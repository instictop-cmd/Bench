import type { PilotSetup } from "@/game/pilot";

export type ShellState = PilotSetup & {
  history: string[];
  base?: PilotSetup;
};

export type ShellResult = {
  output: string;
  exitCode: number;
  state: ShellState;
  ms: number;
};

export interface ShellRuntime {
  init(setup: PilotSetup): ShellState;
  exec(command: string, state: ShellState): ShellResult;
}

type CommandResult = {
  output: string;
  exitCode: number;
};

type ParsedGroup = {
  connector: "&&" | "||" | null;
  commands: string[][];
};

const DEFAULT_HOME = "/home/pip";

function cloneState(state: ShellState): ShellState {
  return {
    cwd: state.cwd,
    files: { ...state.files },
    dirs: [...state.dirs],
    env: { ...state.env },
    git: {
      staged: [...state.git.staged],
      commits: state.git.commits.map((commit) => ({
        message: commit.message,
        files: [...commit.files],
      })),
    },
    history: [...state.history],
    base: state.base,
  };
}

function normalizePath(path: string): string {
  const stack: string[] = [];
  for (const part of path.split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") {
      stack.pop();
      continue;
    }
    stack.push(part);
  }
  return `/${stack.join("/")}`;
}

function resolvePath(cwd: string, path: string): string {
  if (path.startsWith("/")) return normalizePath(path);
  return normalizePath(`${cwd}/${path}`);
}

function parentPath(path: string): string {
  if (path === "/") return "/";
  const index = path.lastIndexOf("/");
  return index <= 0 ? "/" : path.slice(0, index);
}

function baseName(path: string): string {
  if (path === "/") return "/";
  const index = path.lastIndexOf("/");
  return path.slice(index + 1);
}

function addDirWithParents(dirs: Set<string>, path: string) {
  let current = path;
  while (true) {
    dirs.add(current);
    if (current === "/") break;
    current = parentPath(current);
  }
}

function splitLines(text: string): string[] {
  if (!text) return [];
  const lines = text.split("\n");
  if (lines[lines.length - 1] === "") lines.pop();
  return lines;
}

function expandVariables(token: string, env: Record<string, string>): string {
  return token.replace(/\$(\w+|\{[^}]+\})/g, (match, name: string) => {
    const key = name.startsWith("{") ? name.slice(1, -1) : name;
    return env[key] ?? "";
  });
}

function expandTilde(token: string, env: Record<string, string>): string {
  const home = env.HOME ?? DEFAULT_HOME;
  if (token === "~") return home;
  if (token.startsWith("~/")) return `${home}${token.slice(1)}`;
  return token;
}

function hashHex(input: string): string {
  let hash = 5381;
  for (let index = 0; index < input.length; index += 1) {
    hash = ((hash << 5) + hash + input.charCodeAt(index)) >>> 0;
  }
  return hash.toString(16).padStart(7, "0").slice(-7);
}

function padCount(value: number): string {
  return String(value).padStart(6, " ");
}

function lex(input: string): { tokens: string[]; error?: string } {
  const tokens: string[] = [];
  let current = "";
  let quote: '"' | "'" | null = null;
  let escaped = false;
  let started = false;

  const flush = () => {
    if (!started) return;
    tokens.push(current);
    current = "";
    started = false;
  };

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];

    if (escaped) {
      current += char;
      escaped = false;
      started = true;
      continue;
    }

    if (quote === "'") {
      if (char === "'") {
        quote = null;
      } else {
        current += char;
      }
      started = true;
      continue;
    }

    if (quote === '"') {
      if (char === '"') {
        quote = null;
      } else if (char === "\\") {
        const next = input[index + 1];
        if (next === '"' || next === "\\") {
          escaped = true;
        } else {
          current += "\\";
        }
      } else {
        current += char;
      }
      started = true;
      continue;
    }

    if (char === "\\") {
      escaped = true;
      started = true;
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      started = true;
      continue;
    }

    if (char === " " || char === "\t") {
      flush();
      continue;
    }

    if (char === "|") {
      flush();
      if (input[index + 1] === "|") {
        tokens.push("||");
        index += 1;
      } else {
        tokens.push("|");
      }
      continue;
    }

    if (char === "&") {
      flush();
      if (input[index + 1] === "&") {
        tokens.push("&&");
        index += 1;
      } else {
        return { tokens, error: "syntax error: single & is not supported" };
      }
      continue;
    }

    current += char;
    started = true;
  }

  if (quote) return { tokens, error: "syntax error: unmatched quote" };
  if (escaped) current += "\\";
  flush();
  return { tokens };
}

