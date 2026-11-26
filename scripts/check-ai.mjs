const base = process.env.AI_BASE_URL ?? "https://apihub.agnes-ai.com/v1";
const key = process.env.AI_API_KEY ?? "";
const model = process.env.AI_MODEL ?? "agnes-3.0-flash";

if (!key) {
  console.error("AI_API_KEY is empty. Add your key to .env.local first.");
  process.exit(1);
}

console.log(`model: ${model}`);
console.log(`base:  ${base}`);

const started = Date.now();

const res = await fetch(`${base}/chat/completions`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model,
    messages: [
      { role: "system", content: "Answer in one short sentence." },
      { role: "user", content: "Say hello to a new learner." },
    ],
    max_tokens: 60,
  }),
});

const body = await res.text();

console.log(`status: ${res.status} in ${Date.now() - started}ms`);
console.log(body.slice(0, 1200));

if (!res.ok) process.exit(1);
