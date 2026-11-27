"use client";

import Link from "next/link";
import { track } from "@vercel/analytics";
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { LegalLinks } from "./LegalLinks";
import { ShareButton } from "./ShareButton";
import { completeQuest } from "@/lib/progress";
import { useProgress } from "@/lib/useProgress";
import {
  shellRuntime,
  type ShellResult,
  type ShellState,
} from "@/lib/shell-runtime";
import {
  PILOT_LESSONS,
  nextPilotLesson,
  type PilotCheck,
  type PilotLesson,
} from "@/game/pilot";

type TermLine = {
  id: number;
  kind: "sys" | "cmd" | "out" | "err" | "ok";
  text: string;
  cwd?: string;
};

function initialLines(lesson: PilotLesson): TermLine[] {
  return [
    {
      id: 0,
      kind: "sys",
      text: "bench shell · simulation only · no real files, no network.",
    },
    {
      id: 1,
      kind: "sys",
      text: `virtual filesystem at ${lesson.setup.cwd}.`,
    },
    {
      id: 2,
      kind: "sys",
      text: 'type "help" for commands. the checklist on the left is the lesson.',
    },
  ];
}

function checkMatches(
  check: PilotCheck,
  command: string,
  result: ShellResult,
): boolean {
  let pattern: RegExp;
  try {
    pattern = new RegExp(check.command);
  } catch {
    return false;
  }

  if (!pattern.test(command.trim())) return false;

  if (
    check.outputIncludes &&
    check.outputIncludes.some((text) => !result.output.includes(text))
  ) {
    return false;
  }

  if (check.cwd !== undefined && result.state.cwd !== check.cwd) return false;
  if (check.exitCode !== undefined && result.exitCode !== check.exitCode) {
    return false;
  }

  if (
    check.fileExists !== undefined &&
    result.state.files[check.fileExists] === undefined
  ) {
    return false;
  }

  if (
    check.fileMissing !== undefined &&
    result.state.files[check.fileMissing] !== undefined
  ) {
    return false;
  }

  if (check.fileContains) {
    const content = result.state.files[check.fileContains.path];
    if (content === undefined || !content.includes(check.fileContains.text)) {
      return false;
    }
  }

  if (check.gitStaged) {
    const expected = [...check.gitStaged].sort();
    const actual = [...result.state.git.staged].sort();
    if (
      expected.length !== actual.length ||
      expected.some((file, index) => file !== actual[index])
    ) {
      return false;
    }
  }

  return true;
}