function parseGroups(tokens: string[]): {
  groups: ParsedGroup[];
  error?: string;
} {
  const groups: ParsedGroup[] = [];
  let connector: "&&" | "||" | null = null;
  let commands: string[][] = [];
  let command: string[] = [];

  const flushCommand = (): boolean => {
    if (command.length === 0) return false;
    commands.push(command);
    command = [];
    return true;
  };

  for (const token of tokens) {
    if (token === "|" || token === "&&" || token === "||") {
      if (!flushCommand()) {
        return { groups, error: "syntax error near unexpected token" };
      }
      if (token === "|") continue;
      groups.push({ connector, commands });
      connector = token;
      commands = [];
      continue;
    }
    command.push(token);
  }

  if (!flushCommand()) {
    return { groups, error: "syntax error near unexpected token" };
  }

  groups.push({ connector, commands });
  return { groups };
}

function listDirectory(
  state: ShellState,
  target: string,
  showHidden: boolean,
): { output: string; exitCode: number } {
  const names = new Set<string>();

  for (const dir of state.dirs) {
    if (dir !== target && parentPath(dir) === target) {
      const name = baseName(dir);
      if (name) names.add(name);
    }
  }

  for (const file of Object.keys(state.files)) {
    if (parentPath(file) === target) {
      const name = baseName(file);
      if (name) names.add(name);
    }
  }

  const visible = [...names]
    .filter((name) => showHidden || !name.startsWith("."))
    .sort();

  return { output: visible.join("\n"), exitCode: 0 };
}

function readFile(
  state: ShellState,
  path: string,
): { content?: string; error?: string } {
  if (state.dirs.includes(path)) {
    return { error: "Is a directory" };
  }
  const content = state.files[path];
  if (content === undefined) {
    return { error: "No such file or directory" };
  }
  return { content };
}

function diffText(before: string, after: string): string {
  const left = splitLines(before);
  const right = splitLines(after);
  const rows = left.length;
  const columns = right.length;
  const table: number[][] = Array.from({ length: rows + 1 }, () =>
    new Array<number>(columns + 1).fill(0),
  );

  for (let row = rows - 1; row >= 0; row -= 1) {
    for (let column = columns - 1; column >= 0; column -= 1) {
      table[row][column] =
        left[row] === right[column]
          ? table[row + 1][column + 1] + 1
          : Math.max(table[row + 1][column], table[row][column + 1]);
    }
  }

  const ops: { kind: " " | "-" | "+"; text: string }[] = [];
  let row = 0;
  let column = 0;

  while (row < rows && column < columns) {
    if (left[row] === right[column]) {
      ops.push({ kind: " ", text: left[row] });
      row += 1;
      column += 1;
    } else if (table[row + 1][column] >= table[row][column + 1]) {
      ops.push({ kind: "-", text: left[row] });
      row += 1;
    } else {
      ops.push({ kind: "+", text: right[column] });
      column += 1;
    }
  }

  while (row < rows) {
    ops.push({ kind: "-", text: left[row] });
    row += 1;
  }

  while (column < columns) {
    ops.push({ kind: "+", text: right[column] });
    column += 1;
  }

  const output: string[] = [];
  let cursor = 0;
  let leftLine = 1;
  let rightLine = 1;

  while (cursor < ops.length) {
    if (ops[cursor].kind === " ") {
      leftLine += 1;
      rightLine += 1;
      cursor += 1;
      continue;
    }

    const startLeft = leftLine;
    const startRight = rightLine;
    const removed: string[] = [];
    const added: string[] = [];

    while (cursor < ops.length && ops[cursor].kind !== " ") {
      if (ops[cursor].kind === "-") {
        removed.push(ops[cursor].text);
        leftLine += 1;
      } else {
        added.push(ops[cursor].text);
        rightLine += 1;
      }
      cursor += 1;
    }

    const endLeft = leftLine - 1;
    const endRight = rightLine - 1;

    if (removed.length > 0 && added.length > 0) {
      const leftRange = `${startLeft}${removed.length > 1 ? `,${endLeft}` : ""}`;
      const rightRange = `${startRight}${added.length > 1 ? `,${endRight}` : ""}`;
      output.push(`${leftRange}c${rightRange}`);
      removed.forEach((line) => output.push(`< ${line}`));
      output.push("---");
      added.forEach((line) => output.push(`> ${line}`));
    } else if (removed.length > 0) {
      const range = `${startLeft}${removed.length > 1 ? `,${endLeft}` : ""}`;
      output.push(`${range}d${startRight - 1}`);
      removed.forEach((line) => output.push(`< ${line}`));
    } else if (added.length > 0) {
      const range = `${startRight}${added.length > 1 ? `,${endRight}` : ""}`;
      output.push(`${startLeft - 1}a${range}`);
      added.forEach((line) => output.push(`> ${line}`));
    }
  }

  return output.join("\n");
}

function pathWithin(root: string, target: string): string | null {
  if (target === root) return "";
  if (root === "/") return target.slice(1);
  if (target.startsWith(`${root}/`)) return target.slice(root.length + 1);
  return null;
}

function repoFiles(state: ShellState): string[] {
  const root = state.cwd;
  const files: string[] = [];

  for (const path of Object.keys(state.files)) {
    const relative = pathWithin(root, path);
    if (relative !== null && relative) files.push(relative);
  }

  return files.sort();
}

