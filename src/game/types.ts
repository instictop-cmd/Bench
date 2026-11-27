export type RankId =
  | "operator"
  | "analyst"
  | "tinkerer"
  | "integrator"
  | "engineer"
  | "architect";

export type CourseKind = "quest" | "flow" | "tool" | "eval" | "deploy";

export type QuestChoice = {
  id: string;
  label: string;
  correct: boolean;
  feedback: string;
};

export type QuestStep = {
  id: string;
  title: string;
  detail: string;
  command?: string;
  expectAll?: string[];
  usePrevious?: boolean;
  compare?: {
    question: string;
    correct: "first" | "second";
  };
  choices?: QuestChoice[];
};

export type Quest = {
  id: string;
  rank: RankId;
  order: number;
  title: string;
  scene: string;
  goal: string;
  steps: QuestStep[];
  win: string;
  artifact: { id: string; name: string; note: string };
  xp: number;
  card?: { id: string; title: string; body: string };
};

export type Rank = {
  id: RankId;
  name: string;
  zone: string;
  verb: string;
  kind: CourseKind;
  blurb: string;
};

export const RANKS: Rank[] = [
  {
    id: "operator",
    name: "Operator",
    zone: "The Library",
    verb: "ai",
    kind: "quest",
    blurb: "Command the machine. Add constraints. Learn to hear the difference.",
  },
  {
    id: "analyst",
    name: "Analyst",
    zone: "The Archive",
    verb: "check",
    kind: "quest",
    blurb: "Judge the answer. Quote the source. Separate unsupported from false.",
  },
  {
    id: "tinkerer",
    name: "Tinkerer",
    zone: "The Workshop",
    verb: "flow",
    kind: "flow",
    blurb: "Chain steps, carry state, guard against failure.",
  },
  {
    id: "integrator",
    name: "Integrator",
    zone: "The Server Room",
    verb: "tool",
    kind: "tool",
    blurb: "Give the model hands. Pick a tool, fill its schema, grant the least access.",
  },
  {
    id: "engineer",
    name: "Engineer",
    zone: "The Observatory",
    verb: "eval",
    kind: "eval",
    blurb: "Measure quality. Write cases, read failures, catch regressions, set the gate.",
  },
  {
    id: "architect",
    name: "Architect",
    zone: "The Rooftop",
    verb: "deploy",
    kind: "deploy",
    blurb: "Ship and stay calm. Read logs, roll back, gate risk, run the service.",
  },
];

export const rankById = (id: RankId) => RANKS.find((rank) => rank.id === id);

export const nextRank = (id: RankId) => {
  const index = RANKS.findIndex((rank) => rank.id === id);
  return index >= 0 ? RANKS[index + 1] : undefined;
};
