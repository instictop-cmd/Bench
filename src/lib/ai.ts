export type AiMode = "prologue" | "quest-1";

export const AI_MODES: Record<
  AiMode,
  { scope: RegExp | null; redirect: string }
> = {
  prologue: { scope: null, redirect: "" },
  "quest-1": {
    scope: /photosynthesis|plant|light|sugar|oxygen|12[\s-]?year|sentence/i,
    redirect:
      'this terminal only knows today\'s lesson. try: ai "explain photosynthesis in one sentence for a 12-year-old"',
  },
};

export const SYSTEM_PROMPTS: Record<AiMode, string> = {
  prologue: [
    "You are the machine inside Bench, a beginner AI lab.",
    "Answer in at most 3 short sentences, under 60 words.",
    "No markdown, no lists, no preamble.",
    "Never mention being an AI or a model.",
  ].join(" "),
  "quest-1": [
    "You are the machine inside Bench, a beginner AI lab.",
    "Answer the question naturally in plain language, with no markdown or preamble.",
    "If the user states a length, audience, or format constraint, follow it exactly.",
    "Never mention being an AI or a model.",
  ].join(" "),
};

const BASE_URL = process.env.AI_BASE_URL ?? "https://apihub.agnes-ai.com/v1";
const API_KEY = process.env.AI_API_KEY ?? "";
const MODEL = process.env.AI_MODEL ?? "agnes-3.0-flash";

export function isLive(): boolean {
  return Boolean(API_KEY);
}

export function modelName(): string {
  return MODEL;
}

export function mockAnswer(prompt: string): string {
  const text = prompt.toLowerCase();
  const concise = /one sentence|12[\s-]?year|simply|short/.test(text);

  if (text.includes("photosynthesis") || text.includes("plant")) {
    if (concise) {
      return "Plants eat sunlight: light goes in, sugar comes out, and oxygen is the leftover.";
    }
    return "Photosynthesis is the biochemical process by which photoautotrophic organisms convert light energy into chemical energy, producing glucose and releasing oxygen as a byproduct.";
  }

  if (text.includes("plan") || text.includes("study")) {
    if (concise) {
      return "Study in three daily blocks, hardest subject first.";
    }
    return "Study in three blocks a day, fifty minutes each. Put the hardest subject first, keep the same time daily, and add one review block on Sunday.";
  }

  if (text.includes("message") || text.includes("avoid")) {
    if (concise) {
      return 'Say: "I\'ve been avoiding this. Here\'s where I am, and here\'s what I need."';
    }
    return 'Try: "I\'ve been putting this off because I didn\'t want to get it wrong. Here\'s where I am, and here\'s what I need. If you can meet me halfway, I\'d appreciate it." Then add the specifics.';
  }

  return "Here's the short version: start with what you already know, name the one thing you don't, and test that first.";
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
