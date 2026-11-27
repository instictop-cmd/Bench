export type RankId =
  | "operator"
  | "analyst"
  | "tinkerer"
  | "integrator"
  | "engineer"
  | "architect"
  | "connector"
  | "caller"
  | "pilot";

export type CourseKind =
  | "quest"
  | "flow"
  | "tool"
  | "eval"
  | "deploy"
  | "connect"
  | "request"
  | "operate"
  | "studio";

export type RankTrack = "core" | "shared" | "operator" | "builder";

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
  track?: RankTrack;
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
  {
    id: "connector",
    name: "Connector",
    zone: "The Switchboard",
    verb: "connect",
    kind: "connect",
    track: "shared",
    blurb:
      "Give the model hands. Read a server, call a tool, use a resource, and trust nothing blindly.",
  },
  {
    id: "caller",
    name: "Caller",
    zone: "The Exchange",
    verb: "request",
    kind: "request",
    track: "shared",
    blurb:
      "Speak HTTP. Read a payload, carry a key, survive a 429, and verify an event.",
  },
  {
    id: "pilot",
    name: "Pilot",
    zone: "The Cockpit",
    verb: "operate",
    kind: "operate",
    track: "builder",
    blurb:
      "Operate the machine. Move through a filesystem, pipe output, keep secrets out of git.",
  },
];

export const rankById = (id: RankId) => RANKS.find((rank) => rank.id === id);

export const nextRank = (id: RankId) => {
  const index = RANKS.findIndex((rank) => rank.id === id);
  return index >= 0 ? RANKS[index + 1] : undefined;
};
