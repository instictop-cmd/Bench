import {
  TOOL_SPECS,
  type ScopeId,
  type ToolId,
  type ToolSpec,
} from "@/game/tool";

export type Validation = {
  ok: boolean;
  errors: Record<string, string>;
};

export type ToolResult = {
  tool: ToolId;
  ok: boolean;
  output: string;
  error?: string;
  scope: ScopeId;
  ms: number;
};

export interface ToolRuntime {
  list(): ToolSpec[];
  validate(tool: ToolId, args: Record<string, string>): Validation;
  call(
    tool: ToolId,
    args: Record<string, string>,
    scope: ScopeId,
  ): Promise<ToolResult>;
}

function evalArithmetic(source: string): number {
  let index = 0;
  const text = source.replace(/\s+/g, "");

  function number(): number {
    if (text.startsWith("(", index)) {
      index += 1;
      const value = expression();
      if (!text.startsWith(")", index)) throw new Error("missing )");
      index += 1;
      return value;
    }

    const start = index;
    while (index < text.length && /[0-9.]/.test(text[index])) index += 1;
    if (start === index) throw new Error("expected a number");
    const value = Number(text.slice(start, index));
    if (!Number.isFinite(value)) throw new Error("not a number");
    return value;
  }

  function term(): number {
    let value = number();
    while (text[index] === "*" || text[index] === "/") {
      const op = text[index];
      index += 1;
      const right = number();
      if (op === "/" && right === 0) throw new Error("division by zero");
      value = op === "*" ? value * right : value / right;
    }
    return value;
  }

  function expression(): number {
    let value = term();
    while (text[index] === "+" || text[index] === "-") {
      const op = text[index];
      index += 1;
      const right = term();
      value = op === "+" ? value + right : value - right;
    }
    return value;
  }

  if (!text) throw new Error("empty expression");
  const value = expression();
  if (index !== text.length) throw new Error("unexpected symbol");
  return value;
}

const FILE_CONTENT: Record<string, string> = {
  "notes.md":
    "Photosynthesis is how plants use sunlight, water, and carbon dioxide to make food. It happens in the leaves, mostly in cells called chloroplasts. The plant releases oxygen as a",
  "summary.md": "Photosynthesis turns sunlight, water, and CO2 into food.",
};

export class MockToolRuntime implements ToolRuntime {
  list(): ToolSpec[] {
    return Object.values(TOOL_SPECS);
  }

  validate(tool: ToolId, args: Record<string, string>): Validation {
    const spec = TOOL_SPECS[tool];
    const errors: Record<string, string> = {};

    if (!spec) return { ok: false, errors: { tool: "unknown tool" } };

    for (const field of spec.fields) {
      const value = (args[field.key] ?? "").trim();
      if (field.required && !value) {
        errors[field.key] = `${field.label} is required.`;
        continue;
      }
      if (value && field.type === "number" && !/^-?\d+$/.test(value)) {
        errors[field.key] = `${field.label} must be a whole number.`;
      }
    }

    return { ok: Object.keys(errors).length === 0, errors };
  }

  async call(
    tool: ToolId,
    args: Record<string, string>,
    scope: ScopeId,
  ): Promise<ToolResult> {
    const spec = TOOL_SPECS[tool];
    const validation = this.validate(tool, args);
    const base = { tool, scope, ms: 8 } as const;

    if (!spec) {
      return { ...base, ok: false, output: "", error: "unknown tool" };
    }

    if (!validation.ok) {
      return {
        ...base,
        ok: false,
        output: "",
        error: Object.values(validation.errors).join(" "),
      };
    }

    const needed: ScopeId =
      tool === "file" && !(args.content ?? "").trim()
        ? "files.read"
        : spec.permission;

    const covers =
      scope === needed ||
      (needed.startsWith("files.") && scope === "files.readwrite");

    if (!covers) {
      return {
        ...base,
        ok: false,
        output: "",
        error: `permission denied: ${tool} needs ${needed}, you granted ${scope}.`,
      };
    }

    if (tool === "calculator") {
      try {
        const value = evalArithmetic(args.expression ?? "");
        return {
          ...base,
          ok: true,
          output: `${args.expression?.trim()} = ${Number(value.toFixed(6))}`,
        };
      } catch (error) {
        return {
          ...base,
          ok: false,
          output: "",
          error: `calculation failed: ${
            error instanceof Error ? error.message : "bad expression"
          }`,
        };
      }
    }

    if (tool === "calendar") {
      const duration = Number(args.duration);
      if (!/^\d{4}-\d{2}-\d{2}$/.test((args.date ?? "").trim())) {
        return {
          ...base,
          ok: false,
          output: "",
          error: "Date must look like YYYY-MM-DD.",
        };
      }
      if (!Number.isFinite(duration) || duration <= 0 || duration > 480) {
        return {
          ...base,
          ok: false,
          output: "",
          error: "Minutes must be between 1 and 480.",
        };
      }
      return {
        ...base,
        ok: true,
        output: `booked "${args.title.trim()}" on ${args.date.trim()} for ${duration} min`,
      };
    }

    if (tool === "file") {
      const path = (args.path ?? "").trim();
      const content = (args.content ?? "").trim();

      if (content) {
        return {
          ...base,
          ok: true,
          output: `wrote ${content.length} chars to ${path}`,
        };
      }

      const file = FILE_CONTENT[path];
      if (file === undefined) {
        return {
          ...base,
          ok: false,
          output: "",
          error: `file not found: ${path}`,
        };
      }

      if (path === "notes.md") {
        return {
          ...base,
          ok: true,
          output: `${file}… [truncated: 42 chars remain]`,
        };
      }

      return { ...base, ok: true, output: file };
    }

    const limit = args.limit ? Number(args.limit) : 3;
    if (!Number.isFinite(limit) || limit < 1 || limit > 5) {
      return {
        ...base,
        ok: false,
        output: "",
        error: "Results must be between 1 and 5.",
      };
    }

    const query = (args.query ?? "").trim();
    return {
      ...base,
      ok: true,
      output: [
        `${limit} result${limit === 1 ? "" : "s"} for "${query}":`,
        "1. A beginner guide with one worked example.",
        "2. A classroom worksheet with an answer key.",
      ]
        .slice(0, limit + 1)
        .join("\n"),
    };
  }
}

export class FakeToolRuntime implements ToolRuntime {
  list(): ToolSpec[] {
    return Object.values(TOOL_SPECS);
  }

  validate(tool: ToolId, args: Record<string, string>): Validation {
    const spec = TOOL_SPECS[tool];
    return { ok: Boolean(spec) && Boolean(args), errors: {} };
  }

  async call(
    tool: ToolId,
    args: Record<string, string>,
    scope: ScopeId,
  ): Promise<ToolResult> {
    return {
      tool,
      ok: true,
      output: `${tool} output for ${JSON.stringify(args)}`,
      scope,
      ms: 1,
    };
  }
}

export const toolRuntime: ToolRuntime = new MockToolRuntime();
