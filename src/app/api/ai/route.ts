import type { NextRequest } from "next/server";
import { AiError, isLive, streamAgnes } from "@/lib/ai";
import { AI_QUESTS } from "@/lib/ai-quests";
import { moderationVerdict, refusalFor } from "@/lib/moderation";
import { getLimiter } from "@/lib/rate-limit";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

const SESSION_LIMIT = 60;
const IP_LIMIT = 200;
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const DAILY_CAP = Number(process.env.AI_DAILY_CAP ?? 2_000);
const MAX_PROMPT = 500;
const MAX_CONTEXT = 800;
const MAX_BODY = 16_384;

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
      "X-Content-Type-Options": "nosniff",
      ...headers,
    },
  });
}

function isAllowedOrigin(req: NextRequest): boolean {
  const fetchSite = req.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") {
    return false;
  }

  const origin = req.headers.get("origin");
  if (!origin) return true;

  const allowed = new Set([new URL(req.url).origin]);
  if (process.env.NODE_ENV !== "production") {
    allowed.add("http://localhost:3000");
    allowed.add("http://127.0.0.1:3000");
  }

  return allowed.has(origin);
}

type Body = {
  prompt?: unknown;
  questId?: unknown;
  mode?: unknown;
  context?: unknown;
};

export async function POST(req: NextRequest) {
  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return text("unsupported media type", 415);
  }

  if (!isAllowedOrigin(req)) {
    return text("forbidden", 403);
  }

  const bodyLength = Number(req.headers.get("content-length") ?? 0);
  if (bodyLength > MAX_BODY) {
    return text("payload too large", 413);
  }

  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!session) {
    return text("session required", 401, { "x-bench-session": "missing" });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return text("bad request", 400);
  }

  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  const id =
    typeof body.questId === "string"
      ? body.questId
      : typeof body.mode === "string"
        ? body.mode
        : "";
  const context =
    typeof body.context === "string"
      ? body.context.slice(0, MAX_CONTEXT).trim()
      : "";

  if (!prompt || prompt.length > MAX_PROMPT) {
    return text(`prompt must be 1-${MAX_PROMPT} characters`, 400);
  }

  const config = AI_QUESTS[id];
  if (!config) return text("unknown quest", 400);

  if (moderationVerdict(prompt) === "refuse") {
    return text(refusalFor(prompt), 200, { "x-bench-moderation": "refused" });
  }

  if (config.scope && !config.scope.test(prompt)) {
    return text(config.redirect, 200, { "x-bench-scope": "blocked" });
  }

  const ip = (req.headers.get("x-forwarded-for") ?? "local")
    .split(",")[0]
    .trim();
  const day = new Date().toISOString().slice(0, 10);
  const limiter = getLimiter();

  let rates;
  try {
    rates = await Promise.all([
      limiter.consume(`bench:rl:sid:${session}`, SESSION_LIMIT, HOUR),
      limiter.consume(`bench:rl:ip:${ip}`, IP_LIMIT, HOUR),
      limiter.consume(`bench:rl:day:${day}`, DAILY_CAP, DAY),
    ]);
  } catch (error) {
    console.error("[ai] rate limiter failed", error);
    return text("machine unavailable", 503);
  }

  const limited = rates.find((rate) => !rate.ok);
  if (limited) {
    const retry = Math.max(1, Math.ceil((limited.reset - Date.now()) / 1000));
    return text("slow down. this terminal has an hourly limit.", 429, {
      "Retry-After": String(retry),
      "x-bench-limit": "session",
    });
  }

  const key = `${id}:${prompt.toLowerCase()}`;
  const cacheable = id !== "prologue" && !context;

  if (cacheable) {
    const hit = cacheGet(key);
    if (hit) {
      return text(hit.text, 200, {
        "x-bench-cache": "hit",
        ...(hit.mock ? { "x-bench-mock": "1" } : {}),
      });
    }
  }

  if (!isLive()) {
    const answer = config.fallback;
    if (cacheable) cacheSet(key, { text: answer, mock: true });
    return text(answer, 200, { "x-bench-mock": "1" });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  const userPrompt = context
    ? `${prompt}\n\nDraft from the previous step:\n${context}`
    : prompt;
  const iterator = streamAgnes(
    userPrompt,
    config.systemPrompt,
    controller.signal,
  )[Symbol.asyncIterator]();

  let head: string;
  try {
    const first = await iterator.next();
    const value = first.value;
    if (first.done || !value) throw new Error("empty response");
    head = value;
  } catch (error) {
    clearTimeout(timeout);
    const status = error instanceof AiError ? error.status : 0;
    console.error(
      "[ai] provider failed",
      status,
      error instanceof Error ? error.message : String(error),
    );
    return text("machine unavailable", 502, { "x-bench-error": "provider" });
  }

  const encoder = new TextEncoder();
  let full = head;

  const stream = new ReadableStream<Uint8Array>({
    async start(streamController) {
      try {
        streamController.enqueue(encoder.encode(head));

        for (;;) {
          const next = await iterator.next();
          if (next.done) break;
          if (!next.value) continue;
          full += next.value;
          streamController.enqueue(encoder.encode(next.value));
        }

        if (cacheable) cacheSet(key, { text: full, mock: false });
        streamController.close();
      } catch (error) {
        console.error("[ai] stream failed", error);
        streamController.error(error);
      } finally {
        clearTimeout(timeout);
      }
    },
    cancel() {
      controller.abort();
      clearTimeout(timeout);
      void iterator.return?.(undefined);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "x-bench-model": process.env.AI_MODEL ?? "agnes-3.0-flash",
    },
  });
}
