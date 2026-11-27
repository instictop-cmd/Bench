import { FLOW_OPS, type FlowSpec, type FlowTrace } from "@/game/flow";
import { streamAi } from "./ai-client";

const REFUSAL = /^\s*i can'?t help with that/i;

export interface FlowRuntime {
  run(spec: FlowSpec, input: string): Promise<FlowTrace>;
}

export class ScriptedFlowRuntime implements FlowRuntime {
  async run(spec: FlowSpec, input: string): Promise<FlowTrace> {
    let previous = input;
    const steps: FlowTrace["steps"] = [];

    for (const step of spec.steps) {
      const operation = FLOW_OPS[step.operationId];
      if (!operation) throw new Error(`unknown operation: ${step.operationId}`);

      const context = { input, previous, variables: spec.variables };
      const started = Date.now();
      let output = "";
      let degraded = false;

      if (operation.kind === "transform" && operation.transform) {
        output = operation.transform(context);
      } else if (operation.serverId && operation.prompt) {
        const prompt = operation.prompt(context);
        try {
          const result = await streamAi(prompt, operation.serverId, () => {});
          output = result.text.trim();
          if (!output || REFUSAL.test(output)) {
            degraded = true;
            output = operation.fallback ?? "";
          }
        } catch {
          degraded = true;
          output = operation.fallback ?? "";
        }
      }

      steps.push({
        id: step.id,
        operationId: operation.id,
        label: operation.label,
        input: operation.prompt ? operation.prompt(context) : "",
        output,
        ms: Date.now() - started,
        degraded,
      });

      previous = output;
    }

    return {
      steps,
      output: previous,
      ok: steps.length > 0 && steps.every((step) => step.output.trim().length > 0),
    };
  }
}

export class FakeFlowRuntime implements FlowRuntime {
  async run(spec: FlowSpec, input: string): Promise<FlowTrace> {
    let previous = input;
    const steps: FlowTrace["steps"] = spec.steps.map((step, index) => {
      const operation = FLOW_OPS[step.operationId];
      const output = `${operation?.label ?? step.operationId} output ${index + 1}`;
      previous = output;
      return {
        id: step.id,
        operationId: step.operationId,
        label: operation?.label ?? step.operationId,
        input: previous,
        output,
        ms: 1,
      };
    });

    return { steps, output: previous, ok: steps.length > 0 };
  }
}

export const flowRuntime: FlowRuntime = new ScriptedFlowRuntime();
