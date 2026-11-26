const BASE_URL = process.env.AI_BASE_URL ?? "https://apihub.agnes-ai.com/v1";
const API_KEY = process.env.AI_API_KEY ?? "";
const MODEL = process.env.AI_MODEL ?? "agnes-3.0-flash";

export function isLive(): boolean {
  return Boolean(API_KEY);
}

export function modelName(): string {
  return MODEL;
}

export class AiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "AiError";
  }
}

type StreamChunk = {
  choices?: Array<{ delta?: { content?: string } }>;
};

export async function* streamAgnes(
  prompt: string,
  system: string,
  signal: AbortSignal,
): AsyncGenerator<string> {
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 220,
      stream: true,
    }),
    signal,
  });

  if (!res.ok || !res.body) {
    const body = await res.text().catch(() => "");
    throw new AiError(res.status, body.slice(0, 300) || res.statusText);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const raw of lines) {
      const line = raw.trim();
      if (!line.startsWith("data:")) continue;

      const data = line.slice(5).trim();
      if (!data) continue;
      if (data === "[DONE]") return;

      try {
        const parsed = JSON.parse(data) as StreamChunk;
        const delta = parsed.choices?.[0]?.delta?.content;
        if (delta) yield delta;
      } catch {
        // keep-alive frame or partial payload
      }
    }
  }
}
