"use client";

import Link from "next/link";
import { track } from "@vercel/analytics";
import { useEffect, useRef, useState } from "react";
import { LegalLinks } from "./LegalLinks";
import { ShareButton } from "./ShareButton";
import { completeQuest } from "@/lib/progress";
import { useProgress } from "@/lib/useProgress";
import { httpRuntime, type HttpResponse } from "@/lib/http-runtime";
import {
  REQUEST_LESSONS,
  apiEndpointById,
  nextRequestLesson,
  type HttpMethod,
  type RequestLesson,
} from "@/game/request";

type SentRequest = {
  method: HttpMethod;
  path: string;
  query: Record<string, string>;
  body?: string;
  auth: boolean;
};

const METHODS: HttpMethod[] = ["GET", "POST", "PATCH", "DELETE"];

function cleanValues(values: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(values)
      .map(([key, value]) => [key, value.trim()] as const)
      .filter(([, value]) => value.length > 0),
  );
}

function sameValues(
  actual: Record<string, string>,
  expected: Record<string, string>,
): boolean {
  const left = cleanValues(actual);
  const right = cleanValues(expected);
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);

  return (
    leftKeys.length === rightKeys.length &&
    rightKeys.every((key) => left[key] === right[key])
  );
}

function normalizePath(value: string): string {
  const [raw] = value.trim().split("?");
  return raw.length > 1 ? raw.replace(/\/+$/, "") : raw;
}

function querySuffix(query: Record<string, string>): string {
  const search = new URLSearchParams(cleanValues(query)).toString();
  return search ? `?${search}` : "";
}

