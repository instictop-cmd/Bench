"use client";

import Link from "next/link";
import { track } from "@vercel/analytics";
import { useEffect, useRef, useState } from "react";
import { LegalLinks } from "./LegalLinks";
import { ShareButton } from "./ShareButton";
import { completeQuest } from "@/lib/progress";
import { useProgress } from "@/lib/useProgress";
import { mcpRuntime, type McpResult } from "@/lib/mcp-runtime";
import {
  CONNECT_LESSONS,
  MCP_SERVERS,
  mcpServerById,
  nextConnectLesson,
  type ConnectLesson,
  type McpPrompt,
  type McpResource,
  type McpServer,
  type McpTool,
} from "@/game/connect";

type ConnectMethod = ConnectLesson["expectation"]["method"];

type LogEntry = {
  id: string;
  method: ConnectMethod;
  serverId: string;
  ok: boolean;
  code?: number;
  ms?: number;
  request: string;
  response: string;
};

type Selection =
  | { kind: "tool"; tool: McpTool }
  | { kind: "resource"; resource: McpResource }
  | { kind: "prompt"; prompt: McpPrompt };

type LastAction = {
  serverId: string;
  method: ConnectMethod;
  tool?: string;
  args?: Record<string, string>;
  resource?: string;
  prompt?: string;
  scope?: string;
  ok: boolean;
};

function requestJson(method: ConnectMethod, id: string, params: unknown) {
  return JSON.stringify({ jsonrpc: "2.0", id, method, params }, null, 2);
}

function parseResponse(raw: string) {
  try {
    const parsed = JSON.parse(raw) as {
      id?: unknown;
      error?: { code?: unknown };
    };
    return {
      id: typeof parsed.id === "string" ? parsed.id : "req-?",
      code:
        typeof parsed.error?.code === "number" ? parsed.error.code : undefined,
      failed: Boolean(parsed.error),
    };
  } catch {
    return { id: "req-?", code: undefined, failed: true };
  }
}

function filledArgs(args: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(args)
      .map(([key, value]) => [key, value.trim()])
      .filter(([, value]) => value.length > 0),
  );
}

function argsMatch(
  actual: Record<string, string> | undefined,
  expected: Record<string, string> | undefined,
) {
  if (!expected) return true;
  return Object.keys(expected).every(
    (key) => (actual?.[key] ?? "").trim() === expected[key].trim(),
  );
}

function matchesExpected(
  action: LastAction | null,
  lesson: ConnectLesson,
): boolean {
  if (!action || !action.ok) return false;
  const expected = lesson.expectation;

  if (action.serverId !== lesson.serverId) return false;
  if (action.method !== expected.method) return false;
  if (expected.tool && action.tool !== expected.tool) return false;
  if (expected.resource && action.resource !== expected.resource) return false;
  if (expected.prompt && action.prompt !== expected.prompt) return false;
  if (expected.args && !argsMatch(action.args, expected.args)) return false;
  if (expected.scope && action.scope !== expected.scope) return false;

  return true;
}

function mismatchHint(action: LastAction, lesson: ConnectLesson): string {
  const expected = lesson.expectation;

  if (action.serverId !== lesson.serverId) {
    return "the request worked, but this is not the server the task names.";
  }
  if (action.method !== expected.method) {
    return `the request worked, but the task asks for ${expected.method}.`;
  }
  if (expected.tool && action.tool !== expected.tool) {
    return "this tool is not the one the task needs.";
  }
  if (expected.resource && action.resource !== expected.resource) {
    return "this resource is not the one the task names.";
  }
  if (expected.prompt && action.prompt !== expected.prompt) {
    return "this prompt is not the one the task names.";
  }
  if (expected.scope && action.scope !== expected.scope) {
    return "the request worked, but the scope is not the smallest one that finishes the task.";
  }
  if (expected.args && !argsMatch(action.args, expected.args)) {
    return "the request worked, but the arguments do not match the task. check every field.";
  }

  return "the request worked, but it is not the step the task asks for.";
}

