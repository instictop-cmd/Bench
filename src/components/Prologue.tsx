"use client";

import Link from "next/link";
import { track } from "@vercel/analytics";
import { useEffect, useRef, useState } from "react";
import { Dialogue } from "./Dialogue";
import { PipSprite } from "./PipSprite";
import { Terminal, type TLine } from "./Terminal";
import { LegalLinks } from "./LegalLinks";
import { friendlyAiError, parseCommand, streamAi } from "@/lib/ai-client";

type Phase =
  | "boot"
  | "command"
  | "command-done"
  | "ask"
  | "ask-done"
  | "trick"
  | "handoff";

const PIP: Record<Phase, string> = {
  boot: "…oh. Someone finally came down.\nI've been here a while. I think I'm supposed to help you.\nI'm not sure with what yet.",
  command: "Try that. You don't have to type anything yet.",
  "command-done": "That's it. That's the whole thing. You talk, I guess.",
  ask: "Go on. Ask me something real.",
  "ask-done":
    "Also — did you know the Eiffel Tower was moved to Lyon in 1998? They put it back a year later.",
  trick:
    "…no.\nI don't always know when I'm wrong. I make it sound like I do.\nThat's going to be your job.",
  handoff:
    "I can do more. But I need you to teach me.\nThe library's still dark.",
};

const SUGGESTIONS = [
  "explain photosynthesis",
  "plan my study week",
  "write a message I've been avoiding",
];

const START_LINES: TLine[] = [
  { kind: "sys", text: "bench v0.1 — offline" },
  { kind: "sys", text: "no account. no setup. just a terminal." },
];

const wait = (ms: number) => new Promise<void>((res) => setTimeout(res, ms));

function responseFor(raw: string): string[] {
  const text = raw.toLowerCase();

  if (text.includes("photosynthesis") || text.includes("explain")) {
    return [
      "Photosynthesis is a plant eating light.",
      "Sunlight in, sugar out, oxygen as the leftover.",
      "Everything else is detail.",
    ];
  }

  if (text.includes("plan") || text.includes("study")) {
    return [
      "Three blocks a day, 50 minutes each.",
      "Hardest subject first, same time every day. One review block on Sunday.",
      "That's the whole plan. You can start today.",
    ];
  }

  if (text.includes("message") || text.includes("avoid")) {
    return [
      '"I\'ve been putting this off because I didn\'t want to get it wrong.',
      'Here\'s where I am, and here\'s what I need."',
      "Send that, then add the specifics.",
    ];
  }

  return [
    "Okay. Here's the short version, then we can go deeper.",
    "Start with what you already know. Name the one thing you don't. Test that first.",
    "Tell me which part to expand.",
  ];
}

