import type { Quest } from "./types";

export const QUESTS: Quest[] = [
  {
    id: "op-01",
    rank: "operator",
    order: 1,
    title: "Hello, Operator",
    scene: "the library",
    goal: "Ask the same question twice. Learn to hear the difference.",
    win: "Pick the answer a 12-year-old could actually use.",
    artifact: {
      id: "clarity-lens",
      name: "Clarity Lens",
      note: "add an audience and a limit to any prompt",
    },
    xp: 10,
    steps: [
      {
        id: "plain",
        title: "Ask it plainly",
        detail: 'run ai "explain photosynthesis"',
        command: 'ai "explain photosynthesis"',
        expectAll: ["photosynthesis"],
      },
      {
        id: "constrained",
        title: "Add one constraint",
        detail: "ask for one sentence, for a 12-year-old",
        command:
          'ai "explain photosynthesis to a 12-year-old in one sentence"',
        expectAll: ["photosynthesis", "12"],
      },
      {
        id: "choose",
        title: "Pick the better answer",
        detail: "choose the one you would actually use",
        compare: {
          question: "which one would a 12-year-old actually use?",
          correct: "second",
        },
      },
    ],
  },
  {
    id: "op-02",
    rank: "operator",
    order: 2,
    title: "Name the Deliverable",
    scene: "the library",
    goal: "Ask for an output, not a subject.",
    win: "Make a complete brief and prove which ingredient matters.",
    artifact: {
      id: "goal-line",
      name: "Goal Line",
      note: "name the deliverable, the count, and the deadline",
    },
    xp: 10,
    steps: [
      {
        id: "subject",
        title: "Ask for a subject",
        detail: 'run ai "statistics"',
        command: 'ai "statistics"',
        expectAll: ["statistics"],
      },
      {
        id: "deliverable",
        title: "Ask for a deliverable",
        detail: "name the plan, the count, and the deadline",
        command:
          'ai "make a 3-step revision plan for my statistics exam on Friday, 30 minutes each"',
        expectAll: ["revision", "friday"],
      },
      {
        id: "ablate",
        title: "Name what mattered",
        detail: "which request gave you something you can act on?",
        choices: [
          {
            id: "subject",
            label: "statistics",
            correct: false,
            feedback: "That returns a definition. There is no plan in it.",
          },
          {
            id: "brief",
            label: "the 3-step plan with a time and a day",
            correct: true,
            feedback: "Yes. Deliverable, count, deadline. That is a brief.",
          },
        ],
      },
    ],
  },
  {
    id: "op-03",
    rank: "operator",
    order: 3,
    title: "Wear the Role",
    scene: "the library",
    goal: "A role changes what the machine notices.",
    win: "Say what the role changed, not just that it sounded different.",
    artifact: {
      id: "role-card",
      name: "Role Card",
      note: "name who is listening before you ask",
    },
    xp: 10,
    steps: [
      {
        id: "plain",
        title: "Ask plainly",
        detail: 'run ai "explain diversification"',
        command: 'ai "explain diversification"',
        expectAll: ["diversification"],
      },
      {
        id: "role",
        title: "Give it a role",
        detail: "ask a strict professor to grade a claim",
        command:
          'ai "you are a strict finance professor. grade this: diversification removes all risk"',
        expectAll: ["professor", "diversification"],
      },
      {
        id: "reflect",
        title: "Name what changed",
        detail: "what did the role actually do?",
        choices: [
          {
            id: "personality",
            label: "It gave the machine a personality",
            correct: false,
            feedback: "It did more than sound different. Look at what it checked.",
          },
          {
            id: "attention",
            label: "It changed what the machine looked for and how it said it",
            correct: true,
            feedback: "Yes. A role is a lens, not a costume.",
          },
        ],
      },
    ],
  },
  {
    id: "op-04",
    rank: "operator",
    order: 4,
    title: "Show It Your Voice",
    scene: "the library",
    goal: "Two examples beat one adjective.",
    win: "Tell which rewrite actually matches the samples.",
    artifact: {
      id: "style-sample",
      name: "Style Sample",
      note: "give two examples before asking for a voice",
    },
    xp: 10,
    steps: [
      {
        id: "examples",
        title: "Show two samples",
        detail: "give the machine your rhythm, not an adjective",
        command:
          'ai "rewrite in my voice. example 1: hey - move review to 4? example 2: no stress if not. now: I can\'t attend"',
        expectAll: ["voice", "example"],
      },
      {
        id: "plain",
        title: "Ask without samples",
        detail: "same request, no examples",
        command: 'ai "rewrite this plainly: I can\'t attend"',
        expectAll: ["rewrite"],
      },
      {
        id: "choose",
        title: "Pick the one in your voice",
        detail: "which rewrite sounds like the samples?",
        compare: {
          question: "which one sounds like the samples?",
          correct: "first",
        },
      },
    ],
  },
  {
    id: "op-05",
    rank: "operator",
    order: 5,
    title: "The Second Draft",
    scene: "the library",
    goal: "Improve the draft without collateral edits.",
    win: "Make the asked changes and leave everything else alone.",
    artifact: {
      id: "draft-loop",
      name: "Draft Loop",
      note: "send the draft back with only the changes you want",
    },
    xp: 10,
    steps: [
      {
        id: "draft",
        title: "Get a first draft",
        detail: "a short leave request",
        command: 'ai "write a 40-word leave request for Friday"',
        expectAll: ["leave", "friday"],
      },
      {
        id: "revise",
        title: "Revise with context",
        detail: "ask for three specific changes, not a new draft",
        command:
          'ai "shorter, warmer, mention the client demo I\'ll miss"',
        usePrevious: true,
        expectAll: ["shorter", "warmer"],
      },
      {
        id: "reflect",
        title: "Check the collateral",
        detail: "what did the revision actually change?",
        choices: [
          {
            id: "asked",
            label: "Shorter, warmer, and it mentions the demo",
            correct: true,
            feedback: "Yes. Only the asked changes. That is the loop.",
          },
          {
            id: "invented",
            label: "It added a new excuse you did not ask for",
            correct: false,
            feedback: "Look again. Did it invent a reason, or keep your reason?",
          },
        ],
      },
    ],
  },
  {
    id: "an-01",
    rank: "analyst",
    order: 1,
    title: "Source or It Didn't Happen",
    scene: "the archive",
    goal: "A claim needs a sentence from the source.",
    win: "Read the card, quote the line, and name the verdict.",
    artifact: {
      id: "source-stamp",
      name: "Source Stamp",
      note: "quote the exact line before you agree",
    },
    xp: 15,
    card: {
      id: "A1",
      title: "Card A1 — Library hours",
      body: "Campus library. Monday to Saturday: 9:00–21:00. Sunday: 10:00–16:00.",
    },
    steps: [
      {
        id: "check",
        title: "Check the claim",
        detail:
          'run check "the library is closed on Sundays" against A1',
        command:
          'check "the library is closed on Sundays" against A1',
        expectAll: ["check", "a1"],
      },
      {
        id: "verdict",
        title: "Read the card yourself",
        detail: "what does A1 actually say?",
        choices: [
          {
            id: "supports",
            label: "Supports — the card says it is closed",
            correct: false,
            feedback: "Read the Sunday line again. It gives hours.",
          },
          {
            id: "contradicts",
            label: "Contradicts — Sunday has hours",
            correct: true,
            feedback: "Yes. Sunday: 10:00–16:00. Quote it.",
          },
          {
            id: "neither",
            label: "Does not address — no Sunday information",
            correct: false,
            feedback: "The card does mention Sunday. Look at the hours.",
          },
        ],
      },
    ],
  },
  {
    id: "an-02",
    rank: "analyst",
    order: 2,
    title: "The Receipt",
    scene: "the archive",
    goal: "A number needs who, when, where, and how many.",
    win: "Catch a claim that reaches beyond its sample.",
    artifact: {
      id: "scope-ruler",
      name: "Scope Ruler",
      note: "check the population before repeating a statistic",
    },
    xp: 15,
    card: {
      id: "A2",
      title: "Card A2 — AI survey",
      body: "Student AI survey, 2024. 1,200 students across 3 Pune colleges. 68% said they used AI for assignments at least once.",
    },
    steps: [
      {
        id: "check",
        title: "Check the statistic",
        detail:
          'run check "68% of Indian students use AI for assignments" against A2',
        command:
          'check "68% of Indian students use AI for assignments" against A2',
        expectAll: ["check", "a2"],
      },
      {
        id: "verdict",
        title: "Find the overreach",
        detail: "where does the claim stop matching the card?",
        choices: [
          {
            id: "supports",
            label: "Supports — the number is in the card",
            correct: false,
            feedback: "The number is there. The population is not.",
          },
          {
            id: "contradicts",
            label: "Contradicts — the card says a different number",
            correct: false,
            feedback: "68% is correct. Look at who was surveyed.",
          },
          {
            id: "scope",
            label: "Does not address — the card says 3 Pune colleges, not India",
            correct: true,
            feedback: "Yes. The sample is not the population.",
          },
        ],
      },
    ],
  },
  {
    id: "an-03",
    rank: "analyst",
    order: 3,
    title: "Two Cards, One Truth",
    scene: "the archive",
    goal: "Newer evidence can overturn older evidence.",
    win: "Name the card that decides, not the one that agrees.",
    artifact: {
      id: "cross-check",
      name: "Cross-Check",
      note: "check the date before you repeat a fact",
    },
    xp: 15,
    card: {
      id: "B1+B2",
      title: "Cards B1 and B2 — Library Wi-Fi",
      body: "B1 (2023): Wi-Fi is available in the library and in both computer labs.\n\nB2 (2025): Wi-Fi has been removed from the library. It remains available in the computer labs.",
    },
    steps: [
      {
        id: "check",
        title: "Check both cards",
        detail:
          'run check "wifi works in the library" against B1+B2',
        command: 'check "wifi works in the library" against B1+B2',
        expectAll: ["check", "b1"],
      },
      {
        id: "verdict",
        title: "Name the deciding card",
        detail: "which card decides the answer?",
        choices: [
          {
            id: "b1",
            label: "B1 — it says the library has Wi-Fi",
            correct: false,
            feedback: "B1 is older. What happened in 2025?",
          },
          {
            id: "b2",
            label: "B2 — it removes Wi-Fi from the library",
            correct: true,
            feedback: "Yes. The newer card wins, and it contradicts the claim.",
          },
          {
            id: "both",
            label: "Both — they agree",
            correct: false,
            feedback: "They disagree. One is from 2023 and one is from 2025.",
          },
        ],
      },
    ],
  },
  {
    id: "an-04",
    rank: "analyst",
    order: 4,
    title: "Quote, Don't Paraphrase",
    scene: "the archive",
    goal: "One word can change a rule.",
    win: "Find the word that the summary dropped.",
    artifact: {
      id: "exact-quote",
      name: "Exact Quote",
      note: "quote the rule; do not smooth it",
    },
    xp: 15,
    card: {
      id: "A4",
      title: "Card A4 — Extension policy",
      body: "Extension policy: request at least 48 hours before the deadline. Requests after the deadline require a medical certificate.",
    },
    steps: [
      {
        id: "check",
        title: "Check the summary",
        detail:
          'run check "students can get an extension anytime with a medical certificate" against A4',
        command:
          'check "students can get an extension anytime with a medical certificate" against A4',
        expectAll: ["check", "a4"],
      },
      {
        id: "verdict",
        title: "Find the drift",
        detail: "which word breaks the summary?",
        choices: [
          {
            id: "anytime",
            label: "“Anytime” — the card says at least 48 hours before",
            correct: true,
            feedback: "Yes. The summary erased the 48-hour rule.",
          },
          {
            id: "certificate",
            label: "“Medical certificate” — the card never mentions one",
            correct: false,
            feedback: "It does mention one, but only after the deadline.",
          },
          {
            id: "supports",
            label: "Nothing — the summary is accurate",
            correct: false,
            feedback: "Read the first sentence again. There is a time limit.",
          },
        ],
      },
    ],
  },
  {
    id: "an-05",
    rank: "analyst",
    order: 5,
    title: "The Missing Source",
    scene: "the archive",
    goal: "Unsupported is not the same as false.",
    win: "Choose “not enough evidence” over “false”.",
    artifact: {
      id: "null-result",
      name: "Null Result",
      note: "say “not enough evidence” when the card is silent",
    },
    xp: 15,
    card: {
      id: "A5",
      title: "Card A5 — Library services",
      body: "Library services: opening hours and Wi-Fi. No other services are listed.",
    },
    steps: [
      {
        id: "check",
        title: "Check an absent claim",
        detail:
          'run check "the library has 40,000 books" against A5',
        command: 'check "the library has 40,000 books" against A5',
        expectAll: ["check", "a5"],
      },
      {
        id: "verdict",
        title: "Pick the honest verdict",
        detail: "the card is silent on books. What does that mean?",
        choices: [
          {
            id: "false",
            label: "False — there are no books",
            correct: false,
            feedback: "Silence is not evidence of absence. The card just does not say.",
          },
          {
            id: "null",
            label: "Not enough evidence — the card does not address it",
            correct: true,
            feedback: "Yes. Unsupported is not false. Say what you do not know.",
          },
          {
            id: "supports",
            label: "Supports — the library has books",
            correct: false,
            feedback: "The card does not mention books at all.",
          },
        ],
      },
    ],
  },
];

export const questById = (id: string) => QUESTS.find((q) => q.id === id);

export const questsForRank = (rank: Quest["rank"]) =>
  QUESTS.filter((q) => q.rank === rank).sort((a, b) => a.order - b.order);

export const nextQuest = (id: string): Quest | undefined => {
  const index = QUESTS.findIndex((q) => q.id === id);
  return index >= 0 ? QUESTS[index + 1] : undefined;
};