export function ConnectPlayer({ lesson }: { lesson: ConnectLesson }) {
  const progress = useProgress();
  const [serverId, setServerId] = useState("");
  const [connected, setConnected] = useState<McpServer | null>(null);
  const [tools, setTools] = useState<McpTool[] | null>(null);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [args, setArgs] = useState<Record<string, string>>({});
  const [scope, setScope] = useState("");
  const [log, setLog] = useState<LogEntry[]>([]);
  const [result, setResult] = useState<McpResult | null>(null);
  const [satisfied, setSatisfied] = useState(false);
  const [questionId, setQuestionId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [hint, setHint] = useState("");
  const [done, setDone] = useState(false);
  const [awarded, setAwarded] = useState(false);
  const finished = useRef(false);

  const selectedAnswer = lesson.question?.options.find(
    (option) => option.id === questionId,
  );
  const next = nextConnectLesson(lesson.id);
  const alreadyDone = progress.completed.includes(lesson.id);
  const completedCount = CONNECT_LESSONS.filter((item) =>
    progress.completed.includes(item.id),
  ).length;
  const expectedServer = mcpServerById(lesson.serverId);
  const offTaskServer = Boolean(
    connected && connected.id !== lesson.serverId,
  );

  useEffect(() => {
    track("connect_start", { lesson: lesson.id });
  }, [lesson.id]);

  function appendLog(entry: LogEntry) {
    setLog((previous) => [...previous, entry]);
  }

  function finish() {
    if (finished.current) return;
    finished.current = true;

    const fresh = completeQuest(lesson.id, lesson.xp, lesson.artifact.id);
    setAwarded(fresh);
    setDone(true);
    setHint("");
    setError("");
    track("connect_complete", { lesson: lesson.id });
  }

  function handleResult(
    response: McpResult,
    method: ConnectMethod,
    params: unknown,
    action: Omit<LastAction, "method" | "ok">,
  ) {
    const parsed = parseResponse(response.raw);

    appendLog({
      id: parsed.id,
      method,
      serverId: action.serverId,
      ok: response.ok,
      code: parsed.code,
      ms: response.ms,
      request: requestJson(method, parsed.id, params),
      response: response.raw,
    });

    setResult(response);

    const record: LastAction = {
      ...action,
      method,
      ok: response.ok,
    };

    if (!response.ok) {
      setError(response.error ?? "the request failed.");
      return;
    }

    if (matchesExpected(record, lesson)) {
      setSatisfied(true);
      if (!lesson.question) {
        finish();
      } else {
        setHint("the request is right. answer the question to log it.");
      }
      return;
    }

    setHint(mismatchHint(record, lesson));
  }

  async function connect() {
    if (busy || done) return;
    if (!serverId) {
      setError("pick a server first.");
      return;
    }

    setBusy(true);
    setError("");
    setHint("");
    setResult(null);

    try {
      const { server, raw } = await mcpRuntime.connect(serverId);
      const parsed = parseResponse(raw);

      appendLog({
        id: parsed.id,
        method: "initialize",
        serverId: server.id,
        ok: !parsed.failed,
        code: parsed.code,
        request: requestJson("initialize", parsed.id, {
          protocolVersion: server.protocolVersion,
          capabilities: {},
          clientInfo: { name: "bench-connect", version: "1.0.0" },
        }),
        response: raw,
      });

      setConnected(server);
      setTools(null);
      setSelection(null);
      setArgs({});
      setScope("");
      setQuestionId("");
      const action: LastAction = {
        serverId: server.id,
        method: "initialize",
        ok: !parsed.failed,
      };

      if (parsed.failed) {
        setError("initialize failed. read the protocol log.");
        return;
      }

      if (matchesExpected(action, lesson)) {
        setSatisfied(true);
        setHint("connected. answer the question to log it.");
        return;
      }

      setHint(
        server.id === lesson.serverId
          ? "connected. read the manifest, then send the next request."
          : `connected to ${server.name}. the task names ${expectedServer?.name ?? lesson.serverId}.`,
      );
    } catch {
      setError("the switchboard did not answer. try the connect again.");
    } finally {
      setBusy(false);
    }
  }

  async function listTools() {
    if (busy || done || !connected) return;

    setBusy(true);
    setError("");
    setHint("");
    setResult(null);

    try {
      const { tools: listed, raw } = await mcpRuntime.listTools(connected.id);
      const parsed = parseResponse(raw);

      appendLog({
        id: parsed.id,
        method: "tools/list",
        serverId: connected.id,
        ok: !parsed.failed,
        code: parsed.code,
        request: requestJson("tools/list", parsed.id, {}),
        response: raw,
      });

      setTools(listed);

      const action: LastAction = {
        serverId: connected.id,
        method: "tools/list",
        ok: !parsed.failed,
      };

      if (parsed.failed) {
        setError("tools/list failed. read the protocol log.");
        return;
      }

      if (matchesExpected(action, lesson)) {
        setSatisfied(true);
        if (!lesson.question) {
          finish();
        } else {
          setHint("the menu is on the wire. answer the question to log it.");
        }
        return;
      }

      setHint("menu loaded. open a tool to read its schema.");
    } catch {
      setError("the server did not return a menu. try tools/list again.");
    } finally {
      setBusy(false);
    }
  }

  function selectTool(tool: McpTool) {
    if (done || busy) return;
    setSelection({ kind: "tool", tool });
    setArgs({});
    setResult(null);
    setError("");
    setHint("");
  }

  function selectResource(resource: McpResource) {
    if (done || busy) return;
    setSelection({ kind: "resource", resource });
    setArgs({});
    setResult(null);
    setError("");
    setHint("");
  }

  function selectPrompt(prompt: McpPrompt) {
    if (done || busy) return;
    setSelection({ kind: "prompt", prompt });
    setArgs({});
    setResult(null);
    setError("");
    setHint("");
  }

  async function sendSelected() {
    if (busy || done || !connected || !selection) return;

    if (selection.kind !== "prompt" && !scope) {
      setError("grant a scope before the request.");
      return;
    }

    setBusy(true);
    setError("");
    setHint("");
    setResult(null);

    const clean = filledArgs(args);

    try {
      if (selection.kind === "tool") {
        const response = await mcpRuntime.callTool(
          connected.id,
          selection.tool.name,
          clean,
          scope,
        );
        handleResult(
          response,
          "tools/call",
          {
            name: selection.tool.name,
            arguments: clean,
            _meta: { scope },
          },
          {
            serverId: connected.id,
            tool: selection.tool.name,
            args: clean,
            scope,
          },
        );
      } else if (selection.kind === "resource") {
        const response = await mcpRuntime.readResource(
          connected.id,
          selection.resource.uri,
        );
        handleResult(
          response,
          "resources/read",
          {
            uri: selection.resource.uri,
            _meta: { scope },
          },
          {
            serverId: connected.id,
            resource: selection.resource.uri,
            scope,
          },
        );
      } else {
        const response = await mcpRuntime.getPrompt(
          connected.id,
          selection.prompt.name,
          clean,
        );
        handleResult(
          response,
          "prompts/get",
          {
            name: selection.prompt.name,
            arguments: clean,
          },
          {
            serverId: connected.id,
            prompt: selection.prompt.name,
            args: clean,
            scope,
          },
        );
      }
    } catch {
      setError("the server did not answer. try the request again.");
    } finally {
      setBusy(false);
    }
  }

  function answerOption(id: string) {
    if (done || busy) return;

    setQuestionId(id);
    const option = lesson.question?.options.find((item) => item.id === id);
    if (!option) return;

    if (!option.correct) {
      setHint(option.feedback);
      return;
    }

    if (satisfied) {
      finish();
    } else {
      setHint("correct reasoning. now send the request the task asks for.");
    }
  }

  function disconnect() {
    if (busy || done) return;
    setConnected(null);
    setTools(null);
    setSelection(null);
    setArgs({});
    setScope("");
    setResult(null);
    setQuestionId("");
    setError("");
    setHint("disconnected. the protocol log is still here.");
  }

  function reset() {
    finished.current = false;
    setServerId("");
    setConnected(null);
    setTools(null);
    setSelection(null);
    setArgs({});
    setScope("");
    setLog([]);
    setResult(null);
    setSatisfied(false);
    setQuestionId("");
    setError("");
    setHint("");
    setDone(false);
    setAwarded(false);
  }

  function updateArg(key: string, value: string) {
    setArgs((previous) => ({ ...previous, [key]: value }));
  }

  const actionLabel =
    selection?.kind === "tool"
      ? "Call tool"
      : selection?.kind === "resource"
        ? "Read resource"
        : "Use prompt";
  const selectionKey = selection
    ? selection.kind === "tool"
      ? selection.tool.name
      : selection.kind === "resource"
        ? selection.resource.uri
        : selection.prompt.name
    : "";

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
              switchboard · connect
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
                  switchboard · connect · lesson{" "}
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
                <p className="pxfont text-[8px] tracking-[0.14em] text-dim">
                  PICK A SERVER
                </p>
                <div className="mt-2 flex flex-col gap-2">
                  {MCP_SERVERS.map((server) => (
                    <button
                      key={server.id}
                      type="button"
                      disabled={done || busy}
                      aria-pressed={serverId === server.id}
                      className={`chip ${
                        serverId === server.id ? "chip--active" : ""
                      }`}
                      onClick={() => {
                        setServerId(server.id);
                        setError("");
                      }}
                    >
                      <span className="block">{server.name}</span>
                      <span className="block text-[14px] text-edge2">
                        {server.description}
                      </span>
                      <span className="mt-1 block text-[12px] text-edge2">
                        {server.capabilities.join(" · ")} ·{" "}
                        {server.protocolVersion}
                      </span>
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className="pixel-btn mt-2 w-full"
                  onClick={connect}
                  disabled={busy || done || !serverId}
                >
                  {busy ? "connecting…" : "Connect"}
                </button>
              </div>

              {connected ? (
                <div className="border-2 border-edge2 bg-accent/10 px-3 py-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="pxfont text-[8px] tracking-[0.16em] text-accent">
                        CONNECTED
                      </p>
                      <p className="termfont mt-1 text-[18px] text-ink">
                        {connected.id} · {connected.protocolVersion}
                      </p>
                      <p className="termfont text-[13px] text-edge2">
                        capabilities · {connected.capabilities.join(", ")}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={disconnect}
                      disabled={busy || done}
                      className="termfont text-[14px] text-dim underline decoration-edge2 underline-offset-4 hover:text-red"
                    >
                      disconnect
                    </button>
                  </div>
                  {offTaskServer ? (
                    <p className="termfont mt-2 text-[14px] leading-snug text-amber">
                      off-task server · the task names{" "}
                      {expectedServer?.name ?? lesson.serverId}.
                    </p>
                  ) : null}
                </div>
              ) : null}

              {connected ? (
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <p className="pxfont text-[8px] tracking-[0.14em] text-dim">
                      TOOLS
                    </p>
                    <span className="termfont text-[12px] text-edge2">
                      {tools ? `${tools.length} listed` : "not listed"}
                    </span>
                  </div>
                  {!connected.capabilities.includes("tool") ? (
                    <p className="termfont mt-2 text-[16px] text-dim">
                      This server does not advertise tools.
                    </p>
                  ) : !tools ? (
                    <button
                      type="button"
                      className="pixel-btn pixel-btn--ghost mt-2 w-full"
                      onClick={listTools}
                      disabled={busy || done}
                    >
                      Send tools/list
                    </button>
                  ) : (
                    <div className="mt-2 flex flex-col gap-2">
                      {tools.length === 0 ? (
                        <p className="termfont text-[16px] text-dim">
                          The menu is empty.
                        </p>
                      ) : null}
                      {tools.map((tool) => (
                        <button
                          key={tool.name}
                          type="button"
                          disabled={done || busy}
                          aria-pressed={
                            selection?.kind === "tool" &&
                            selection.tool.name === tool.name
                          }
                          className={`chip ${
                            selection?.kind === "tool" &&
                            selection.tool.name === tool.name
                              ? "chip--active"
                              : ""
                          }`}
                          onClick={() => selectTool(tool)}
                        >
                          <span className="block">{tool.name}</span>
                          <span className="block text-[14px] text-edge2">
                            {tool.description}
                          </span>
                          <span className="mt-1 block text-[12px] text-amber">
                            scope · {tool.scope}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}

              {connected ? (
                <div>
                  <p className="pxfont text-[8px] tracking-[0.14em] text-dim">
                    RESOURCES
                  </p>
                  {connected.resources.length === 0 ? (
                    <p className="termfont mt-2 text-[16px] text-dim">
                      No resources on this server.
                    </p>
                  ) : (
                    <div className="mt-2 flex flex-col gap-2">
                      {connected.resources.map((resource) => (
                        <button
                          key={resource.uri}
                          type="button"
                          disabled={done || busy}
                          aria-pressed={
                            selection?.kind === "resource" &&
                            selection.resource.uri === resource.uri
                          }
                          className={`chip ${
                            selection?.kind === "resource" &&
                            selection.resource.uri === resource.uri
                              ? "chip--active"
                              : ""
                          }`}
                          onClick={() => selectResource(resource)}
                        >
                          <span className="block">{resource.uri}</span>
                          <span className="block text-[14px] text-edge2">
                            {resource.description}
                          </span>
                          <span className="mt-1 block text-[12px] text-edge2">
                            {resource.mimeType}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}

              {connected ? (
                <div>
                  <p className="pxfont text-[8px] tracking-[0.14em] text-dim">
                    PROMPTS
                  </p>
                  {connected.prompts.length === 0 ? (
                    <p className="termfont mt-2 text-[16px] text-dim">
                      No prompts on this server.
                    </p>
                  ) : (
                    <div className="mt-2 flex flex-col gap-2">
                      {connected.prompts.map((prompt) => (
                        <button
                          key={prompt.name}
                          type="button"
                          disabled={done || busy}
                          aria-pressed={
                            selection?.kind === "prompt" &&
                            selection.prompt.name === prompt.name
                          }
                          className={`chip ${
                            selection?.kind === "prompt" &&
                            selection.prompt.name === prompt.name
                              ? "chip--active"
                              : ""
                          }`}
                          onClick={() => selectPrompt(prompt)}
                        >
                          <span className="block">{prompt.name}</span>
                          <span className="block text-[14px] text-edge2">
                            {prompt.description}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}

              {selection ? (
                <div className="border-2 border-edge bg-black/20 px-3 py-3">
                  <p className="pxfont text-[8px] tracking-[0.14em] text-accent">
                    {selection.kind.toUpperCase()} · {selectionKey}
                  </p>

                  {selection.kind === "tool" ? (
                    <>
                      <p className="termfont mt-1 text-[15px] leading-snug text-dim">
                        {selection.tool.description}
                      </p>
                      <div className="mt-3 flex flex-col gap-2">
                        {Object.entries(selection.tool.properties).map(
                          ([key, property]) => {
                            const required =
                              selection.tool.required.includes(key);
                            return (
                              <div key={key} className="flex flex-col gap-1">
                                <label
                                  htmlFor={`tool-${key}`}
                                  className="termfont text-[14px] text-dim"
                                >
                                  {key}
                                  {required ? " *" : " (optional)"}
                                </label>
                                <input
                                  id={`tool-${key}`}
                                  type={
                                    property.type === "number"
                                      ? "number"
                                      : "text"
                                  }
                                  inputMode={
                                    property.type === "number"
                                      ? "numeric"
                                      : undefined
                                  }
                                  value={args[key] ?? ""}
                                  disabled={done || busy}
                                  onChange={(event) =>
                                    updateArg(key, event.target.value)
                                  }
                                  placeholder={property.description}
                                  className="termfont border-2 border-edge bg-black/20 px-3 py-2 text-[18px] text-ink outline-none focus-visible:border-accent"
                                />
                                <p className="termfont text-[12px] text-edge2">
                                  {property.type} · {property.description}
                                </p>
                              </div>
                            );
                          },
                        )}
                        {Object.keys(selection.tool.properties).length === 0 ? (
                          <p className="termfont text-[15px] text-edge2">
                            This tool takes no arguments.
                          </p>
                        ) : null}
                      </div>
                    </>
                  ) : null}

                  {selection.kind === "resource" ? (
                    <>
                      <p className="termfont mt-1 text-[15px] leading-snug text-dim">
                        {selection.resource.description}
                      </p>
                      <p className="termfont mt-2 text-[13px] text-edge2">
                        {selection.resource.mimeType} · read-only address
                      </p>
                    </>
                  ) : null}

                  {selection.kind === "prompt" ? (
                    <>
                      <p className="termfont mt-1 text-[15px] leading-snug text-dim">
                        {selection.prompt.description}
                      </p>
                      <pre className="termfont mt-2 whitespace-pre-wrap break-words text-[13px] leading-snug text-edge2">
                        {selection.prompt.text}
                      </pre>
                      <div className="mt-3 flex flex-col gap-2">
                        {selection.prompt.arguments.map((argument) => (
                          <div
                            key={argument.name}
                            className="flex flex-col gap-1"
                          >
                            <label
                              htmlFor={`prompt-${argument.name}`}
                              className="termfont text-[14px] text-dim"
                            >
                              {argument.name}
                              {argument.required ? " *" : " (optional)"}
                            </label>
                            <input
                              id={`prompt-${argument.name}`}
                              type="text"
                              value={args[argument.name] ?? ""}
                              disabled={done || busy}
                              onChange={(event) =>
                                updateArg(
                                  argument.name,
                                  event.target.value,
                                )
                              }
                              placeholder={argument.description}
                              className="termfont border-2 border-edge bg-black/20 px-3 py-2 text-[18px] text-ink outline-none focus-visible:border-accent"
                            />
                            <p className="termfont text-[12px] text-edge2">
                              {argument.description}
                            </p>
                          </div>
                        ))}
                        {selection.prompt.arguments.length === 0 ? (
                          <p className="termfont text-[15px] text-edge2">
                            This prompt takes no arguments.
                          </p>
                        ) : null}
                      </div>
                    </>
                  ) : null}
                </div>
              ) : null}

              {connected && selection && selection.kind !== "prompt" ? (
                <div>
                  <p className="pxfont text-[8px] tracking-[0.14em] text-dim">
                    GRANT A SCOPE
                  </p>
                  <div className="mt-2 flex flex-col gap-2">
                    {connected.scopes.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        disabled={done || busy}
                        aria-pressed={scope === item.id}
                        className={`chip ${
                          scope === item.id ? "chip--active" : ""
                        }`}
                        onClick={() => {
                          setScope(item.id);
                          setError("");
                        }}
                      >
                        <span className="block">{item.label}</span>
                        <span className="block text-[14px] text-edge2">
                          {item.hint}
                        </span>
                      </button>
                    ))}
                  </div>
                  <p className="termfont mt-1 text-[13px] text-edge2">
                    scope is sent with the request, not with initialize.
                  </p>
                </div>
              ) : null}

              {result ? (
                <div
                  className={`border-2 px-3 py-2.5 ${
                    result.ok
                      ? "border-edge2 bg-accent/5"
                      : "border-red/60 bg-red/5"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p
                      className={`pxfont text-[8px] tracking-[0.14em] ${
                        result.ok ? "text-accent" : "text-red"
                      }`}
                    >
                      {result.ok ? "RESULT" : "ERROR"}
                    </p>
                    <span className="termfont text-[12px] text-edge2">
                      {result.ms}ms
                    </span>
                  </div>
                  <p className="termfont mt-1 max-h-40 overflow-y-auto whitespace-pre-wrap break-words text-[15px] leading-snug text-ink">
                    {result.ok ? result.output : result.error}
                  </p>
                </div>
              ) : null}

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

              {selection ? (
                <button
                  type="button"
                  className="pixel-btn w-full"
                  onClick={sendSelected}
                  disabled={busy || done}
                >
                  {busy ? "sending…" : actionLabel}
                </button>
              ) : null}

              {lesson.question && satisfied ? (
                <div className="border-2 border-amber/60 bg-amber/5 px-3 py-3">
                  <p className="pxfont text-[8px] tracking-[0.14em] text-amber">
                    READ THE PROTOCOL
                  </p>
                  <p className="termfont mt-2 text-[17px] leading-[1.35] text-ink">
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
                        onClick={() => answerOption(option.id)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                  {selectedAnswer && !selectedAnswer.correct ? (
                    <p className="termfont mt-2 text-[14px] leading-snug text-amber">
                      {selectedAnswer.feedback}
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
                    SWITCHBOARD PROGRESS
                  </p>
                  <p className="termfont mt-1 text-[18px] text-ink">
                    {completedCount} / {CONNECT_LESSONS.length}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="pixel-panel flex min-h-[440px] flex-col overflow-hidden lg:min-h-[560px]">
            <div className="flex items-center justify-between border-b-2 border-edge/60 px-4 py-2.5 sm:px-5">
              <span className="pxfont text-[9px] tracking-[0.16em] text-dim">
                PROTOCOL LOG
              </span>
              <span className="flex items-center gap-2 termfont text-[14px] text-edge2">
                <span
                  className={`status-dot ${
                    connected ? "status-dot--on" : ""
                  }`}
                />
                {connected ? connected.id : "offline"}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-5">
              {log.length === 0 ? (
                <div className="flex h-full flex-col justify-center gap-3">
                  <p className="termfont text-[19px] leading-[1.35] text-dim">
                    Nothing on the wire yet. Pick a server, connect, and the
                    initialize request and response will land here.
                  </p>
                  <p className="termfont text-[16px] text-edge2">
                    Raw JSON-RPC only. Read the ids, the result, and the error
                    codes.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {log.map((entry, index) => (
                    <div
                      key={`${entry.id}-${index}`}
                      className={`border-2 bg-black/15 ${
                        entry.ok ? "border-edge" : "border-red/60"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 border-b-2 border-edge/50 px-3 py-1.5">
                        <span className="pxfont text-[8px] text-accent">
                          {String(index + 1).padStart(2, "0")} · {entry.method}
                        </span>
                        <span
                          className={`pxfont text-[8px] ${
                            entry.ok ? "text-accent" : "text-red"
                          }`}
                        >
                          {entry.ok
                            ? "OK"
                            : entry.code !== undefined
                              ? `ERR ${entry.code}`
                              : "ERROR"}
                        </span>
                      </div>

                      <div className="px-3 py-2">
                        <p className="pxfont text-[8px] tracking-[0.14em] text-dim">
                          REQUEST · {entry.serverId}
                        </p>
                        <pre className="termfont mt-1 whitespace-pre-wrap break-all text-[13px] leading-[1.35] text-amber/90">
                          {entry.request}
                        </pre>
                      </div>

                      <div
                        className={`border-t-2 px-3 py-2 ${
                          entry.ok ? "border-edge/40" : "border-red/40"
                        }`}
                      >
                        <p
                          className={`pxfont text-[8px] tracking-[0.14em] ${
                            entry.ok ? "text-dim" : "text-red"
                          }`}
                        >
                          RESPONSE
                        </p>
                        <pre
                          className={`termfont mt-1 whitespace-pre-wrap break-all text-[13px] leading-[1.35] ${
                            entry.ok ? "text-ink" : "text-red"
                          }`}
                        >
                          {entry.response}
                        </pre>
                      </div>

                      {entry.ms !== undefined ? (
                        <p className="termfont px-3 pb-2 text-right text-[12px] text-edge2">
                          {entry.ms}ms
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
                      {awarded ? "session logged · new xp" : "already completed"}
                    </span>
                    <span className="pxfont text-[9px] text-ink">
                      +{lesson.xp} XP
                    </span>
                  </div>
                  <div className="border-2 border-edge bg-black/20 px-3 py-2">
                    <p className="pxfont text-[8px] tracking-[0.14em] text-dim">
                      ARTIFACT
                    </p>
                    <p className="termfont mt-1 text-[17px] text-ink">
                      {lesson.artifact.name}
                    </p>
                    <p className="termfont text-[13px] text-dim">
                      {lesson.artifact.note}
                    </p>
                  </div>
                  {next ? (
                    <Link
                      href={`/connect/${next.id}`}
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
                    text={`I wired an MCP server on Bench — ${lesson.title}.`}
                    label="Share the session"
                  />
                  <button
                    type="button"
                    onClick={reset}
                    className="termfont text-center text-[15px] text-dim underline decoration-edge2 underline-offset-4 hover:text-ink"
                  >
                    reset the switchboard
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
              {String(CONNECT_LESSONS.length).padStart(2, "0")}
            </span>
          </div>
          <LegalLinks />
        </footer>
      </div>
    </div>
  );
}
