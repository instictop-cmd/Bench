import { NextResponse } from "next/server";
import { getLimiter } from "@/lib/rate-limit";

type RpcRequest = {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: Record<string, unknown>;
};

const NOTES: Record<string, string> = {
  "study.md": [
    "Photosynthesis is how plants use sunlight, water, and carbon dioxide to make food.",
    "It happens in the leaves, mostly in cells called chloroplasts.",
    "The plant releases oxygen as a by-product.",
    "",
    "Spaced review beats rereading. Test yourself after one day, three days, and one week.",
  ].join("\n"),
  "reading-list.md": [
    "1. How to take smart notes — one idea per note.",
    "2. Make It Stick — retrieval practice beats rereading.",
    "3. The MCP specification — tools, resources, prompts.",
  ].join("\n"),
};

const TOOLS = [
  {
    name: "read_notes",
    title: "Read notes",
    description: "Read one note file from the Bench notebook.",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "study.md or reading-list.md",
        },
      },
      required: ["path"],
    },
  },
  {
    name: "search_notes",
    title: "Search notes",
    description: "Search every note for a word or phrase.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Text to find" },
      },
      required: ["query"],
    },
  },
  {
    name: "word_count",
    title: "Count words",
    description: "Count the words in one note file.",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "study.md or reading-list.md",
        },
      },
      required: ["path"],
    },
  },
];

const RESOURCES = [
  {
    uri: "notes://study",
    name: "Study notes",
    description: "The learner's photosynthesis notes.",
    mimeType: "text/markdown",
  },
  {
    uri: "notes://reading-list",
    name: "Reading list",
    description: "Three sources worth reading.",
    mimeType: "text/markdown",
  },
];

const PROMPTS = [
  {
    name: "quiz_me",
    description: "Turn a note into three retrieval questions.",
    arguments: [
      {
        name: "topic",
        description: "What to quiz",
        required: true,
      },
    ],
  },
];

function result(id: RpcRequest["id"], value: unknown) {
  return NextResponse.json({ jsonrpc: "2.0", id: id ?? null, result: value });
}

function failure(
  id: RpcRequest["id"],
  code: number,
  message: string,
  status = 200,
) {
  return NextResponse.json(
    { jsonrpc: "2.0", id: id ?? null, error: { code, message } },
    { status },
  );
}

function readNote(path: unknown): { text: string; error?: string } {
  if (typeof path !== "string" || !path.trim()) {
    return { text: "", error: "path is required" };
  }
  const text = NOTES[path.trim()];
  if (!text) {
    return { text: "", error: `note not found: ${path}` };
  }
  return { text };
}

function toolResult(text: string, isError = false) {
  return {
    content: [{ type: "text", text }],
    isError,
  };
}

export async function POST(
  request: Request,
  { params: routeParams }: { params: Promise<{ server: string }> },
) {
  const { server } = await routeParams;

  if (server !== "bench-notes") {
    return NextResponse.json(
      { error: "unknown MCP server" },
      { status: 404 },
    );
  }

  const forwarded = request.headers.get("x-forwarded-for") ?? "local";
  const ip = forwarded.split(",")[0]?.trim() || "local";
  const limit = await getLimiter().consume(`mcp:${server}:${ip}`, 120, 60_000);

  if (!limit.ok) {
    return NextResponse.json(
      { error: "rate limited" },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.max(1, Math.ceil((limit.reset - Date.now()) / 1000))),
        },
      },
    );
  }

  let body: RpcRequest;
  try {
    body = (await request.json()) as RpcRequest;
  } catch {
    return failure(null, -32700, "parse error", 400);
  }

  const { id, method, params: rawParams } = body;
  const params = rawParams ?? {};

  if (method === "initialize") {
    return result(id, {
      protocolVersion: "2025-06-18",
      capabilities: {
        tools: { listChanged: false },
        resources: { subscribe: false, listChanged: false },
        prompts: { listChanged: false },
      },
      serverInfo: {
        name: "bench-notes",
        version: "1.0.0",
      },
      instructions:
        "Read notes, search them, and use the quiz prompt. This server is read-only.",
    });
  }

  if (method === "notifications/initialized") {
    return new NextResponse(null, { status: 202 });
  }

  if (method === "ping") {
    return result(id, {});
  }

  if (method === "tools/list") {
    return result(id, { tools: TOOLS });
  }

  if (method === "tools/call") {
    const name = typeof params.name === "string" ? params.name : "";
    const args =
      params.arguments && typeof params.arguments === "object"
        ? (params.arguments as Record<string, unknown>)
        : {};

    if (name === "read_notes") {
      const note = readNote(args.path);
      return result(
        id,
        toolResult(note.error ?? note.text, Boolean(note.error)),
      );
    }

    if (name === "search_notes") {
      const query =
        typeof args.query === "string" ? args.query.trim().toLowerCase() : "";
      if (!query) {
        return result(id, toolResult("query is required", true));
      }
      const matches = Object.entries(NOTES).flatMap(([path, text]) =>
        text
          .split("\n")
          .filter((line) => line.toLowerCase().includes(query))
          .map((line) => `${path}: ${line}`),
      );
      return result(
        id,
        toolResult(matches.length ? matches.join("\n") : "no matches", false),
      );
    }

    if (name === "word_count") {
      const note = readNote(args.path);
      if (note.error) return result(id, toolResult(note.error, true));
      return result(
        id,
        toolResult(String(note.text.trim().split(/\s+/).length)),
      );
    }

    return result(id, toolResult(`unknown tool: ${name}`, true));
  }

  if (method === "resources/list") {
    return result(id, { resources: RESOURCES });
  }

  if (method === "resources/read") {
    const uri = typeof params.uri === "string" ? params.uri : "";
    const map: Record<string, string> = {
      "notes://study": "study.md",
      "notes://reading-list": "reading-list.md",
    };
    const path = map[uri];
    if (!path) {
      return failure(id, -32602, `unknown resource: ${uri}`);
    }
    return result(id, {
      contents: [
        {
          uri,
          mimeType: "text/markdown",
          text: NOTES[path],
        },
      ],
    });
  }

  if (method === "prompts/list") {
    return result(id, { prompts: PROMPTS });
  }

  if (method === "prompts/get") {
    const name = typeof params.name === "string" ? params.name : "";
    if (name !== "quiz_me") {
      return failure(id, -32602, `unknown prompt: ${name}`);
    }
    const args =
      params.arguments && typeof params.arguments === "object"
        ? (params.arguments as Record<string, unknown>)
        : {};
    const topic =
      typeof args.topic === "string" && args.topic.trim()
        ? args.topic.trim()
        : "the study notes";
    return result(id, {
      description: "Three retrieval questions",
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Write three short retrieval questions about ${topic}. No answers.`,
          },
        },
      ],
    });
  }

  return failure(id, -32601, `method not found: ${method ?? "unknown"}`);
}

export async function GET() {
  return NextResponse.json(
    {
      error:
        "This MCP endpoint accepts JSON-RPC POST requests. The server is read-only.",
    },
    { status: 405 },
  );
}
