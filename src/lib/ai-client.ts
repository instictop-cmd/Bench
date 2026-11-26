export type AiResult = {
  text: string;
  scopeBlocked: boolean;
  cached: boolean;
  mock: boolean;
};

export async function streamAi(
  prompt: string,
  mode: string,
  onChunk: (chunk: string) => void,
  signal?: AbortSignal,
): Promise<AiResult> {
  const res = await fetch("/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, mode }),
    signal,
  });

  if (!res.ok) {
    throw new Error(`ai ${res.status}`);
  }

  const scopeBlocked = res.headers.get("x-bench-scope") === "blocked";
  const cached = res.headers.get("x-bench-cache") === "hit";
  const mock = res.headers.get("x-bench-mock") === "1";

  if (!res.body) {
    const text = await res.text();
    return { text, scopeBlocked, cached, mock };
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

  return { text, scopeBlocked, cached, mock };
}

export function parseCommand(raw: string): string {
  const quoted = raw.match(/^\s*ai\s+["']([\s\S]*)["']\s*$/i);
  if (quoted) return quoted[1].trim();

  return raw.replace(/^\s*ai\s+/i, "").replace(/^["']|["']$/g, "").trim();
}

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}
