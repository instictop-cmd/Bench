# Bench

A pixel lab where complete beginners learn to actually use AI — by waking up a
small machine in a basement and teaching it what they know.

**v0.1** ships the prologue and the first quest.

## What's here

- `/` — landing page
- `/play` — the prologue: four beats, first win in under a minute
- `/quest/1` — *Hello, Operator*: same question twice, learn to hear the difference

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## How it works

- **Scripted runtime, not a real shell.** A small command layer renders the
  terminal and validates outcomes. This keeps v0 free, safe, and instant.
- **Labs are data.** The prologue and quest 1 are phase machines over a small
  `TLine[]` stream. The same shape becomes the declarative `Lab` spec when the
  runtime grows up.
- **Progress is local.** XP and notebook items live in `localStorage`
  (`src/lib/progress.ts`). No auth, no database, no setup — yet.
- **The interface seam.** `Terminal` + the phase machine are deliberately dumb so
  a real model proxy or sandbox can slot in behind them without rewriting content.

## Design rules

1. The first command is `ai "..."`, never `ls`.
2. Nothing can be broken. Reset and hints, no red X.
3. The prologue is a chapter, not a gate.
4. Each rank unlocks a new verb, not just more lessons.

## Roadmap

| Rank | Zone | Verb |
|---|---|---|
| Operator | Library | `ai` |
| Analyst | Archive | `check` |
| Tinkerer | Workshop | `flow` |
| Integrator | Server Room | `tool` |
| Engineer | Observatory | `eval` |
| Architect | Rooftop | `deploy` |

Next up: quests 2–5, the Confident Liar boss, XP/rank state, and a real model
proxy behind the `ai` command.
