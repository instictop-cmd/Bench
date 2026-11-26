export type RankId = "operator" | "analyst";

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
  blurb: string;
};

export const RANKS: Rank[] = [
  {
    id: "operator",
    name: "Operator",
    zone: "The Library",
    verb: "ai",
    blurb: "Command the machine. Add constraints. Learn to hear the difference.",
  },
  {
    id: "analyst",
    name: "Analyst",
    zone: "The Archive",
    verb: "check",
    blurb: "Judge the answer. Quote the source. Separate unsupported from false.",
  },
];

export const LOCKED_RANKS = [
  { name: "Tinkerer", zone: "The Workshop", verb: "flow" },
  { name: "Integrator", zone: "The Server Room", verb: "tool" },
  { name: "Engineer", zone: "The Observatory", verb: "eval" },
  { name: "Architect", zone: "The Rooftop", verb: "deploy" },
];