function prettyBody(raw: string): string {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

function statusBand(status: number): string {
  if (status >= 200 && status < 300) return "2xx";
  if (status >= 500) return "5xx";
  if (status >= 400) return "4xx";
  return "3xx";
}

function statusClasses(status: number): string {
  if (status >= 200 && status < 300) {
    return "border-edge2 bg-accent/5 text-accent";
  }
  if (status >= 500) {
    return "border-red/60 bg-red/5 text-red";
  }
  return "border-amber/60 bg-amber/5 text-amber";
}

function statusHint(status: number): string {
  if (status >= 200 && status < 300) {
    return "The request succeeded. Read the body before you trust the shape.";
  }
  if (status === 401) {
    return "401 · the request was not authenticated. Check the credential in the request and read the body.";
  }
  if (status === 403) {
    return "403 · the key is real, but it lacks the scope this route needs.";
  }
  if (status === 404) {
    return "404 · no route matches that method and path.";
  }
  if (status === 405) {
    return "405 · the path exists, but not for that method.";
  }
  if (status === 429) {
    return "429 · too many requests. Honor Retry-After before the next attempt.";
  }
  if (status >= 500) {
    return "5xx · the service failed. A safe retry may help, but read the body first.";
  }
  if (status >= 400) {
    return "4xx · the exchange rejected the request. Read the body for the reason.";
  }
  return `The exchange answered with status ${status}.`;
}

export function RequestPlayer({ lesson }: { lesson: RequestLesson }) {
  const progress = useProgress();
  const endpoint = apiEndpointById(lesson.endpointId);
  const [method, setMethod] = useState<HttpMethod>(lesson.expectation.method);
  const [path, setPath] = useState(lesson.expectation.path);
  const [queryValues, setQueryValues] = useState<Record<string, string>>({});
  const [bodyValues, setBodyValues] = useState<Record<string, string>>({});
  const [token, setToken] = useState("");
  const [useAuth, setUseAuth] = useState(endpoint?.auth === "bearer");
  const [response, setResponse] = useState<HttpResponse | null>(null);
  const [sent, setSent] = useState<SentRequest | null>(null);
  const [verified, setVerified] = useState(false);
  const [questionId, setQuestionId] = useState("");
  const [busy, setBusy] = useState(false);
  const [retryAfter, setRetryAfter] = useState(0);
  const [error, setError] = useState("");
  const [hint, setHint] = useState("");
  const [done, setDone] = useState(false);
  const [awarded, setAwarded] = useState(false);
  const finishGuard = useRef(false);

  const doneCount = REQUEST_LESSONS.filter((item) =>
    progress.completed.includes(item.id),
  ).length;
  const next = nextRequestLesson(lesson.id);
  const alreadyDone = progress.completed.includes(lesson.id);

  const selectedOption = lesson.question?.options.find(
    (option) => option.id === questionId,
  );
  const questionCorrect = selectedOption?.correct ?? false;
  const showQuestion = Boolean(lesson.question && verified);

  useEffect(() => {
    httpRuntime.reset?.();
    track("request_start", { lesson: lesson.id });
  }, [lesson.id]);

  useEffect(() => {
    if (retryAfter <= 0) return;

    const timer = window.setTimeout(() => {
      setRetryAfter((seconds) => Math.max(0, seconds - 1));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [retryAfter]);

  function expectationMatches(): boolean {
    const expectation = lesson.expectation;

    if (method !== expectation.method) return false;
    if (normalizePath(path) !== normalizePath(expectation.path)) return false;
    if (!sameValues(queryValues, expectation.query ?? {})) return false;
    if (!sameValues(bodyValues, expectation.body ?? {})) return false;
    if (expectation.auth && !(useAuth && token.trim())) return false;

    return true;
  }

  function mismatchHint(): string {
    const expectation = lesson.expectation;

    if (method !== expectation.method) {
      return "the method is wrong for this task.";
    }
    if (normalizePath(path) !== normalizePath(expectation.path)) {
      return "the path is wrong for this task.";
    }
    if (!sameValues(queryValues, expectation.query ?? {})) {
      return "the query values do not match the task.";
    }
    if (!sameValues(bodyValues, expectation.body ?? {})) {
      return "the body values do not match the task.";
    }
    if (expectation.auth && !(useAuth && token.trim())) {
      return "this endpoint needs a bearer token.";
    }
    return "check the request fields against the task.";
  }

  function finish() {
    if (finishGuard.current) return;
    finishGuard.current = true;

    const fresh = completeQuest(lesson.id, lesson.xp, lesson.artifact.id);
    setAwarded(fresh);
    setDone(true);
    setHint("");
    track("request_complete", { lesson: lesson.id });
  }

  async function send() {
    if (busy || done) return;

    if (retryAfter > 0) {
      setHint(`retry-after · wait ${retryAfter}s before sending again.`);
      return;
    }

    if (!endpoint) {
      setError("the endpoint docs are missing.");
      return;
    }

    setBusy(true);
    setError("");
    setHint("");
    setVerified(false);

    const query = cleanValues(queryValues);
    const body = cleanValues(bodyValues);
    const headers: Record<string, string> = { accept: "application/json" };

    if (endpoint.auth === "bearer" && useAuth && token.trim()) {
      headers.authorization = `Bearer ${token.trim()}`;
    }

    const bodyText =
      method !== "GET" && Object.keys(body).length > 0
        ? JSON.stringify(body)
        : undefined;

    if (bodyText) headers["content-type"] = "application/json";

    const request: SentRequest = {
      method,
      path: path.trim(),
      query,
      body: bodyText,
      auth: Boolean(headers.authorization),
    };

    setSent(request);

    try {
      const result = await httpRuntime.send({
        method,
        path: path.trim(),
        query,
        headers,
        body: bodyText,
      });
      setResponse(result);

      const wait = Number(result.headers["retry-after"] ?? "");

      if (result.status === 429 && Number.isFinite(wait) && wait > 0) {
        setRetryAfter(Math.max(1, Math.ceil(wait)));
        setHint(
          "429 · the exchange asked you to slow down. honor Retry-After, then retry the same request.",
        );
        return;
      }

      setRetryAfter(0);

      if (result.status < 200 || result.status >= 300) {
        setHint(statusHint(result.status));
        return;
      }

      if (!expectationMatches()) {
        if (result.headers.next) {
          setHint(
            "page 1 read. the next cursor is in the next header. now fetch page 2.",
          );
        } else {
          setHint(`the exchange answered, but ${mismatchHint()}`);
        }
        return;
      }

      setVerified(true);

      if (!lesson.question) {
        finish();
        return;
      }

      if (questionCorrect) {
        finish();
      } else {
        setHint("the request is right. answer the question to log it.");
      }
    } catch {
      setError("the exchange is busy. send the request again.");
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

    if (verified) {
      finish();
    } else {
      setHint("correct reasoning. now send the request that finishes the task.");
    }
  }

  function reset() {
    setMethod(lesson.expectation.method);
    setPath(lesson.expectation.path);
    setQueryValues({});
    setBodyValues({});
    setToken("");
    setUseAuth(endpoint?.auth === "bearer");
    setResponse(null);
    setSent(null);
    setVerified(false);
    setQuestionId("");
    setBusy(false);
    setRetryAfter(0);
    setError("");
    setHint("");
    setDone(false);
    setAwarded(false);
    finishGuard.current = false;
    httpRuntime.reset?.();
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
              exchange · request
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
                  exchange · request · lesson{" "}
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

              {endpoint ? (
                <div className="border-2 border-edge bg-black/20 px-3 py-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="pxfont text-[8px] tracking-[0.14em] text-accent">
                      ENDPOINT DOCS
                    </span>
                    <span className="termfont text-[14px] text-edge2">
                      {endpoint.service} ·{" "}
                      {endpoint.auth === "bearer"
                        ? "bearer auth"
                        : "no auth"}
                    </span>
                  </div>
                  <p className="termfont mt-2 text-[17px] text-ink">
                    {endpoint.method} {endpoint.path}
                  </p>
                  <p className="termfont mt-1 text-[15px] leading-snug text-dim">
                    {endpoint.description}
                  </p>
                  {endpoint.query.length > 0 ? (
                    <div className="mt-2">
                      <p className="termfont text-[13px] uppercase tracking-[0.12em] text-edge2">
                        query
                      </p>
                      {endpoint.query.map((field) => (
                        <p
                          key={field.name}
                          className="termfont text-[14px] leading-snug text-dim"
                        >
                          <span className="text-ink">
                            {field.name}
                            {field.required ? " *" : ""}
                          </span>
                          {" · example "}
                          {field.example}
                          {field.hint ? ` · ${field.hint}` : ""}
                        </p>
                      ))}
                    </div>
                  ) : null}
                  {endpoint.body.length > 0 ? (
                    <div className="mt-2">
                      <p className="termfont text-[13px] uppercase tracking-[0.12em] text-edge2">
                        body
                      </p>
                      {endpoint.body.map((field) => (
                        <p
                          key={field.name}
                          className="termfont text-[14px] leading-snug text-dim"
                        >
                          <span className="text-ink">
                            {field.name}
                            {field.required ? " *" : ""}
                          </span>
                          {" · example "}
                          {field.example}
                          {field.hint ? ` · ${field.hint}` : ""}
                        </p>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="hairline" />

              <div>
                <p className="pxfont text-[8px] tracking-[0.14em] text-dim">
                  COMPOSE THE REQUEST
                </p>
                <div className="mt-2 flex gap-2">
                  <label htmlFor="request-method" className="sr-only">
                    Method
                  </label>
                  <select
                    id="request-method"
                    value={method}
                    disabled={done || busy}
                    onChange={(event) =>
                      setMethod(event.target.value as HttpMethod)
                    }
                    className="termfont border-2 border-edge bg-black/20 px-2 py-2 text-[16px] text-accent outline-none focus-visible:border-accent"
                  >
                    {METHODS.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                  <label htmlFor="request-path" className="sr-only">
                    Path
                  </label>
                  <input
                    id="request-path"
                    value={path}
                    disabled={done || busy}
                    onChange={(event) => setPath(event.target.value)}
                    spellCheck={false}
                    className="termfont min-w-0 flex-1 border-2 border-edge bg-black/20 px-3 py-2 text-[17px] text-ink outline-none focus-visible:border-accent"
                  />
                </div>

                {endpoint && endpoint.query.length > 0 ? (
                  <div className="mt-3 flex flex-col gap-2">
                    <p className="pxfont text-[8px] tracking-[0.14em] text-dim">
                      QUERY
                    </p>
                    {endpoint.query.map((field) => (
                      <div key={field.name} className="flex flex-col gap-1">
                        <label
                          htmlFor={`request-query-${field.name}`}
                          className="termfont text-[14px] text-dim"
                        >
                          {field.name}
                          {field.required ? " *" : " (optional)"}
                          {field.hint ? (
                            <span className="text-edge2"> · {field.hint}</span>
                          ) : null}
                        </label>
                        <input
                          id={`request-query-${field.name}`}
                          value={queryValues[field.name] ?? ""}
                          disabled={done || busy}
                          onChange={(event) =>
                            setQueryValues((prev) => ({
                              ...prev,
                              [field.name]: event.target.value,
                            }))
                          }
                          placeholder={field.example}
                          spellCheck={false}
                          className="termfont border-2 border-edge bg-black/20 px-3 py-2 text-[18px] text-ink outline-none focus-visible:border-accent"
                        />
                      </div>
                    ))}
                  </div>
                ) : null}

                {endpoint && endpoint.body.length > 0 ? (
                  <div className="mt-3 flex flex-col gap-2">
                    <p className="pxfont text-[8px] tracking-[0.14em] text-dim">
                      BODY
                    </p>
                    {endpoint.body.map((field) => (
                      <div key={field.name} className="flex flex-col gap-1">
                        <label
                          htmlFor={`request-body-${field.name}`}
                          className="termfont text-[14px] text-dim"
                        >
                          {field.name}
                          {field.required ? " *" : " (optional)"}
                          {field.hint ? (
                            <span className="text-edge2"> · {field.hint}</span>
                          ) : null}
                        </label>
                        <input
                          id={`request-body-${field.name}`}
                          value={bodyValues[field.name] ?? ""}
                          disabled={done || busy}
                          onChange={(event) =>
                            setBodyValues((prev) => ({
                              ...prev,
                              [field.name]: event.target.value,
                            }))
                          }
                          placeholder={field.example}
                          spellCheck={false}
                          className="termfont border-2 border-edge bg-black/20 px-3 py-2 text-[18px] text-ink outline-none focus-visible:border-accent"
                        />
                      </div>
                    ))}
                  </div>
                ) : null}

                {endpoint?.auth === "bearer" ? (
                  <div className="mt-3">
                    <p className="pxfont text-[8px] tracking-[0.14em] text-dim">
                      AUTHORIZATION
                    </p>
                    <div className="mt-2 flex flex-col gap-2">
                      <button
                        type="button"
                        disabled={done || busy}
                        aria-pressed={useAuth}
                        className={`chip ${useAuth ? "chip--active" : ""}`}
                        onClick={() => setUseAuth((value) => !value)}
                      >
                        <span className="block">
                          {useAuth ? "bearer token · on" : "bearer token · off"}
                        </span>
                        <span className="block text-[14px] text-edge2">
                          Authorization: Bearer &lt;token&gt;
                        </span>
                      </button>
                      {useAuth ? (
                        <div className="flex flex-col gap-1">
                          <label
                            htmlFor="request-token"
                            className="termfont text-[14px] text-dim"
                          >
                            token
                          </label>
                          <input
                            id="request-token"
                            value={token}
                            disabled={done || busy}
                            onChange={(event) => setToken(event.target.value)}
                            placeholder="bench-demo-key"
                            autoComplete="off"
                            spellCheck={false}
                            className="termfont border-2 border-edge bg-black/20 px-3 py-2 text-[18px] text-ink outline-none focus-visible:border-accent"
                          />
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : null}
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
                onClick={send}
                disabled={busy || done || retryAfter > 0}
              >
                {busy
                  ? "sending…"
                  : retryAfter > 0
                    ? `retry in ${retryAfter}s`
                    : "Send request"}
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
                    EXCHANGE PROGRESS
                  </p>
                  <p className="termfont mt-1 text-[18px] text-ink">
                    {doneCount} / {REQUEST_LESSONS.length}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="pixel-panel flex min-h-[440px] flex-col overflow-hidden lg:min-h-[560px]">
            <div className="flex items-center justify-between border-b-2 border-edge/60 px-4 py-2.5 sm:px-5">
              <span className="pxfont text-[9px] tracking-[0.16em] text-dim">
                HTTP LOG
              </span>
              <span className="flex items-center gap-2 termfont text-[14px] text-edge2">
                <span className="status-dot status-dot--on" />
                exchange
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-5">
              {!response ? (
                <div className="flex h-full flex-col justify-center gap-3">
                  <p className="termfont text-[19px] leading-[1.35] text-dim">
                    Compose a request, send it, and the status, headers, and
                    body will land here.
                  </p>
                  <p className="termfont text-[16px] text-edge2">
                    The exchange answers in plain JSON.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="border-2 border-edge bg-black/15 px-3 py-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="pxfont text-[8px] text-accent">
                        REQUEST
                      </span>
                      <span className="termfont text-[14px] text-edge2">
                        {response.ms}ms
                      </span>
                    </div>
                    <p className="termfont mt-2 break-all text-[17px] leading-snug text-ink">
                      {sent
                        ? `${sent.method} ${sent.path}${querySuffix(sent.query)}`
                        : `${method} ${path}`}
                    </p>
                    {sent?.body ? (
                      <p className="termfont mt-1 break-all text-[14px] text-edge2">
                        body · {sent.body}
                      </p>
                    ) : null}
                    {sent?.auth ? (
                      <p className="termfont mt-1 text-[14px] text-edge2">
                        authorization · bearer token sent
                      </p>
                    ) : null}
                  </div>

                  <div
                    className={`border-2 px-3 py-2.5 ${statusClasses(
                      response.status,
                    )}`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="pxfont text-[8px] tracking-[0.14em]">
                        STATUS {response.status}
                      </span>
                      <span className="termfont text-[14px]">
                        {statusBand(response.status)}
                      </span>
                    </div>
                    <p className="termfont mt-2 text-[16px] leading-snug">
                      {statusHint(response.status)}
                    </p>
                  </div>

                  <div>
                    <p className="pxfont text-[8px] tracking-[0.14em] text-dim">
                      HEADERS
                    </p>
                    <div className="mt-2 flex flex-col gap-1 border-2 border-edge bg-black/15 px-3 py-2.5">
                      {Object.entries(response.headers).map(([key, value]) => (
                        <div
                          key={key}
                          className="flex flex-col gap-0.5 sm:flex-row sm:gap-2"
                        >
                          <span className="termfont text-[14px] text-edge2 sm:w-40 sm:shrink-0">
                            {key}
                          </span>
                          <span className="termfont break-all text-[15px] text-ink">
                            {value || "(empty)"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="pxfont text-[8px] tracking-[0.14em] text-dim">
                      BODY
                    </p>
                    <pre className="termfont mt-2 max-h-[320px] overflow-auto whitespace-pre-wrap break-words border-2 border-edge bg-black/20 px-3 py-2.5 text-[15px] leading-[1.45] text-ink">
                      {prettyBody(response.body)}
                    </pre>
                  </div>

                  {retryAfter > 0 ? (
                    <div className="border-2 border-amber/60 bg-amber/5 px-3 py-2.5">
                      <p className="pxfont text-[8px] tracking-[0.14em] text-amber">
                        RETRY-AFTER
                      </p>
                      <p className="termfont mt-1 text-[17px] text-ink">
                        wait {retryAfter}s, then send the same request.
                      </p>
                    </div>
                  ) : null}

                  {showQuestion && lesson.question ? (
                    <div className="border-2 border-edge2 bg-black/25 px-3 py-3">
                      <p className="pxfont text-[8px] tracking-[0.14em] text-amber">
                        READ THE RESPONSE
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
                        ? "request logged · new xp"
                        : "already completed"}
                    </span>
                    <span className="pxfont text-[9px] text-ink">
                      +{lesson.xp} XP
                    </span>
                  </div>
                  {next ? (
                    <Link
                      href={`/request/${next.id}`}
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
                    text={`I sent an API request on Bench — ${lesson.title}.`}
                    label="Share the request"
                  />
                  <button
                    type="button"
                    onClick={reset}
                    className="termfont text-center text-[15px] text-dim underline decoration-edge2 underline-offset-4 hover:text-ink"
                  >
                    send another request
                  </button>
                </div>
              ) : null}
            </div>
          </section>
        </main>

        <footer className="flex flex-col gap-2 border-t-2 border-edge/60 pt-3">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <span className="termfont text-[14px] text-edge2">{lesson.win}</span>
            <span className="termfont text-[14px] text-edge2">
              lesson {String(lesson.order).padStart(2, "0")} /{" "}
              {String(REQUEST_LESSONS.length).padStart(2, "0")}
            </span>
          </div>
          <LegalLinks />
        </footer>
      </div>
    </div>
  );
}