function trackedFiles(state: ShellState): Set<string> {
  const tracked = new Set<string>();
  for (const commit of state.git.commits) {
    for (const file of commit.files) tracked.add(file);
  }
  return tracked;
}

function gitStatus(state: ShellState): CommandResult {
  const files = repoFiles(state);
  const tracked = trackedFiles(state);
  const staged = [...state.git.staged].sort();
  const untracked = files.filter(
    (file) => !staged.includes(file) && !tracked.has(file),
  );
  const lines = ["On branch main"];

  if (state.git.commits.length === 0) {
    lines.push("", "No commits yet");
  }

  if (staged.length > 0) {
    lines.push("", "Changes to be committed:");
    lines.push('  (use "git restore --staged <file>..." to unstage)');
    for (const file of staged) {
      lines.push(`\t${tracked.has(file) ? "modified" : "new file"}:   ${file}`);
    }
  }

  if (untracked.length > 0) {
    lines.push("", "Untracked files:");
    lines.push('  (use "git add <file>..." to include in what will be committed)');
    for (const file of untracked) lines.push(`\t${file}`);
  }

  if (staged.length === 0 && untracked.length === 0) {
    lines.push("", "nothing to commit, working tree clean");
  } else if (staged.length === 0) {
    lines.push(
      "",
      'nothing added to commit but untracked files present (use "git add" to track)',
    );
  }

  return { output: lines.join("\n"), exitCode: 0 };
}

function gitAdd(state: ShellState, args: string[]): CommandResult {
  const stageAll =
    args.includes("-A") ||
    args.includes("-a") ||
    args.includes("--all") ||
    args.includes(".");
  const paths = args.filter(
    (arg) => !arg.startsWith("-") && arg !== ".",
  );
  const root = state.cwd;
  const files = repoFiles(state);
  const selected = new Set(state.git.staged);

  if (stageAll) {
    for (const file of files) selected.add(file);
  }

  if (!stageAll && paths.length === 0) {
    return { output: "Nothing specified, nothing added.", exitCode: 1 };
  }

  for (const path of paths) {
    const target = resolvePath(root, expandTilde(path, state.env));
    const relative = pathWithin(root, target);
    if (relative !== null && state.files[target] !== undefined) {
      selected.add(relative);
      continue;
    }
    if (relative !== null && state.dirs.includes(target)) {
      const prefix = relative ? `${relative}/` : "";
      const matches = files.filter((file) => file.startsWith(prefix));
      for (const file of matches) selected.add(file);
      continue;
    }
    return {
      output: `fatal: pathspec '${path}' did not match any files`,
      exitCode: 128,
    };
  }

  state.git.staged = [...selected].sort();
  return { output: "", exitCode: 0 };
}

function gitCommit(state: ShellState, args: string[]): CommandResult {
  let message = "";

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "-m" || arg === "--message") {
      message = args.slice(index + 1).join(" ").trim();
      break;
    }
    if (arg.startsWith("--message=")) {
      message = arg.slice("--message=".length).trim();
      break;
    }
  }

  if (!message) {
    return {
      output:
        'error: interactive commit is not available in this simulation.\nuse: git commit -m "message"',
      exitCode: 1,
    };
  }

  const files = [...state.git.staged].sort();
  if (files.length === 0) {
    return {
      output: "On branch main\nnothing to commit, working tree clean",
      exitCode: 1,
    };
  }

  const index = state.git.commits.length;
  const shortHash = hashHex(`${message}:${index}`);
  const insertions = files.reduce((total, file) => {
    const content = state.files[resolvePath(state.cwd, file)] ?? "";
    return total + splitLines(content).length;
  }, 0);

  state.git.commits.push({ message, files });
  state.git.staged = [];

  const fileWord = files.length === 1 ? "file" : "files";
  const insertionWord = insertions === 1 ? "insertion" : "insertions";
  const summary =
    insertions > 0
      ? ` ${files.length} ${fileWord} changed, ${insertions} ${insertionWord}(+)`
      : ` ${files.length} ${fileWord} changed`;

  return {
    output: `[main ${shortHash}] ${message}\n${summary}`,
    exitCode: 0,
  };
}

function gitDiff(state: ShellState, args: string[]): CommandResult {
  const cached = args.includes("--cached") || args.includes("--staged");
  const files = cached ? [...state.git.staged].sort() : [];
  const chunks: string[] = [];

  for (const file of files) {
    const content = state.files[resolvePath(state.cwd, file)];
    if (content === undefined) continue;
    const lines = splitLines(content);
    const body = lines.map((line) => `+${line}`).join("\n");
    const chunk = [
      `diff --git a/${file} b/${file}`,
      "new file mode 100644",
      `index 0000000..${hashHex(content)}`,
      "--- /dev/null",
      `+++ b/${file}`,
      `@@ -0,0 +1,${lines.length} @@`,
      body,
    ]
      .filter((line) => line.length > 0)
      .join("\n");
    chunks.push(chunk);
  }

  return { output: chunks.join("\n"), exitCode: 0 };
}

