"use client";

import Link from "next/link";
import { track } from "@vercel/analytics";
import { useEffect, useRef, useState } from "react";
import { LegalLinks } from "./LegalLinks";
import { ShareButton } from "./ShareButton";
import { completeQuest } from "@/lib/progress";
import { useProgress } from "@/lib/useProgress";
import { evalRuntime } from "@/lib/eval-runtime";
import {
  EVAL_LESSONS,
  checkLabel,
  nextEvalLesson,
  type EvalLesson,
  type EvalReport,
} from "@/game/eval";

export function EvalPlayer({ lesson }: { lesson: EvalLesson }) {
  const progress = useProgress();
  const [candidateId, setCandidateId] = useState("");
  const [report, setReport] = useState<EvalReport | null>(null);
  const [answerId, setAnswerId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [awarded, setAwarded] = useState(false);
  const awardedRef = useRef(false);

  const selectedCandidate = lesson.candidates.find(
    (candidate) => candidate.id === candidateId,
  );
  const reportCandidate = report
    ? lesson.candidates.find((candidate) => candidate.id === report.candidateId)
    : undefined;
  const selectedChoice = lesson.question?.options.find(
    (option) => option.id === answerId,
  );
  const observatoryDone = EVAL_LESSONS.filter((item) =>
    progress.completed.includes(item.id),
  ).length;
  const next = nextEvalLesson(lesson.id);
  const alreadyDone = progress.completed.includes(lesson.id);
  const passRate = report?.total
    ? Math.round((report.passed / report.total) * 100)
    : 0;

  useEffect(() => {
    track("eval_start", { lesson: lesson.id });
  }, [lesson.id]);

  function tryComplete(result: EvalReport | null, choiceId: string) {
    if (awardedRef.current || !result) return;

    const clearsGate =
      result.candidateId === lesson.runCandidateId &&
      result.passed >= lesson.pass;
    const choice = lesson.question?.options.find(
      (option) => option.id === choiceId,
    );
    const answersRight = lesson.question ? Boolean(choice?.correct) : true;

    if (!clearsGate || !answersRight) return;

    awardedRef.current = true;
    const fresh = completeQuest(lesson.id, lesson.xp, lesson.artifact.id);
    setAwarded(fresh);
    setDone(true);
    track("eval_complete", { lesson: lesson.id });
  }

  async function runSuite() {
    if (busy || done || !selectedCandidate) return;

    setBusy(true);
    setError("");

    try {
      const result = await evalRuntime.run(lesson.cases, selectedCandidate);
      setReport(result);
      tryComplete(result, answerId);
    } catch {
      setError("the eval harness jammed. try again.");
    } finally {
      setBusy(false);
    }
  }

  function answer(choiceId: string) {
    if (done) return;
    setAnswerId(choiceId);
    tryComplete(report, choiceId);
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
              observatory · eval
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
                  observatory · eval · lesson{" "}
                  {String(lesson.order).padStart(2, "0")}
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
                  THE CASES
                </p>
                <div className="mt-2 flex flex-col gap-2">
                  {lesson.cases.map((test, index) => (
                    <div
                      key={test.id}
                      className="border-2 border-edge bg-black/15 px-3 py-2.5"
                    >
                      <div className="flex items-baseline gap-2">
                        <span className="pxfont text-[8px] text-accent">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <span className="termfont text-[17px] text-ink">
                          {test.label}
                        </span>
                      </div>
                      <p className="termfont mt-1.5 text-[14px] leading-snug text-edge2">
                        input · {test.input}
                      </p>
                      <p className="termfont mt-1 text-[13px] text-amber">
                        check · {checkLabel(test.check)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="pxfont text-[8px] tracking-[0.14em] text-dim">
                  RUN THIS CANDIDATE
                </p>
                <div className="mt-2 flex flex-col gap-2">
                  {lesson.candidates.map((candidate) => (
                    <button
                      key={candidate.id}
                      type="button"
                      disabled={done || busy}
                      aria-pressed={candidateId === candidate.id}
                      className={`chip ${
                        candidateId === candidate.id ? "chip--active" : ""
                      }`}
                      onClick={() => {
                        setCandidateId(candidate.id);
                        setError("");
                      }}
                    >
                      <span className="block">{candidate.name}</span>
                      <span className="block text-[14px] text-edge2">
                        {candidate.note}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {error ? (
                <p className="termfont text-[16px] leading-snug text-amber">
                  {error}
                </p>
              ) : null}

              <button
                type="button"
                className="pixel-btn w-full"
                onClick={runSuite}
                disabled={busy || done || !candidateId}
              >
                {busy ? "running…" : "Run suite"}
              </button>

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
                    OBSERVATORY PROGRESS
                  </p>
                  <p className="termfont mt-1 text-[18px] text-ink">
                    {observatoryDone} / {EVAL_LESSONS.length}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="pixel-panel flex min-h-[440px] flex-col overflow-hidden lg:min-h-[560px]">
            <div className="flex items-center justify-between border-b-2 border-edge/60 px-4 py-2.5 sm:px-5">
              <span className="pxfont text-[9px] tracking-[0.16em] text-dim">
                EVAL LOG
              </span>
              <span className="flex items-center gap-2 termfont text-[14px] text-edge2">
                <span className="status-dot status-dot--on" />
                observatory
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-5">
              {!report ? (
                <div className="flex h-full flex-col justify-center gap-3">
                  <p className="termfont text-[19px] leading-[1.35] text-dim">
                    Pick a candidate, then run the suite. Every case will report
                    its output, pass or fail, and the reason.
                  </p>
                  <p className="termfont text-[16px] text-edge2">
                    Gate · pass {lesson.pass} of {lesson.cases.length}. The
                    mark is set before the run, not after.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="border-2 border-edge2 bg-accent/10 px-3 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="termfont text-[15px] text-ink">
                        {reportCandidate?.name ?? report.candidateId}
                      </span>
                      <span className="pxfont text-[10px] text-accent">
                        {report.passed} / {report.total}
                      </span>
                    </div>
                    <p className="termfont mt-1 text-[24px] leading-none text-ink">
                      {report.passed} / {report.total} passed
                    </p>
                    <p className="termfont mt-1 text-[14px] text-dim">
                      {passRate}% pass rate · gate {lesson.pass} /{" "}
                      {lesson.cases.length}
                    </p>
                  </div>

                  {lesson.cases.map((test) => {
                    const result = report.results.find(
                      (item) => item.caseId === test.id,
                    );
                    const passed = result?.pass ?? false;

                    return (
                      <div
                        key={test.id}
                        className="border-2 border-edge bg-black/15 px-3 py-2.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`pxfont text-[8px] tracking-[0.16em] ${
                              passed ? "text-accent" : "text-red"
                            }`}
                          >
                            {passed ? "PASS" : "FAIL"}
                          </span>
                          <span className="termfont text-[14px] text-dim">
                            {test.label}
                          </span>
                        </div>
                        <p className="termfont mt-2 text-[14px] leading-snug text-edge2">
                          input · {test.input}
                        </p>
                        <p className="termfont text-[13px] text-dim">
                          check · {checkLabel(test.check)}
                        </p>
                        <p className="termfont mt-2 whitespace-pre-line text-[17px] leading-[1.3] text-ink">
                          {result?.output || "(no output)"}
                        </p>
                        <p
                          className={`termfont mt-1 text-[13px] ${
                            passed ? "text-accent" : "text-amber"
                          }`}
                        >
                          reason · {result?.reason ?? "no result recorded"}
                        </p>
                      </div>
                    );
                  })}

                  {lesson.question ? (
                    <>
                      <div className="hairline" />
                      <div>
                        <p className="pxfont text-[8px] tracking-[0.14em] text-dim">
                          READ THE RESULT
                        </p>
                        <p className="termfont mt-2 text-[18px] leading-[1.35] text-ink">
                          {lesson.question.prompt}
                        </p>
                        <div className="mt-2 flex flex-col gap-2">
                          {lesson.question.options.map((option) => (
                            <button
                              key={option.id}
                              type="button"
                              disabled={done}
                              aria-pressed={answerId === option.id}
                              className={`chip ${
                                answerId === option.id ? "chip--active" : ""
                              }`}
                              onClick={() => answer(option.id)}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                        {selectedChoice ? (
                          <p
                            className={`termfont mt-2 border-2 border-edge bg-black/20 px-3 py-2 text-[15px] leading-snug ${
                              selectedChoice.correct
                                ? "text-accent"
                                : "text-amber"
                            }`}
                          >
                            {selectedChoice.correct ? "correct · " : "not yet · "}
                            {selectedChoice.feedback}
                          </p>
                        ) : null}
                        {selectedChoice?.correct && report && !done ? (
                          <p className="termfont mt-2 text-[14px] text-dim">
                            Correct read. The lesson still needs a report that
                            clears the gate. Run another candidate.
                          </p>
                        ) : null}
                      </div>
                    </>
                  ) : null}
                </div>
              )}
            </div>

            <div className="border-t-2 border-edge/70 px-4 py-3 sm:px-5">
              {done ? (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between border-2 border-edge2 bg-accent/10 px-3 py-2.5">
                    <span className="termfont text-[16px] text-accent">
                      {awarded ? "eval complete · new xp" : "already completed"}
                    </span>
                    <span className="pxfont text-[9px] text-ink">
                      +{lesson.xp} XP
                    </span>
                  </div>
                  <div className="border-2 border-edge bg-black/20 px-3 py-2">
                    <p className="termfont text-[13px] uppercase tracking-[0.12em] text-dim">
                      artifact
                    </p>
                    <p className="termfont mt-1 text-[18px] text-ink">
                      {lesson.artifact.name}
                    </p>
                    <p className="termfont text-[14px] text-dim">
                      {lesson.artifact.note}
                    </p>
                  </div>
                  {next ? (
                    <Link href={`/eval/${next.id}`} className="pixel-btn w-full">
                      Next lesson · {next.title}
                    </Link>
                  ) : (
                    <Link href="/campus" className="pixel-btn w-full">
                      Back to campus
                    </Link>
                  )}
                  <ShareButton
                    text={`I ran an eval suite on Bench — ${lesson.title}.`}
                    label="Share the eval"
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
              {String(EVAL_LESSONS.length).padStart(2, "0")}
            </span>
          </div>
          <LegalLinks />
        </footer>
      </div>
    </div>
  );
}
