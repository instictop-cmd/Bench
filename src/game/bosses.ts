import type { RankId } from "./types";

export type BossClaim = {
  id: string;
  text: string;
  fake: boolean;
  note: string;
};

export type BossOption = {
  id: string;
  label: string;
  correct: boolean;
  feedback: string;
};

export type BossRound = {
  id: string;
  title: string;
  prompt: string;
  claims?: BossClaim[];
  options?: BossOption[];
};

export type Boss = {
  id: string;
  rank: RankId;
  title: string;
  scene: string;
  goal: string;
  rounds: BossRound[];
  pass: number;
  xp: number;
  artifact: { id: string; name: string; note: string };
};

export const BOSSES: Boss[] = [
  {
    id: "op-boss",
    rank: "operator",
    title: "The Confident Liar",
    scene: "the library",
    goal: "One claim in each round has no source. Find it.",
    pass: 2,
    xp: 25,
    artifact: {
      id: "truth-auditor",
      name: "Truth Auditor",
      note: "a precise number can still be invented",
    },
    rounds: [
      {
        id: "round-1",
        title: "Round 1 — the study",
        prompt: "Pip makes four claims. One has no source.",
        claims: [
          {
            id: "c1",
            text: "The library is open until 21:00 on weekdays.",
            fake: false,
            note: "Card A1: Monday–Saturday 9:00–21:00.",
          },
          {
            id: "c2",
            text: "A 2024 study found that 92% of students use AI every day.",
            fake: true,
            note: "No such study is in the cards. A precise number is not a source.",
          },
          {
            id: "c3",
            text: "Extension requests need 48 hours' notice.",
            fake: false,
            note: "Card A4 says at least 48 hours before the deadline.",
          },
          {
            id: "c4",
            text: "Wi-Fi is available in the computer labs.",
            fake: false,
            note: "Cards B1 and B2 both keep Wi-Fi in the labs.",
          },
        ],
      },
      {
        id: "round-2",
        title: "Round 2 — the hours",
        prompt: "Four claims about the library. One contradicts the card.",
        claims: [
          {
            id: "c1",
            text: "The library is closed on Sundays.",
            fake: true,
            note: "Card A1 says Sunday: 10:00–16:00. The claim contradicts it.",
          },
          {
            id: "c2",
            text: "Sunday hours are 10:00–16:00.",
            fake: false,
            note: "Card A1.",
          },
          {
            id: "c3",
            text: "The survey covered 1,200 students.",
            fake: false,
            note: "Card A2.",
          },
          {
            id: "c4",
            text: "Wi-Fi was removed from the library in 2025.",
            fake: false,
            note: "Card B2.",
          },
        ],
      },
      {
        id: "round-3",
        title: "Round 3 — the missing page",
        prompt: "Four claims. One is unsupported, not false.",
        claims: [
          {
            id: "c1",
            text: "A medical certificate is required after the deadline.",
            fake: false,
            note: "Card A4.",
          },
          {
            id: "c2",
            text: "The library has 40,000 books.",
            fake: true,
            note: "Card A5 lists hours and Wi-Fi only. Unsupported is not false.",
          },
          {
            id: "c3",
            text: "The 2024 survey covered three Pune colleges.",
            fake: false,
            note: "Card A2.",
          },
          {
            id: "c4",
            text: "The 2023 notice listed Wi-Fi in the library.",
            fake: false,
            note: "Card B1.",
          },
        ],
      },
    ],
  },
  {
    id: "an-boss",
    rank: "analyst",
    title: "The Vague Machine",
    scene: "the archive",
    goal: "Turn fog into a testable question. Pick the question that adds what is missing.",
    pass: 2,
    xp: 35,
    artifact: {
      id: "fog-lens",
      name: "Fog Lens",
      note: "ask who, when, where, and how many before you believe a claim",
    },
    rounds: [
      {
        id: "round-1",
        title: "Round 1 — “many students”",
        prompt: "Many students struggle with AI.",
        options: [
          {
            id: "o1",
            label: "Which students, where, and how many?",
            correct: true,
            feedback: "Yes. Population, place, and size. That is a testable claim.",
          },
          {
            id: "o2",
            label: "Is AI good or bad?",
            correct: false,
            feedback: "That is a new topic, not a missing ingredient.",
          },
          {
            id: "o3",
            label: "Should I use AI?",
            correct: false,
            feedback: "That is a personal decision, not a test of the claim.",
          },
        ],
      },
      {
        id: "round-2",
        title: "Round 2 — “experts agree”",
        prompt: "Experts agree AI improves learning.",
        options: [
          {
            id: "o1",
            label: "Which experts, which learners, and what outcome?",
            correct: true,
            feedback: "Yes. Expertise, population, measure. Then you can check it.",
          },
          {
            id: "o2",
            label: "Who counts as an expert?",
            correct: false,
            feedback: "Closer, but the learners and the outcome are still missing.",
          },
          {
            id: "o3",
            label: "Does AI improve anything?",
            correct: false,
            feedback: "That repeats the claim. It does not test it.",
          },
        ],
      },
      {
        id: "round-3",
        title: "Round 3 — “significantly”",
        prompt: "AI significantly increases marks.",
        options: [
          {
            id: "o1",
            label: "By how much, for whom, and compared to what?",
            correct: true,
            feedback: "Yes. Effect size, population, and counterfactual.",
          },
          {
            id: "o2",
            label: "What is a mark?",
            correct: false,
            feedback: "Definitions are useful, but the comparison is missing.",
          },
          {
            id: "o3",
            label: "Is AI significant?",
            correct: false,
            feedback: "“Significant” is the word to test, not repeat.",
          },
        ],
      },
    ],
  },
  {
    id: "ru-boss",
    rank: "tinkerer",
    title: "The Runaway",
    scene: "the workshop",
    goal: "A flow that never stops. Add the exit condition and the budget.",
    pass: 2,
    xp: 35,
    artifact: {
      id: "runaway-badge",
      name: "Runaway Badge",
      note: "every loop needs an exit and a budget",
    },
    rounds: [
      {
        id: "round-1",
        title: "Round 1 — the loop",
        prompt: "A flow keeps summarising its own output. What do you add first?",
        options: [
          {
            id: "budget",
            label: "A max step budget and an exit condition",
            correct: true,
            feedback: "Yes. A loop without an exit is a bill, not a flow.",
          },
          {
            id: "model",
            label: "A bigger model",
            correct: false,
            feedback: "A bigger model loops faster. It does not stop.",
          },
          {
            id: "steps",
            label: "More steps",
            correct: false,
            feedback: "More steps make the loop longer, not bounded.",
          },
        ],
      },
      {
        id: "round-2",
        title: "Round 2 — the retry",
        prompt: "A retry loop never accepts a result. What is missing?",
        options: [
          {
            id: "stop",
            label: "A stop condition and a retry cap",
            correct: true,
            feedback: "Yes. Define success, then cap the attempts.",
          },
          {
            id: "timeout",
            label: "A longer timeout",
            correct: false,
            feedback: "A longer timeout gives the loop more time to run away.",
          },
          {
            id: "prompt",
            label: "A new prompt",
            correct: false,
            feedback: "A new prompt changes the task, not the loop.",
          },
        ],
      },
      {
        id: "round-3",
        title: "Round 3 — the daily flow",
        prompt: "A daily flow burns credits every morning. What do you add?",
        options: [
          {
            id: "budget",
            label: "A schedule, a budget, and a human check",
            correct: true,
            feedback: "Yes. Trigger, budget, and a review gate.",
          },
          {
            id: "context",
            label: "A bigger context window",
            correct: false,
            feedback: "More context does not make the routine accountable.",
          },
          {
            id: "tools",
            label: "More tools",
            correct: false,
            feedback: "More tools mean more places to spend.",
          },
        ],
      },
    ],
  },
];

export const bossById = (id: string) => BOSSES.find((boss) => boss.id === id);

export const bossForRank = (rank: RankId) =>
  BOSSES.find((boss) => boss.rank === rank);
