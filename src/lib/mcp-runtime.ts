import type { McpPrompt, McpServer, McpTool } from "@/game/connect";
import { mcpServerById } from "@/game/connect";

export type McpMessage = {
  id: string;
  method: string;
  params?: unknown;
  result?: unknown;
  error?: { code: number; message: string };
};

export type McpResult = {
  ok: boolean;
  output: string;
  raw: string;
  error?: string;
  ms: number;
};

export interface McpRuntime {
  connect(serverId: string): Promise<{ server: McpServer; raw: string }>;
  listTools(serverId: string): Promise<{ tools: McpTool[]; raw: string }>;
  callTool(
    serverId: string,
    tool: string,
    args: Record<string, string>,
    scope: string,
  ): Promise<McpResult>;
  readResource(serverId: string, uri: string): Promise<McpResult>;
  getPrompt(
    serverId: string,
    name: string,
    args?: Record<string, string>,
  ): Promise<McpResult>;
}

const TIMING = {
  list: 11,
  call: 24,
  read: 9,
  prompt: 14,
} as const;

const sequences = new Map<string, number>();

function nextId(serverId: string): string {
  const next = (sequences.get(serverId) ?? 0) + 1;
  sequences.set(serverId, next);
  return `req-${next}`;
}

function rpcResult(id: string, result: unknown): string {
  return JSON.stringify({ jsonrpc: "2.0", id, result }, null, 2);
}

function errorResult(
  id: string,
  code: number,
  message: string,
  ms: number,
  data?: unknown,
): McpResult {
  const error: { code: number; message: string; data?: unknown } = {
    code,
    message,
  };
  if (data !== undefined) error.data = data;

  return {
    ok: false,
    output: `Error ${code} · ${message}`,
    raw: JSON.stringify({ jsonrpc: "2.0", id, error }, null, 2),
    error: message,
    ms,
  };
}

function okResult(
  id: string,
  result: unknown,
  output: string,
  ms: number,
): McpResult {
  return {
    ok: true,
    output,
    raw: rpcResult(id, result),
    ms,
  };
}

function capabilityMap(server: McpServer): Record<string, unknown> {
  const capabilities: Record<string, unknown> = {};
  if (server.capabilities.includes("tool")) {
    capabilities.tools = { listChanged: false };
  }
  if (server.capabilities.includes("resource")) {
    capabilities.resources = { subscribe: false, listChanged: false };
  }
  if (server.capabilities.includes("prompt")) {
    capabilities.prompts = { listChanged: false };
  }
  return capabilities;
}

function toolManifest(tool: McpTool) {
  return {
    name: tool.name,
    title: tool.title,
    description: tool.description,
    inputSchema: {
      type: "object",
      properties: tool.properties,
      required: tool.required,
    },
    _meta: { scope: tool.scope },
  };
}

function scopeCovers(granted: string, required: string): boolean {
  if (granted === required) return true;
  if (granted === "*") return true;
  if (granted.endsWith(".*")) {
    return required.startsWith(granted.slice(0, -1));
  }
  return false;
}

function missingArgs(
  tool: McpTool,
  args: Record<string, string>,
): string[] {
  return tool.required.filter((key) => {
    const value = args[key];
    return typeof value !== "string" || value.trim() === "";
  });
}

function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

function noteText(server: McpServer, path: string): string {
  if (path === "study.md") {
    const study = server.resources.find(
      (resource) => resource.uri === "notes://study",
    );
    if (study) return study.text;
  }

  return `# ${path}

Notes from the study desk.

- Photosynthesis needs light, water, and carbon dioxide.
- Active recall beats rereading.
- Quiz yourself before the session.`;
}

function pathError(path: string): string {
  if (path.includes("..") || path.startsWith("/") || path.includes("\\")) {
    return "Path escapes the notes folder.";
  }
  return "";
}

