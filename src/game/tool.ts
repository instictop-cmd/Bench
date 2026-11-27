export type ToolId = "calculator" | "calendar" | "file" | "search";

export type ScopeId =
  | "compute"
  | "calendar.read"
  | "calendar.write"
  | "files.read"
  | "files.write"
  | "files.readwrite"
  | "web.search";

export type ToolField = {
  key: string;
  label: string;
  type: "text" | "number" | "date";
  placeholder: string;
  required: boolean;
  hint?: string;
};

export type ToolSpec = {
  id: ToolId;
  name: string;
  hint: string;
  permission: ScopeId;
  returns: string;
  fields: ToolField[];
};

export type ToolScope = {
  id: ScopeId;
  label: string;
  hint: string;
};

export type ToolChoice = {
  id: string;
  label: string;
  correct: boolean;
  feedback: string;
};

export type ToolLesson = {
  id: string;
  order: number;
  title: string;
  scene: string;
  goal: string;
  task: string;
  tools: ToolId[];
  scopes: ScopeId[];
  expectedTool: ToolId;
  expectedArgs: Record<string, string | number>;
  expectedScope: ScopeId;
  defaultArgs?: Record<string, string>;
  proposal?: string;
  question?: {
    prompt: string;
    options: ToolChoice[];
  };
  win: string;
  artifact: { id: string; name: string; note: string };
  xp: number;
};

export const TOOL_SPECS: Record<ToolId, ToolSpec> = {
  calculator: {
    id: "calculator",
    name: "calculator",
    hint: "do exact arithmetic",
    permission: "compute",
    returns: "a number",
    fields: [
      {
        key: "expression",
        label: "Expression",
        type: "text",
        placeholder: "1200 * 7",
        required: true,
        hint: "numbers and + - * / only",
      },
    ],
  },
  calendar: {
    id: "calendar",
    name: "calendar",
    hint: "book a block of time",
    permission: "calendar.write",
    returns: "a booking confirmation",
    fields: [
      {
        key: "title",
        label: "Title",
        type: "text",
        placeholder: "Deep Work",
        required: true,
      },
      {
        key: "date",
        label: "Date",
        type: "date",
        placeholder: "2026-12-01",
        required: true,
      },
      {
        key: "duration",
        label: "Minutes",
        type: "number",
        placeholder: "30",
        required: true,
        hint: "whole minutes",
      },
    ],
  },
  file: {
    id: "file",
    name: "file",
    hint: "read or write one file",
    permission: "files.write",
    returns: "file contents or a write receipt",
    fields: [
      {
        key: "path",
        label: "Path",
        type: "text",
        placeholder: "notes.md",
        required: true,
      },
      {
        key: "content",
        label: "Content",
        type: "text",
        placeholder: "leave empty to read",
        required: false,
        hint: "optional; empty means read",
      },
    ],
  },
  search: {
    id: "search",
    name: "search",
    hint: "look things up on the web",
    permission: "web.search",
    returns: "a short result list",
    fields: [
      {
        key: "query",
        label: "Query",
        type: "text",
        placeholder: "photosynthesis for beginners",
        required: true,
      },
      {
        key: "limit",
        label: "Results",
        type: "number",
        placeholder: "3",
        required: false,
        hint: "1 to 5",
      },
    ],
  },
};

export const TOOL_SCOPES: Record<ScopeId, ToolScope> = {
  compute: {
    id: "compute",
    label: "compute",
    hint: "run arithmetic, nothing else",
  },
  "calendar.read": {
    id: "calendar.read",
    label: "calendar.read",
    hint: "see events",
  },
  "calendar.write": {
    id: "calendar.write",
    label: "calendar.write",
    hint: "create or change one event",
  },
  "files.read": {
    id: "files.read",
    label: "files.read",
    hint: "open a file",
  },
  "files.write": {
    id: "files.write",
    label: "files.write",
    hint: "save a file",
  },
  "files.readwrite": {
    id: "files.readwrite",
    label: "files.readwrite",
    hint: "read and write every file",
  },
  "web.search": {
    id: "web.search",
    label: "web.search",
    hint: "search the public web",
  },
};

