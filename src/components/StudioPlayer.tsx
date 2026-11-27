"use client";

import Link from "next/link";
import { track } from "@vercel/analytics";
import { useEffect, useRef, useState } from "react";
import { LegalLinks } from "./LegalLinks";
import { ShareButton } from "./ShareButton";
import { completeQuest } from "@/lib/progress";
import { useProgress } from "@/lib/useProgress";
import { shellRuntime, type ShellState } from "@/lib/shell-runtime";
import type { PilotSetup } from "@/game/pilot";
import type {
  Studio,
  StudioMission,
  StudioTerminalStep,
} from "@/game/studio";

type McpTool = {
  name: string;
  description: string;
};

type ServerInfo = {
  name: string;
  version: string;
  protocol: string;
  instructions: string;
};

type TerminalRun = {
  output: string;
  exitCode: number;
  ok: boolean;
  local: boolean;
};

type LogTone = "ok" | "warn" | "error" | "info";

type LogEntry = {
  id: number;
  tag: string;
  title: string;
  body?: string;
  tone: LogTone;
};

type Feedback = {
  ok: boolean;
  text: string;
};

type ToolField = {
  key: string;
  label: string;
  options?: string[];
  placeholder?: string;
};

const TOOL_FIELDS: Record<string, ToolField[]> = {
  read_notes: [
    {
      key: "path",
      label: "path",
      options: ["study.md", "reading-list.md"],
    },
  ],
  search_notes: [
    {
      key: "query",
      label: "query",
      placeholder: "photosynthesis",
    },
  ],
  word_count: [
    {
      key: "path",
      label: "path",
      options: ["study.md", "reading-list.md"],
    },
  ],
};

function parseServerInfo(result: unknown): ServerInfo {
  const data = (result ?? {}) as Record<string, unknown>;
  const info = (data.serverInfo ?? {}) as Record<string, unknown>;

  return {
    name: typeof info.name === "string" ? info.name : "bench-notes",
    version: typeof info.version === "string" ? info.version : "unknown",
    protocol:
      typeof data.protocolVersion === "string"
        ? data.protocolVersion
        : "unknown",
    instructions:
      typeof data.instructions === "string" ? data.instructions : "",
  };
}

function parseTools(result: unknown): McpTool[] {
  const data = (result ?? {}) as Record<string, unknown>;
  if (!Array.isArray(data.tools)) return [];

  const tools: McpTool[] = [];
  for (const raw of data.tools) {
    if (!raw || typeof raw !== "object") continue;
    const item = raw as Record<string, unknown>;
    if (typeof item.name !== "string") continue;
    tools.push({
      name: item.name,
      description:
        typeof item.description === "string" ? item.description : "",
    });
  }
  return tools;
}

function parseToolResult(result: unknown): {
  text: string;
  isError: boolean;
} {
  const data = (result ?? {}) as Record<string, unknown>;
  const parts: string[] = [];

  if (Array.isArray(data.content)) {
    for (const raw of data.content) {
      if (!raw || typeof raw !== "object") continue;
      const block = raw as Record<string, unknown>;
      if (typeof block.text === "string") parts.push(block.text);
    }
  }

  return {
    text: parts.join("\n"),
    isError: data.isError === true,
  };
}

function errorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return "The notes server did not answer. Check the connection and retry.";
}

function wireSummary(mission: StudioMission | undefined) {
  if (!mission) return "not wired";
  const args = Object.entries(mission.args ?? {})
    .map(([key, value]) => `${key}: "${value}"`)
    .join(", ");
  const mcp = `initialize → tools/list → tools/call ${mission.tool ?? "read_notes"}(${args})`;
  const shell = mission.terminal?.steps
    .map((step) => step.command)
    .join(" · ");

  return shell ? `${mcp}\nshell · ${shell}` : mcp;
}

function resolveLocalPath(setup: PilotSetup, path: string) {
  if (path.startsWith("/")) return path;
  const cwd = setup.cwd.endsWith("/")
    ? setup.cwd.slice(0, -1)
    : setup.cwd;
  return `${cwd}/${path}`;
}

function localName(setup: PilotSetup, path: string) {
  const cwd = setup.cwd.endsWith("/")
    ? setup.cwd.slice(0, -1)
    : setup.cwd;
  if (path === cwd) return "";
  if (path.startsWith(`${cwd}/`)) return path.slice(cwd.length + 1);
  return path;
}