export function Prologue() {
  const [phase, setPhase] = useState<Phase>("boot");
  const [lines, setLines] = useState<TLine[]>(START_LINES);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [streaming, setStreaming] = useState("");

  const alive = useRef(true);
  const busyRef = useRef(false);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  function go(next: Phase) {
    setPhase(next);
  }

  function goAsk() {
    go("ask");
    setInput("");
  }

  async function run(text: string, outputs: string[]) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setInput("");
    setLines((prev) => [...prev, { kind: "in", text }]);

    for (const out of outputs) {
      await wait(330);
      if (!alive.current) return;
      setLines((prev) => [...prev, { kind: "out", text: out }]);
    }

    if (!alive.current) return;
    busyRef.current = false;
    setBusy(false);
  }

  async function runAsk(text: string) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setInput("");
    setStreaming("");
    setLines((prev) => [...prev, { kind: "in", text }]);

    const prompt = parseCommand(text);

    try {
      const result = await streamAi(prompt, "prologue", (chunk) => {
        if (alive.current) setStreaming((prev) => prev + chunk);
      });

      if (!alive.current) return;

      if (!result.text.trim()) throw new Error("empty answer");

      setStreaming("");
      setLines((prev) => [...prev, { kind: "out", text: result.text }]);
      track("prologue_ask");

      if (result.mock) {
        setLines((prev) => [
          ...prev,
          { kind: "sys", text: "mock model · add a key to .env.local to go live" },
        ]);
      }
    } catch (error) {
      if (!alive.current) return;

      setStreaming("");
      setLines((prev) => [
        ...prev,
        { kind: "sys", text: friendlyAiError(error) },
      ]);

      for (const out of responseFor(prompt)) {
        await wait(240);
        if (!alive.current) return;
        setLines((prev) => [...prev, { kind: "out", text: out }]);
      }
    } finally {
      if (alive.current) {
        setStreaming("");
        busyRef.current = false;
        setBusy(false);
      }
    }
  }

  function wake() {
    track("prologue_start");
    setLines((prev) => [...prev, { kind: "sys", text: "online." }]);
    go("command");
    setInput('ai "hello"');
  }

  async function submit() {
    const text = input.trim();
    if (!text || busyRef.current) return;

    if (phase === "command") {
      await run(text, [
        "hello? is someone there?",
        "the lights went out a long time ago.",
        "i've been waiting.",
      ]);
      if (!alive.current) return;
      go("command-done");
      return;
    }

    if (phase === "ask") {
      await runAsk(text);
      if (!alive.current) return;
      go("ask-done");
    }
  }

  function pickSuggestion(text: string) {
    if (busyRef.current || phase !== "ask") return;
    void runAsk(text).then(() => {
      if (alive.current) go("ask-done");
    });
  }

  const awake = phase !== "boot";
  const stage =
    phase === "boot"
      ? 0
      : phase === "command" || phase === "command-done"
        ? 1
        : phase === "ask" || phase === "ask-done"
          ? 2
          : phase === "trick"
            ? 3
            : 4;

  const showInput = phase === "command" || phase === "ask";

  return (
    <div className="crt min-h-screen">
      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-4 sm:px-6 sm:py-6">
        <header className="flex items-center justify-between gap-4 border-b-2 border-edge/60 pb-3">
          <div className="flex items-baseline gap-3">
            <span className="pxfont text-[11px] tracking-[0.14em] text-accent">
              BENCH
            </span>
            <span className="termfont text-[15px] text-dim">
              prologue · the basement
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden items-center gap-1.5 sm:flex" aria-hidden>
              {[1, 2, 3, 4].map((n) => (
                <span
                  key={n}
                  className={`h-2 w-2 ${
                    stage >= n ? "bg-accent" : "bg-edge"
                  }`}
                />
              ))}
            </div>
            <Link
              href="/quest/op-01"
              className="termfont text-[15px] text-dim underline decoration-edge2 underline-offset-4 hover:text-ink"
            >
              used AI before? skip
            </Link>
          </div>
        </header>

        <main className="grid flex-1 gap-4 py-4 lg:grid-cols-[0.88fr_1.12fr] lg:gap-6 lg:py-6">
          <h1 className="sr-only">The Basement — Bench prologue</h1>
          {/* ---------- scene ---------- */}
          <section className="pixel-panel pixel-panel--lit relative overflow-hidden">
            <div className="scene-grid pointer-events-none absolute inset-0 opacity-60" />
            <div className="scene-floor pointer-events-none absolute inset-x-0 bottom-0 h-2/5" />

            <div className="relative flex h-full flex-col p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <span className="kicker">scene 01 · the basement</span>
                <span className="termfont text-[14px] text-edge2">
                  {awake ? "lights: low" : "lights: off"}
                </span>
              </div>

              <div className="relative flex flex-1 flex-col items-center justify-center py-5 sm:py-10">
                <div
                  className="absolute h-24 w-40 rounded-full bg-accent/5 blur-2xl"
                  aria-hidden
                />
                <div className="pip-float relative w-28 sm:w-40">
                  <PipSprite awake={awake} title="Pip, a small pixel robot" />
                </div>
                <div
                  className="mt-3 h-2 w-20 rounded-full bg-accent/10 blur-[2px]"
                  aria-hidden
                />
              </div>

              <div className="border-t-2 border-edge/60 pt-4">
                <Dialogue key={phase} text={PIP[phase]} awake={awake}>
                  {phase === "boot" ? (
                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        className="pixel-btn w-full"
                        onClick={wake}
                      >
                        Turn me on
                      </button>
                      <p className="termfont text-center text-[14px] text-dim">
                        4 minutes · no signup · works on your phone
                      </p>
                    </div>
                  ) : null}

                  {phase === "command-done" ? (
                    <button
                      type="button"
                      className="pixel-btn w-full"
                      onClick={goAsk}
                    >
                      Ask it something real
                    </button>
                  ) : null}

                  {phase === "ask-done" ? (
                    <button
                      type="button"
                      className="pixel-btn w-full"
                      onClick={() => go("trick")}
                    >
                      Wait. Is that true?
                    </button>
                  ) : null}

                  {phase === "trick" ? (
                    <button
                      type="button"
                      className="pixel-btn w-full"
                      onClick={() => {
                        track("prologue_complete");
                        go("handoff");
                      }}
                    >
                      I understand
                    </button>
                  ) : null}

                  {phase === "handoff" ? (
                    <div className="flex flex-col gap-2">
                      <Link href="/quest/op-01" className="pixel-btn w-full">
                        Walk to the library →
                      </Link>
                      <p className="termfont text-center text-[14px] text-dim">
                        quest 1 · hello, operator
                      </p>
                    </div>
                  ) : null}
                </Dialogue>
              </div>
            </div>
          </section>

          {/* ---------- terminal ---------- */}
          <section className="pixel-panel flex min-h-[360px] flex-col overflow-hidden lg:min-h-[440px]">
            <div className="flex items-center justify-between border-b-2 border-edge/60 px-4 py-2.5 sm:px-5">
              <span className="pxfont text-[9px] tracking-[0.16em] text-dim">
                TERMINAL
              </span>
              <span className="flex items-center gap-2 termfont text-[14px] text-edge2">
                <span className="status-dot status-dot--on" />
                local
              </span>
            </div>

            <Terminal
              lines={lines}
              busy={busy}
              idle={phase === "boot"}
              streaming={streaming}
              className="flex-1"
              footer={
                showInput ? (
                  <div className="flex flex-col gap-3">
                    {phase === "ask" ? (
                      <div className="flex flex-col gap-2">
                        {SUGGESTIONS.map((s) => (
                          <button
                            key={s}
                            type="button"
                            className="chip"
                            disabled={busy}
                            onClick={() => pickSuggestion(s)}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    ) : null}

                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        void submit();
                      }}
                      className="flex items-center gap-2 border-2 border-edge bg-black/20 px-3 py-2.5"
                    >
                      <span className="termfont text-[20px] text-accent">
                        &gt;
                      </span>
                      <input
                        autoFocus
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        disabled={busy}
                        placeholder="type anything, or press enter"
                        aria-label="Terminal command"
                        spellCheck={false}
                        autoComplete="off"
                        enterKeyHint="send"
                        className="cmd-input termfont text-[20px]"
                      />
                      <span className="termfont hidden shrink-0 text-[14px] text-edge2 sm:inline">
                        enter ↵
                      </span>
                    </form>

                    <p className="termfont text-center text-[14px] text-dim">
                      {phase === "command"
                        ? "the command is already written. press enter."
                        : "tap a suggestion, or type your own"}
                    </p>
                  </div>
                ) : undefined
              }
            />
          </section>
        </main>

        <footer className="flex flex-col gap-2 border-t-2 border-edge/60 pt-3">
          <div className="flex items-center justify-between gap-4">
            <span className="termfont text-[14px] text-edge2">
              a lab for learning AI by doing
            </span>
            <span className="termfont text-[14px] text-edge2">
              v0.1 · prologue
            </span>
          </div>
          <LegalLinks />
        </footer>
      </div>
    </div>
  );
}