function gitLog(state: ShellState): CommandResult {
  if (state.git.commits.length === 0) {
    return {
      output:
        "fatal: your current branch 'main' does not have any commits yet",
      exitCode: 128,
    };
  }

  const chunks = state.git.commits
    .map((commit, index) => {
      const shortHash = hashHex(`${commit.message}:${index}`);
      return [
        `commit ${shortHash}`,
        "Author: Pip <pip@bench.local>",
        "Date:   Thu Jan 1 00:00:00 2026 +0000",
        "",
        `    ${commit.message}`,
      ].join("\n");
    })
    .reverse();

  return { output: chunks.join("\n\n"), exitCode: 0 };
}

function unstage(state: ShellState, args: string[]): CommandResult {
  const paths = args.filter((arg) => !arg.startsWith("-"));
  if (paths.length === 0) {
    state.git.staged = [];
    return { output: "", exitCode: 0 };
  }

  const keep = state.git.staged.filter((file) => !paths.includes(file));
  state.git.staged = keep;
  return { output: "", exitCode: 0 };
}

function gitCommand(state: ShellState, args: string[]): CommandResult {
  const sub = args[0];

  if (!sub) {
    return {
      output:
        "usage: git status | git diff | git add <path> | git commit -m <message> | git log",
      exitCode: 1,
    };
  }

  if (sub === "status") return gitStatus(state);
  if (sub === "add") return gitAdd(state, args.slice(1));
  if (sub === "commit") return gitCommit(state, args.slice(1));
  if (sub === "log") return gitLog(state);
  if (sub === "diff") return gitDiff(state, args.slice(1));

  if (sub === "restore") {
    if (!args.includes("--staged")) {
      return {
        output:
          "the simulation only supports: git restore --staged <path>",
        exitCode: 1,
      };
    }
    return unstage(state, args.slice(1));
  }

  if (sub === "reset") {
    if (args.includes("--hard")) {
      return {
        output:
          "the simulation does not run destructive resets. use git restore --staged <path>.",
        exitCode: 1,
      };
    }
    return unstage(state, args.slice(1));
  }

  return {
    output: `git: '${sub}' is not a git command.`,
    exitCode: 1,
  };
}

