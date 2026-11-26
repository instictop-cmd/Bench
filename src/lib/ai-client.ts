export type AiResult = {
  text: string;
  scopeBlocked: boolean;
  refused: boolean;
  cached: boolean;
  mock: boolean;
};

export class AiClientError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "AiClientError";
  }
}

export async function streamAi(
  prompt: string,
  id: string,
  onChunk: (chunk: string) => void,
  options?: { context?: string; signal?: AbortSignal },
): Promise<AiResult> {
  const res = await fetch("/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt,
      questId: id,
      context: options?.context,
    }),
    signal: options?.signal,
  });

  if (!res.ok) {
    throw new AiClientError(res.status, `ai ${res.status}`);
  }

  const scopeBlocked = res.headers.get("x-bench-scope") === "blocked";
  const refused = res.headers.get("x-bench-moderation") === "refused";
  const cached = res.headers.get("x-bench-cache") === "hit";
  const mock = res.headers.get("x-bench-mock") === "1";

  if (!res.body) {
    const text = await res.text();
    return { text, scopeBlocked, refused, cached, mock };
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let text = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    if (!chunk) continue;

    text += chunk;
    onChunk(chunk);
  }

  return { text, scopeBlocked, refused, cached, mock };
}

export function friendlyAiError(error: unknown): string {
  if (error instanceof AiClientError) {
    if (error.status === 429) return "hourly limit reached · cached answer";
    if (error.status === 401 || error.status === 403) {
      return "session expired · refresh the page";
    }
    if (error.status === 502 || error.status === 503) {
      return "machine unavailable · cached answer";
    }
  }
  return "machine busy · cached answer";
}

export function parseCommand(raw: string): string {
  const quoted = raw.match(/^\s*ai\s+["']([\s\S]*)["']\s*$/i);
  if (quoted) return quoted[1].trim();

  return raw
    .replace(/^\s*ai\s+/i, "")
    .replace(/^["']|["']$/g, "")
    .trim();
}

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function countSentences(text: string): number {
  return text
    .trim()
    .split(/[.!?]+(?:\s|$)/)
    .map((part) => part.trim())
    .filter(Boolean).length;
}
