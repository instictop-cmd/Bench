import {
  AI_MODES,
  AiError,
  isLive,
  mockAnswer,
  streamAgnes,
  SYSTEM_PROMPTS,
  type AiMode,
} from "@/lib/ai";

const RATE_LIMIT = 20;
const WINDOW_MS = 60 * 60 * 1000;
const hits = new Map<string, { count: number; reset: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();

  if (hits.size > 500) {
    for (const [key, entry] of hits) {
      if (entry.reset < now) hits.delete(key);
    }
  }

  const entry = hits.get(ip);
  if (!entry || entry.reset < now) {
    hits.set(ip, { count: 1, reset: now + WINDOW_MS });
    return false;
  }

  entry.count += 1;
  return entry.count > RATE_LIMIT;
}

const cache = new Map<string, { text: string; mock: boolean }>();
const CACHE_MAX = 100;

function cacheGet(key: string) {
  return cache.get(key);
}

function cacheSet(key: string, value: { text: string; mock: boolean }) {
  if (cache.size >= CACHE_MAX) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, value);
}

function text(
  body: string,
  status = 200,
  headers: Record<string, string> = {},
): Response {
  return new Response(body, {
    status,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      ...headers,
    },
  });
}

type Body = { prompt?: unknown; mode?: unknown };

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return text("bad request", 400);
  }

  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  const mode = typeof body.mode === "string" ? body.mode : "";

  if (!prompt || prompt.length > 500) {
    return text("prompt must be 1-500 characters", 400);
  }

  const config = AI_MODES[mode as AiMode];
  if (!config) return text("unknown mode", 400);

  if (config.scope && !config.scope.test(prompt)) {
    return text(config.redirect, 200, { "x-bench-scope": "blocked" });
  }

  const ip = (req.headers.get("x-forwarded-for") ?? "local")
    .split(",")[0]
    .trim();

  if (isRateLimited(ip)) {
    return text("slow down. this terminal has an hourly limit.", 429);
  }

  const key = `${mode}:${prompt.toLowerCase()}`;
  const hit = cacheGet(key);
  if (hit) {
    return text(hit.text, 200, {
      "x-bench-cache": "hit",
      ...(hit.mock ? { "x-bench-mock": "1" } : {}),
    });
  }

  if (!isLive()) {
    const answer = mockAnswer(prompt);
    cacheSet(key, { text: answer, mock: true });
    return text(answer, 200, { "x-bench-mock": "1" });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);

  const stream = new ReadableStream<Uint8Array>({
    async start(streamController) {
      const encoder = new TextEncoder();
      let full = "";

      try {
        for await (const delta of streamAgnes(
          prompt,
          SYSTEM_PROMPTS[mode as AiMode],
          controller.signal,
        )) {
          full += delta;
          streamController.enqueue(encoder.encode(delta));
        }
        if (full) cacheSet(key, { text: full, mock: false });
        streamController.close();
      } catch (error) {
        const status = error instanceof AiError ? error.status : 0;
        console.error(
          "[ai]",
          status,
          error instanceof Error ? error.message : String(error),
        );
        streamController.error(error);
      } finally {
        clearTimeout(timeout);
      }
    },
    cancel() {
      controller.abort();
      clearTimeout(timeout);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