function dispatch(
  name: string,
  args: string[],
  state: ShellState,
  stdin: string,
): CommandResult {
  switch (name) {
    case "pwd":
      return { output: state.cwd, exitCode: 0 };

    case "ls": {
      const showHidden = args.some(
        (arg) => arg.startsWith("-") && arg.includes("a"),
      );
      const paths = args.filter((arg) => !arg.startsWith("-"));
      const target = resolvePath(
        state.cwd,
        expandTilde(paths[0] ?? ".", state.env),
      );
      if (state.files[target] !== undefined) {
        return { output: baseName(target), exitCode: 0 };
      }
      if (!state.dirs.includes(target)) {
        const label = paths[0] ?? ".";
        return {
          output: `ls: cannot access '${label}': No such file or directory`,
          exitCode: 2,
        };
      }
      return listDirectory(state, target, showHidden);
    }

    case "cd": {
      const raw = args[0] ?? state.env.HOME ?? DEFAULT_HOME;
      const target = resolvePath(state.cwd, expandTilde(raw, state.env));
      if (state.dirs.includes(target)) {
        state.env.OLDPWD = state.cwd;
        state.cwd = target;
        state.env.PWD = target;
        return { output: "", exitCode: 0 };
      }
      if (state.files[target] !== undefined) {
        return {
          output: `cd: not a directory: ${raw}`,
          exitCode: 1,
        };
      }
      return {
        output: `cd: no such file or directory: ${raw}`,
        exitCode: 1,
      };
    }

    case "cat": {
      const paths = args.filter((arg) => !arg.startsWith("-"));
      if (paths.length === 0) {
        return { output: stdin, exitCode: 0 };
      }
      const chunks: string[] = [];
      let exitCode = 0;
      for (const path of paths) {
        const target = resolvePath(state.cwd, expandTilde(path, state.env));
        const file = readFile(state, target);
        if (file.error || file.content === undefined) {
          chunks.push(`cat: ${path}: ${file.error ?? "unreadable file"}`);
          exitCode = 1;
        } else {
          chunks.push(file.content);
        }
      }
      return { output: chunks.join(""), exitCode };
    }

    case "head":
    case "tail": {
      let count = 10;
      let path: string | undefined;
      for (let index = 0; index < args.length; index += 1) {
        const arg = args[index];
        if (arg === "-n") {
          const value = Number.parseInt(args[index + 1] ?? "", 10);
          if (Number.isFinite(value)) count = value;
          index += 1;
        } else if (/^-\d+$/.test(arg)) {
          count = Number.parseInt(arg.slice(1), 10);
        } else if (!arg.startsWith("-") && path === undefined) {
          path = arg;
        }
      }
      const safeCount = Math.max(0, count);
      let content = stdin;
      if (path !== undefined) {
        const target = resolvePath(state.cwd, expandTilde(path, state.env));
        const file = readFile(state, target);
        if (file.error || file.content === undefined) {
          return {
            output: `${name}: cannot open '${path}' for reading: ${file.error ?? "unreadable file"}`,
            exitCode: 1,
          };
        }
        content = file.content;
      }
      const lines = splitLines(content);
      const selected =
        name === "head"
          ? lines.slice(0, safeCount)
          : lines.slice(Math.max(0, lines.length - safeCount));
      return { output: selected.join("\n"), exitCode: 0 };
    }

    case "grep": {
      let ignoreCase = false;
      let lineNumbers = false;
      let countOnly = false;
      let invert = false;
      let pattern: string | null = null;
      const paths: string[] = [];

      for (const arg of args) {
        if (arg === "--") continue;
        if (arg.startsWith("-") && arg.length > 1) {
          if (arg.includes("i")) ignoreCase = true;
          if (arg.includes("n")) lineNumbers = true;
          if (arg.includes("c")) countOnly = true;
          if (arg.includes("v")) invert = true;
          continue;
        }
        if (pattern === null) {
          pattern = arg;
        } else {
          paths.push(arg);
        }
      }

      if (pattern === null) {
        return { output: "usage: grep [flags] pattern [file]", exitCode: 2 };
      }

      let expression: RegExp;
      try {
        expression = new RegExp(pattern, ignoreCase ? "i" : "");
      } catch {
        return { output: `grep: invalid pattern: ${pattern}`, exitCode: 2 };
      }

      const sources: { name: string; content: string }[] = [];
      if (paths.length === 0) {
        sources.push({ name: "", content: stdin });
      } else {
        for (const path of paths) {
          const target = resolvePath(state.cwd, expandTilde(path, state.env));
          const file = readFile(state, target);
          if (file.error || file.content === undefined) {
            return {
              output: `grep: ${path}: ${file.error ?? "unreadable file"}`,
              exitCode: 2,
            };
          }
          sources.push({ name: path, content: file.content });
        }
      }

      const manyFiles = sources.length > 1;
      const output: string[] = [];
      let matches = 0;

      for (const source of sources) {
        let count = 0;
        const lines = splitLines(source.content);
        for (let index = 0; index < lines.length; index += 1) {
          const line = lines[index];
          const hit = expression.test(line) !== invert;
          if (!hit) continue;
          count += 1;
          if (countOnly) continue;
          const prefix = manyFiles ? `${source.name}:` : "";
          const number = lineNumbers ? `${index + 1}:` : "";
          output.push(`${prefix}${number}${line}`);
        }
        if (countOnly) {
          output.push(manyFiles ? `${source.name}:${count}` : String(count));
        }
        matches += count;
      }

      return {
        output: output.join("\n"),
        exitCode: matches > 0 ? 0 : 1,
      };
    }

    case "wc": {
      let modes: ("lines" | "words" | "chars")[] = [];
      let path: string | undefined;

      for (const arg of args) {
        if (arg.startsWith("-") && arg.length > 1) {
          if (arg.includes("l")) modes.push("lines");
          if (arg.includes("w")) modes.push("words");
          if (arg.includes("c")) modes.push("chars");
          continue;
        }
        if (path === undefined) path = arg;
      }

      if (modes.length === 0) modes = ["lines", "words", "chars"];

      let content = stdin;
      if (path !== undefined) {
        const target = resolvePath(state.cwd, expandTilde(path, state.env));
        const file = readFile(state, target);
        if (file.error || file.content === undefined) {
          return {
            output: `wc: ${path}: ${file.error ?? "unreadable file"}`,
            exitCode: 1,
          };
        }
        content = file.content;
      }

      const counts: Record<"lines" | "words" | "chars", number> = {
        lines: splitLines(content).length,
        words: content.split(/\s+/).filter(Boolean).length,
        chars: content.length,
      };

      const numbers = modes.map((mode) => padCount(counts[mode]));
      const suffix = path !== undefined ? ` ${path}` : "";
      return { output: `${numbers.join(" ")}${suffix}`, exitCode: 0 };
    }

    case "echo": {
      const values = args.filter((arg) => arg !== "-n");
      return { output: values.join(" "), exitCode: 0 };
    }

    case "printf": {
      const format = args[0] ?? "";
      const values = args.slice(1);
      let valueIndex = 0;
      let output = "";

      for (let index = 0; index < format.length; index += 1) {
        const char = format[index];
        if (char === "\\" && index + 1 < format.length) {
          const escaped = format[index + 1];
          if (escaped === "n") output += "\n";
          else if (escaped === "t") output += "\t";
          else output += escaped;
          index += 1;
          continue;
        }
        if (char === "%" && index + 1 < format.length) {
          const spec = format[index + 1];
          if (spec === "%") {
            output += "%";
          } else if (spec === "s") {
            output += values[valueIndex] ?? "";
            valueIndex += 1;
          } else if (spec === "d") {
            const parsed = Number.parseInt(values[valueIndex] ?? "0", 10);
            output += String(Number.isFinite(parsed) ? parsed : 0);
            valueIndex += 1;
          } else {
            output += `%${spec}`;
          }
          index += 1;
          continue;
        }
        output += char;
      }

      return { output, exitCode: 0 };
    }

    case "mkdir": {
      const parents = args.includes("-p");
      const paths = args.filter((arg) => !arg.startsWith("-"));
      if (paths.length === 0) {
        return { output: "mkdir: missing operand", exitCode: 1 };
      }

      let exitCode = 0;
      const errors: string[] = [];

      for (const path of paths) {
        const target = resolvePath(state.cwd, expandTilde(path, state.env));
        if (state.dirs.includes(target)) {
          if (!parents) {
            errors.push(`mkdir: ${path}: File exists`);
            exitCode = 1;
          }
          continue;
        }
        if (state.files[target] !== undefined) {
          errors.push(`mkdir: ${path}: File exists`);
          exitCode = 1;
          continue;
        }
        if (parents) {
          const additions: string[] = [];
          let current = target;
          while (true) {
            if (!state.dirs.includes(current)) additions.push(current);
            if (current === "/") break;
            current = parentPath(current);
          }
          if (
            additions.some((path) => state.files[path] !== undefined) ||
            state.files[parentPath(target)] !== undefined
          ) {
            errors.push(`mkdir: ${path}: Not a directory`);
            exitCode = 1;
            continue;
          }
          state.dirs.push(...additions.reverse());
        } else if (state.dirs.includes(parentPath(target))) {
          state.dirs.push(target);
        } else {
          errors.push(`mkdir: ${path}: No such file or directory`);
          exitCode = 1;
        }
      }

      return { output: errors.join("\n"), exitCode };
    }

    case "touch": {
      const paths = args.filter((arg) => !arg.startsWith("-"));
      if (paths.length === 0) {
        return { output: "touch: missing operand", exitCode: 1 };
      }

      let exitCode = 0;
      const errors: string[] = [];

      for (const path of paths) {
        const target = resolvePath(state.cwd, expandTilde(path, state.env));
        if (state.files[target] !== undefined) continue;
        if (state.dirs.includes(target)) {
          errors.push(`touch: ${path}: Is a directory`);
          exitCode = 1;
          continue;
        }
        if (!state.dirs.includes(parentPath(target))) {
          errors.push(`touch: ${path}: No such file or directory`);
          exitCode = 1;
          continue;
        }
        state.files[target] = "";
      }

      return { output: errors.join("\n"), exitCode };
    }

    case "cp": {
      const paths = args.filter((arg) => !arg.startsWith("-"));
      if (paths.length < 2) {
        return { output: "cp: missing destination file operand", exitCode: 1 };
      }

      const destination = resolvePath(
        state.cwd,
        expandTilde(paths[paths.length - 1], state.env),
      );
      const sources = paths.slice(0, -1);
      const destinationIsDir = state.dirs.includes(destination);
      if (sources.length > 1 && !destinationIsDir) {
        return {
          output: "cp: target is not a directory",
          exitCode: 1,
        };
      }

      let exitCode = 0;
      const errors: string[] = [];

      for (const source of sources) {
        const sourcePath = resolvePath(
          state.cwd,
          expandTilde(source, state.env),
        );
        const file = readFile(state, sourcePath);
        if (file.error || file.content === undefined) {
          errors.push(`cp: ${source}: ${file.error ?? "unreadable file"}`);
          exitCode = 1;
          continue;
        }

        const target = destinationIsDir
          ? `${destination}/${baseName(sourcePath)}`
          : destination;

        if (!state.dirs.includes(parentPath(target))) {
          errors.push(`cp: ${target}: No such file or directory`);
          exitCode = 1;
          continue;
        }

        state.files[target] = file.content;
      }

      return { output: errors.join("\n"), exitCode };
    }

    case "mv": {
      const paths = args.filter((arg) => !arg.startsWith("-"));
      if (paths.length < 2) {
        return { output: "mv: missing destination file operand", exitCode: 1 };
      }

      const destination = resolvePath(
        state.cwd,
        expandTilde(paths[paths.length - 1], state.env),
      );
      const sources = paths.slice(0, -1);
      const destinationIsDir = state.dirs.includes(destination);
      if (sources.length > 1 && !destinationIsDir) {
        return { output: "mv: target is not a directory", exitCode: 1 };
      }

      let exitCode = 0;
      const errors: string[] = [];

      for (const source of sources) {
        const sourcePath = resolvePath(
          state.cwd,
          expandTilde(source, state.env),
        );
        const target = destinationIsDir
          ? `${destination}/${baseName(sourcePath)}`
          : destination;

        if (sourcePath === target) continue;

        if (state.files[sourcePath] !== undefined) {
          if (!state.dirs.includes(parentPath(target))) {
            errors.push(`mv: ${target}: No such file or directory`);
            exitCode = 1;
            continue;
          }
          state.files[target] = state.files[sourcePath];
          delete state.files[sourcePath];
          continue;
        }

        if (state.dirs.includes(sourcePath)) {
          if (target.startsWith(`${sourcePath}/`)) {
            errors.push("mv: cannot move a directory into itself");
            exitCode = 1;
            continue;
          }
          if (state.files[target] !== undefined) {
            errors.push(`mv: ${target}: Not a directory`);
            exitCode = 1;
            continue;
          }
          if (
            !state.dirs.includes(target) &&
            !state.dirs.includes(parentPath(target))
          ) {
            errors.push(`mv: ${target}: No such file or directory`);
            exitCode = 1;
            continue;
          }

          const movedDirs = state.dirs.filter(
            (dir) => dir === sourcePath || dir.startsWith(`${sourcePath}/`),
          );
          const movedFiles = Object.keys(state.files).filter((file) =>
            file.startsWith(`${sourcePath}/`),
          );
          const remaining = new Set(
            state.dirs.filter((dir) => !movedDirs.includes(dir)),
          );

          for (const dir of movedDirs) {
            remaining.add(`${target}${dir.slice(sourcePath.length)}`);
          }
          state.dirs = [...remaining];

          for (const file of movedFiles) {
            const content = state.files[file];
            delete state.files[file];
            state.files[`${target}${file.slice(sourcePath.length)}`] = content;
          }
          continue;
        }

        errors.push(`mv: ${source}: No such file or directory`);
        exitCode = 1;
      }

      return { output: errors.join("\n"), exitCode };
    }

    case "rm": {
      const recursive = args.some(
        (arg) => arg.startsWith("-") && arg.includes("r"),
      );
      const force = args.some(
        (arg) => arg.startsWith("-") && arg.includes("f"),
      );
      const paths = args.filter((arg) => !arg.startsWith("-"));

      if (paths.length === 0) {
        if (force) return { output: "", exitCode: 0 };
        return { output: "rm: missing operand", exitCode: 1 };
      }

      let exitCode = 0;
      const errors: string[] = [];

      for (const path of paths) {
        const target = resolvePath(state.cwd, expandTilde(path, state.env));
        if (state.files[target] !== undefined) {
          delete state.files[target];
          continue;
        }
        if (state.dirs.includes(target)) {
          if (!recursive) {
            errors.push(`rm: ${path}: Is a directory`);
            exitCode = 1;
            continue;
          }
          state.dirs = state.dirs.filter(
            (dir) => dir !== target && !dir.startsWith(`${target}/`),
          );
          for (const file of Object.keys(state.files)) {
            if (file.startsWith(`${target}/`)) delete state.files[file];
          }
          continue;
        }
        if (!force) {
          errors.push(`rm: ${path}: No such file or directory`);
          exitCode = 1;
        }
      }

      return { output: errors.join("\n"), exitCode };
    }

    case "diff": {
      const paths = args.filter((arg) => !arg.startsWith("-"));
      if (paths.length < 2) {
        return { output: "usage: diff file1 file2", exitCode: 2 };
      }

      const first = readFile(
        state,
        resolvePath(state.cwd, expandTilde(paths[0], state.env)),
      );
      const second = readFile(
        state,
        resolvePath(state.cwd, expandTilde(paths[1], state.env)),
      );

      if (first.error || first.content === undefined) {
        return {
          output: `diff: ${paths[0]}: ${first.error ?? "unreadable file"}`,
          exitCode: 2,
        };
      }
      if (second.error || second.content === undefined) {
        return {
          output: `diff: ${paths[1]}: ${second.error ?? "unreadable file"}`,
          exitCode: 2,
        };
      }

      if (first.content === second.content) {
        return { output: "", exitCode: 0 };
      }

      return { output: diffText(first.content, second.content), exitCode: 1 };
    }

    case "export": {
      if (args.length === 0 || args[0] === "-p") {
        const lines = Object.keys(state.env)
          .sort()
          .map((key) => `${key}=${state.env[key]}`);
        return { output: lines.join("\n"), exitCode: 0 };
      }

      let exitCode = 0;
      const errors: string[] = [];

      for (const arg of args) {
        const separator = arg.indexOf("=");
        const key = separator >= 0 ? arg.slice(0, separator) : arg;
        const value = separator >= 0 ? arg.slice(separator + 1) : "";

        if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
          errors.push(`export: '${arg}': not a valid identifier`);
          exitCode = 1;
          continue;
        }

        state.env[key] = value;
      }

      return { output: errors.join("\n"), exitCode };
    }

    case "env": {
      const lines = Object.keys(state.env)
        .sort()
        .map((key) => `${key}=${state.env[key]}`);
      return { output: lines.join("\n"), exitCode: 0 };
    }

    case "history": {
      const lines = state.history.map(
        (command, index) => `${String(index + 1).padStart(4, " ")}  ${command}`,
      );
      return { output: lines.join("\n"), exitCode: 0 };
    }

    case "clear":
      return { output: "", exitCode: 0 };

    case "reset": {
      const fresh = new SimulatedShellRuntime().init(state.base ?? state);
      state.cwd = fresh.cwd;
      state.files = fresh.files;
      state.dirs = fresh.dirs;
      state.env = fresh.env;
      state.git = fresh.git;
      state.history = fresh.history;
      state.base = fresh.base;
      return {
        output: "shell reset · virtual filesystem restored",
        exitCode: 0,
      };
    }

    case "help":
      return {
        output: [
          "bench shell · safe simulation",
          "",
          "navigate   pwd, ls, cd",
          "read       cat, head, tail, grep, wc, diff",
          "write      mkdir, touch, cp, mv, rm",
          "shell      echo, printf, export, env, true, false, history, clear, reset, help",
          "compose    command | command, command && command, command || command",
          'git        git status, git diff, git add, git commit -m "message", git log',
          "",
          "nothing here touches a real machine or the network.",
        ].join("\n"),
        exitCode: 0,
      };

    case "git":
      return gitCommand(state, args);

    case "true":
      return { output: "", exitCode: 0 };

    case "false":
      return { output: "", exitCode: 1 };

    default:
      return { output: `${name}: command not found`, exitCode: 127 };
  }
}

