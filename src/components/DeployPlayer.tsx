"use client";

import Link from "next/link";
import { track } from "@vercel/analytics";
import { useEffect, useRef, useState } from "react";
import { LegalLinks } from "./LegalLinks";
import { ShareButton } from "./ShareButton";
import { completeQuest } from "@/lib/progress";
import { useProgress } from "@/lib/useProgress";
import { deployRuntime, type DeployResult } from "@/lib/deploy-runtime";
import {
  DEPLOY_LESSONS,
  nextDeployLesson,
  type DeployLesson,
  type DeployVersionStatus,
} from "@/game/deploy";

const VERSION_TONE: Record<DeployVersionStatus, string> = {
  live: "text-accent",
  previous: "text-dim",
  failed: "text-red",
};

const LOG_TONE: Record<"info" | "warn" | "error", string> = {
  info: "text-dim",
  warn: "text-amber",
  error: "text-red",
};

const METRIC_TONE: Record<"good" | "warn" | "bad", string> = {
  good: "text-accent",
  warn: "text-amber",
  bad: "text-red",
};

export function DeployPlayer({ lesson }: { lesson: DeployLesson }) {
  const progress = useProgress();
  const [result, setResult] = useState<DeployResult | null>(null);
  const [choiceId, setChoiceId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [awarded, setAwarded] = useState(false);
  const doneRef = useRef(false);

  const next = nextDeployLesson(lesson.id);
  const alreadyDone = progress.completed.includes(lesson.id);
  const chosen = lesson.question?.options.find(
    (option) => option.id === choiceId,
  );
  const rooftopDone = DEPLOY_LESSONS.filter((item) =>
    progress.completed.includes(item.id),
  ).length;
  const logs = result ? result.logs : lesson.logs;

  useEffect(() => {
    track("deploy_start", { lesson: lesson.id });
  }, [lesson.id]);

  function finish(actionResult: DeployResult | null, optionId: string) {
    if (!actionResult?.ok || doneRef.current) return;

    if (lesson.question) {
      const option = lesson.question.options.find(
        (item) => item.id === optionId,
      );
      if (!option?.correct) return;
    }

    doneRef.current = true;
    const fresh = completeQuest(lesson.id, lesson.xp, lesson.artifact.id);
    setAwarded(fresh);
    setDone(true);
    track("deploy_complete", { lesson: lesson.id });
  }

  async function chooseAction(actionId: string) {
    if (busy || done) return;

    setBusy(true);
    setError("");

    try {
      const actionResult = await deployRuntime.run(lesson, actionId);
      setResult(actionResult);
      finish(actionResult, choiceId);
    } catch {
      setError("the deploy console is offline. try again.");
    } finally {
      setBusy(false);
    }
  }

  function chooseOption(optionId: string) {
    if (done || busy) return;
    setChoiceId(optionId);
    finish(result, optionId);
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
              rooftop · deploy
            </span>
          </div>
          <span className="termfont text-[15px] text-dim">{progress.xp} xp</span>
        </header>

        <main className="grid flex-1 gap-4 py-4 lg:grid-cols-[0.95fr_1.05fr] lg:gap-6 lg:py-6">
          <section className="pixel-panel pixel-panel--lit relative overflow-hidden">
            <div className="scene-grid pointer-events-none absolute inset-0 opacity-30" />
            <div className="relative flex h-full flex-col gap-4 p-4 sm:p-5">
              <div>
                <p className="kicker">
                  rooftop · deploy · lesson {String(lesson.order).padStart(2, "0")}
                </p>
                <h1 className="pxfont mt-3 text-[17px] leading-[1.6] text-ink sm:text-[19px]">
                  {lesson.title}
                </h1>
                <p className="termfont mt-3 text-[19px] leading-[1.35] text-dim">
                  {lesson.goal}
                </p>
                {alreadyDone && !done ? (
                  <p className="termfont mt-2 text-[15px] text-amber">
                    completed · replaying will not add xp
                  </p>
                ) : null}
              </div>

              <div className="hairline" />

              <div>
                <p className="pxfont text-[8px] tracking-[0.14em] text-dim">
                  VERSION TIMELINE
                </p>
                <ol className="mt-2 flex flex-col gap-2">
                  {lesson.versions.map((version) => (
                    <li
                      key={version.id}
                      className="border-2 border-edge bg-black/20 px-3 py-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="termfont text-[18px] text-ink">
                          {version.label}
                        </span>
                        <span
                          className={`termfont text-[13px] uppercase tracking-[0.1em] ${
                            VERSION_TONE[version.status]
                          }`}
                        >
                          {version.status}
                        </span>
                      </div>
                      <p className="termfont text-[15px] leading-snug text-dim">
                        {version.note}
                      </p>
                    </li>
                  ))}
                </ol>
              </div>

              <div>
                <p className="pxfont text-[8px] tracking-[0.14em] text-dim">
                  METRICS
                </p>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {lesson.metrics.map((metric) => (
                    <div
                      key={metric.label}
                      className="border-2 border-edge bg-black/20 px-2.5 py-2"
                    >
                      <p className="termfont text-[12px] uppercase tracking-[0.08em] text-dim">
                        {metric.label}
                      </p>
                      <p
                        className={`termfont mt-1 text-[19px] leading-none ${
                          METRIC_TONE[metric.tone]
                        }`}
                      >
                        {metric.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="hairline" />

              <div>
                <p className="pxfont text-[8px] tracking-[0.14em] text-dim">
                  CHOOSE A MOVE
                </p>
                <div className="mt-2 flex flex-col gap-2">
                  {lesson.actions.map((action) => (
                    <button
                      key={action.id}
                      type="button"
                      disabled={busy || done}
                      aria-pressed={result?.actionId === action.id}
                      className={`chip w-full ${
                        result?.actionId === action.id ? "chip--active" : ""
                      }`}
                      onClick={() => {
                        void chooseAction(action.id);
                      }}
                    >
                      <span className="block">{action.label}</span>
                      <span className="block text-[14px] text-edge2">
                        {action.hint}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {lesson.question ? (
                <div>
                  <p className="pxfont text-[8px] tracking-[0.14em] text-dim">
                    CHECK YOUR JUDGMENT
                  </p>
                  <p className="termfont mt-2 text-[18px] leading-snug text-ink">
                    {lesson.question.prompt}
                  </p>
                  <div className="mt-2 flex flex-col gap-2">
                    {lesson.question.options.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        disabled={busy || done}
                        aria-pressed={choiceId === option.id}
                        className={`chip ${
                          choiceId === option.id ? "chip--active" : ""
                        }`}
                        onClick={() => chooseOption(option.id)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                  {chosen ? (
                    <p
                      className={`termfont mt-2 text-[16px] leading-snug ${
                        chosen.correct ? "text-accent" : "text-amber"
                      }`}
                    >
                      {chosen.feedback}
                    </p>
                  ) : null}
                  {result?.ok && !chosen?.correct ? (
                    <p className="termfont mt-2 text-[15px] text-amber">
                      answer the question to complete the lesson.
                    </p>
                  ) : null}
                </div>
              ) : null}

              {error ? (
                <p className="termfont text-[16px] leading-snug text-amber">
                  {error}
                </p>
              ) : null}

              <div className="mt-auto flex flex-col gap-3">
                <div className="hairline" />
                <div className="flex items-center justify-between gap-3">
                  <span className="kicker">reward</span>
                  <span className="termfont text-[18px] text-amber">
                    +{lesson.xp} xp
                  </span>
                </div>
                <div className="border-2 border-edge bg-black/20 px-3 py-2.5">
                  <p className="termfont text-[13px] uppercase tracking-[0.12em] text-dim">
                    notebook item
                  </p>
                  <p className="termfont mt-1 text-[19px] text-ink">
                    {lesson.artifact.name}
                  </p>
                  <p className="termfont text-[15px] text-dim">
                    {lesson.artifact.note}
                  </p>
                </div>
                <div className="border-2 border-edge2 bg-accent/10 px-3 py-2">
                  <p className="pxfont text-[8px] tracking-[0.16em] text-accent">
                    ROOFTOP PROGRESS
                  </p>
                  <p className="termfont mt-1 text-[18px] text-ink">
                    {rooftopDone} / {DEPLOY_LESSONS.length}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="pixel-panel flex min-h-[440px] flex-col overflow-hidden lg:min-h-[560px]">
            <div className="flex items-center justify-between border-b-2 border-edge/60 px-4 py-2.5 sm:px-5">
              <span className="pxfont text-[9px] tracking-[0.16em] text-dim">
                DEPLOY CONSOLE
              </span>
              <span className="flex items-center gap-2 termfont text-[14px] text-edge2">
                <span
                  className={`status-dot ${
                    result && !result.state.healthy ? "" : "status-dot--on"
                  }`}
                />
                {busy
                  ? "running"
                  : result
                    ? result.state.healthy
                      ? "healthy"
                      : "degraded"
                    : "rooftop"}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-5">
              {result ? (
                <div
                  className={`mb-4 border-2 px-3 py-2.5 ${
                    result.ok
                      ? "border-accent bg-accent/10"
                      : "border-edge2 bg-black/20"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="pxfont text-[8px] tracking-[0.14em] text-dim">
                      STATE
                    </span>
                    <span
                      className={`termfont text-[16px] ${
                        result.state.healthy ? "text-accent" : "text-red"
                      }`}
                    >
                      current {result.state.current} ·{" "}
                      {result.state.healthy ? "healthy" : "degraded"}
                    </span>
                  </div>
                  <p className="termfont mt-2 text-[17px] leading-snug text-ink">
                    {result.message}
                  </p>
                </div>
              ) : (
                <p className="termfont mb-4 text-[17px] leading-snug text-dim">
                  Live logs from the rooftop. Read the first error before you
                  choose a move.
                </p>
              )}

              <ol className="flex flex-col gap-2">
                {logs.map((line) => (
                  <li key={line.id} className="flex items-start gap-2">
                    <span
                      className={`pxfont mt-1 shrink-0 text-[8px] tracking-[0.08em] ${
                        LOG_TONE[line.level]
                      }`}
                    >
                      {line.level.toUpperCase()}
                    </span>
                    <span
                      className={`termfont text-[16px] leading-snug ${
                        LOG_TONE[line.level]
                      }`}
                    >
                      {line.text}
                    </span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="border-t-2 border-edge/70 px-4 py-3 sm:px-5">
              {done ? (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between border-2 border-edge2 bg-accent/10 px-3 py-2.5">
                    <span className="termfont text-[16px] text-accent">
                      {awarded ? "deploy complete · new xp" : "already completed"}
                    </span>
                    <span className="pxfont text-[9px] text-ink">
                      +{lesson.xp} XP
                    </span>
                  </div>
                  <div className="border-2 border-edge bg-black/20 px-3 py-2.5">
                    <p className="termfont text-[13px] uppercase tracking-[0.12em] text-dim">
                      artifact
                    </p>
                    <p className="termfont mt-1 text-[19px] text-ink">
                      {lesson.artifact.name}
                    </p>
                    <p className="termfont text-[15px] text-dim">
                      {lesson.artifact.note}
                    </p>
                  </div>
                  {next ? (
                    <Link href={`/deploy/${next.id}`} className="pixel-btn w-full">
                      Next lesson · {next.title}
                    </Link>
                  ) : (
                    <Link href="/campus" className="pixel-btn w-full">
                      Back to campus
                    </Link>
                  )}
                  <ShareButton
                    text={`I shipped a deploy on Bench — ${lesson.title}.`}
                    label="Share the deploy"
                  />
                </div>
              ) : null}
            </div>
          </section>
        </main>

        <footer className="flex flex-col gap-2 border-t-2 border-edge/60 pt-3">
          <div className="flex items-center justify-between gap-4">
            <span className="termfont text-[14px] text-edge2">{lesson.win}</span>
            <span className="termfont text-[14px] text-edge2">
              lesson {String(lesson.order).padStart(2, "0")} /{" "}
              {String(DEPLOY_LESSONS.length).padStart(2, "0")}
            </span>
          </div>
          <LegalLinks />
        </footer>
      </div>
    </div>
  );
}
