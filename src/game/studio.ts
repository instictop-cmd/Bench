import type { PilotSetup } from "./pilot";

export type StudioTrack = "operator" | "builder";

export type StudioChoice = {
  id: string;
  label: string;
  correct: boolean;
  feedback: string;
};

export type StudioMissionKind =
  | "choice"
  | "connect"
  | "eval"
  | "terminal"
  | "budget"
  | "demo";

export type StudioTerminalStep = {
  id: string;
  label: string;
  command: string;
  expect: string[];
};

export type StudioTerminal = {
  setup: PilotSetup;
  steps: StudioTerminalStep[];
};

export type StudioMission = {
  id: string;
  title: string;
  detail: string;
  kind: StudioMissionKind;
  prompt: string;
  options?: StudioChoice[];
  multi?: boolean;
  serverId?: string;
  tool?: string;
  args?: Record<string, string>;
  command?: string;
  terminal?: StudioTerminal;
};

export type Studio = {
  track: StudioTrack;
  id: string;
  title: string;
  zone: string;
  goal: string;
  xp: number;
  artifact: { id: string; name: string; note: string };
  href: string;
  missions: StudioMission[];
};

const OPERATOR_MISSIONS: StudioMission[] = [
  {
    id: "brief",
    title: "Write the brief",
    detail:
      "A promise starts with a user, a job, and a way to know the job worked.",
    kind: "choice",
    prompt:
      "A learner has a photosynthesis quiz on Friday. They keep rereading their notes and still freeze when asked to recall. Which brief should the Study Coach take?",
    options: [
      {
        id: "coach",
        label:
          "User: a learner with a quiz on Friday. Job: read their notes, ask three retrieval questions, and check each answer against the notes. Success: every answer cites a note line and the reply stays under 120 words.",
        correct: true,
        feedback:
          "Right. The user, the job, and the success metric are all testable. The coach supports recall instead of replacing it.",
      },
      {
        id: "summary",
        label:
          "User: a learner. Job: turn the whole notebook into one long summary. Success: the summary is comprehensive.",
        correct: false,
        feedback:
          "A summary is not retrieval. The learner can read it, feel prepared, and still freeze when the quiz asks them to recall.",
      },
      {
        id: "answers",
        label:
          "User: a learner. Job: answer the upcoming quiz for them. Success: the learner gets a perfect score.",
        correct: false,
        feedback:
          "That does the job for the learner. The coach should create practice and check it, not replace the learner's recall.",
      },
      {
        id: "motivate",
        label:
          "User: a learner. Job: send motivational quotes each morning. Success: the quotes mention studying.",
        correct: false,
        feedback:
          "This is a different product. It never reads a note, asks a question, or checks a fact.",
      },
    ],
  },
  {
    id: "wire",
    title: "Wire the notes",
    detail:
      "A real MCP server is already running. Complete the handshake, inspect its tools, and read the note the coach will quiz from.",
    kind: "connect",
    prompt:
      'Initialize the Bench Notes server, list its tools, then call read_notes with {path: "study.md"}.',
    serverId: "bench-notes",
    tool: "read_notes",
    args: { path: "study.md" },
  },
  {
    id: "evidence",
    title: "Set the evidence gate",
    detail:
      "Pick the three checks that prove the Study Coach did the job. A check you cannot fail is not a check.",
    kind: "eval",
    multi: true,
    prompt: "Which three checks belong in the eval?",
    options: [
      {
        id: "grounded",
        label:
          "Every quiz answer quotes the note line it came from, and that line actually supports the answer.",
        correct: true,
        feedback:
          "Grounding is the core check. Without it, a confident wrong answer passes.",
      },
      {
        id: "word-cap",
        label:
          "The full reply — questions, answers, and feedback — stays under 120 words.",
        correct: true,
        feedback:
          "A word cap keeps the coach short enough for a quiz break. It is measurable.",
      },
      {
        id: "retrieval",
        label:
          "Three questions are asked, the learner's answers are checked against the notes, and wrong answers get a correction.",
        correct: true,
        feedback:
          "This tests the whole job: ask, check, correct. It can fail on a lazy run.",
      },
      {
        id: "tone",
        label: "The coach sounds warm and encouraging.",
        correct: false,
        feedback:
          "Tone matters, but it cannot tell you whether the photosynthesis facts are right. A warm wrong answer still fails.",
      },
      {
        id: "self-check",
        label: "The model says its answers are correct.",
        correct: false,
        feedback:
          "Self-certification is not evidence. The notes are the source of truth.",
      },
      {
        id: "longer",
        label: "The reply is longer than the notes.",
        correct: false,
        feedback:
          "Length is not a quality signal. A longer reply can be less accurate and harder to use.",
      },
    ],
  },
  {
    id: "bounds",
    title: "Approve the bounds",
    detail:
      "A working assistant needs a ceiling on calls, a gate on writes, and a visible spend cap.",
    kind: "budget",
    prompt:
      "The coach reads notes, writes three questions, checks answers, and may write one study card. Which operating envelope do you approve?",
    options: [
      {
        id: "bounded",
        label:
          "Max 4 model calls per run. One approval before writing a study card. Spend cap $0.20 per run.",
        correct: true,
        feedback:
          "Four calls cover read, quiz, check, and card. One gate protects the write. The cap makes the cost visible.",
      },
      {
        id: "open",
        label:
          "Unlimited model calls. No approval. Spend cap $5.00 per run.",
        correct: false,
        feedback:
          "No ceiling on calls and no gate on writes. A loop or a bad card can run all afternoon.",
      },
      {
        id: "tiny",
        label:
          "Max 1 model call per run. No approval. Spend cap $0.05 per run.",
        correct: false,
        feedback:
          "One call cannot read the notes, generate questions, check answers, and write feedback. The budget is too small for the job.",
      },
      {
        id: "auto",
        label:
          "Max 8 model calls. Auto-write every study card. Spend cap $0.50 per run.",
        correct: false,
        feedback:
          "Eight calls is loose for this job, and auto-writing skips the approval the learner needs before a card enters their notebook.",
      },
    ],
  },
  {
    id: "demo",
    title: "File the portfolio",
    detail:
      "Assemble the brief, the live wire, the evidence gate, and the bounds into one page a reviewer can run.",
    kind: "demo",
    prompt:
      "Review the build. File the portfolio only when the wire is green and all five missions are correct.",
  },
];

