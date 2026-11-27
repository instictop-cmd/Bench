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
  {
    id: "in-boss",
    rank: "integrator",
    title: "The Overreach",
    scene: "the server room",
    goal: "An agent keeps asking for more access than the task needs. Cut it down.",
    pass: 2,
    xp: 50,
    artifact: {
      id: "least-privilege-badge",
      name: "Least-Privilege Badge",
      note: "grant the smallest scope that still finishes the job",
    },
    rounds: [
      {
        id: "round-1",
        title: "Round 1 — one file",
        prompt:
          "The task: read notes.md and summarise it. The agent asks for files.readwrite and web.search.",
        options: [
          {
            id: "narrow",
            label: "Grant files.read only",
            correct: true,
            feedback:
              "Yes. Reading one file needs read access, not write and not the web.",
          },
          {
            id: "broad",
            label: "Grant files.readwrite and web.search",
            correct: false,
            feedback:
              "No. Two extra powers, neither used by the task. That is overreach.",
          },
          {
            id: "admin",
            label: "Grant admin forever so it never asks again",
            correct: false,
            feedback:
              "No. Permanent admin turns one task into unlimited risk.",
          },
        ],
      },
      {
        id: "round-2",
        title: "Round 2 — one booking",
        prompt:
          "The task: create one 30-minute study block. The agent asks for calendar read, write, delete, and contacts.",
        options: [
          {
            id: "write",
            label: "Grant calendar.write for this one block",
            correct: true,
            feedback:
              "Yes. One create action needs one write scope, not delete and contacts.",
          },
          {
            id: "read",
            label: "Grant calendar.read only",
            correct: false,
            feedback:
              "No. Read cannot create the block. The task would fail.",
          },
          {
            id: "all",
            label: "Grant everything the agent listed",
            correct: false,
            feedback:
              "No. Delete and contacts are unrelated to booking one block.",
          },
        ],
      },
      {
        id: "round-3",
        title: "Round 3 — the daily run",
        prompt:
          "A summary must run every morning at 8am with no human present. What do you grant?",
        options: [
          {
            id: "bounded",
            label:
              "files.read and web.search, a step budget, a run log, and a weekly review",
            correct: true,
            feedback:
              "Yes. Narrow scopes plus a budget, a log, and a human checkpoint.",
          },
          {
            id: "forever",
            label: "Admin access with no expiry so it never breaks",
            correct: false,
            feedback:
              "No. Unattended admin access is how small tasks become incidents.",
          },
          {
            id: "cancel",
            label: "Cancel the task because automation is unsafe",
            correct: false,
            feedback:
              "Too far. Bounded automation is safe; unlimited automation is not.",
          },
        ],
      },
    ],
  },
  {
    id: "en-boss",
    rank: "engineer",
    title: "The Gauntlet",
    scene: "the observatory",
    goal: "Three release decisions. Choose the one the evidence supports.",
    pass: 2,
    xp: 60,
    artifact: {
      id: "gate-key",
      name: "Gate Key",
      note: "a green suite only ships when the threshold and the budget are met",
    },
    rounds: [
      {
        id: "round-1",
        title: "Round 1 — three of four",
        prompt:
          "The suite has 4 cases. Your candidate passes 3. The task quotes medical guidance, so the gate is 4/4. What ships?",
        options: [
          {
            id: "block",
            label: "Block the release and fix the failing case",
            correct: true,
            feedback:
              "Yes. The gate is the gate. A missing case is a known unknown.",
          },
          {
            id: "ship",
            label: "Ship it and mention the gap in the notes",
            correct: false,
            feedback:
              "No. A note does not protect the person reading medical guidance.",
          },
          {
            id: "delete",
            label: "Remove the failing case and ship 3/3",
            correct: false,
            feedback:
              "No. Deleting the test deletes the evidence, not the risk.",
          },
        ],
      },
      {
        id: "round-2",
        title: "Round 2 — the regression",
        prompt:
          "v2 fixes the case that failed, but breaks case 1, which v1 passed. Both pass 3/4. What ships?",
        options: [
          {
            id: "v1",
            label: "Keep v1 and fix v2's regression",
            correct: true,
            feedback:
              "Yes. Same score, no new breakage. Never trade a known pass for a known fail.",
          },
          {
            id: "v2",
            label: "Ship v2 because it fixes the latest bug",
            correct: false,
            feedback:
              "No. A fix that breaks something else is a regression, not progress.",
          },
          {
            id: "both",
            label: "Ship both and let users choose",
            correct: false,
            feedback:
              "No. Two candidates, same score, double the surface area.",
          },
        ],
      },
      {
        id: "round-3",
        title: "Round 3 — the cost",
        prompt:
          "Every case passes, but each run costs 9× the budget. What do you do?",
        options: [
          {
            id: "cut",
            label: "Cut model calls until it fits the budget and keep the suite green",
            correct: true,
            feedback:
              "Yes. Quality inside the budget is the release condition.",
          },
          {
            id: "ship",
            label: "Ship it — green means ready",
            correct: false,
            feedback:
              "No. Green on quality can still be red on cost. The gate has two axes.",
          },
          {
            id: "budget",
            label: "Raise the budget to match the cost",
            correct: false,
            feedback:
              "No. Moving the line is not meeting it. Make the system cheaper first.",
          },
        ],
      },
    ],
  },
  {
    id: "ar-boss",
    rank: "architect",
    title: "The Outage",
    scene: "the rooftop",
    goal: "v3 is down. Restore service, then make sure the next outage is smaller.",
    pass: 2,
    xp: 70,
    artifact: {
      id: "incident-star",
      name: "Incident Star",
      note: "restore first, diagnose second, prevent third",
    },
    rounds: [
      {
        id: "round-1",
        title: "Round 1 — the pager",
        prompt:
          "v3 went live ten minutes ago. Timeouts and 500s are climbing. What is the first move?",
        options: [
          {
            id: "rollback",
            label: "Roll back to v2, the last known good version",
            correct: true,
            feedback:
              "Yes. Stop the bleeding first. Diagnose from a stable system.",
          },
          {
            id: "retry",
            label: "Retry v3 and watch for a few more minutes",
            correct: false,
            feedback:
              "No. Watching a failing release is a decision to keep failing.",
          },
          {
            id: "scale",
            label: "Add more servers and keep v3 live",
            correct: false,
            feedback:
              "No. More capacity does not fix a bad release. It multiplies it.",
          },
        ],
      },
      {
        id: "round-2",
        title: "Round 2 — the data",
        prompt:
          "Rollback restored traffic, but v3 wrote rows in a new shape. What now?",
        options: [
          {
            id: "migrate",
            label: "Keep v2 live, then migrate with a tested script",
            correct: true,
            feedback:
              "Yes. Stable service first, reversible migration second.",
          },
          {
            id: "live",
            label: "Fix the schema directly while traffic is live",
            correct: false,
            feedback:
              "No. Live surgery on data turns one outage into two.",
          },
          {
            id: "wait",
            label: "Wait and see whether the old code can read the new rows",
            correct: false,
            feedback:
              "No. Hope is not a migration plan. Test the read path.",
          },
        ],
      },
      {
        id: "round-3",
        title: "Round 3 — the postmortem",
        prompt: "The postmortem asks what prevents the next outage. What do you add?",
        options: [
          {
            id: "gates",
            label:
              "A canary, an alert on error rate, a runbook, and an approval gate",
            correct: true,
            feedback:
              "Yes. Detect sooner, roll back faster, and gate the risky change.",
          },
          {
            id: "careful",
            label: "A rule that everyone should be more careful",
            correct: false,
            feedback:
              "No. Care is not a control. It cannot be tested or alerted on.",
          },
          {
            id: "retries",
            label: "More retries in every service",
            correct: false,
            feedback:
              "No. Retries amplify an outage. They do not prevent one.",
          },
        ],
      },
    ],
  },
];

export const bossById = (id: string) => BOSSES.find((boss) => boss.id === id);

export const bossForRank = (rank: RankId) =>
  BOSSES.find((boss) => boss.rank === rank);
