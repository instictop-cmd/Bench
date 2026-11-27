export type FlowOperation = {
  id: string;
  label: string;
  hint: string;
  kind: "model" | "transform";
  serverId?: string;
  prompt?: (context: FlowContext) => string;
  transform?: (context: FlowContext) => string;
  fallback?: string;
};

export type FlowContext = {
  input: string;
  previous: string;
  variables: Record<string, string>;
};

export type FlowStep = {
  id: string;
  operationId: string;
};

export type FlowSpec = {
  steps: FlowStep[];
  variables: Record<string, string>;
};

export type FlowTraceStep = {
  id: string;
  operationId: string;
  label: string;
  input: string;
  output: string;
  ms: number;
  degraded?: boolean;
};

export type FlowTrace = {
  steps: FlowTraceStep[];
  output: string;
  ok: boolean;
};

export type FlowVariable = {
  key: string;
  label: string;
  placeholder: string;
  default: string;
};

export type FlowLesson = {
  id: string;
  order: number;
  title: string;
  scene: string;
  goal: string;
  inputLabel: string;
  inputPlaceholder: string;
  inputDefault: string;
  maxInput: number;
  variables?: FlowVariable[];
  operations: string[];
  required: string[];
  win: string;
  artifact: { id: string; name: string; note: string };
  xp: number;
};

export const FLOW_OPS: Record<string, FlowOperation> = {
  summarise: {
    id: "summarise",
    label: "Summarise notes",
    hint: "3 bullets from the input",
    kind: "model",
    serverId: "fl-summarise",
    prompt: ({ input }) =>
      `Summarise these study notes in exactly 3 short bullets. No preamble.\n\n${input}`,
    fallback:
      "• The notes explain one idea.\n• They give one example.\n• They leave one question to test.",
  },
  quiz: {
    id: "quiz",
    label: "Make a quiz",
    hint: "3 questions from the previous step",
    kind: "model",
    serverId: "fl-quiz",
    prompt: ({ previous }) =>
      `Write exactly 3 short quiz questions from this text. No answers, no preamble.\n\n${previous}`,
    fallback:
      "1. What is the main idea?\n2. Which example is used?\n3. What should you test next?",
  },
  "set-topic": {
    id: "set-topic",
    label: "Set the topic",
    hint: "store one value for later steps",
    kind: "transform",
    transform: ({ variables }) => variables.topic?.trim() ?? "",
  },
  explain: {
    id: "explain",
    label: "Explain simply",
    hint: "use the stored topic",
    kind: "model",
    serverId: "fl-explain",
    prompt: ({ variables }) =>
      `Explain ${variables.topic || "the topic"} to a 12-year-old in exactly 2 sentences. No markdown.`,
    fallback:
      "Start with the simplest true sentence. Then add one concrete example.",
  },
  "quiz-topic": {
    id: "quiz-topic",
    label: "Quiz the topic",
    hint: "3 questions from the explanation",
    kind: "model",
    serverId: "fl-quiz-topic",
    prompt: ({ previous }) =>
      `Write exactly 3 short quiz questions about this explanation. No answers, no preamble.\n\n${previous}`,
    fallback:
      "1. What is the topic?\n2. What is one example?\n3. What is a common mistake?",
  },
  title: {
    id: "title",
    label: "Add a title",
    hint: "a transform, not a model call",
    kind: "transform",
    transform: ({ previous }) =>
      previous.split("\n")[0].slice(0, 50) || "Untitled",
  },
  schedule: {
    id: "schedule",
    label: "Schedule it",
    hint: "a transform, not a model call",
    kind: "transform",
    transform: () => "reminder set for tomorrow",
  },
};

export const FLOW_LESSONS: FlowLesson[] = [
  {
    id: "fl-01",
    order: 1,
    title: "Chain Two Steps",
    scene: "the workshop",
    goal: "Turn raw notes into a summary and a quiz, in one run.",
    inputLabel: "Paste your notes",
    inputPlaceholder: "Photosynthesis is how plants use sunlight...",
    inputDefault:
      "Photosynthesis is how plants use sunlight, water, and carbon dioxide to make food. It happens in the leaves. The plant releases oxygen as a leftover.",
    maxInput: 300,
    operations: ["summarise", "quiz", "title", "schedule"],
    required: ["summarise", "quiz"],
    win: "Two model steps in order, with two non-empty outputs.",
    artifact: {
      id: "flow-card",
      name: "Flow Card",
      note: "one input, two useful outputs",
    },
    xp: 15,
  },
  {
    id: "fl-02",
    order: 2,
    title: "Carry a Variable",
    scene: "the workshop",
    goal: "Set the topic once, then use it in every step.",
    inputLabel: "What are you studying?",
    inputPlaceholder: "photosynthesis",
    inputDefault: "photosynthesis",
    maxInput: 80,
    variables: [
      {
        key: "topic",
        label: "Topic variable",
        placeholder: "photosynthesis",
        default: "photosynthesis",
      },
    ],
    operations: ["set-topic", "explain", "quiz-topic", "title"],
    required: ["set-topic", "explain", "quiz-topic"],
    win: "The topic is set once and used through the flow.",
    artifact: {
      id: "variable-vault",
      name: "Variable Vault",
      note: "type it once; reuse it everywhere",
    },
    xp: 15,
  },
];

export const flowLessonById = (id: string) =>
  FLOW_LESSONS.find((lesson) => lesson.id === id);

export const nextFlowLesson = (id: string) => {
  const index = FLOW_LESSONS.findIndex((lesson) => lesson.id === id);
  return index >= 0 ? FLOW_LESSONS[index + 1] : undefined;
};

export function validateFlow(
  spec: FlowSpec,
  lesson: FlowLesson,
): string | null {
  const ids = spec.steps.map((step) => step.operationId);

  if (ids.length !== lesson.required.length) {
    return `this flow needs ${lesson.required.length} steps.`;
  }

  for (let i = 0; i < ids.length; i += 1) {
    if (ids[i] !== lesson.required[i]) {
      return `step ${i + 1} should be "${FLOW_OPS[lesson.required[i]]?.label}".`;
    }
  }

  if (lesson.variables) {
    for (const variable of lesson.variables) {
      if (!spec.variables[variable.key]?.trim()) {
        return `set the ${variable.label.toLowerCase()}.`;
      }
    }
  }

  return null;
}