export class SimulatedShellRuntime implements ShellRuntime {
  init(setup: PilotSetup): ShellState {
    const cwd = normalizePath(setup.cwd || DEFAULT_HOME);
    const files: Record<string, string> = {};

    for (const [path, content] of Object.entries(setup.files)) {
      files[normalizePath(path)] = content;
    }

    const dirs = new Set<string>();
    dirs.add("/");
    addDirWithParents(dirs, cwd);

    for (const dir of setup.dirs) {
      addDirWithParents(dirs, normalizePath(dir));
    }

    for (const file of Object.keys(files)) {
      addDirWithParents(dirs, parentPath(file));
    }

    const env = { ...setup.env };
    if (!env.HOME) env.HOME = DEFAULT_HOME;
    if (!env.USER) env.USER = "pip";
    if (!env.PWD) env.PWD = cwd;

    const state: ShellState = {
      cwd,
      files,
      dirs: [...dirs].sort(),
      env,
      git: {
        staged: [...setup.git.staged],
        commits: setup.git.commits.map((commit) => ({
          message: commit.message,
          files: [...commit.files],
        })),
      },
      history: [],
    };

    state.base = {
      cwd: state.cwd,
      files: { ...state.files },
      dirs: [...state.dirs],
      env: { ...state.env },
      git: {
        staged: [...state.git.staged],
        commits: state.git.commits.map((commit) => ({
          message: commit.message,
          files: [...commit.files],
        })),
      },
    };

    return state;
  }