export function PilotPlayer({ lesson }: { lesson: PilotLesson }) {
  const progress = useProgress();
  const [shellState, setShellState] = useState<ShellState>(() =>
    shellRuntime.init(lesson.setup),
  );
  const [entries, setEntries] = useState<TermLine[]>(() =>
    initialLines(lesson),
  );
  const [input, setInput] = useState("");
  const [passed, setPassed] = useState<string[]>([]);
  const [questionId, setQuestionId] = useState("");
  const [done, setDone] = useState(false);
  const [awarded, setAwarded] = useState(false);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [draft, setDraft] = useState("");

  const outputRef = useRef<HTMLDivElement>(null);
  const nextLineId = useRef(3);
  const finished = useRef(false);

  const next = nextPilotLesson(lesson.id);
  const alreadyDone = progress.completed.includes(lesson.id);
  const doneCount = PILOT_LESSONS.filter((item) =>
    progress.completed.includes(item.id),
  ).length;
  const checksComplete = passed.length === lesson.checks.length;
  const selectedOption = lesson.question?.options.find(
    (option) => option.id === questionId,
  );
  const questionCorrect = selectedOption?.correct ?? false;

  useEffect(() => {
    track("pilot_start", { lesson: lesson.id });
  }, [lesson.id]);

  useEffect(() => {
    const node = outputRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [entries, done]);

  function append(lines: Omit<TermLine, "id">[]) {
    if (lines.length === 0) return;
    const stamped = lines.map((line) => ({
      ...line,
      id: nextLineId.current++,
    }));
    setEntries((prev) => [...prev, ...stamped]);
  }

  function finish() {
    if (finished.current) return;
    finished.current = true;

    const fresh = completeQuest(lesson.id, lesson.xp, lesson.artifact.id);
    setAwarded(fresh);
    setDone(true);
    append([
      {
        kind: "ok",
        text: fresh
          ? `lesson complete · +${lesson.xp} xp · ${lesson.artifact.name} logged`
          : `lesson complete · ${lesson.artifact.name} already logged · no extra xp`,
      },
    ]);
    track("pilot_complete", { lesson: lesson.id });
  }

  function resetLesson() {
    setShellState(shellRuntime.init(lesson.setup));
    setEntries(initialLines(lesson));
    nextLineId.current = 3;
    setInput("");
    setPassed([]);
    setQuestionId("");
    setDone(false);
    setAwarded(false);
    setHistoryIndex(-1);
    setDraft("");
    finished.current = false;
  }

  function run(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (done) return;

    const command = input.trim();
    if (!command) return;

    const cwd = shellState.cwd;
    const result = shellRuntime.exec(command, shellState);
    setShellState(result.state);
    setInput("");
    setHistoryIndex(-1);
    setDraft("");

    if (command === "reset") {
      resetLesson();
      return;
    }

    if (command === "clear") {
      setEntries([]);
      return;
    }

    const lines: Omit<TermLine, "id">[] = [
      { kind: "cmd", text: command, cwd },
    ];

    if (result.output) {
      lines.push({
        kind: result.exitCode === 0 ? "out" : "err",
        text: result.output,
      });
    }

    if (result.exitCode !== 0) {
      lines.push({ kind: "sys", text: `exit ${result.exitCode}` });
    }

    const nextCheck = lesson.checks.find(
      (check) => !passed.includes(check.id),
    );
    let passedNow = passed;

    if (nextCheck && checkMatches(nextCheck, command, result)) {
      passedNow = [...passed, nextCheck.id];
      setPassed(passedNow);
      lines.push({
        kind: "ok",
        text: `check passed · ${nextCheck.label}`,
      });
    }

    append(lines);

    if (
      passedNow.length === lesson.checks.length &&
      (!lesson.question || questionCorrect)
    ) {
      finish();
    }
  }

  function answer(id: string) {
    if (done) return;
    setQuestionId(id);
    const option = lesson.question?.options.find((item) => item.id === id);
    if (!option?.correct) return;
    if (passed.length === lesson.checks.length) finish();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
    if (shellState.history.length === 0) return;

    event.preventDefault();

    if (event.key === "ArrowUp") {
      if (historyIndex < 0) setDraft(input);
      const nextIndex =
        historyIndex < 0
          ? shellState.history.length - 1
          : Math.max(0, historyIndex - 1);
      setHistoryIndex(nextIndex);
      setInput(shellState.history[nextIndex]);
      return;
    }

    if (historyIndex < 0) return;
    if (historyIndex >= shellState.history.length - 1) {
      setHistoryIndex(-1);
      setInput(draft);
      return;
    }

    const nextIndex = historyIndex + 1;
    setHistoryIndex(nextIndex);
    setInput(shellState.history[nextIndex]);
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
              cockpit · operate
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
                  cockpit · operate · lesson{" "}
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

              <div className="hairline" />

              <div>
                <div className="flex items-center justify-between gap-3">
                  <p className="pxfont text-[8px] tracking-[0.14em] text-dim">
                    FLIGHT CHECKS
                  </p>
                  <span className="termfont text-[14px] text-edge2">
                    {passed.length} / {lesson.checks.length}
                  </span>
                </div>
                <ol className="mt-2 flex flex-col gap-2">
                  {lesson.checks.map((check, index) => {
                    const complete = passed.includes(check.id);
                    return (
                      <li
                        key={check.id}
                        className={`border-2 px-2.5 py-2 ${
                          complete
                            ? "border-accent/60 bg-accent/5"
                            : "border-edge bg-black/20"
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <span
                            className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center border-2 pxfont text-[8px] ${
                              complete
                                ? "border-accent bg-accent text-[#04140d]"
                                : "border-edge2 text-dim"
                            }`}
                          >
                            {complete
                              ? "x"
                              : String(index + 1).padStart(2, "0")}
                          </span>
                          <div className="min-w-0">
                            <p
                              className={`termfont text-[17px] leading-snug ${
                                complete ? "text-ink" : "text-dim"
                              }`}
                            >
                              {check.label}
                            </p>
                            {complete ? (
                              <p className="termfont text-[13px] text-accent">
                                logged
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </div>

              {checksComplete && lesson.question && !done ? (
                <div className="border-2 border-amber/60 bg-amber/5 px-3 py-3">
                  <p className="pxfont text-[8px] tracking-[0.14em] text-amber">
                    CHECK YOUR REASONING
                  </p>
                  <p className="termfont mt-2 text-[18px] leading-[1.35] text-ink">
                    {lesson.question.prompt}
                  </p>
                  <div className="mt-3 flex flex-col gap-2">
                    {lesson.question.options.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        disabled={done}
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
                  {selectedOption && !selectedOption.correct ? (
                    <p className="termfont mt-2 text-[15px] leading-snug text-amber">
                      {selectedOption.feedback}
                    </p>
                  ) : null}
                </div>
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
                    PILOT PROGRESS
                  </p>
                  <p className="termfont mt-1 text-[18px] text-ink">
                    {doneCount} / {PILOT_LESSONS.length}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="pixel-panel flex h-[68vh] min-h-[440px] flex-col overflow-hidden lg:h-auto lg:min-h-[560px]">
            <div className="border-b-2 border-edge/60 px-4 py-2.5 sm:px-5">
              <div className="flex items-center justify-between gap-3">
                <span className="pxfont text-[9px] tracking-[0.16em] text-dim">
                  TERMINAL
                </span>
                <span className="flex items-center gap-2 termfont text-[13px] text-edge2">
                  <span className="status-dot status-dot--on" />
                  virtual
                </span>
              </div>
              <div className="mt-2 flex items-center gap-2 border-2 border-amber/40 bg-amber/5 px-2 py-1">
                <span className="status-dot status-dot--on" />
                <span className="termfont text-[13px] leading-snug text-amber">
                  safe terminal · virtual filesystem · simulation
                </span>
              </div>
            </div>

            <div
              ref={outputRef}
              className="min-h-0 flex-1 overflow-y-auto bg-black/10 p-4 sm:p-5"
              aria-live="polite"
            >
              {entries.length === 0 ? (
                <p className="termfont text-[15px] leading-snug text-edge2">
                  screen cleared. type help, or reset to restore the lesson.
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {entries.map((entry) => {
                    if (entry.kind === "cmd") {
                      return (
                        <div
                          key={entry.id}
                          className="term-line termfont text-[17px] leading-[1.35]"
                        >
                          <span className="term-prefix">
                            {entry.cwd ?? shellState.cwd} ${" "}
                          </span>
                          <span className="text-amber">{entry.text}</span>
                        </div>
                      );
                    }

                    if (entry.kind === "sys") {
                      return (
                        <p
                          key={entry.id}
                          className="term-line termfont text-[14px] leading-snug text-dim"
                        >
                          {entry.text}
                        </p>
                      );
                    }

                    if (entry.kind === "ok") {
                      return (
                        <p
                          key={entry.id}
                          className="term-line termfont text-[15px] leading-snug text-accent"
                        >
                          {entry.text}
                        </p>
                      );
                    }

                    return (
                      <p
                        key={entry.id}
                        className={`term-line termfont text-[17px] leading-[1.35] ${
                          entry.kind === "err" ? "text-red" : "text-ink"
                        }`}
                      >
                        {entry.text}
                      </p>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="border-t-2 border-edge/70 px-4 py-3 sm:px-5">
              {done ? (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between border-2 border-edge2 bg-accent/10 px-3 py-2.5">
                    <span className="termfont text-[16px] text-accent">
                      {awarded
                        ? "lesson complete · new xp"
                        : "already completed · no extra xp"}
                    </span>
                    <span className="pxfont text-[9px] text-ink">
                      +{lesson.xp} XP
                    </span>
                  </div>
                  <div className="border-2 border-edge bg-black/20 px-3 py-2">
                    <p className="termfont text-[13px] uppercase tracking-[0.12em] text-dim">
                      artifact
                    </p>
                    <p className="termfont mt-0.5 text-[18px] text-ink">
                      {lesson.artifact.name}
                    </p>
                    <p className="termfont text-[14px] text-dim">
                      {lesson.artifact.note}
                    </p>
                  </div>
                  {next ? (
                    <Link
                      href={`/pilot/${next.id}`}
                      className="pixel-btn w-full"
                    >
                      Next lesson · {next.title}
                    </Link>
                  ) : (
                    <Link href="/campus" className="pixel-btn w-full">
                      Back to campus
                    </Link>
                  )}
                  <ShareButton
                    text={`I completed ${lesson.title} in the cockpit on Bench.`}
                    label="Share the lesson"
                  />
                  <button
                    type="button"
                    onClick={resetLesson}
                    className="termfont text-center text-[15px] text-dim underline decoration-edge2 underline-offset-4 hover:text-ink"
                  >
                    run it again
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <span className="pxfont text-[8px] tracking-[0.14em] text-edge2">
                      CWD
                    </span>
                    <span className="termfont break-all text-right text-[14px] text-accent">
                      {shellState.cwd}
                    </span>
                  </div>
                  <form onSubmit={run} className="mt-2 flex items-center gap-2">
                    <label htmlFor="pilot-command" className="sr-only">
                      Command
                    </label>
                    <span
                      aria-hidden="true"
                      className="termfont shrink-0 text-[18px] text-accent"
                    >
                      $
                    </span>
                    <input
                      id="pilot-command"
                      value={input}
                      onChange={(event) => setInput(event.target.value)}
                      onKeyDown={handleKeyDown}
                      autoComplete="off"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      placeholder="type a command"
                      className="cmd-input termfont min-w-0 flex-1 text-[18px]"
                    />
                    <button
                      type="submit"
                      disabled={!input.trim()}
                      className="termfont shrink-0 border-2 border-accent bg-accent/10 px-2.5 py-1.5 text-[14px] uppercase tracking-[0.08em] text-accent hover:bg-accent/20 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      run
                    </button>
                  </form>
                  <p className="termfont mt-1.5 text-[12px] leading-snug text-edge2">
                    enter runs · up/down history · clear wipes the screen · reset
                    restores the lesson
                  </p>
                </>
              )}
            </div>
          </section>
        </main>

        <footer className="flex flex-col gap-2 border-t-2 border-edge/60 pt-3">
          <div className="flex items-start justify-between gap-4">
            <span className="termfont text-[14px] text-edge2">{lesson.win}</span>
            <span className="termfont shrink-0 text-[14px] text-edge2">
              lesson {String(lesson.order).padStart(2, "0")} /{" "}
              {String(PILOT_LESSONS.length).padStart(2, "0")}
            </span>
          </div>
          <LegalLinks />
        </footer>
      </div>
    </div>
  );
}