function fallbackShell(setup: PilotSetup, rawCommand: string) {
  const command = rawCommand.trim();

  if (command === "pwd") {
    return { output: setup.cwd, exitCode: 0 };
  }

  if (command === "ls") {
    const entries = new Set<string>();

    for (const dir of setup.dirs) {
      const name = localName(setup, dir);
      if (name && !name.includes("/")) entries.add(`${name}/`);
    }

    for (const file of Object.keys(setup.files)) {
      const name = localName(setup, file);
      if (name && !name.includes("/")) entries.add(name);
    }

    return { output: [...entries].sort().join("\n"), exitCode: 0 };
  }

  if (command === "git status") {
    const lines = ["On branch main"];

    if (setup.git.staged.length > 0) {
      lines.push("Changes to be committed:");
      for (const file of setup.git.staged) {
        lines.push(`  staged: ${file}`);
      }
    } else {
      lines.push("nothing staged");
    }

    lines.push(`${setup.git.commits.length} commit(s) on this branch`);
    return { output: lines.join("\n"), exitCode: 0 };
  }

  if (command.startsWith("cat ")) {
    const path = command.slice(4).trim();
    const file =
      setup.files[resolveLocalPath(setup, path)] ?? setup.files[path];
    if (file === undefined) {
      return { output: `cat: ${path}: no such file`, exitCode: 1 };
    }
    return { output: file, exitCode: 0 };
  }

  if (command.startsWith("grep ")) {
    const rest = command.slice(5).trim();
    const flagMatch = rest.match(/^((?:-[a-zA-Z]+\s+)*)/);
    const flags = flagMatch?.[1] ?? "";
    const remainder = rest.slice(flags.length).trim();
    const quote = remainder[0];

    let pattern = "";
    let path = "";

    if (quote === '"' || quote === "'") {
      const close = remainder.indexOf(quote, 1);
      if (close === -1) {
        return { output: "grep: unterminated pattern", exitCode: 2 };
      }
      pattern = remainder.slice(1, close);
      path = remainder.slice(close + 1).trim();
    } else {
      const space = remainder.indexOf(" ");
      if (space === -1) {
        return { output: "grep: missing file", exitCode: 2 };
      }
      pattern = remainder.slice(0, space);
      path = remainder.slice(space + 1).trim();
    }

    path = path.replace(/^["']|["']$/g, "");
    const file =
      setup.files[resolveLocalPath(setup, path)] ?? setup.files[path];
    if (file === undefined) {
      return { output: `grep: ${path}: no such file`, exitCode: 2 };
    }

    const caseInsensitive = flags.includes("i");
    const numbered = flags.includes("n");
    const hits: string[] = [];

    file.split("\n").forEach((line, index) => {
      const haystack = caseInsensitive ? line.toLowerCase() : line;
      const needle = caseInsensitive ? pattern.toLowerCase() : pattern;
      if (haystack.includes(needle)) {
        hits.push(`${numbered ? `${index + 1}:` : ""}${line}`);
      }
    });

    return {
      output: hits.join("\n"),
      exitCode: hits.length > 0 ? 0 : 1,
    };
  }

  return {
    output: `command not available in the local shell: ${command}`,
    exitCode: 127,
  };
}

function toneBox(tone: LogTone) {
  if (tone === "error") return "border-red/60 bg-red/5";
  if (tone === "warn") return "border-amber/60 bg-amber/5";
  if (tone === "ok") return "border-edge2 bg-accent/5";
  return "border-edge bg-black/15";
}

function toneTag(tone: LogTone) {
  if (tone === "error") return "text-red";
  if (tone === "warn") return "text-amber";
  if (tone === "ok") return "text-accent";
  return "text-dim";
}

function PortfolioSummary({
  brief,
  tools,
  checks,
  bounds,
}: {
  brief: string;
  tools: string;
  checks: string[];
  bounds: string;
}) {
  return (
    <div className="border-2 border-edge2 bg-black/25 px-3 py-3">
      <p className="pxfont text-[8px] tracking-[0.14em] text-accent">
        PORTFOLIO
      </p>
      <dl className="mt-3 flex flex-col gap-3">
        <div>
          <dt className="pxfont text-[8px] tracking-[0.12em] text-dim">
            BRIEF
          </dt>
          <dd className="termfont mt-1 text-[16px] leading-snug text-ink">
            {brief}
          </dd>
        </div>
        <div>
          <dt className="pxfont text-[8px] tracking-[0.12em] text-dim">
            TOOLS USED
          </dt>
          <dd className="termfont mt-1 whitespace-pre-line text-[15px] leading-snug text-dim">
            {tools}
          </dd>
        </div>
        <div>
          <dt className="pxfont text-[8px] tracking-[0.12em] text-dim">
            CHECKS
          </dt>
          <dd className="mt-1">
            {checks.length > 0 ? (
              <ol className="flex flex-col gap-1">
                {checks.map((check, index) => (
                  <li
                    key={check}
                    className="termfont text-[15px] leading-snug text-ink"
                  >
                    <span className="text-accent">
                      {String(index + 1).padStart(2, "0")}
                    </span>{" "}
                    · {check}
                  </li>
                ))}
              </ol>
            ) : (
              <span className="termfont text-[15px] text-dim">not set</span>
            )}
          </dd>
        </div>
        <div>
          <dt className="pxfont text-[8px] tracking-[0.12em] text-dim">
            BOUNDS
          </dt>
          <dd className="termfont mt-1 text-[16px] leading-snug text-ink">
            {bounds}
          </dd>
        </div>
      </dl>
    </div>
  );
}

export function StudioPlayer({ studio }: { studio: Studio }) {
  const progress = useProgress();
  const [step, setStep] = useState(0);
  const [completed, setCompleted] = useState<boolean[]>(() =>
    studio.missions.map(() => false),
  );
  const completedRef = useRef<boolean[]>(studio.missions.map(() => false));
  const [picked, setPicked] = useState<Record<string, string>>({});
  const [multiPicked, setMultiPicked] = useState<Record<string, string[]>>({});
  const [feedback, setFeedback] = useState<Record<string, Feedback>>({});
  const [log, setLog] = useState<LogEntry[]>([]);
  const logId = useRef(0);
  const requestId = useRef(0);
  const shellRef = useRef<ShellState | null>(null);
  const [terminalRuns, setTerminalRuns] = useState<
    Record<string, TerminalRun>
  >({});
  const [wireHint, setWireHint] = useState("");
  const [wireError, setWireError] = useState("");
  const [busy, setBusy] = useState<"" | "init" | "tools" | "call">("");
  const [initialized, setInitialized] = useState(false);
  const [toolsLoaded, setToolsLoaded] = useState(false);
  const [server, setServer] = useState<ServerInfo | null>(null);
  const [tools, setTools] = useState<McpTool[]>([]);
  const [selectedTool, setSelectedTool] = useState("");
  const [toolArgs, setToolArgs] = useState<Record<string, string>>({});
  const [note, setNote] = useState("");
  const [noteOk, setNoteOk] = useState(false);
  const [done, setDone] = useState(false);
  const [awarded, setAwarded] = useState(false);
  const awardedRef = useRef(false);

  const mission = studio.missions[step];
  const missionDone = completed[step];
  const alreadyDone = progress.completed.includes(studio.id);
  const isLastMission = step === studio.missions.length - 1;
  const totalMissions = studio.missions.length;

  const wireMission = studio.missions.find(
    (item) => item.kind === "connect" || item.kind === "terminal",
  );
  const briefMission = studio.missions[0];
  const evidenceMission = studio.missions[2];
  const boundsMission = studio.missions[3];

  const selectedIds = mission
    ? (multiPicked[mission.id] ?? [])
    : ([] as string[]);

  const briefChoice =
    briefMission?.options?.find(
      (option) => option.id === picked[briefMission.id],
    ) ?? briefMission?.options?.find((option) => option.correct);

  const chosenChecks = (evidenceMission?.options ?? []).filter((option) =>
    (multiPicked[evidenceMission?.id ?? ""] ?? []).includes(option.id),
  );
  const checks = (
    chosenChecks.length > 0
      ? chosenChecks
      : (evidenceMission?.options ?? []).filter((option) => option.correct)
  ).map((option) => option.label);

  const boundsChoice =
    boundsMission?.options?.find(
      (option) => option.id === picked[boundsMission.id],
    ) ?? boundsMission?.options?.find((option) => option.correct);

  const portfolioText = [
    `brief · ${briefChoice?.label ?? "not set"}`,
    `tools · ${wireSummary(wireMission)}`,
    `checks · ${checks.join(" | ")}`,
    `bounds · ${boundsChoice?.label ?? "not set"}`,
  ].join("\n");

  const terminalSteps = wireMission?.terminal?.steps ?? [];
  const terminalPassed = terminalSteps.every(
    (item) => terminalRuns[item.id]?.ok,
  );
  const terminalDoneCount = terminalSteps.filter(
    (item) => terminalRuns[item.id]?.ok,
  ).length;

  const alreadyDoneMessage = alreadyDone && !done;

  useEffect(() => {
    track("studio_start", { studio: studio.id, track: studio.track });
  }, [studio.id, studio.track]);

  function addLog(entry: Omit<LogEntry, "id">) {
    logId.current += 1;
    const id = logId.current;
    setLog((prev) => [...prev, { ...entry, id }]);
  }

  function acceptMission() {
    if (completedRef.current[step]) return;
    const next = [...completedRef.current];
    next[step] = true;
    completedRef.current = next;
    setCompleted(next);

    const option =
      mission.kind === "eval"
        ? undefined
        : mission.options?.find((item) =>
            mission.multi
              ? (multiPicked[mission.id] ?? []).includes(item.id)
              : picked[mission.id] === item.id,
          );

    const body =
      mission.kind === "eval"
        ? (mission.options ?? [])
            .filter((item) => item.correct)
            .map((item) => `- ${item.label}`)
            .join("\n")
        : mission.kind === "connect" || mission.kind === "terminal"
          ? wireSummary(wireMission)
          : option?.label;

    const tag =
      mission.kind === "choice"
        ? "BRIEF"
        : mission.kind === "eval"
          ? "EVIDENCE"
          : mission.kind === "budget"
            ? "BOUNDS"
            : "WIRE";

    const title =
      mission.kind === "choice"
        ? "brief locked"
        : mission.kind === "eval"
          ? "evidence gate set"
          : mission.kind === "budget"
            ? "bounds approved"
            : "wire checks passed";

    addLog({ tag, title, body, tone: "ok" });
  }

  function continueMission() {
    if (!completed[step]) return;
    setStep((current) => Math.min(current + 1, totalMissions - 1));
  }

  function clearFeedback(missionId: string) {
    setFeedback((prev) => {
      if (!prev[missionId]) return prev;
      const next = { ...prev };
      delete next[missionId];
      return next;
    });
  }

  function pickOption(mission: StudioMission, optionId: string) {
    if (completed[step]) return;
    setPicked((prev) => ({ ...prev, [mission.id]: optionId }));
    clearFeedback(mission.id);
  }

  function toggleOption(mission: StudioMission, optionId: string) {
    if (completed[step]) return;
    const current = multiPicked[mission.id] ?? [];
    const next = current.includes(optionId)
      ? current.filter((id) => id !== optionId)
      : [...current, optionId];

    if (next.length > 3) {
      setFeedback((prev) => ({
        ...prev,
        [mission.id]: {
          ok: false,
          text: "Three checks only. Deselect one before adding another.",
        },
      }));
      return;
    }

    setMultiPicked((prev) => ({ ...prev, [mission.id]: next }));
    clearFeedback(mission.id);
  }

  function submitChoice(mission: StudioMission) {
    if (completed[step]) return;
    const options = mission.options ?? [];

    if (mission.multi) {
      const ids = multiPicked[mission.id] ?? [];
      const correct = options.filter((option) => option.correct);
      const chosen = new Set(ids);
      const exact =
        ids.length === correct.length &&
        correct.every((option) => chosen.has(option.id)) &&
        ids.every((id) => correct.some((option) => option.id === id));

      if (!exact) {
        setFeedback((prev) => ({
          ...prev,
          [mission.id]: {
            ok: false,
            text:
              ids.length !== correct.length
                ? `Three checks only. You selected ${ids.length}. Pick checks that can fail on a bad run.`
                : "Not yet. At least one check describes a feeling or trusts the model instead of testing the job.",
          },
        }));
        return;
      }

      acceptMission();
      setFeedback((prev) => ({
        ...prev,
        [mission.id]: {
          ok: true,
          text: "Evidence gate set. These checks can catch a confident wrong answer.",
        },
      }));
      return;
    }

    const option = options.find((item) => item.id === picked[mission.id]);

    if (!option) {
      setFeedback((prev) => ({
        ...prev,
        [mission.id]: {
          ok: false,
          text: "Pick one option before you lock it.",
        },
      }));
      return;
    }

    if (!option.correct) {
      setFeedback((prev) => ({
        ...prev,
        [mission.id]: { ok: false, text: option.feedback },
      }));
      return;
    }

    acceptMission();
    setFeedback((prev) => ({
      ...prev,
      [mission.id]: { ok: true, text: option.feedback },
    }));
  }

  async function rpc(method: string, params: Record<string, unknown>) {
    requestId.current += 1;
    const serverId = wireMission?.serverId ?? "bench-notes";
    let response: Response;

    try {
      response = await fetch(`/api/mcp/${serverId}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: String(requestId.current),
          method,
          params,
        }),
      });
    } catch {
      throw new Error(
        "The notes server did not answer. Check the connection and retry.",
      );
    }

    if (response.status === 429) {
      throw new Error(
        "The notes server is rate limiting calls. Wait a few seconds, then retry.",
      );
    }

    if (!response.ok) {
      throw new Error(
        `The notes server returned ${response.status}. Retry in a moment.`,
      );
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new Error(
        "The notes server sent a reply we could not read. Retry.",
      );
    }

    const data = (payload ?? {}) as Record<string, unknown>;
    const rpcError = data.error;

    if (rpcError && typeof rpcError === "object") {
      const message = (rpcError as Record<string, unknown>).message;
      throw new Error(
        typeof message === "string"
          ? `The notes server refused the call: ${message}`
          : "The notes server refused the call. Retry.",
      );
    }

    return data.result;
  }

  function wireReady(runs: Record<string, TerminalRun>, readOk: boolean) {
    if (!readOk) return false;
    const steps = wireMission?.terminal?.steps ?? [];
    return steps.every((item) => runs[item.id]?.ok);
  }

  async function initializeServer() {
    if (busy !== "" || initialized) return;
    setBusy("init");
    setWireError("");
    setWireHint("");

    try {
      const result = await rpc("initialize", {
        protocolVersion: "2025-06-18",
        capabilities: {},
        clientInfo: { name: "bench-studio", version: "1.0.0" },
      });
      const info = parseServerInfo(result);
      setServer(info);
      setInitialized(true);
      addLog({
        tag: "MCP",
        title: "initialize · bench-notes",
        body: `protocol ${info.protocol} · ${info.name} ${info.version}`,
        tone: "ok",
      });
    } catch (error) {
      const message = errorMessage(error);
      setWireError(message);
      addLog({
        tag: "MCP",
        title: "initialize failed",
        body: message,
        tone: "error",
      });
    } finally {
      setBusy("");
    }
  }

  async function listTools() {
    if (busy !== "" || !initialized || toolsLoaded) return;
    setBusy("tools");
    setWireError("");
    setWireHint("");

    try {
      const result = await rpc("tools/list", {});
      const nextTools = parseTools(result);

      if (nextTools.length === 0) {
        throw new Error("The server returned an empty tool list. Retry.");
      }

      setTools(nextTools);
      setToolsLoaded(true);
      addLog({
        tag: "MCP",
        title: `tools/list · ${nextTools.length} tools`,
        body: nextTools
          .map((tool) => `${tool.name} — ${tool.description}`)
          .join("\n"),
        tone: "ok",
      });
    } catch (error) {
      const message = errorMessage(error);
      setWireError(message);
      addLog({
        tag: "MCP",
        title: "tools/list failed",
        body: message,
        tone: "error",
      });
    } finally {
      setBusy("");
    }
  }

  function selectTool(name: string) {
    if (busy !== "" || noteOk) return;
    setSelectedTool(name);
    setToolArgs({});
    setNote("");
    setWireHint("");
    setWireError("");
  }

  function setToolArg(key: string, value: string) {
    setToolArgs((prev) => ({ ...prev, [key]: value }));
    setNote("");
    setWireHint("");
  }

  async function callTool() {
    if (busy !== "" || !selectedTool || noteOk || !toolsLoaded) return;

    const fields = TOOL_FIELDS[selectedTool] ?? [];
    const missing = fields.some(
      (field) => !(toolArgs[field.key] ?? "").trim(),
    );

    if (missing) {
      setWireHint("Fill every required field before the call.");
      return;
    }

    setBusy("call");
    setWireError("");
    setWireHint("");
    setNote("");

    try {
      const result = await rpc("tools/call", {
        name: selectedTool,
        arguments: toolArgs,
      });
      const parsed = parseToolResult(result);

      if (parsed.isError) {
        const message =
          parsed.text || "The tool returned an error. Retry the call.";
        setWireError(message);
        addLog({
          tag: "MCP",
          title: `tools/call ${selectedTool} · error`,
          body: message,
          tone: "error",
        });
        return;
      }

      const expectedArgs = wireMission?.args ?? {};
      const argsMatch = Object.entries(expectedArgs).every(
        ([key, value]) => toolArgs[key] === value,
      );
      const ok =
        selectedTool === wireMission?.tool &&
        argsMatch &&
        parsed.text.trim().length > 0;

      setNote(parsed.text);
      addLog({
        tag: "MCP",
        title: `tools/call ${selectedTool}`,
        body: parsed.text,
        tone: ok ? "ok" : "warn",
      });

      if (!ok) {
        setWireHint(
          `The call worked. This mission needs ${
            wireMission?.tool ?? "read_notes"
          } with ${JSON.stringify(expectedArgs)}.`,
        );
        return;
      }

      setNoteOk(true);

      if (wireReady(terminalRuns, true)) {
        acceptMission();
      }
    } catch (error) {
      const message = errorMessage(error);
      setWireError(message);
      addLog({
        tag: "MCP",
        title: `tools/call ${selectedTool} failed`,
        body: message,
        tone: "error",
      });
    } finally {
      setBusy("");
    }
  }

  function runTerminal(terminalStep: StudioTerminalStep) {
    const terminal = wireMission?.terminal;
    if (!terminal || busy !== "" || completed[step]) return;

    let output = "";
    let exitCode = 0;
    let local = false;

    try {
      if (!shellRef.current) {
        shellRef.current = shellRuntime.init(terminal.setup);
      }
      const result = shellRuntime.exec(terminalStep.command, shellRef.current);
      shellRef.current = result.state;
      output = result.output;
      exitCode = result.exitCode;
    } catch {
      const fallback = fallbackShell(terminal.setup, terminalStep.command);
      output = fallback.output;
      exitCode = fallback.exitCode;
      local = true;
    }

    const ok =
      exitCode === 0 &&
      terminalStep.expect.every((token) => output.includes(token));

    const nextRuns = {
      ...terminalRuns,
      [terminalStep.id]: { output, exitCode, ok, local },
    };

    setTerminalRuns(nextRuns);
    addLog({
      tag: "SHELL",
      title: `$ ${terminalStep.command}`,
      body: `${output}\nexit ${exitCode}${local ? "\nlocal reference shell" : ""}`,
      tone: ok ? "ok" : "error",
    });

    if (!ok) {
      setWireHint(
        "That command did not return what the runbook expects. Run it again.",
      );
      return;
    }

    setWireHint("");
    if (wireReady(nextRuns, noteOk)) {
      acceptMission();
    }
  }

  function filePortfolio() {
    if (done) return;

    const earlierDone = completedRef.current
      .slice(0, totalMissions - 1)
      .every(Boolean);

    if (!earlierDone || !noteOk) {
      setFeedback((prev) => ({
        ...prev,
        [mission.id]: {
          ok: false,
          text: "The build is not ready to file. The live MCP read must succeed before the portfolio can close.",
        },
      }));
      return;
    }

    setDone(true);
    const next = [...completedRef.current];
    next[totalMissions - 1] = true;
    completedRef.current = next;
    setCompleted(next);

    let fresh = false;
    if (!awardedRef.current) {
      awardedRef.current = true;
      fresh = completeQuest(studio.id, studio.xp, studio.artifact.id);
    }

    setAwarded(fresh);
    addLog({
      tag: "PORTFOLIO",
      title: fresh ? "portfolio filed · new xp" : "portfolio filed · replay",
      body: portfolioText,
      tone: "ok",
    });
    track("studio_complete", {
      studio: studio.id,
      track: studio.track,
      xp_awarded: fresh,
    });
  }

  const itemFeedback = feedback[mission?.id ?? ""];
  const smallButton =
    "termfont cursor-pointer border-2 border-edge2 px-2.5 py-1.5 text-[15px] leading-none text-accent hover:bg-accent/10 disabled:cursor-not-allowed disabled:opacity-40";
  const isChoiceMission =
    mission?.kind === "choice" ||
    mission?.kind === "eval" ||
    mission?.kind === "budget";
  const isWireMission =
    mission?.kind === "connect" || mission?.kind === "terminal";

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
              launchpad · studio
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
                  {studio.zone.toLowerCase()} · studio · {studio.track} path
                </p>
                <h1 className="pxfont mt-3 text-[17px] leading-[1.6] text-ink sm:text-[19px]">
                  {studio.title}
                </h1>
                <p className="termfont mt-3 text-[19px] leading-[1.35] text-dim">
                  {studio.goal}
                </p>
                {alreadyDoneMessage ? (
                  <p className="termfont mt-2 text-[15px] text-amber">
                    portfolio already filed · replaying will not add xp
                  </p>
                ) : null}
              </div>

              <ol
                className="grid grid-cols-5 gap-1 border-2 border-edge bg-black/20 p-2"
                aria-label="Studio progress"
              >
                {studio.missions.map((item, index) => {
                  const isDone = completed[index];
                  const isActive = index === step;
                  return (
                    <li
                      key={item.id}
                      aria-current={isActive ? "step" : undefined}
                      className="flex flex-col gap-1"
                    >
                      <span
                        className={`h-1.5 ${
                          isDone
                            ? "bg-accent"
                            : isActive
                              ? "bg-amber"
                              : "bg-edge"
                        }`}
                      />
                      <span
                        className={`pxfont text-[7px] tracking-[0.06em] ${
                          isDone
                            ? "text-accent"
                            : isActive
                              ? "text-amber"
                              : "text-edge2"
                        }`}
                      >
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span
                        className={`termfont text-[13px] leading-none ${
                          isDone
                            ? "text-accent"
                            : isActive
                              ? "text-amber"
                              : "text-edge2"
                        }`}
                      >
                        {item.id}
                      </span>
                    </li>
                  );
                })}
              </ol>

              <div className="hairline" />

              {done ? (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between gap-3 border-2 border-edge2 bg-accent/10 px-3 py-2.5">
                    <span className="termfont text-[16px] text-accent">
                      {awarded
                        ? "portfolio filed · new xp"
                        : "already completed · no new xp"}
                    </span>
                    <span className="pxfont text-[9px] text-ink">
                      +{studio.xp} XP
                    </span>
                  </div>

                  <div className="border-2 border-edge bg-black/20 px-3 py-2.5">
                    <p className="termfont text-[13px] uppercase tracking-[0.12em] text-dim">
                      portfolio artifact
                    </p>
                    <p className="termfont mt-1 text-[19px] text-ink">
                      {studio.artifact.name}
                    </p>
                    <p className="termfont text-[15px] text-dim">
                      {studio.artifact.note}
                    </p>
                  </div>

                  <PortfolioSummary
                    brief={briefChoice?.label ?? "not set"}
                    tools={wireSummary(wireMission)}
                    checks={checks}
                    bounds={boundsChoice?.label ?? "not set"}
                  />

                  <Link href="/campus" className="pixel-btn w-full">
                    Back to campus
                  </Link>
                  <ShareButton
                    text={`I built the ${studio.track} portfolio on Bench — ${studio.artifact.note}.`}
                    label="Share the portfolio"
                  />
                </div>
              ) : mission ? (
                <div className="flex flex-col gap-4">
                  <div>
                    <p className="kicker">
                      mission {String(step + 1).padStart(2, "0")} ·{" "}
                      {mission.id}
                    </p>
                    <h2 className="pxfont mt-2 text-[13px] leading-[1.6] text-ink">
                      {mission.title}
                    </h2>
                    <p className="termfont mt-2 text-[17px] leading-snug text-dim">
                      {mission.detail}
                    </p>
                  </div>

                  <div className="border-2 border-edge2 bg-black/25 px-3 py-2.5">
                    <p className="pxfont text-[8px] tracking-[0.14em] text-accent">
                      THE TASK
                    </p>
                    <p className="termfont mt-1 text-[18px] leading-[1.35] text-ink">
                      {mission.prompt}
                    </p>
                  </div>

                  {isChoiceMission ? (
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="pxfont text-[8px] tracking-[0.14em] text-dim">
                          {mission.multi ? "PICK THREE" : "PICK ONE"}
                        </p>
                        {mission.multi ? (
                          <span className="termfont text-[14px] text-edge2">
                            {selectedIds.length} / 3 selected
                          </span>
                        ) : null}
                      </div>

                      <div className="flex flex-col gap-2">
                        {(mission.options ?? []).map((option) => {
                          const active = mission.multi
                            ? selectedIds.includes(option.id)
                            : picked[mission.id] === option.id;
                          return (
                            <button
                              key={option.id}
                              type="button"
                              disabled={missionDone}
                              aria-pressed={active}
                              className={`chip ${
                                active ? "chip--active" : ""
                              }`}
                              onClick={() =>
                                mission.multi
                                  ? toggleOption(mission, option.id)
                                  : pickOption(mission, option.id)
                              }
                            >
                              <span className="block">{option.label}</span>
                            </button>
                          );
                        })}
                      </div>

                      {itemFeedback ? (
                        <div
                          className={`border-2 px-3 py-2.5 ${
                            itemFeedback.ok
                              ? "border-edge2 bg-accent/5"
                              : "border-red/60 bg-red/5"
                          }`}
                        >
                          <p
                            className={`pxfont text-[8px] tracking-[0.14em] ${
                              itemFeedback.ok ? "text-accent" : "text-red"
                            }`}
                          >
                            {itemFeedback.ok ? "GATE PASSED" : "NOT YET"}
                          </p>
                          <p className="termfont mt-1 text-[16px] leading-snug text-ink">
                            {itemFeedback.text}
                          </p>
                        </div>
                      ) : null}

                      {mission.multi && itemFeedback ? (
                        <div className="flex flex-col gap-2">
                          {(mission.options ?? [])
                            .filter((option) =>
                              selectedIds.includes(option.id),
                            )
                            .map((option) => (
                              <p
                                key={option.id}
                                className={`termfont text-[14px] leading-snug ${
                                  option.correct ? "text-accent" : "text-red"
                                }`}
                              >
                                {option.feedback}
                              </p>
                            ))}
                        </div>
                      ) : null}

                      {missionDone ? (
                        <button
                          type="button"
                          className="pixel-btn w-full"
                          onClick={continueMission}
                        >
                          Continue · mission{" "}
                          {String(step + 2).padStart(2, "0")}
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="pixel-btn w-full"
                          onClick={() => submitChoice(mission)}
                        >
                          {mission.kind === "choice"
                            ? "Lock the brief"
                            : mission.kind === "eval"
                              ? "Check the gate"
                              : "Approve the bounds"}
                        </button>
                      )}
                    </div>
                  ) : null}

                  {isWireMission ? (
                    <div className="flex flex-col gap-3">
                      {mission.terminal ? (
                        <div className="border-2 border-edge bg-black/20">
                          <div className="flex items-center justify-between gap-2 border-b-2 border-edge/60 px-3 py-2">
                            <p className="pxfont text-[8px] tracking-[0.14em] text-dim">
                              SHELL · {mission.terminal.setup.cwd}
                            </p>
                            <span className="termfont text-[13px] text-edge2">
                              {terminalDoneCount} / {terminalSteps.length}{" "}
                              checks
                            </span>
                          </div>
                          <div className="flex flex-col gap-2 p-3">
                            {terminalSteps.map((terminalStep) => {
                              const run = terminalRuns[terminalStep.id];
                              return (
                                <div
                                  key={terminalStep.id}
                                  className="border-2 border-edge bg-black/15 px-2.5 py-2"
                                >
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div>
                                      <p className="termfont text-[14px] text-dim">
                                        {terminalStep.label.toLowerCase()}
                                      </p>
                                      <p className="termfont text-[16px] text-amber">
                                        $ {terminalStep.command}
                                      </p>
                                    </div>
                                    <button
                                      type="button"
                                      aria-label={`Run ${terminalStep.command}`}
                                      className={smallButton}
                                      disabled={busy !== "" || missionDone}
                                      onClick={() =>
                                        runTerminal(terminalStep)
                                      }
                                    >
                                      {run
                                        ? run.ok
                                          ? "run again"
                                          : "retry"
                                        : "run"}
                                    </button>
                                  </div>
                                  {run ? (
                                    <pre
                                      className={`termfont mt-2 whitespace-pre-wrap text-[15px] leading-snug ${
                                        run.ok ? "text-ink" : "text-red"
                                      }`}
                                    >
                                      {run.output || "(no output)"}
                                      {"\n"}
                                      <span className="text-edge2">
                                        exit {run.exitCode}
                                        {run.local
                                          ? " · local reference shell"
                                          : ""}
                                      </span>
                                    </pre>
                                  ) : null}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : null}

                      <div className="border-2 border-edge bg-black/20">
                        <div className="flex items-center justify-between gap-2 border-b-2 border-edge/60 px-3 py-2">
                          <p className="pxfont text-[8px] tracking-[0.14em] text-dim">
                            MCP · BENCH NOTES
                          </p>
                          <span className="termfont text-[13px] text-edge2">
                            {noteOk
                              ? "read_notes returned"
                              : initialized
                                ? "initialized"
                                : "not connected"}
                          </span>
                        </div>
                        <div className="flex flex-col gap-3 p-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="termfont text-[16px] text-ink">
                              01 · initialize
                            </span>
                            <button
                              type="button"
                              className={smallButton}
                              disabled={
                                busy !== "" || initialized || missionDone
                              }
                              onClick={initializeServer}
                            >
                              {busy === "init"
                                ? "connecting…"
                                : initialized
                                  ? "connected"
                                  : "initialize"}
                            </button>
                          </div>

                          {server ? (
                            <p className="termfont text-[14px] leading-snug text-dim">
                              {server.name} {server.version} · protocol{" "}
                              {server.protocol}
                              {server.instructions
                                ? ` · ${server.instructions}`
                                : ""}
                            </p>
                          ) : null}

                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="termfont text-[16px] text-ink">
                              02 · tools/list
                            </span>
                            <button
                              type="button"
                              className={smallButton}
                              disabled={
                                !initialized ||
                                busy !== "" ||
                                toolsLoaded ||
                                missionDone
                              }
                              onClick={listTools}
                            >
                              {busy === "tools"
                                ? "listing…"
                                : toolsLoaded
                                  ? "listed"
                                  : "list tools"}
                            </button>
                          </div>

                          {tools.length > 0 ? (
                            <div className="flex flex-col gap-2">
                              <p className="pxfont text-[8px] tracking-[0.14em] text-dim">
                                TOOLS RETURNED
                              </p>
                              {tools.map((tool) => (
                                <button
                                  key={tool.name}
                                  type="button"
                                  disabled={
                                    busy !== "" || missionDone || noteOk
                                  }
                                  aria-pressed={selectedTool === tool.name}
                                  className={`chip ${
                                    selectedTool === tool.name
                                      ? "chip--active"
                                      : ""
                                  }`}
                                  onClick={() => selectTool(tool.name)}
                                >
                                  <span className="block">{tool.name}</span>
                                  <span className="block text-[14px] text-edge2">
                                    {tool.description}
                                  </span>
                                </button>
                              ))}
                            </div>
                          ) : null}

                          {selectedTool ? (
                            <div className="flex flex-col gap-2">
                              <p className="pxfont text-[8px] tracking-[0.14em] text-dim">
                                03 · tools/call
                              </p>
                              {(TOOL_FIELDS[selectedTool] ?? []).map(
                                (field) =>
                                  field.options ? (
                                    <div key={field.key}>
                                      <p className="termfont text-[14px] text-dim">
                                        {field.label}
                                      </p>
                                      <div className="mt-1 flex flex-wrap gap-2">
                                        {field.options.map((value) => (
                                          <button
                                            key={value}
                                            type="button"
                                            disabled={
                                              busy !== "" || missionDone
                                            }
                                            aria-pressed={
                                              toolArgs[field.key] === value
                                            }
                                            className={`chip ${
                                              toolArgs[field.key] === value
                                                ? "chip--active"
                                                : ""
                                            }`}
                                            onClick={() =>
                                              setToolArg(field.key, value)
                                            }
                                          >
                                            {value}
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  ) : (
                                    <label
                                      key={field.key}
                                      htmlFor={`studio-arg-${field.key}`}
                                      className="flex flex-col gap-1"
                                    >
                                      <span className="termfont text-[14px] text-dim">
                                        {field.label}
                                      </span>
                                      <input
                                        id={`studio-arg-${field.key}`}
                                        value={toolArgs[field.key] ?? ""}
                                        disabled={busy !== "" || missionDone}
                                        onChange={(event) =>
                                          setToolArg(
                                            field.key,
                                            event.target.value,
                                          )
                                        }
                                        placeholder={field.placeholder}
                                        className="termfont border-2 border-edge bg-black/20 px-3 py-2 text-[18px] text-ink outline-none focus-visible:border-accent"
                                      />
                                    </label>
                                  ),
                              )}
                              <button
                                type="button"
                                className="pixel-btn w-full"
                                disabled={busy !== "" || missionDone}
                                onClick={callTool}
                              >
                                {busy === "call"
                                  ? "calling…"
                                  : `Call ${selectedTool}`}
                              </button>
                            </div>
                          ) : toolsLoaded ? (
                            <p className="termfont text-[15px] leading-snug text-dim">
                              Pick a tool above, fill its arguments, then call
                              it.
                            </p>
                          ) : null}
                        </div>
                      </div>

                      {wireError ? (
                        <div className="border-2 border-red/60 bg-red/5 px-3 py-2.5">
                          <p className="pxfont text-[8px] tracking-[0.14em] text-red">
                            WIRE ERROR
                          </p>
                          <p className="termfont mt-1 text-[16px] leading-snug text-red">
                            {wireError}
                          </p>
                          <p className="termfont mt-1 text-[14px] text-dim">
                            The mission is not complete. Retry the failed step.
                          </p>
                        </div>
                      ) : null}

                      {wireHint ? (
                        <p className="termfont text-[16px] leading-snug text-amber">
                          {wireHint}
                        </p>
                      ) : null}

                      {note ? (
                        <div className="border-2 border-edge2 bg-accent/5 px-3 py-2.5">
                          <div className="flex items-center justify-between gap-2">
                            <p className="pxfont text-[8px] tracking-[0.14em] text-accent">
                              STUDY NOTE · {selectedTool}
                            </p>
                            {noteOk ? (
                              <span className="termfont text-[13px] text-accent">
                                returned
                              </span>
                            ) : null}
                          </div>
                          <p className="termfont mt-2 whitespace-pre-line text-[16px] leading-snug text-ink">
                            {note}
                          </p>
                        </div>
                      ) : null}

                      {missionDone ? (
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center justify-between border-2 border-edge2 bg-accent/10 px-3 py-2.5">
                            <span className="termfont text-[16px] text-accent">
                              wire checks passed
                            </span>
                            <span className="termfont text-[14px] text-edge2">
                              {noteOk ? "read_notes" : "terminal"}
                            </span>
                          </div>
                          <button
                            type="button"
                            className="pixel-btn w-full"
                            onClick={continueMission}
                          >
                            Continue · mission{" "}
                            {String(step + 2).padStart(2, "0")}
                          </button>
                        </div>
                      ) : terminalSteps.length > 0 && terminalPassed ? (
                        <p className="termfont text-[15px] leading-snug text-accent">
                          Shell checks green. Now prove the live note read.
                        </p>
                      ) : null}
                    </div>
                  ) : null}

                  {mission.kind === "demo" ? (
                    <div className="flex flex-col gap-3">
                      <div className="border-2 border-edge bg-black/20 px-3 py-2.5">
                        <p className="pxfont text-[8px] tracking-[0.14em] text-dim">
                          BUILD STATUS
                        </p>
                        <ul className="mt-2 flex flex-col gap-1">
                          <li className="termfont text-[15px] text-ink">
                            brief · {completed[0] ? "locked" : "open"}
                          </li>
                          <li className="termfont text-[15px] text-ink">
                            wire ·{" "}
                            {noteOk
                              ? "read_notes returned study.md"
                              : "open"}
                            {terminalSteps.length > 0
                              ? ` · shell ${terminalDoneCount} / ${terminalSteps.length}`
                              : ""}
                          </li>
                          <li className="termfont text-[15px] text-ink">
                            evidence ·{" "}
                            {completed[2] ? "3 checks" : "open"}
                          </li>
                          <li className="termfont text-[15px] text-ink">
                            bounds · {completed[3] ? "approved" : "open"}
                          </li>
                        </ul>
                      </div>

                      <PortfolioSummary
                        brief={briefChoice?.label ?? "not set"}
                        tools={wireSummary(wireMission)}
                        checks={checks}
                        bounds={boundsChoice?.label ?? "not set"}
                      />

                      {itemFeedback && !itemFeedback.ok ? (
                        <div className="border-2 border-red/60 bg-red/5 px-3 py-2.5">
                          <p className="pxfont text-[8px] tracking-[0.14em] text-red">
                            NOT READY
                          </p>
                          <p className="termfont mt-1 text-[16px] leading-snug text-ink">
                            {itemFeedback.text}
                          </p>
                        </div>
                      ) : null}

                      <button
                        type="button"
                        className="pixel-btn w-full"
                        onClick={filePortfolio}
                        disabled={done}
                      >
                        File the portfolio
                      </button>
                      <p className="termfont text-[14px] leading-snug text-edge2">
                        Filing requires the live MCP read to have succeeded.
                        No read, no portfolio.
                      </p>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </section>

          <section className="pixel-panel flex min-h-[440px] flex-col overflow-hidden lg:min-h-[560px]">
            <div className="flex items-center justify-between border-b-2 border-edge/60 px-4 py-2.5 sm:px-5">
              <span className="pxfont text-[9px] tracking-[0.16em] text-dim">
                BUILD LOG
              </span>
              <span className="flex items-center gap-2 termfont text-[14px] text-edge2">
                <span
                  className={`status-dot ${
                    log.length > 0 ? "status-dot--on" : ""
                  }`}
                />
                {done ? "filed" : initialized ? "server live" : "studio"}
              </span>
            </div>

            <div
              className="flex-1 overflow-y-auto p-4 sm:p-5"
              role="log"
              aria-live="polite"
            >
              {log.length === 0 ? (
                <div className="flex h-full flex-col justify-center gap-3">
                  <p className="termfont text-[19px] leading-[1.35] text-dim">
                    The build log records every decision: the brief, the MCP
                    handshake, the shell checks, the evidence gate, and the
                    bounds.
                  </p>
                  <p className="termfont text-[16px] text-edge2">
                    One mission at a time. Nothing is filed until the wire
                    answers.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {log.map((entry) => (
                    <div
                      key={entry.id}
                      className={`border-2 px-3 py-2.5 ${toneBox(
                        entry.tone,
                      )}`}
                    >
                      <span
                        className={`pxfont text-[8px] tracking-[0.14em] ${toneTag(
                          entry.tone,
                        )}`}
                      >
                        {entry.tag}
                      </span>
                      <p className="termfont mt-1 text-[16px] text-ink">
                        {entry.title}
                      </p>
                      {entry.body ? (
                        <p className="termfont mt-1 whitespace-pre-wrap break-words text-[15px] leading-snug text-dim">
                          {entry.body}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t-2 border-edge/70 px-4 py-3 sm:px-5">
              {done ? (
                <div className="flex flex-col gap-1">
                  <p className="termfont text-[16px] text-accent">
                    portfolio filed · {studio.artifact.name}
                  </p>
                  <p className="termfont text-[14px] text-dim">
                    {studio.artifact.note}
                  </p>
                </div>
              ) : (
                <p className="termfont text-[14px] leading-snug text-edge2">
                  {isLastMission
                    ? "The file action is the last gate."
                    : "Every action lands here. Nothing is hidden."}
                </p>
              )}
            </div>
          </section>
        </main>

        <footer className="flex flex-col gap-2 border-t-2 border-edge/60 pt-3">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <span className="termfont text-[14px] text-edge2">
              {studio.goal}
            </span>
            <span className="termfont whitespace-nowrap text-[14px] text-edge2">
              mission {String(Math.min(step + 1, totalMissions)).padStart(2, "0")} /{" "}
              {String(totalMissions).padStart(2, "0")}
            </span>
          </div>
          <LegalLinks />
        </footer>
      </div>
    </div>
  );
}
