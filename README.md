<div align="center">

# BENCH

### A pixel lab where complete beginners learn to actually use AI.

Wake a dormant agent in a basement. Teach it what you know. One quest at a time.

[![Next.js](https://img.shields.io/badge/Next.js-16.4-000000?logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-7DFFB3)](./LICENSE)

**[Open the live lab →](https://bench-sepia.vercel.app)**

[Run it](#run-it) · [How it works](#how-it-works) · [Roadmap](#roadmap)

</div>

![Bench landing page](docs/landing.png)

## What is this?

Bench is a game, not a course catalog.

You arrive in a dark basement lab and find **Pip** — a small machine that has been waiting a long time. It can talk, but it can't tell when it's wrong. Over six ranks you teach it to verify, use tools, run flows, and eventually work without you.

It's built for people who don't write code: BBA, MBA, BCom, design, and anyone who wants to use AI well without a CS degree. The terminal is a guided command box, not a shell. The first command anyone types is `ai "..."` — never `ls`.

**The design rule:** every rank unlocks a new *verb*, not just more lessons.

## What's in v0.1

- **Landing page** with a living scene and a progress strip
- **The prologue** — four beats, first win in under a minute:
  1. Wake Pip up
  2. Run your first command (pre-written — just press Enter)
  3. Ask something real
  4. Catch Pip in a confident lie, and learn why verification is your job
- **Quest 01 · Hello, Operator** — ask the same question twice, add one constraint, pick the better answer
- **+10 XP**, a **Clarity Lens** notebook item, and `Operator · 1/5` rank progress
- **Real AI behind the `ai` command** — Agnes 3.0 Flash, streamed from a server route so the key never reaches the browser. Without a key it falls back to a deterministic mock
- Progress saved locally, no account required

| The prologue | Quest 01 |
| --- | --- |
| ![The prologue](docs/prologue.png) | ![Quest 01](docs/quest-1.png) |

## Run it

Requires Node.js 20.9 or newer.

```bash
npm install
cp .env.example .env.local   # add your Agnes AI key to AI_API_KEY
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The app runs without a key using a deterministic mock. To check the provider before opening the app:

```bash
npm run ai:check
```

```bash
npm run lint       # eslint
npm run typecheck  # tsc --noEmit
npm run build      # production build
```

### Deploy

Hosted on Vercel. Set `AI_API_KEY`, `AI_BASE_URL`, and `AI_MODEL` in the project environment, then:

```bash
vercel --prod
```

No database, auth provider, or other service to provision.

## How it works

**Real model, server-side.** The `ai` command posts to `/api/ai`, which calls Agnes AI's OpenAI-compatible endpoint and streams the answer back. The key lives in `.env.local` (or Vercel environment variables) and never reaches the browser. If the provider fails, the terminal falls back to a deterministic answer so the lesson still works.

**Scoped by design.** The prologue accepts any question. Quests declare a topic whitelist, so out-of-scope prompts are redirected without a model call. On top of that: a 220-token output cap, a 20-request hourly limit per IP, and a prompt cache for repeats.

**Progress is local.** XP and notebook items live in `localStorage`, read through `useSyncExternalStore` and updated by an append-style event (`bench:progress`). There is no auth or database yet.

**The seam is deliberate.** `Terminal` only renders lines; the phase machine owns state. A real model proxy and a sandboxed runtime can slot in behind the same interface without rewriting the content. That's the next build.

**Nothing can be broken.** Hints, retries, and reset are part of the design. The prologue has no wrong answer.

## Project structure

```text
src/
  app/
    page.tsx           landing page
    play/page.tsx      the prologue
    quest/1/page.tsx   quest 01
    api/ai/route.ts    model proxy: scope, cap, cache, stream
    globals.css        CRT, pixel panels, buttons
  components/
    Prologue.tsx       prologue state machine + copy
    QuestOne.tsx       quest 01
    Dialogue.tsx       typewriter + Pip's voice
    Terminal.tsx       line renderer + streaming
    PipSprite.tsx      the pixel robot
    ProgressStrip.tsx  local XP display
  lib/
    ai.ts              Agnes provider, system prompt, mock
    ai-client.ts       browser streaming client + command parser
    progress.ts        XP, notebook, storage events
    useProgress.ts     useSyncExternalStore hook
scripts/check-ai.mjs   provider smoke test
.env.example           environment template
docs/                  README screenshots
```

## Design rules

1. The first command is `ai "..."`, never `ls`.
2. Nothing can be broken. Nudges, never red X's.
3. The prologue is a chapter, not a gate.
4. Each rank unlocks a new verb, not just more lessons.

## Roadmap

| Rank | Zone | New verb | Promotion test |
| --- | --- | --- | --- |
| **Operator** | Library | `ai` | The Confident Liar |
| **Analyst** | Archive | `check` | The Vague Machine |
| **Tinkerer** | Workshop | `flow` | The Runaway |
| **Integrator** | Server Room | `tool` | The Overreach |
| **Engineer** | Observatory | `eval` | The Gauntlet |
| **Architect** | Rooftop | `deploy` | The Capstone |

Next up:

- Quests 02–05 and the Confident Liar boss
- A shared rate limiter (Upstash) once the beta goes public
- The rank/unlock engine as data, with ranks 3–6 visible as locked silhouettes
- Auth and synced progress once retention is proven

## Status

Early prototype, v0.1. Live at [bench-sepia.vercel.app](https://bench-sepia.vercel.app). The `ai` command runs through Agnes AI, with a deterministic mock as the fallback when no key is present. XP is local and there is no auth or database yet — the goal is to prove the loop before adding accounts.

Independent student project. Not affiliated with any company or institution.

## License

MIT — see [LICENSE](./LICENSE).
