export type FlowOperation = {
  id: string;
  label: string;
  hint: string;
  kind: "model" | "transform";
  serverId?: string;
  prompt?: (context: FlowContext) => string;
  transform?: (context: FlowContext) => string;
  guard?: (context: FlowContext) => { output: string; tripped: boolean };
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
  triggerId?: string;
};

export type FlowTraceStep = {
  id: string;
  operationId: string;
  label: string;
  input: string;
  output: string;
  ms: number;
  degraded?: boolean;
  guarded?: boolean;
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

export type FlowTriggerOption = {
  id: string;
  label: string;
  hint: string;
  correct: boolean;
  testId: string;
};

export type FlowTrigger = {
  label: string;
  options: FlowTriggerOption[];
};

export const TRIGGER_TESTS: Record<string, (input: string) => boolean> = {
  "has-link": (input) => /https?:\/\/\S+/i.test(input),
  empty: (input) => input.trim().length === 0,
  always: () => true,
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
  trigger?: FlowTrigger;
  maxModelSteps?: number;
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
    hint: "3 bullets from the previous step",
    kind: "model",
    serverId: "fl-summarise",
    prompt: ({ previous }) =>
      `Summarise these study notes in exactly 3 short bullets. No preamble.\n\n${previous}`,
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
      `Write exactly 3 different short quiz questions from this text. No answers, no preamble.\n\n${previous}`,
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
  "strip-link": {
    id: "strip-link",
    label: "Strip the link",
    hint: "remove the URL, keep the notes",
    kind: "transform",
    transform: ({ input }) =>
      input
        .replace(/https?:\/\/\S+/gi, "")
        .replace(/\bsource:\s*$/i, "")
        .replace(/\s+/g, " ")
        .trim(),
  },
  guard: {
    id: "guard",
    label: "Add a guard",
    hint: "parse it; fall back if it breaks",
    kind: "transform",
    guard: ({ previous }) => {
      try {
        const parsed = JSON.parse(previous) as { bullets?: unknown };
        if (Array.isArray(parsed.bullets) && parsed.bullets.length > 0) {
          return {
            output: parsed.bullets
              .filter((item): item is string => typeof item === "string")
              .join("\n"),
            tripped: false,
          };
        }
      } catch {
        // malformed output: fall through to the fallback
      }

      return {
        output:
          "• Plants use sunlight, water, and carbon dioxide.\n• The process is photosynthesis.\n• It releases oxygen.",
        tripped: true,
      };
    },
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
      `Write exactly 3 different short quiz questions about this explanation. No answers, no preamble.\n\n${previous}`,
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
  {
    id: "fl-03",
    order: 3,
    title: "Add a Trigger",
    scene: "the workshop",
    goal: "Run the flow only when the input looks like a source link.",
    inputLabel: "Notes with a source link",
    inputPlaceholder: "Notes... Source: https://...",
    inputDefault:
      "Photosynthesis is how plants use sunlight, water, and carbon dioxide to make food. Source: https://example.com/photosynthesis",
    maxInput: 300,
    trigger: {
      label: "When should this flow run?",
      options: [
        {
          id: "has-link",
          label: "When the input contains a link",
          hint: "look for http:// or https://",
          correct: true,
          testId: "has-link",
        },
        {
          id: "empty",
          label: "When the input is empty",
          hint: "never for this lesson",
          correct: false,
          testId: "empty",
        },
        {
          id: "always",
          label: "Always run",
          hint: "too broad to be a condition",
          correct: false,
          testId: "always",
        },
      ],
    },
    operations: ["strip-link", "summarise", "quiz", "title"],
    required: ["strip-link", "summarise", "quiz"],
    win: "Correct trigger, link stripped, then summary and quiz.",
    artifact: {
      id: "trigger-switch",
      name: "Trigger Switch",
      note: "run only when the condition is true",
    },
    xp: 15,
  },
  {
    id: "fl-04",
    order: 4,
    title: "Fail Gracefully",
    scene: "the workshop",
    goal: "One step returns broken JSON. Guard it before the quiz.",
    inputLabel: "The previous step returned this",
    inputPlaceholder: '{"topic":"photosynthesis","bullets":[...]}',
    inputDefault: '{"topic":"photosynthesis","bullets":["Plants use sunlight",',
    maxInput: 300,
    operations: ["guard", "summarise", "quiz", "title"],
    required: ["guard", "quiz"],
    win: "A guard before the quiz; broken output becomes a usable fallback.",
    artifact: {
      id: "guardrail",
      name: "Guardrail",
      note: "check the shape before you use it",
    },
    xp: 15,
  },
  {
    id: "fl-05",
    order: 5,
    title: "The Daily Flow",
    scene: "the workshop",
    goal: "Build a four-step routine that stays inside a two-call budget.",
    inputLabel: "What do you want to study?",
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
    maxModelSteps: 2,
    operations: ["set-topic", "explain", "quiz-topic", "schedule", "summarise"],
    required: ["set-topic", "explain", "quiz-topic", "schedule"],
    win: "Four steps, two model calls, one reusable routine.",
    artifact: {
      id: "routine",
      name: "Routine",
      note: "set it up once; run it daily",
    },
    xp: 20,
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
  input = "",
): string | null {
  if (lesson.trigger) {
    if (!spec.triggerId) return "pick a trigger first.";

    const option = lesson.trigger.options.find(
      (candidate) => candidate.id === spec.triggerId,
    );
    if (!option) return "pick a trigger first.";

    const test = TRIGGER_TESTS[option.testId];
    if (!option.correct) return "that trigger is too broad for this lesson.";
    if (!test || !test(input)) {
      return "this input does not match the trigger. add a link.";
    }
  }

  if (lesson.maxModelSteps !== undefined) {
    const modelCalls = spec.steps.filter(
      (step) => FLOW_OPS[step.operationId]?.kind === "model",
    ).length;

    if (modelCalls > lesson.maxModelSteps) {
      return `this flow uses ${modelCalls} model calls; the budget is ${lesson.maxModelSteps}.`;
    }
  }

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
