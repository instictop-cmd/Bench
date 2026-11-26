"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Terminal, type TLine } from "./Terminal";
import { PipSprite } from "./PipSprite";
import { awardOnce } from "@/lib/progress";
import { useXp } from "@/lib/useProgress";
import { countWords, parseCommand, streamAi } from "@/lib/ai-client";

type Phase = "first" | "second" | "choose" | "passed";

const FIRST_CMD = 'ai "explain photosynthesis"';
const SECOND_CMD =
  'ai "explain photosynthesis to a 12-year-old in one sentence"';

const START_LINES: TLine[] = [
  { kind: "sys", text: "bench v0.1 — online" },
  { kind: "sys", text: "library terminal · quest 01" },
];

const ANSWER_A =
  "Photosynthesis is the biochemical process by which photoautotrophic organisms convert light energy into chemical energy, producing glucose and releasing oxygen as a byproduct.";

const ANSWER_B =
  "Plants eat sunlight: light goes in, sugar comes out, and oxygen is the leftover.";

export function QuestOne() {
  const [phase, setPhase] = useState<Phase>("first");
  const [lines, setLines] = useState<TLine[]>(START_LINES);
  const [input, setInput] = useState(FIRST_CMD);
  const [busy, setBusy] = useState(false);
  const [streaming, setStreaming] = useState("");
  const [answerA, setAnswerA] = useState(ANSWER_A);
  const [answerB, setAnswerB] = useState(ANSWER_B);
  const xp = useXp();
  const [earned, setEarned] = useState(false);

  const alive = useRef(true);
  const busyRef = useRef(false);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  async function ask(text: string, fallback: string): Promise<string | null> {
    if (busyRef.current) return null;

    busyRef.current = true;
    setBusy(true);
    setInput("");
    setStreaming("");
    setLines((prev) => [...prev, { kind: "in", text }]);

    const prompt = parseCommand(text);

    try {
      const result = await streamAi(prompt, "quest-1", (chunk) => {
        if (alive.current) setStreaming((prev) => prev + chunk);
      });

      if (!alive.current) return null;

      if (result.scopeBlocked) {
        setStreaming("");
        setLines((prev) => [...prev, { kind: "sys", text: result.text }]);
        setInput(text);
        return null;
      }

      const answer = result.text.trim() ? result.text : fallback;
      setStreaming("");
      setLines((prev) => [...prev, { kind: "out", text: answer }]);
      return answer;
    } catch {
      if (!alive.current) return fallback;

      setStreaming("");
      setLines((prev) => [
        ...prev,
        { kind: "sys", text: "machine busy · cached answer" },
        { kind: "out", text: fallback },
      ]);
      return fallback;
    } finally {
      if (alive.current) {
        setStreaming("");
        busyRef.current = false;
        setBusy(false);
      }
    }
  }

  async function submit() {
    const text = input.trim();
    if (!text || busyRef.current) return;

    if (phase === "first") {
      const answer = await ask(text, ANSWER_A);
      if (!alive.current || !answer) return;
      setAnswerA(answer);
      setPhase("second");
      setInput(SECOND_CMD);
      return;
    }

    if (phase === "second") {
      const answer = await ask(text, ANSWER_B);
      if (!alive.current || !answer) return;
      setAnswerB(answer);

      if (countWords(answer) > 35) {
        setLines((prev) => [
          ...prev,
          {
            kind: "sys",
            text: "it ignored the length constraint. that's the lesson: check the output.",
          },
        ]);
      }

      setPhase("choose");
    }
  }

  function chooseA() {
    setLines((prev) => [
      ...prev,
      { kind: "err", text: "not quite. which one would a 12-year-old actually get?" },
    ]);
  }

  function chooseB() {
    if (phase !== "choose") return;
    const fresh = awardOnce({
      xp: 10,
      key: "bench.quest.1.done",
      item: "clarity-lens",
    });
    setEarned(fresh);
    setLines((prev) => [
      ...prev,
      { kind: "sys", text: "check ✓ audience constraint applied" },
      { kind: "sys", text: "reward · +10 xp" },
      { kind: "sys", text: "notebook · clarity lens added" },
    ]);
    setPhase("passed");
  }

  const stepDone =
    phase === "second" || phase === "choose" || phase === "passed";
  const secondDone = phase === "choose" || phase === "passed";
  const showInput = phase === "first" || phase === "second";

  return (
    <div className="crt min-h-screen">
      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-4 sm:px-6 sm:py-6">
        <header className="flex items-center justify-between gap-4 border-b-2 border-edge/60 pb-3">
          <div className="flex items-baseline gap-3">
            <Link
              href="/"
              className="pxfont text-[11px] tracking-[0.14em] text-accent hover:text-ink"
            >
              BENCH
            </Link>
            <span className="termfont text-[15px] text-dim">
              the library · quest 01
            </span>
          </div>
          <span className="termfont text-[15px] text-dim">{xp} xp</span>
        </header>

        <main className="grid flex-1 gap-4 py-4 lg:grid-cols-[0.88fr_1.12fr] lg:gap-6 lg:py-6">
          {/* ---------- quest card ---------- */}
          <section className="pixel-panel pixel-panel--lit relative overflow-hidden">
            <div className="scene-grid pointer-events-none absolute inset-0 opacity-40" />

            <div className="relative flex h-full flex-col gap-5 p-4 sm:p-5">
              <div>
                <p className="kicker">quest 01 · the library</p>
                <h1 className="pxfont mt-3 text-[17px] leading-[1.6] text-ink sm:text-[19px]">
                  Hello, Operator
                </h1>
                <p className="termfont mt-3 text-[19px] leading-[1.35] text-dim">
                  Ask the same question twice. Learn to hear the difference.
                </p>
              </div>

              <div className="hairline" />

              <div className="flex flex-1 flex-col justify-center gap-5">
                <ol className="flex flex-col gap-3">
                  <Step
                    n={1}
                    done={stepDone}
                    title="Ask it plainly"
                    body={`run ${FIRST_CMD}`}
                  />
                  <Step
                    n={2}
                    done={secondDone}
                    title="Add one constraint"
                    body="ask for one sentence, for a 12-year-old"
                  />
                  <Step
                    n={3}
                    done={phase === "passed"}
                    title="Pick the better answer"
                    body="choose the one you would actually use"
                  />
                </ol>

                <div className="flex items-center gap-3 border-2 border-edge/70 bg-black/20 p-3">
                  <div className="w-9 shrink-0">
                    <PipSprite awake />
                  </div>
                  <p className="termfont text-[16px] leading-snug text-dim">
                    &ldquo;I&apos;ll answer whatever you ask. I won&apos;t know
                    if it&apos;s any good. That part&apos;s yours.&rdquo;
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <div className="hairline" />

                <div className="flex items-center justify-between gap-3">
                  <span className="kicker">reward</span>
                  <span className="termfont text-[18px] text-amber">
                    +10 xp
                  </span>
                </div>

                <div className="border-2 border-edge bg-black/20 px-3 py-2.5">
                  <p className="termfont text-[13px] uppercase tracking-[0.12em] text-dim">
                    notebook item
                  </p>
                  <p className="termfont mt-1 text-[19px] text-ink">
                    Clarity Lens
                  </p>
                  <p className="termfont text-[15px] text-dim">
                    add an audience and a limit to any prompt
                  </p>
                </div>

                {phase === "passed" ? (
                  <div className="border-2 border-edge2 bg-accent/10 px-3 py-3">
                    <p className="pxfont text-[8px] tracking-[0.16em] text-accent">
                      RANK PROGRESS
                    </p>
                    <p className="termfont mt-2 text-[20px] text-ink">
                      Operator · 1 / 5
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          </section>

          {/* ---------- terminal ---------- */}
          <section className="pixel-panel flex min-h-[380px] flex-col overflow-hidden lg:min-h-[460px]">
            <div className="flex items-center justify-between border-b-2 border-edge/60 px-4 py-2.5 sm:px-5">
              <span className="pxfont text-[9px] tracking-[0.16em] text-dim">
                TERMINAL
              </span>
              <span className="flex items-center gap-2 termfont text-[14px] text-edge2">
                <span className="status-dot status-dot--on" />
                library
              </span>
            </div>

            <Terminal
              lines={lines}
              busy={busy}
              streaming={streaming}
              className="flex-1"
              footer={
                <div className="flex flex-col gap-3">
                  {showInput ? (
                    <>
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
                        {phase === "first"
                          ? "press enter. the command is already written."
                          : "press enter. same question, one constraint added."}
                      </p>
                    </>
                  ) : null}

                  {phase === "choose" ? (
                    <>
                      <p className="termfont text-center text-[15px] text-dim">
                        which one would you actually use?
                      </p>
                      <button
                        type="button"
                        className="chip"
                        onClick={chooseA}
                      >
                        A · the first answer · {countWords(answerA)} words
                      </button>
                      <button
                        type="button"
                        className="chip"
                        onClick={chooseB}
                      >
                        B · the second answer · {countWords(answerB)} words
                      </button>
                    </>
                  ) : null}

                  {phase === "passed" ? (
                    <>
                      <div className="flex items-center justify-between border-2 border-edge2 bg-accent/10 px-3 py-2.5">
                        <span className="termfont text-[16px] text-accent">
                          {earned ? "new xp awarded" : "already completed"}
                        </span>
                        <span className="pxfont text-[9px] text-ink">
                          +10 XP
                        </span>
                      </div>
                      <Link href="/" className="pixel-btn w-full">
                        Back to campus
                      </Link>
                      <button
                        type="button"
                        disabled
                        className="pixel-btn pixel-btn--ghost w-full"
                      >
                        Next quest · locked
                      </button>
                    </>
                  ) : null}
                </div>
              }
            />
          </section>
        </main>

        <footer className="flex items-center justify-between gap-4 border-t-2 border-edge/60 pt-3">
          <span className="termfont text-[14px] text-edge2">
            one constraint changes everything
          </span>
          <span className="termfont text-[14px] text-edge2">
            quest 01 / 05
          </span>
        </footer>
      </div>
    </div>
  );
}

function Step({
  n,
  done,
  title,
  body,
}: {
  n: number;
  done: boolean;
  title: string;
  body: string;
}) {
  return (
    <li className="flex items-start gap-3">
      <span
        className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center border-2 pxfont text-[8px] ${
          done
            ? "border-accent bg-accent text-[#04140d]"
            : "border-edge text-edge2"
        }`}
      >
        {done ? "✓" : n}
      </span>
      <span className="flex flex-col">
        <span
          className={`termfont text-[19px] leading-tight ${
            done ? "text-ink" : "text-dim"
          }`}
        >
          {title}
        </span>
        <span className="termfont text-[15px] leading-snug text-dim">
          {body}
        </span>
      </span>
    </li>
  );
}
