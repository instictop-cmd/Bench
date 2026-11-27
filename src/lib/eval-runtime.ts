import type {
  EvalCandidate,
  EvalCase,
  EvalCaseResult,
  EvalCheck,
  EvalReport,
} from "@/game/eval";

export interface EvalRuntime {
  run(cases: EvalCase[], candidate: EvalCandidate): Promise<EvalReport>;
}

function check(output: string, rule: EvalCheck): { pass: boolean; reason: string } {
  const text = output.trim();
  const lower = text.toLowerCase();

  if (rule.type === "contains") {
    const pass = lower.includes(rule.value.toLowerCase());
    return {
      pass,
      reason: pass
        ? `contains "${rule.value}"`
        : `missing "${rule.value}"`,
    };
  }

  if (rule.type === "equals") {
    const pass = lower === rule.value.trim().toLowerCase();
    return {
      pass,
      reason: pass ? "exact match" : `expected exactly "${rule.value}"`,
    };
  }

  if (rule.type === "regex") {
    let pass = false;
    try {
      pass = new RegExp(rule.value, "i").test(text);
    } catch {
      pass = false;
    }
    return {
      pass,
      reason: pass ? `matches /${rule.value}/` : `does not match /${rule.value}/`,
    };
  }

  const words = text ? text.split(/\s+/).length : 0;
  const pass = words <= rule.value;
  return {
    pass,
    reason: pass ? `${words} words` : `${words} words; the cap is ${rule.value}`,
  };
}

export class ScriptedEvalRuntime implements EvalRuntime {
  async run(cases: EvalCase[], candidate: EvalCandidate): Promise<EvalReport> {
    const results: EvalCaseResult[] = cases.map((test) => {
      const output = candidate.outputs[test.id] ?? "";
      if (!output.trim()) {
        return {
          caseId: test.id,
          pass: false,
          reason: "no output was returned",
          output,
        };
      }
      const verdict = check(output, test.check);
      return {
        caseId: test.id,
        pass: verdict.pass,
        reason: verdict.reason,
        output,
      };
    });

    return {
      candidateId: candidate.id,
      results,
      passed: results.filter((result) => result.pass).length,
      total: results.length,
    };
  }
}

export const evalRuntime: EvalRuntime = new ScriptedEvalRuntime();
