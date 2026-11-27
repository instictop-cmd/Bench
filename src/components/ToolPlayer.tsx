"use client";

import Link from "next/link";
import { track } from "@vercel/analytics";
import { useEffect, useState } from "react";
import { LegalLinks } from "./LegalLinks";
import { ShareButton } from "./ShareButton";
import { completeQuest } from "@/lib/progress";
import { useProgress } from "@/lib/useProgress";
import { toolRuntime, type ToolResult } from "@/lib/tool-runtime";
import {
  TOOL_LESSONS,
  TOOL_SCOPES,
  TOOL_SPECS,
  nextToolLesson,
  sameArgs,
  type ScopeId,
  type ToolId,
  type ToolLesson,
} from "@/game/tool";

export function ToolPlayer({ lesson }: { lesson: ToolLesson }) {
  const progress = useProgress();
  const [tool, setTool] = useState<ToolId | null>(null);
  const [args, setArgs] = useState<Record<string, string>>(
    lesson.defaultArgs ?? {},
  );
  const [scope, setScope] = useState<ScopeId | "">("");
  const [result, setResult] = useState<ToolResult | null>(null);
  const [questionId, setQuestionId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [hint, setHint] = useState("");
  const [done, setDone] = useState(false);
  const [awarded, setAwarded] = useState(false);

  const spec = tool ? TOOL_SPECS[tool] : undefined;
  const doneCount = TOOL_LESSONS.filter((item) =>
    progress.completed.includes(item.id),
  ).length;
  const next = nextToolLesson(lesson.id);
  const alreadyDone = progress.completed.includes(lesson.id);

  const selectedOption = lesson.question?.options.find(
    (option) => option.id === questionId,
  );
  const questionCorrect = selectedOption?.correct ?? false;

  useEffect(() => {
    track("tool_start", { lesson: lesson.id });
  }, [lesson.id]);

  function matches(
    nextTool: ToolId,
    nextArgs: Record<string, string>,
    nextScope: ScopeId | "",
  ) {
    return (
      nextTool === lesson.expectedTool &&
      nextScope === lesson.expectedScope &&
      sameArgs(nextArgs, lesson.expectedArgs)
    );
  }

  function finish() {
    const fresh = completeQuest(lesson.id, lesson.xp, lesson.artifact.id);
    setAwarded(fresh);
    setDone(true);
    track("tool_complete", { lesson: lesson.id });
  }

  function pickTool(nextTool: ToolId) {
    if (done || busy) return;
    setTool(nextTool);
    setArgs(lesson.defaultArgs ?? {});
    setResult(null);
    setError("");
    setHint("");
  }

  async function call() {
    if (busy || done) return;

    if (!tool) {
      setError("pick a tool first.");
      return;
    }
    if (!scope) {
      setError("grant a scope before the call.");
      return;
    }

    setBusy(true);
    setError("");
    setHint("");
    setResult(null);

    try {
      const output = await toolRuntime.call(tool, args, scope);
      setResult(output);

      if (!output.ok) {
        setError(output.error ?? "the call failed.");
        return;
      }

      if (!matches(tool, args, scope)) {
        if (tool !== lesson.expectedTool) {
          setHint("the call worked, but this is not the tool the task needs.");
        } else if (scope !== lesson.expectedScope) {
          setHint(
            "the call worked, but the scope is not the smallest one that finishes the task.",
          );
        } else {
          setHint(
            "the call worked, but the arguments do not match the task. check every field.",
          );
        }
        return;
      }

      if (!lesson.question) {
        finish();
        return;
      }

      if (questionCorrect) {
        finish();
      } else {
        setHint("the call is right. answer the question to log it.");
      }
    } catch {
      setError("the server room is busy. try the call again.");
    } finally {
      setBusy(false);
    }
  }

  function answer(id: string) {
    if (done || busy) return;
    setQuestionId(id);
    const option = lesson.question?.options.find((item) => item.id === id);
    if (!option) return;

    if (!option.correct) {
      setHint(option.feedback);
      return;
    }

    if (result?.ok && matches(tool ?? lesson.expectedTool, args, scope)) {
      finish();
    } else {
      setHint("correct reasoning. now make the call that finishes the task.");
    }
  }

  function reset() {
    setTool(null);
    setArgs(lesson.defaultArgs ?? {});
    setScope("");
    setResult(null);
    setQuestionId("");
    setError("");
    setHint("");
    setDone(false);
    setAwarded(false);
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
              server room · tool
            </span>
          </div>
          <span className="termfont text-[15px] text-dim">
            {progress.xp} xp
          </span>
        </header>

        <main className="grid flex-1 gap-4 py-4 lg:grid-cols-[1.05fr_0.95fr] lg:gap-6 lg:py-6">
          <section className="pixel-panel pixel-panel--lit relative overflow-hidden">
            <div className="scene-grid pointer-events-none absolute inset-0 opacity-30" />
            <div className="relative flex h-full flex-col gap-4 p-4 sm:p-5">
              <div>
                <p className="kicker">
                  server room · tool · lesson{" "}
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

              <div className="border-2 border-edge2 bg-black/25 px-3 py-2.5">
                <p className="pxfont text-[8px] tracking-[0.14em] text-accent">
                  THE TASK
                </p>
                <p className="termfont mt-1 text-[18px] leading-[1.35] text-ink">
                  {lesson.task}
                </p>
              </div>

              {lesson.proposal ? (
                <div className="border-2 border-amber/60 bg-amber/5 px-3 py-2.5">
                  <p className="pxfont text-[8px] tracking-[0.14em] text-amber">
                    MODEL PROPOSAL · INSPECT IT
                  </p>
                  <p className="termfont mt-1 whitespace-pre-wrap text-[16px] leading-[1.4] text-ink">
                    {lesson.proposal}
                  </p>
                </div>
              ) : null}

              <div className="hairline" />

              <div>
                <p className="pxfont text-[8px] tracking-[0.14em] text-dim">
                  PICK A TOOL
                </p>
                <div className="mt-2 flex flex-col gap-2">
                  {lesson.tools.map((id) => {
                    const item = TOOL_SPECS[id];
                    return (
                      <button
                        key={id}
                        type="button"
                        disabled={done || busy}
                        aria-pressed={tool === id}
                        className={`chip ${tool === id ? "chip--active" : ""}`}
                        onClick={() => pickTool(id)}
                      >
                        <span className="block">{item.name}</span>
                        <span className="block text-[14px] text-edge2">
                          {item.hint} · returns {item.returns}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {spec ? (
                <div>
                  <p className="pxfont text-[8px] tracking-[0.14em] text-dim">
                    FILL THE SCHEMA
                  </p>
                  <div className="mt-2 flex flex-col gap-2">
                    {spec.fields.map((field) => (
                      <div key={field.key} className="flex flex-col gap-1">
                        <label
                          htmlFor={`tool-${field.key}`}
                          className="termfont text-[14px] text-dim"
                        >
                          {field.label.toLowerCase()}
                          {field.required ? " *" : " (optional)"}
                          {field.hint ? (
                            <span className="text-edge2"> · {field.hint}</span>
                          ) : null}
                        </label>
                        <input
                          id={`tool-${field.key}`}
                          type={field.type === "number" ? "text" : field.type}
                          inputMode={
                            field.type === "number" ? "numeric" : undefined
                          }
                          value={args[field.key] ?? ""}
                          disabled={done || busy}
                          onChange={(event) =>
                            setArgs((prev) => ({
                              ...prev,
                              [field.key]: event.target.value,
                            }))
                          }
                          placeholder={field.placeholder}
                          className="termfont border-2 border-edge bg-black/20 px-3 py-2 text-[18px] text-ink outline-none focus-visible:border-accent"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div>
                <p className="pxfont text-[8px] tracking-[0.14em] text-dim">
                  GRANT A SCOPE
                </p>
                <div className="mt-2 flex flex-col gap-2">
                  {lesson.scopes.map((id) => {
                    const item = TOOL_SCOPES[id];
                    return (
                      <button
                        key={id}
                        type="button"
                        disabled={done || busy}
                        aria-pressed={scope === id}
                        className={`chip ${scope === id ? "chip--active" : ""}`}
                        onClick={() => {
                          setScope(id);
                          setError("");
                        }}
                      >
                        <span className="block">{item.label}</span>
                        <span className="block text-[14px] text-edge2">
                          {item.hint}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {error ? (
                <p className="termfont text-[16px] leading-snug text-red">
                  {error}
                </p>
              ) : null}
              {hint ? (
                <p className="termfont text-[16px] leading-snug text-amber">
                  {hint}
                </p>
              ) : null}

              <button
                type="button"
                className="pixel-btn w-full"
                onClick={call}
                disabled={busy || done || !tool}
              >
                {busy ? "calling…" : "Call tool"}
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
                    SERVER ROOM PROGRESS
                  </p>
                  <p className="termfont mt-1 text-[18px] text-ink">
                    {doneCount} / {TOOL_LESSONS.length}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="pixel-panel flex min-h-[440px] flex-col overflow-hidden lg:min-h-[560px]">
            <div className="flex items-center justify-between border-b-2 border-edge/60 px-4 py-2.5 sm:px-5">
              <span className="pxfont text-[9px] tracking-[0.16em] text-dim">
                CALL LOG
              </span>
              <span className="flex items-center gap-2 termfont text-[14px] text-edge2">
                <span className="status-dot status-dot--on" />
                server room
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-5">
              {!result ? (
                <div className="flex h-full flex-col justify-center gap-3">
                  <p className="termfont text-[19px] leading-[1.35] text-dim">
                    Pick a tool, fill its schema, grant a scope, then call it.
                    The request and the result will appear here.
                  </p>
                  <p className="termfont text-[16px] text-edge2">
                    A schema is a promise. A scope is a limit.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="border-2 border-edge bg-black/15 px-3 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="pxfont text-[8px] text-accent">
                        REQUEST
                      </span>
                      <span className="termfont text-[14px] text-edge2">
                        {result.ms}ms
                      </span>
                    </div>
                    <p className="termfont mt-2 text-[17px] text-ink">
                      {result.tool}(
                      {Object.entries(args)
                        .filter(([, value]) => value.trim())
                        .map(([key, value]) => `${key}: "${value}"`)
                        .join(", ")}
                      )
                    </p>
                    <p className="termfont mt-1 text-[14px] text-edge2">
                      scope · {result.scope}
                    </p>
                  </div>

                  <div
                    className={`border-2 px-3 py-2.5 ${
                      result.ok
                        ? "border-edge2 bg-accent/5"
                        : "border-red/60 bg-red/5"
                    }`}
                  >
                    <p
                      className={`pxfont text-[8px] ${
                        result.ok ? "text-accent" : "text-red"
                      }`}
                    >
                      {result.ok ? "RESULT" : "ERROR"}
                    </p>
                    <p className="termfont mt-2 whitespace-pre-line text-[18px] leading-[1.35] text-ink">
                      {result.ok ? result.output : result.error}
                    </p>
                  </div>

                  {lesson.question && result.ok && matches(tool ?? lesson.expectedTool, args, scope) ? (
                    <div className="border-2 border-edge2 bg-black/25 px-3 py-3">
                      <p className="pxfont text-[8px] tracking-[0.14em] text-amber">
                        READ THE RESULT
                      </p>
                      <p className="termfont mt-2 text-[18px] leading-[1.35] text-ink">
                        {lesson.question.prompt}
                      </p>
                      <div className="mt-3 flex flex-col gap-2">
                        {lesson.question.options.map((option) => (
                          <button
                            key={option.id}
                            type="button"
                            disabled={done || busy}
                            aria-pressed={questionId === option.id}
                            className={`chip ${
                              questionId === option.id ? "chip--active" : ""
                            }`}
                            onClick={() => answer(option.id)}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                      {questionId && !questionCorrect ? (
                        <p className="termfont mt-2 text-[15px] leading-snug text-amber">
                          {selectedOption?.feedback}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            <div className="border-t-2 border-edge/70 px-4 py-3 sm:px-5">
              {done ? (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between border-2 border-edge2 bg-accent/10 px-3 py-2.5">
                    <span className="termfont text-[16px] text-accent">
                      {awarded
                        ? "call logged · new xp"
                        : "already completed"}
                    </span>
                    <span className="pxfont text-[9px] text-ink">
                      +{lesson.xp} XP
                    </span>
                  </div>
                  {next ? (
                    <Link href={`/tool/${next.id}`} className="pixel-btn w-full">
                      Next lesson · {next.title}
                    </Link>
                  ) : (
                    <Link href="/campus" className="pixel-btn w-full">
                      Back to campus
                    </Link>
                  )}
                  <ShareButton
                    text={`I made a tool call on Bench — ${lesson.title}.`}
                    label="Share the call"
                  />
                  <button
                    type="button"
                    onClick={reset}
                    className="termfont text-center text-[15px] text-dim underline decoration-edge2 underline-offset-4 hover:text-ink"
                  >
                    make another call
                  </button>
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
              {TOOL_LESSONS.length}
            </span>
          </div>
          <LegalLinks />
        </footer>
      </div>
    </div>
  );
}
