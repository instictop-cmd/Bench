"use client";

import Link from "next/link";
import { track } from "@vercel/analytics";
import { useEffect, useRef, useState } from "react";
import { Terminal, type TLine } from "./Terminal";
import { LegalLinks } from "./LegalLinks";
import { completeQuest } from "@/lib/progress";
import { useProgress } from "@/lib/useProgress";
import {
  AiClientError,
  countWords,
  friendlyAiError,
  parseCommand,
  streamAi,
} from "@/lib/ai-client";
import { nextQuest, questsForRank } from "@/game/quests";
import { bossForRank } from "@/game/bosses";
import { RANKS, type Quest, type QuestChoice } from "@/game/types";

export function QuestPlayer({ quest }: { quest: Quest }) {
  const startLines = (): TLine[] => [
    { kind: "sys", text: "bench v0.1 — online" },
    { kind: "sys", text: `${quest.scene} terminal · ${quest.id}` },
  ];

  const [stepIndex, setStepIndex] = useState(0);
  const [lines, setLines] = useState<TLine[]>(startLines);
  const [input, setInput] = useState(quest.steps[0]?.command ?? "");
  const [answers, setAnswers] = useState<string[]>([]);
  const [previous, setPrevious] = useState("");
  const [feedback, setFeedback] = useState("");
  const [streaming, setStreaming] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [awarded, setAwarded] = useState(false);

  const alive = useRef(true);
  const busyRef = useRef(false);

  const progress = useProgress();
  const rank = RANKS.find((item) => item.id === quest.rank);
  const siblings = questsForRank(quest.rank);
  const rankDone = siblings.filter((item) =>
    progress.completed.includes(item.id),
  ).length;
  const next = quest.order < 5 ? nextQuest(quest.id) : undefined;
  const boss = quest.order === 5 ? bossForRank(quest.rank) : undefined;
  const step = quest.steps[stepIndex];
  const alreadyDone = progress.completed.includes(quest.id);

  useEffect(() => {
    alive.current = true;
    track("quest_start", { quest: quest.id });
    return () => {
      alive.current = false;
    };
  }, [quest.id]);

  async function submit() {
    const text = input.trim();
    if (!text || busyRef.current || !step?.command) return;

    const promptText = parseCommand(text);
    const lowered = promptText.toLowerCase();

    if (
      step.expectAll &&
      !step.expectAll.every((token) => lowered.includes(token.toLowerCase()))
    ) {
      setLines((prev) => [
        ...prev,
        { kind: "sys", text: `the card has the exact command. try: ${step.command}` },
      ]);
      return;
    }

    busyRef.current = true;
    setBusy(true);
    setStreaming("");
    setFeedback("");
    setLines((prev) => [...prev, { kind: "in", text }]);

    try {
      const result = await streamAi(
        promptText,
        quest.id,
        (chunk) => {
          if (alive.current) setStreaming((prev) => prev + chunk);
        },
        { context: step.usePrevious ? previous : undefined },
      );

      if (!alive.current) return;

      if (result.scopeBlocked || result.refused) {
        setStreaming("");
        setLines((prev) => [...prev, { kind: "sys", text: result.text }]);
        setInput(text);
        return;
      }

      const answer = result.text.trim();
      if (!answer) throw new Error("empty answer");

      setStreaming("");
      setLines((prev) => [...prev, { kind: "out", text: answer }]);
      setPrevious(answer);
      setAnswers((prev) => [...prev, answer]);
      track("quest_step", { quest: quest.id, step: step.id });
      advance(stepIndex + 1);
    } catch (error) {
      if (!alive.current) return;

      if (
        error instanceof AiClientError &&
        error.status === 502 &&
        error.body.trim()
      ) {
        const answer = error.body.trim();
        setStreaming("");
        setLines((prev) => [
          ...prev,
          { kind: "sys", text: "machine unavailable · reference answer" },
          { kind: "out", text: answer },
        ]);
        setPrevious(answer);
        setAnswers((prev) => [...prev, answer]);
        track("ai_error", { status: "fallback" });
        advance(stepIndex + 1);
        return;
      }

      track("ai_error", {
        status: error instanceof Error ? error.message : "unknown",
      });
      setStreaming("");
      setLines((prev) => [
        ...prev,
        { kind: "sys", text: friendlyAiError(error) },
      ]);
      setInput(text);
    } finally {
      if (alive.current) {
        setStreaming("");
        busyRef.current = false;
        setBusy(false);
      }
    }
  }

  function advance(nextIndex: number) {
    if (nextIndex >= quest.steps.length) {
      finish();
      return;
    }

    setStepIndex(nextIndex);
    setInput(quest.steps[nextIndex]?.command ?? "");
    setFeedback("");
  }

  function finish() {
    const fresh = completeQuest(quest.id, quest.xp, quest.artifact.id);
    setAwarded(fresh);
    setDone(true);
    setLines((prev) => [
      ...prev,
      { kind: "sys", text: `check ✓ ${quest.win}` },
      ...(fresh
        ? [
            { kind: "sys" as const, text: `reward · +${quest.xp} xp` },
            {
              kind: "sys" as const,
              text: `notebook · ${quest.artifact.name} added`,
            },
          ]
        : [{ kind: "sys" as const, text: "already completed · no new xp" }]),
    ]);
    track("quest_complete", { quest: quest.id });
  }

  function choose(choice: QuestChoice) {
    if (!choice.correct) {
      setFeedback(choice.feedback);
      setLines((prev) => [...prev, { kind: "sys", text: choice.feedback }]);
      return;
    }
    advance(stepIndex + 1);
  }

  function chooseCompare(side: "first" | "second") {
    const compare = step?.compare;
    if (!compare) return;
    if (compare.correct === side) {
      advance(stepIndex + 1);
      return;
    }
    const message = "not quite. read both again — which one follows the brief?";
    setFeedback(message);
    setLines((prev) => [...prev, { kind: "sys", text: message }]);
  }

  function reset() {
    setStepIndex(0);
    setAnswers([]);
    setPrevious("");
    setFeedback("");
    setStreaming("");
    setDone(false);
    setInput(quest.steps[0]?.command ?? "");
    setLines(startLines());
  }

  return (
    <div className="crt min-h-screen">
      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-4 sm:px-6 sm:py-6">
        <header className="flex items-center justify-between gap-4 border-b-2 border-edge/60 pb-3">
          <div className="flex items-baseline gap-3">
            <Link
              href="/campus"
              className="pxfont text-[11px] tracking-[0.14em] text-accent hover:text-ink"
            >
              BENCH
            </Link>
            <span className="termfont text-[15px] text-dim">
              {rank?.name.toLowerCase()} · {quest.scene}
            </span>
          </div>
          <span className="termfont text-[15px] text-dim">{progress.xp} xp</span>
        </header>

        <main className="grid flex-1 gap-4 py-4 lg:grid-cols-[0.9fr_1.1fr] lg:gap-6 lg:py-6">
          <section className="pixel-panel pixel-panel--lit relative overflow-hidden">
            <div className="scene-grid pointer-events-none absolute inset-0 opacity-35" />

            <div className="relative flex h-full flex-col gap-4 p-4 sm:p-5">
              <div>
                <p className="kicker">
                  quest {String(quest.order).padStart(2, "0")} ·{" "}
                  {rank?.zone.toLowerCase()}
                </p>
                <h1 className="pxfont mt-3 text-[17px] leading-[1.6] text-ink sm:text-[19px]">
                  {quest.title}
                </h1>
                <p className="termfont mt-3 text-[19px] leading-[1.35] text-dim">
                  {quest.goal}
                </p>
                {alreadyDone ? (
                  <p className="termfont mt-2 text-[15px] text-amber">
                    completed · replaying will not add xp
                  </p>
                ) : null}
              </div>

              {quest.card ? (
                <div className="border-2 border-edge2 bg-black/25 px-3 py-3">
                  <p className="pxfont text-[8px] tracking-[0.14em] text-accent">
                    {quest.card.title}
                  </p>
                  <p className="termfont mt-2 whitespace-pre-line text-[17px] leading-[1.35] text-ink/90">
                    {quest.card.body}
                  </p>
                </div>
              ) : null}

              <div className="hairline" />

              <div className="flex flex-1 flex-col justify-center">
                <ol className="flex flex-col gap-3">
                  {quest.steps.map((item, index) => {
                    const complete = done || index < stepIndex;
                    const current = !done && index === stepIndex;
                    return (
                      <li key={item.id} className="flex items-start gap-3">
                        <span
                          className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center border-2 pxfont text-[8px] ${
                            complete
                              ? "border-accent bg-accent text-[#04140d]"
                              : current
                                ? "border-amber text-amber"
                                : "border-edge text-edge2"
                          }`}
                        >
                          {complete ? "✓" : index + 1}
                        </span>
                        <span className="flex flex-col">
                          <span
                            className={`termfont text-[19px] leading-tight ${
                              complete || current ? "text-ink" : "text-dim"
                            }`}
                          >
                            {item.title}
                          </span>
                          <span className="termfont text-[15px] leading-snug text-dim">
                            {item.detail}
                          </span>
                        </span>
                      </li>
                    );
                  })}
                </ol>
              </div>

              <div className="flex flex-col gap-3">
                <div className="hairline" />
                <div className="flex items-center justify-between gap-3">
                  <span className="kicker">reward</span>
                  <span className="termfont text-[18px] text-amber">
                    +{quest.xp} xp
                  </span>
                </div>
                <div className="border-2 border-edge bg-black/20 px-3 py-2.5">
                  <p className="termfont text-[13px] uppercase tracking-[0.12em] text-dim">
                    notebook item
                  </p>
                  <p className="termfont mt-1 text-[19px] text-ink">
                    {quest.artifact.name}
                  </p>
                  <p className="termfont text-[15px] text-dim">
                    {quest.artifact.note}
                  </p>
                </div>
                <div className="border-2 border-edge2 bg-accent/10 px-3 py-2">
                  <p className="pxfont text-[8px] tracking-[0.16em] text-accent">
                    {rank?.name.toUpperCase()} PROGRESS
                  </p>
                  <p className="termfont mt-1 text-[18px] text-ink">
                    {rankDone} / {siblings.length}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="pixel-panel flex min-h-[420px] flex-col overflow-hidden lg:min-h-[520px]">
            <div className="flex items-center justify-between border-b-2 border-edge/60 px-4 py-2.5 sm:px-5">
              <span className="pxfont text-[9px] tracking-[0.16em] text-dim">
                TERMINAL
              </span>
              <span className="flex items-center gap-2 termfont text-[14px] text-edge2">
                <span className="status-dot status-dot--on" />
                {quest.scene}
              </span>
            </div>

            <Terminal
              lines={lines}
              busy={busy}
              streaming={streaming}
              className="flex-1"
              footer={
                <div className="flex flex-col gap-3">
                  {done ? (
                    <>
                      <div className="flex items-center justify-between border-2 border-edge2 bg-accent/10 px-3 py-2.5">
                        <span className="termfont text-[16px] text-accent">
                          {awarded ? "new xp awarded" : "already completed"}
                        </span>
                        <span className="pxfont text-[9px] text-ink">
                          +{quest.xp} XP
                        </span>
                      </div>
                      <Link href="/campus" className="pixel-btn w-full">
                        Back to campus
                      </Link>
                      {next ? (
                        <Link
                          href={`/quest/${next.id}`}
                          className="pixel-btn pixel-btn--ghost w-full"
                        >
                          Next quest · {next.title}
                        </Link>
                      ) : boss ? (
                        <Link
                          href={`/boss/${boss.id}`}
                          className="pixel-btn pixel-btn--ghost w-full"
                        >
                          Boss trial · {boss.title}
                        </Link>
                      ) : (
                        <Link
                          href="/campus"
                          className="pixel-btn pixel-btn--ghost w-full"
                        >
                          Finish the rank
                        </Link>
                      )}
                      <button
                        type="button"
                        onClick={reset}
                        className="termfont text-center text-[15px] text-dim underline decoration-edge2 underline-offset-4 hover:text-ink"
                      >
                        replay
                      </button>
                    </>
                  ) : null}

                  {!done && step?.command ? (
                    <>
                      <form
                        onSubmit={(event) => {
                          event.preventDefault();
                          void submit();
                        }}
                        className="flex items-center gap-2 border-2 border-edge bg-black/20 px-3 py-2.5"
                      >
                        <span className="termfont text-[20px] text-accent">
                          &gt;
                        </span>
                        <textarea
                          autoFocus
                          rows={2}
                          value={input}
                          onChange={(event) => setInput(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" && !event.shiftKey) {
                              event.preventDefault();
                              void submit();
                            }
                          }}
                          disabled={busy}
                          aria-label="Terminal command"
                          spellCheck={false}
                          autoComplete="off"
                          enterKeyHint="send"
                          className="cmd-input termfont resize-none text-[20px]"
                        />
                        <span className="termfont hidden shrink-0 text-[14px] text-edge2 sm:inline">
                          enter ↵
                        </span>
                      </form>
                      <p className="termfont text-center text-[14px] text-dim">
                        {step.detail}
                      </p>
                    </>
                  ) : null}

                  {!done && step?.choices ? (
                    <>
                      {feedback ? (
                        <p className="termfont text-center text-[15px] text-amber">
                          {feedback}
                        </p>
                      ) : null}
                      {step.choices.map((choice) => (
                        <button
                          key={choice.id}
                          type="button"
                          className="chip"
                          onClick={() => choose(choice)}
                        >
                          {choice.label}
                        </button>
                      ))}
                    </>
                  ) : null}

                  {!done && step?.compare ? (
                    <>
                      {feedback ? (
                        <p className="termfont text-center text-[15px] text-amber">
                          {feedback}
                        </p>
                      ) : null}
                      <p className="termfont text-center text-[15px] text-dim">
                        {step.compare.question}
                      </p>
                      <button
                        type="button"
                        className="chip"
                        onClick={() => chooseCompare("first")}
                      >
                        A · the first answer · {countWords(answers[0] ?? "")} words
                      </button>
                      <button
                        type="button"
                        className="chip"
                        onClick={() => chooseCompare("second")}
                      >
                        B · the second answer · {countWords(answers[1] ?? "")} words
                      </button>
                    </>
                  ) : null}
                </div>
              }
            />
          </section>
        </main>

        <footer className="flex flex-col gap-2 border-t-2 border-edge/60 pt-3">
          <div className="flex items-center justify-between gap-4">
            <span className="termfont text-[14px] text-edge2">{quest.win}</span>
            <span className="termfont text-[14px] text-edge2">
              quest {String(quest.order).padStart(2, "0")} /{" "}
              {siblings.length}
            </span>
          </div>
          <LegalLinks />
        </footer>
      </div>
    </div>
  );
}