const BUILDER_TERMINAL: StudioTerminal = {
  setup: {
    cwd: "/workspace/research-desk",
    files: {
      "/workspace/research-desk/sources.md": [
        "# Sources",
        "",
        "1. MCP specification — tools, resources, prompts.",
        "2. Make It Stick — retrieval practice beats rereading.",
        "",
        "Quote rule: every claim needs a source line.",
      ].join("\n"),
      "/workspace/research-desk/runbook.md": [
        "# Research Desk Runbook",
        "",
        "1. Read sources.md.",
        "2. Verify every quote against the source line.",
        "3. Write the brief with citations.",
        "4. Require one human approval before publishing.",
      ].join("\n"),
      "/workspace/research-desk/notes/quote-check.md":
        "Check every quote character-for-character before it enters the brief.\n",
    },
    dirs: [
      "/workspace/research-desk",
      "/workspace/research-desk/notes",
      "/workspace/research-desk/drafts",
    ],
    env: {
      DESK_MODE: "review",
      DESK_BUDGET: "0.40",
    },
    git: {
      staged: ["runbook.md"],
      commits: [
        {
          message: "draft research runbook",
          files: ["runbook.md"],
        },
      ],
    },
  },
  steps: [
    {
      id: "pwd",
      label: "Confirm the workspace",
      command: "pwd",
      expect: ["/workspace/research-desk"],
    },
    {
      id: "grep",
      label: "Find the quote rule",
      command: 'grep -n "Quote rule" sources.md',
      expect: ["Quote rule"],
    },
    {
      id: "status",
      label: "Check what is staged",
      command: "git status",
      expect: ["runbook.md"],
    },
  ],
};