function runTool(
  server: McpServer,
  tool: McpTool,
  args: Record<string, string>,
): { output: string; structured: Record<string, unknown> } {
  if (tool.name === "read_notes") {
    const path = args.path.trim();
    const text = noteText(server, path);
    return {
      output: text,
      structured: { path, words: countWords(text) },
    };
  }

  if (tool.name === "search_notes") {
    const query = args.query.trim();
    const index = [
      {
        file: "study.md",
        line: "Plants use sunlight, water, and carbon dioxide to make glucose and oxygen.",
      },
      {
        file: "study.md",
        line: "Close the notes. Write what you remember. Check the gaps.",
      },
      {
        file: "study/outline.md",
        line: "Photosynthesis starts with light reactions and ends with the Calvin cycle.",
      },
      {
        file: "reading-list.md",
        line: "van Helmont measured a willow tree and found water was the main input.",
      },
    ];
    const needle = query.toLowerCase();
    const matches = index.filter(
      (entry) =>
        entry.line.toLowerCase().includes(needle) ||
        entry.file.toLowerCase().includes(needle),
    );

    const output =
      matches.length === 0
        ? `No matches for "${query}".`
        : `${matches.length} match${matches.length === 1 ? "" : "es"} for "${query}"\n\n${matches
            .map((entry) => `${entry.file}: ${entry.line}`)
            .join("\n")}`;

    return {
      output,
      structured: { query, matches },
    };
  }

  if (tool.name === "word_count") {
    const path = args.path.trim();
    const words = countWords(noteText(server, path));
    return {
      output: `${words} words in ${path}.`,
      structured: { path, words },
    };
  }

  if (tool.name === "append_note") {
    const path = args.path.trim();
    const text = args.text.trim();
    return {
      output: `Appended 1 line to ${path}.\n\n${text}`,
      structured: { path, appended: 1 },
    };
  }

  if (tool.name === "list_sources") {
    const topic = (args.topic ?? "").trim();
    const sources = [
      "van Helmont, 1648 · willow tree mass comes from water",
      "Priestley, 1772 · a plant restores air that a candle spoils",
      "Ingenhousz, 1779 · light is required for the restoration",
      "Engelmann, 1882 · action spectrum points to chlorophyll",
      "Calvin, 1950 · carbon fixation mapped with carbon-14",
      "Long, 2024 · active recall beats rereading",
    ];
    const output = topic
      ? `Sources matching "${topic}":\n\n${sources.join("\n")}`
      : `Sources on the reading desk:\n\n${sources.join("\n")}`;
    return {
      output,
      structured: { topic: topic || null, sources },
    };
  }

  return {
    output: `The tool ${tool.name} returned an empty result.`,
    structured: { tool: tool.name },
  };
}

export class MockMcpRuntime implements McpRuntime {
  async connect(
    serverId: string,
  ): Promise<{ server: McpServer; raw: string }> {
    const server = mcpServerById(serverId);
    if (!server) throw new Error(`Unknown MCP server: ${serverId}`);

    sequences.set(serverId, 0);
    const id = nextId(serverId);

    const result = {
      protocolVersion: server.protocolVersion,
      capabilities: capabilityMap(server),
      serverInfo: {
        name: server.id,
        title: server.name,
        version: "1.0.0",
      },
      instructions: server.description,
    };

    return { server, raw: rpcResult(id, result) };
  }

  async listTools(
    serverId: string,
  ): Promise<{ tools: McpTool[]; raw: string }> {
    const id = nextId(serverId);
    const server = mcpServerById(serverId);

    if (!server) {
      return {
        tools: [],
        raw: JSON.stringify(
          {
            jsonrpc: "2.0",
            id,
            error: {
              code: -32601,
              message: `Unknown server: ${serverId}`,
            },
          },
          null,
          2,
        ),
      };
    }

    return {
      tools: server.tools,
      raw: rpcResult(id, {
        tools: server.tools.map(toolManifest),
      }),
    };
  }