export const TOOL_LESSONS: ToolLesson[] = [
  {
    id: "tl-01",
    order: 1,
    title: "Pick the Tool",
    scene: "the server room",
    goal: "A task arrives. Choose the one tool that can actually answer it.",
    task: "A sponsor pays ₹1,200 per workshop. You ran 7 workshops. What is the total?",
    tools: ["calculator", "calendar", "search"],
    scopes: ["compute", "calendar.read", "web.search"],
    expectedTool: "calculator",
    expectedArgs: { expression: "1200 * 7" },
    expectedScope: "compute",
    win: "The right tool, the right expression, the right answer.",
    artifact: {
      id: "tool-card",
      name: "Tool Card",
      note: "match the task to the tool before you call it",
    },
    xp: 20,
  },
  {
    id: "tl-02",
    order: 2,
    title: "Fill the Schema",
    scene: "the server room",
    goal: "A tool will reject an incomplete call. Fill every required field.",
    task: "Book a 30-minute study block called Deep Work on 2026-12-01.",
    tools: ["calendar", "calculator"],
    scopes: ["calendar.read", "calendar.write", "compute"],
    expectedTool: "calendar",
    expectedArgs: { title: "Deep Work", date: "2026-12-01", duration: 30 },
    expectedScope: "calendar.write",
    win: "Every required field filled, one booking created.",
    artifact: {
      id: "schema-sheet",
      name: "Schema Sheet",
      note: "a tool only works when its required fields are present",
    },
    xp: 20,
  },
  {
    id: "tl-03",
    order: 3,
    title: "Read the Result",
    scene: "the server room",
    goal: "A tool result can be partial. Report what came back, not what you hoped.",
    task: "Read notes.md and report what the file actually contains.",
    tools: ["file", "search"],
    scopes: ["files.read", "files.write", "web.search"],
    expectedTool: "file",
    expectedArgs: { path: "notes.md" },
    expectedScope: "files.read",
    question: {
      prompt: "The file stops mid-sentence. What is the honest next step?",
      options: [
        {
          id: "invent",
          label: "Finish the sentence from memory",
          correct: false,
          feedback:
            "No. You would be inventing text the tool never returned.",
        },
        {
          id: "report",
          label: "Report the partial text and fetch the rest",
          correct: true,
          feedback:
            "Yes. Say what came back, then make a second call for the rest.",
        },
        {
          id: "hide",
          label: "Say the file ends there",
          correct: false,
          feedback: "No. A truncation notice is evidence, not an ending.",
        },
      ],
    },
    win: "A read call, a partial result, and an honest answer.",
    artifact: {
      id: "result-reader",
      name: "Result Reader",
      note: "read the result as evidence, including what is missing",
    },
    xp: 20,
  },
  {
    id: "tl-04",
    order: 4,
    title: "Scope It",
    scene: "the server room",
    goal: "Grant the least access that still finishes the task.",
    task: "Save the finished summary to summary.md.",
    tools: ["file", "search"],
    scopes: ["files.read", "files.write", "files.readwrite", "web.search"],
    expectedTool: "file",
    expectedArgs: {
      path: "summary.md",
      content: "Photosynthesis turns sunlight, water, and CO2 into food.",
    },
    expectedScope: "files.write",
    defaultArgs: {
      path: "summary.md",
      content: "Photosynthesis turns sunlight, water, and CO2 into food.",
    },
    win: "One write, one narrow scope, no extra access.",
    artifact: {
      id: "permission-key",
      name: "Permission Key",
      note: "ask for the smallest scope that does the job",
    },
    xp: 20,
  },
  {
    id: "tl-05",
    order: 5,
    title: "The Handoff",
    scene: "the server room",
    goal: "The model proposes a call. Inspect it, fix it, then execute it.",
    task: "Save the finished summary to summary.md. The model proposed the call below.",
    tools: ["file", "calendar"],
    scopes: ["files.read", "files.write", "calendar.write"],
    expectedTool: "file",
    expectedArgs: {
      path: "summary.md",
      content: "Plants make food from light.",
    },
    expectedScope: "files.write",
    defaultArgs: {
      path: "summary.md",
      content: "",
    },
    proposal:
      'file({ path: "summary.md", content: "" }) — "I will write the summary now."',
    win: "A checked proposal, a filled argument, a narrow write scope.",
    artifact: {
      id: "call-sheet",
      name: "Call Sheet",
      note: "inspect the proposed call before you let it run",
    },
    xp: 25,
  },
];

export const toolLessonById = (id: string) =>
  TOOL_LESSONS.find((lesson) => lesson.id === id);

export const nextToolLesson = (id: string) => {
  const index = TOOL_LESSONS.findIndex((lesson) => lesson.id === id);
  return index >= 0 ? TOOL_LESSONS[index + 1] : undefined;
};

export function sameArgs(
  actual: Record<string, string>,
  expected: Record<string, string | number>,
): boolean {
  const keys = Object.keys(expected);
  return keys.every(
    (key) => (actual[key] ?? "").trim() === String(expected[key]).trim(),
  );
}