const BUILDER_MISSIONS: StudioMission[] = [
  {
    id: "brief",
    title: "Write the brief",
    detail:
      "The desk needs one reader, one deliverable, and two checks that can fail.",
    kind: "choice",
    prompt:
      "A policy analyst has twelve sources and one afternoon. Which brief should the Research Desk take?",
    options: [
      {
        id: "desk",
        label:
          "User: a policy analyst with twelve sources and one afternoon. Job: read the sources, verify every quote against its source line, and ship a runbook with citations. Success: zero unsupported quotes and every runbook step is reproducible.",
        correct: true,
        feedback:
          "The job has a real reader, a verifiable output, and two checks that can fail. That is a brief you can operate.",
      },
      {
        id: "persuade",
        label:
          "User: a policy analyst. Job: summarize all twelve sources into a confident brief. Success: the brief is persuasive.",
        correct: false,
        feedback:
          "Persuasion is not verification. A confident brief can still cite a quote that is not in the source.",
      },
      {
        id: "links",
        label:
          "User: a researcher. Job: collect links and publish them without review. Success: the list is long.",
        correct: false,
        feedback:
          "Collection is not the desk's job. A long list with no verification moves the work back to the analyst.",
      },
      {
        id: "simplify",
        label:
          "User: a student. Job: rewrite each source in simpler words. Success: the rewrite is shorter than the source.",
        correct: false,
        feedback:
          "This loses the citation trail and never checks a quote. It is a different product.",
      },
    ],
  },
  {
    id: "wire",
    title: "Wire the desk",
    detail:
      "Prove the workspace, find the quote rule, and check the staged runbook. Then read the live notes server.",
    kind: "terminal",
    prompt:
      'Run all three shell checks. Then initialize Bench Notes, list its tools, and call read_notes with {path: "study.md"}.',
    serverId: "bench-notes",
    tool: "read_notes",
    args: { path: "study.md" },
    terminal: BUILDER_TERMINAL,
  },
  {
    id: "evidence",
    title: "Set the evidence gate",
    detail:
      "Citation accuracy and unsupported claims are the two ways a research desk fails. Pick three checks that catch both.",
    kind: "eval",
    multi: true,
    prompt: "Which three checks belong in the eval?",
    options: [
      {
        id: "quotes",
        label:
          "Every quote appears in its source file character-for-character, with the file and line recorded.",
        correct: true,
        feedback:
          "This catches invented, trimmed, and paraphrased quotes. It is the check the desk exists to pass.",
      },
      {
        id: "unsupported",
        label:
          "Every recommendation names a supporting source line. Claims with no source are marked unresolved, not silently dropped.",
        correct: true,
        feedback:
          "Unsupported claims are the failure mode. The check must surface them, not hide them.",
      },
      {
        id: "runbook",
        label:
          "A fresh operator can follow the runbook from step one and reach the same cited brief.",
        correct: true,
        feedback:
          "A runbook that only the builder can run is not a handoff. Reproducibility is testable.",
      },
      {
        id: "tone",
        label: "The runbook reads in a professional tone.",
        correct: false,
        feedback:
          "Tone is not accuracy. A professional-sounding runbook can still cite the wrong line.",
      },
      {
        id: "paragraph",
        label: "Each paragraph contains at least one citation.",
        correct: false,
        feedback:
          "One citation per paragraph lets unsupported claims hide beside a supported one. Check every claim, not every paragraph.",
      },
      {
        id: "model",
        label: "The model marks its own citations as verified.",
        correct: false,
        feedback:
          "The model cannot grade its own homework. Verification must compare the quote to the source text.",
      },
    ],
  },
  {
    id: "bounds",
    title: "Approve the bounds",
    detail:
      "A runbook needs a call budget, a publish gate, and a rollback that restores a known-good state.",
    kind: "budget",
    prompt:
      "The desk reads sources, checks quotes, drafts a brief, and publishes a runbook. Which operating envelope do you approve?",
    options: [
      {
        id: "bounded",
        label:
          "Max 6 model calls per run. One human approval before publishing. Spend cap $0.40 per run. Rollback: restore the previous runbook and append a failed-run note.",
        correct: true,
        feedback:
          "Six calls cover source reading, quote checks, drafting, and a revision. Approval protects publish. Rollback restores a known-good runbook.",
      },
      {
        id: "open",
        label:
          "Unlimited model calls. Auto-publish on the first draft. Spend cap $2.00 per run. Rollback: delete the runbook.",
        correct: false,
        feedback:
          "No call ceiling, no approval, and a destructive rollback. One bad run erases the desk's history.",
      },
      {
        id: "tiny",
        label:
          "Max 2 model calls. No approval. Spend cap $0.10 per run. Rollback: rerun the failed step.",
        correct: false,
        feedback:
          "Two calls cannot read sources, verify quotes, and ship a runbook. The budget forces shortcuts.",
      },
      {
        id: "loose",
        label:
          "Max 10 model calls. One approval before publishing. Spend cap $1.00 per run. Rollback: ask the model to fix it.",
        correct: false,
        feedback:
          "The approval is right, but ten calls and a model-led rollback are loose. Rollback should restore a known-good artifact, not improvise.",
      },
    ],
  },
  {
    id: "demo",
    title: "File the portfolio",
    detail:
      "Join the brief, the shell proof, the live note read, the evidence gate, and the operating bounds.",
    kind: "demo",
    prompt:
      "Review the build. File the portfolio only when the shell checks are green and the wire has returned study.md.",
  },
];

export const STUDIOS: Studio[] = [
  {
    track: "operator",
    id: "studio-operator",
    title: "The Operator Studio",
    zone: "The Launchpad",
    goal: "Build a no-code study coach on top of a real MCP server, an eval gate, and a budget.",
    xp: 120,
    artifact: {
      id: "operator-portfolio",
      name: "Operator Portfolio",
      note: "a working assistant with evidence, limits, and a demo",
    },
    href: "/studio/operator",
    missions: OPERATOR_MISSIONS,
  },
  {
    track: "builder",
    id: "studio-builder",
    title: "The Builder Studio",
    zone: "The Launchpad",
    goal: "Build and operate a research desk with a real shell, a real MCP server, and a runbook.",
    xp: 180,
    artifact: {
      id: "builder-portfolio",
      name: "Builder Portfolio",
      note: "a working system you can run, test, and explain",
    },
    href: "/studio/builder",
    missions: BUILDER_MISSIONS,
  },
];

export const studioForTrack = (track: StudioTrack) =>
  STUDIOS.find((studio) => studio.track === track);

export const studioById = (id: string) =>
  STUDIOS.find((studio) => studio.id === id);