  exec(command: string, state: ShellState): ShellResult {
    const trimmed = command.trim();
    const ms = 8 + (trimmed.length % 17);
    const next = cloneState(state);

    if (trimmed) next.history.push(trimmed);

    const lexed = lex(trimmed);
    if (lexed.error) {
      return { output: lexed.error, exitCode: 2, state: next, ms };
    }

    const parsed = parseGroups(lexed.tokens);
    if (parsed.error) {
      return { output: parsed.error, exitCode: 2, state: next, ms };
    }

    if (parsed.groups.length === 0) {
      return { output: "", exitCode: 0, state: next, ms };
    }

    let current = next;
    let lastExit = 0;
    let ran = false;
    const chunks: string[] = [];

    for (const group of parsed.groups) {
      const shouldRun =
        !ran ||
        group.connector === null ||
        (group.connector === "&&" && lastExit === 0) ||
        (group.connector === "||" && lastExit !== 0);

      if (!shouldRun) continue;

      let stdin = "";
      let groupOutput = "";
      let exitCode = 0;

      for (const tokens of group.commands) {
        const expanded = tokens.map((token) =>
          expandVariables(token, current.env),
        );
        const name = expanded[0] ?? "";
        const args = expanded.slice(1);
        const commandState = cloneState(current);
        const result = dispatch(name, args, commandState, stdin);
        current = commandState;
        stdin = result.output;
        groupOutput = result.output;
        exitCode = result.exitCode;
      }

      lastExit = exitCode;
      ran = true;
      if (groupOutput) chunks.push(groupOutput);
    }

    return {
      output: chunks.join("\n"),
      exitCode: lastExit,
      state: current,
      ms,
    };
  }
}

export const shellRuntime: ShellRuntime = new SimulatedShellRuntime();