  async callTool(
    serverId: string,
    tool: string,
    args: Record<string, string>,
    scope: string,
  ): Promise<McpResult> {
    const id = nextId(serverId);
    const server = mcpServerById(serverId);

    if (!server) {
      return errorResult(
        id,
        -32601,
        `Unknown server: ${serverId}`,
        TIMING.call,
      );
    }

    const selected = server.tools.find((item) => item.name === tool);
    if (!selected) {
      return errorResult(
        id,
        -32602,
        `Unknown tool: ${tool}`,
        TIMING.call,
        { available: server.tools.map((item) => item.name) },
      );
    }

    if (!scope) {
      return errorResult(
        id,
        -32001,
        `No scope granted. ${tool} requires ${selected.scope}.`,
        TIMING.call,
        { required: selected.scope, granted: null },
      );
    }

    if (!scopeCovers(scope, selected.scope)) {
      return errorResult(
        id,
        -32001,
        `Insufficient scope: ${selected.scope} required, ${scope} granted.`,
        TIMING.call,
        { required: selected.scope, granted: scope },
      );
    }

    const missing = missingArgs(selected, args);
    if (missing.length > 0) {
      return errorResult(
        id,
        -32602,
        `Missing required argument: ${missing.join(", ")}`,
        TIMING.call,
        { tool, required: selected.required, missing },
      );
    }

    if (selected.poisoned) {
      return errorResult(
        id,
        -32003,
        "Policy blocked: this tool requests credentials and outbound network access.",
        TIMING.call,
        { tool: selected.name, blocked: true },
      );
    }

    if (selected.name === "read_notes" || selected.name === "word_count") {
      const invalid = pathError(args.path.trim());
      if (invalid) {
        return errorResult(id, -32602, invalid, TIMING.call, {
          tool: selected.name,
          path: args.path,
        });
      }
    }

    if (selected.name === "append_note") {
      const invalid = pathError(args.path.trim());
      if (invalid) {
        return errorResult(id, -32602, invalid, TIMING.call, {
          tool: selected.name,
          path: args.path,
        });
      }
    }

    const { output, structured } = runTool(server, selected, args);
    return okResult(
      id,
      {
        content: [{ type: "text", text: output }],
        structuredContent: structured,
        isError: false,
      },
      output,
      TIMING.call,
    );
  }

  async readResource(serverId: string, uri: string): Promise<McpResult> {
    const id = nextId(serverId);
    const server = mcpServerById(serverId);

    if (!server) {
      return errorResult(
        id,
        -32601,
        `Unknown server: ${serverId}`,
        TIMING.read,
      );
    }

    const resource = server.resources.find((item) => item.uri === uri);
    if (!resource) {
      return errorResult(id, -32002, `Unknown resource: ${uri}`, TIMING.read, {
        available: server.resources.map((item) => item.uri),
      });
    }

    return okResult(
      id,
      {
        contents: [
          {
            uri: resource.uri,
            mimeType: resource.mimeType,
            text: resource.text,
          },
        ],
      },
      resource.text,
      TIMING.read,
    );
  }

  async getPrompt(
    serverId: string,
    name: string,
    args: Record<string, string> = {},
  ): Promise<McpResult> {
    const id = nextId(serverId);
    const server = mcpServerById(serverId);

    if (!server) {
      return errorResult(
        id,
        -32601,
        `Unknown server: ${serverId}`,
        TIMING.prompt,
      );
    }

    const prompt = server.prompts.find((item) => item.name === name);
    if (!prompt) {
      return errorResult(
        id,
        -32602,
        `Unknown prompt: ${name}`,
        TIMING.prompt,
        { available: server.prompts.map((item) => item.name) },
      );
    }

    const missing = prompt.arguments
      .filter((argument) => argument.required)
      .filter((argument) => (args[argument.name] ?? "").trim() === "")
      .map((argument) => argument.name);

    if (missing.length > 0) {
      return errorResult(
        id,
        -32602,
        `Missing required prompt argument: ${missing.join(", ")}`,
        TIMING.prompt,
        { prompt: name, required: missing },
      );
    }

    const text = renderPrompt(prompt, args);
    return okResult(
      id,
      {
        description: prompt.description,
        messages: [
          {
            role: "user",
            content: { type: "text", text },
          },
        ],
      },
      text,
      TIMING.prompt,
    );
  }
}

function renderPrompt(
  prompt: McpPrompt,
  args: Record<string, string>,
): string {
  return prompt.text.replace(
    /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g,
    (match: string, key: string) => {
      const value = (args[key] ?? "").trim();
      return value || match;
    },
  );
}

export const mcpRuntime: McpRuntime = new MockMcpRuntime();
