"use client";

import Link from "next/link";
import { track } from "@vercel/analytics";
import { useEffect, useState } from "react";
import { LegalLinks } from "./LegalLinks";
import { ShareButton } from "./ShareButton";
import { completeQuest } from "@/lib/progress";
import { useProgress } from "@/lib/useProgress";
import { flowRuntime } from "@/lib/flow-runtime";
import {
  FLOW_LESSONS,
  FLOW_OPS,
  nextFlowLesson,
  validateFlow,
  type FlowLesson,
  type FlowStep,
  type FlowTrace,
} from "@/game/flow";

export function FlowPlayer({ lesson }: { lesson: FlowLesson }) {
  const progress = useProgress();
  const [built, setBuilt] = useState<FlowStep[]>([]);
  const [input, setInput] = useState(lesson.inputDefault);
  const [variables, setVariables] = useState<Record<string, string>>(
    Object.fromEntries(
      (lesson.variables ?? []).map((variable) => [
        variable.key,
        variable.default,
      ]),
    ),
  );
  const [trace, setTrace] = useState<FlowTrace | null>(null);
  const [triggerId, setTriggerId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [awarded, setAwarded] = useState(false);

  const used = new Set(built.map((step) => step.operationId));
  const palette = lesson.operations.flatMap((id) => {
    const operation = FLOW_OPS[id];
    return operation ? [operation] : [];
  });
  const workshopDone = FLOW_LESSONS.filter((item) =>
    progress.completed.includes(item.id),
  ).length;
  const next = nextFlowLesson(lesson.id);
  const alreadyDone = progress.completed.includes(lesson.id);

  useEffect(() => {
    track("flow_start", { lesson: lesson.id });
  }, [lesson.id]);

  function addStep(operationId: string) {
    if (used.has(operationId) || done || busy) return;
    setBuilt((prev) => [
      ...prev,
      { id: crypto.randomUUID(), operationId },
    ]);
    setError("");
  }

  function removeStep(index: number) {
    if (done || busy) return;
    setBuilt((prev) => prev.filter((_, i) => i !== index));
    setTrace(null);
    setError("");
  }

  async function run() {
    if (busy) return;
    const spec = { steps: built, variables, triggerId: triggerId || undefined };
    const validation = validateFlow(spec, lesson, input);

    if (validation) {
      setError(validation);
      return;
    }

    if (!input.trim()) {
      setError("add some input first.");
      return;
    }

    setBusy(true);
    setError("");
    setTrace(null);

    try {
      const result = await flowRuntime.run(spec, input);
      setTrace(result);

      if (!result.ok) {
        setError("one step came back empty. try again.");
        return;
      }

      const fresh = completeQuest(lesson.id, lesson.xp, lesson.artifact.id);
      setAwarded(fresh);
      setDone(true);
      track("flow_complete", { lesson: lesson.id });
    } catch {
      setError("the workshop machine is busy. try again.");
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setBuilt([]);
    setInput(lesson.inputDefault);
    setVariables(
      Object.fromEntries(
        (lesson.variables ?? []).map((variable) => [
          variable.key,
          variable.default,
        ]),
      ),
    );
    setTrace(null);
    setError("");
    setTriggerId("");
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
              workshop · flow
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
                  workshop · flow · lesson {String(lesson.order).padStart(2, "0")}
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

              {lesson.trigger ? (
                <div>
                  <p className="pxfont text-[8px] tracking-[0.14em] text-dim">
                    {lesson.trigger.label.toUpperCase()}
                  </p>
                  <div className="mt-2 flex flex-col gap-2">
                    {lesson.trigger.options.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        disabled={done || busy}
                        aria-pressed={triggerId === option.id}
                        className={`chip ${
                          triggerId === option.id ? "chip--active" : ""
                        }`}
                        onClick={() => {
                          setTriggerId(option.id);
                          setError("");
                        }}
                      >
                        <span className="block">{option.label}</span>
                        <span className="block text-[14px] text-edge2">
                          {option.hint}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              <div>
                <p className="pxfont text-[8px] tracking-[0.14em] text-dim">
                  BUILD THE FLOW
                </p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {palette.map((operation) => (
                    <button
                      key={operation.id}
                      type="button"
                      className="chip"
                      disabled={used.has(operation.id) || done || busy}
                      onClick={() => addStep(operation.id)}
                    >
                      <span className="block">{operation.label}</span>
                      <span className="block text-[14px] text-edge2">
                        {operation.hint}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="pxfont text-[8px] tracking-[0.14em] text-dim">
                  YOUR FLOW
                </p>
                {built.length === 0 ? (
                  <p className="termfont mt-2 text-[16px] text-dim">
                    Empty. Add a step from the list above.
                  </p>
                ) : (
                  <ol className="mt-2 flex flex-col gap-1">
                    {built.map((step, index) => (
                      <li
                        key={step.id}
                        className="flex items-center gap-3 border-2 border-edge bg-black/20 px-2 py-1.5"
                      >
                        <span className="pxfont text-[8px] text-accent">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <span className="termfont flex-1 text-[17px] text-ink">
                          {FLOW_OPS[step.operationId]?.label}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeStep(index)}
                          disabled={done || busy}
                          aria-label={`Remove ${FLOW_OPS[step.operationId]?.label}`}
                          className="termfont text-[15px] text-dim hover:text-red"
                        >
                          remove
                        </button>
                      </li>
                    ))}
                  </ol>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <label
                  htmlFor="flow-input"
                  className="pxfont text-[8px] tracking-[0.14em] text-dim"
                >
                  {lesson.inputLabel.toUpperCase()}
                </label>
                <textarea
                  id="flow-input"
                  rows={lesson.inputDefault.length > 80 ? 3 : 2}
                  value={input}
                  maxLength={lesson.maxInput}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder={lesson.inputPlaceholder}
                  className="termfont resize-none border-2 border-edge bg-black/20 px-3 py-2 text-[18px] text-ink outline-none focus-visible:border-accent"
                />
                {lesson.variables?.map((variable) => (
                  <div key={variable.key} className="flex flex-col gap-1">
                    <label
                      htmlFor={`flow-var-${variable.key}`}
                      className="pxfont text-[8px] tracking-[0.14em] text-dim"
                    >
                      {variable.label.toUpperCase()}
                    </label>
                    <input
                      id={`flow-var-${variable.key}`}
                      value={variables[variable.key] ?? ""}
                      onChange={(event) =>
                        setVariables((prev) => ({
                          ...prev,
                          [variable.key]: event.target.value,
                        }))
                      }
                      placeholder={variable.placeholder}
                      className="termfont border-2 border-edge bg-black/20 px-3 py-2 text-[18px] text-ink outline-none focus-visible:border-accent"
                    />
                  </div>
                ))}
              </div>

              {error ? (
                <p className="termfont text-[16px] leading-snug text-amber">
                  {error}
                </p>
              ) : null}

              <button
                type="button"
                className="pixel-btn w-full"
                onClick={run}
                disabled={busy || done || built.length === 0}
              >
                {busy ? "running…" : "Run flow"}
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
                    WORKSHOP PROGRESS
                  </p>
                  <p className="termfont mt-1 text-[18px] text-ink">
                    {workshopDone} / {FLOW_LESSONS.length}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="pixel-panel flex min-h-[440px] flex-col overflow-hidden lg:min-h-[560px]">
            <div className="flex items-center justify-between border-b-2 border-edge/60 px-4 py-2.5 sm:px-5">
              <span className="pxfont text-[9px] tracking-[0.16em] text-dim">
                RUN LOG
              </span>
              <span className="flex items-center gap-2 termfont text-[14px] text-edge2">
                <span className="status-dot status-dot--on" />
                workshop
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-5">
              {!trace ? (
                <div className="flex h-full flex-col justify-center gap-3">
                  <p className="termfont text-[19px] leading-[1.35] text-dim">
                    Build a flow, then run it. Each step will appear here with
                    its output.
                  </p>
                  <p className="termfont text-[16px] text-edge2">
                    Two steps is enough. Order matters.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {lesson.trigger ? (
                    <p className="termfont text-[14px] text-edge2">
                      trigger ·{" "}
                      {
                        lesson.trigger.options.find(
                          (option) => option.id === triggerId,
                        )?.label
                      }
                    </p>
                  ) : null}
                  {trace.steps.map((step, index) => (
                    <div
                      key={step.id}
                      className="border-2 border-edge bg-black/15 px-3 py-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="pxfont text-[8px] text-accent">
                          {String(index + 1).padStart(2, "0")} · {step.label}
                        </span>
                        <span className="termfont text-[14px] text-edge2">
                          {step.ms}ms
                        </span>
                      </div>
                      {step.input ? (
                        <p className="termfont mt-2 max-h-20 overflow-y-auto whitespace-pre-line text-[14px] leading-snug text-edge2">
                          {step.input}
                        </p>
                      ) : null}
                      <p className="termfont mt-2 whitespace-pre-line text-[18px] leading-[1.35] text-ink">
                        {step.output}
                      </p>
                      {step.degraded ? (
                        <p className="termfont mt-1 text-[13px] text-amber">
                          reference answer
                        </p>
                      ) : null}
                      {step.guarded ? (
                        <p className="termfont mt-1 text-[13px] text-amber">
                          guard tripped · fallback used
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t-2 border-edge/70 px-4 py-3 sm:px-5">
              {done ? (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between border-2 border-edge2 bg-accent/10 px-3 py-2.5">
                    <span className="termfont text-[16px] text-accent">
                      {awarded ? "flow complete · new xp" : "already completed"}
                    </span>
                    <span className="pxfont text-[9px] text-ink">
                      +{lesson.xp} XP
                    </span>
                  </div>
                  {next ? (
                    <Link href={`/flow/${next.id}`} className="pixel-btn w-full">
                      Next lesson · {next.title}
                    </Link>
                  ) : (
                    <Link href="/campus" className="pixel-btn w-full">
                      Back to the workshop
                    </Link>
                  )}
                  <ShareButton
                    text={`I built a flow on Bench — ${lesson.title}.`}
                    label="Share the flow"
                  />
                  <button
                    type="button"
                    onClick={reset}
                    className="termfont text-center text-[15px] text-dim underline decoration-edge2 underline-offset-4 hover:text-ink"
                  >
                    build another
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
              {FLOW_LESSONS.length}
            </span>
          </div>
          <LegalLinks />
        </footer>
      </div>
    </div>
  );
}
