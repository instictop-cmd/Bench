export type DeployVersionStatus = "live" | "previous" | "failed";

export type DeployVersion = {
  id: string;
  label: string;
  status: DeployVersionStatus;
  note: string;
};

export type LogLine = {
  id: string;
  level: "info" | "warn" | "error";
  text: string;
};

export type DeployActionKind = "deploy" | "rollback" | "hold" | "approve";

export type DeployAction = {
  id: string;
  label: string;
  hint: string;
  kind: DeployActionKind;
  versionId?: string;
  outcome?: string;
  tone?: "good" | "warn" | "bad";
};

export type DeployMetric = {
  label: string;
  value: string;
  tone: "good" | "warn" | "bad";
};

export type DeployChoice = {
  id: string;
  label: string;
  correct: boolean;
  feedback: string;
};

export type DeployLesson = {
  id: string;
  order: number;
  title: string;
  scene: string;
  goal: string;
  versions: DeployVersion[];
  logs: LogLine[];
  metrics: DeployMetric[];
  actions: DeployAction[];
  expectedAction: string;
  question?: {
    prompt: string;
    options: DeployChoice[];
  };
  win: string;
  artifact: { id: string; name: string; note: string };
  xp: number;
};

export const DEPLOY_LESSONS: DeployLesson[] = [
  {
    id: "dp-01",
    order: 1,
    title: "Ship It",
    scene: "the rooftop",
    goal: "Put v2 in front of real students with a health check, a small canary, and a way back.",
    versions: [
      {
        id: "v2",
        label: "v2 · candidate",
        status: "previous",
        note: "adds note-length limits; tested on 20 sample notes",
      },
      {
        id: "v1",
        label: "v1 · current",
        status: "live",
        note: "serving all students; 42 ms median on the web tier",
      },
      {
        id: "v0",
        label: "v0 · prototype",
        status: "failed",
        note: "no note limits, no health check, no clean rollback",
      },
    ],
    logs: [
      {
        id: "dp01-1",
        level: "info",
        text: "build 208 · image pushed · 11.4 MB",
      },
      {
        id: "dp01-2",
        level: "info",
        text: "smoke test: 20 sample notes → summary in 1.8 s",
      },
      {
        id: "dp01-3",
        level: "warn",
        text: "load balancer has no health-check rule for v2",
      },
      {
        id: "dp01-4",
        level: "info",
        text: "traffic: 0% on v2 · 100% on v1",
      },
    ],
    metrics: [
      { label: "p95 latency", value: "1.8 s", tone: "good" },
      { label: "error rate", value: "0.4%", tone: "good" },
      { label: "daily budget", value: "$2.10 / $5", tone: "warn" },
      { label: "open incidents", value: "0", tone: "good" },
    ],
    actions: [
      {
        id: "canary-check",
        label: "Deploy v2 at 5% behind a health check",
        hint: "roll back automatically if errors pass 1%",
        kind: "deploy",
        versionId: "v2",
        tone: "good",
        outcome:
          "Health check passed at 5%. v2 is live for a small group and v1 stays warm for a fast rollback.",
      },
      {
        id: "send-all",
        label: "Send v2 to 100% of traffic",
        hint: "the smoke test passed; move quickly",
        kind: "deploy",
        versionId: "v2",
        tone: "bad",
        outcome:
          "Without a health check there is no proof. Errors reached 9% before anyone noticed, and traffic is frozen mid-deploy.",
      },
      {
        id: "skip-checks",
        label: "Turn off checks and ship v2",
        hint: "checks are slowing the release down",
        kind: "deploy",
        versionId: "v2",
        tone: "bad",
        outcome:
          "The broken note parser reached every user unchecked. The deploy finished; the service did not stay usable.",
      },
    ],
    expectedAction: "canary-check",
    question: {
      prompt: "What makes this deploy safe to reverse?",
      options: [
        {
          id: "warm-v1",
          label: "The health check and the warm v1 version",
          correct: true,
          feedback:
            "Yes. The check decides when to go forward; the warm version gives you a way back.",
        },
        {
          id: "green-build",
          label: "The build finished without errors",
          correct: false,
          feedback:
            "A green build proves the code compiled, not that real traffic is safe.",
        },
        {
          id: "team-watching",
          label: "The team is watching the dashboard",
          correct: false,
          feedback:
            "Watching is not a control. Name the check and the rollback before traffic moves.",
        },
      ],
    },
    win: "v2 live behind a health check, with v1 ready to take traffic again.",
    artifact: {
      id: "deploy-card",
      name: "Deploy Card",
      note: "a version, a health check, and a budget before traffic",
    },
    xp: 30,
  },
  {
    id: "dp-02",
    order: 2,
    title: "Read the Logs",
    scene: "the rooftop",
    goal: "A timeout appears after a model call on v3. Find the first error and choose the smallest safe move.",
    versions: [
      {
        id: "v3",
        label: "v3 · current",
        status: "live",
        note: "new model route; live for 40 minutes",
      },
      {
        id: "v2",
        label: "v2 · last good",
        status: "previous",
        note: "no timeouts in 6 days; 1.6 s median",
      },
      {
        id: "v1",
        label: "v1 · retired",
        status: "failed",
        note: "no note-length limits; removed last week",
      },
    ],
    logs: [
      {
        id: "dp02-1",
        level: "info",
        text: "request 8f2a · 312 words · route model-a",
      },
      {
        id: "dp02-2",
        level: "info",
        text: "model call finished in 6.4 s",
      },
      {
        id: "dp02-3",
        level: "warn",
        text: "queue wait 24 ms · retry budget 1 of 3 used",
      },
      {
        id: "dp02-4",
        level: "error",
        text: "timeout at 8.0 s · upstream model-b did not answer",
      },
      {
        id: "dp02-5",
        level: "error",
        text: "request 8f2b · same timeout · 3 retries used",
      },
      {
        id: "dp02-6",
        level: "info",
        text: "health check green: it only checks the web process",
      },
    ],
    metrics: [
      { label: "p95 latency", value: "8.2 s", tone: "bad" },
      { label: "error rate", value: "12%", tone: "bad" },
      { label: "queue depth", value: "4", tone: "warn" },
      { label: "web cpu", value: "31%", tone: "good" },
    ],
    actions: [
      {
        id: "rollback-v2",
        label: "Roll back to v2",
        hint: "restore the last version with no timeouts",
        kind: "rollback",
        versionId: "v2",
        tone: "good",
        outcome:
          "v2 is serving again. Latency fell to 1.6 s and the timeouts stopped; v3 stays in the registry for a proper fix.",
      },
      {
        id: "retry-v3",
        label: "Retry v3 one more time",
        hint: "the log is noisy; it may clear on its own",
        kind: "deploy",
        versionId: "v3",
        tone: "warn",
        outcome:
          "Retries made it worse: three attempts filled the queue and the same timeout returned. The logs point at the model route, not luck.",
      },
      {
        id: "add-servers",
        label: "Add two more web servers",
        hint: "more capacity should fix a slow model",
        kind: "deploy",
        versionId: "v3",
        tone: "bad",
        outcome:
          "CPU was never the bottleneck. More servers sent more requests into the same slow model route; p95 stayed at 8.2 s.",
      },
    ],
    expectedAction: "rollback-v2",
    question: {
      prompt: "Which line is the first error to act on?",
      options: [
        {
          id: "first-timeout",
          label: "timeout at 8.0 s · upstream model-b did not answer",
          correct: true,
          feedback:
            "Yes. That is the origin. Everything after it is a consequence of the same timeout.",
        },
        {
          id: "retry-line",
          label: "request 8f2b · same timeout · 3 retries used",
          correct: false,
          feedback:
            "That is the second failure. The first timeout came earlier in the log.",
        },
        {
          id: "green-check",
          label: "health check green",
          correct: false,
          feedback:
            "A green check can be blind to the model route. It is not the error line.",
        },
      ],
    },
    win: "v2 restored, v3 parked, and the timeout traced to the model route.",
    artifact: {
      id: "log-lens",
      name: "Log Lens",
      note: "find the first error, not the loudest one",
    },
    xp: 30,
  },
  {
    id: "dp-03",
    order: 3,
    title: "Roll It Back",
    scene: "the rooftop",
    goal: "v4 is live and producing blank summaries. Stop the harm before you start the fix.",
    versions: [
      {
        id: "v4",
        label: "v4 · current",
        status: "live",
        note: "new summary format; failing since 14:20",
      },
      {
        id: "v3",
        label: "v3 · last good",
        status: "previous",
        note: "6 days clean; 1.6 s median; image still in the registry",
      },
      {
        id: "v1",
        label: "v1 · original",
        status: "failed",
        note: "no note limits and no health check; replaced long ago",
      },
    ],
    logs: [
      {
        id: "dp03-1",
        level: "info",
        text: "14:18 deploy v4 · format change shipped",
      },
      {
        id: "dp03-2",
        level: "warn",
        text: "14:21 malformed summaries: 3 of 100",
      },
      {
        id: "dp03-3",
        level: "error",
        text: "14:26 malformed summaries: 41 of 100",
      },
      {
        id: "dp03-4",
        level: "error",
        text: "14:27 health check failing · 1 of 3 probes",
      },
      {
        id: "dp03-5",
        level: "error",
        text: "14:31 support ticket: blank summaries for a study group",
      },
      {
        id: "dp03-6",
        level: "warn",
        text: "14:32 v3 image is still available in the registry",
      },
    ],
    metrics: [
      { label: "error rate", value: "41%", tone: "bad" },
      { label: "malformed output", value: "41 / 100", tone: "bad" },
      { label: "p95 latency", value: "2.1 s", tone: "warn" },
      { label: "rollback", value: "not started", tone: "warn" },
    ],
    actions: [
      {
        id: "rollback-v3",
        label: "Roll back to v3",
        hint: "restore the last known good version first",
        kind: "rollback",
        versionId: "v3",
        tone: "good",
        outcome:
          "v3 took traffic in 38 seconds. Malformed summaries stopped; the failed v4 image is kept for inspection.",
      },
      {
        id: "rollback-v1",
        label: "Roll back to v1",
        hint: "the oldest version must be the safest",
        kind: "rollback",
        versionId: "v1",
        tone: "warn",
        outcome:
          "v1 removed the bad format, then removed note limits and the health check too. Oversized notes brought errors back.",
      },
      {
        id: "hotfix-live",
        label: "Hotfix v4 while it is live",
        hint: "edit the formatter in production and keep serving",
        kind: "deploy",
        versionId: "v4",
        tone: "bad",
        outcome:
          "A live edit has no review and no clean version. Half the servers got the patch; the other half kept sending malformed summaries.",
      },
    ],
    expectedAction: "rollback-v3",
    question: {
      prompt: "Why restore v3 before fixing v4?",
      options: [
        {
          id: "known-good",
          label: "v3 is the last version known to work, so it stops the harm first",
          correct: true,
          feedback:
            "Yes. Stop the harm, then fix from a clean starting point.",
        },
        {
          id: "newer",
          label: "v3 is newer than v4",
          correct: false,
          feedback:
            "v3 is older. That is the point: it is proven, not newer.",
        },
        {
          id: "deletes",
          label: "Rolling back deletes the bad code",
          correct: false,
          feedback:
            "It does not. v4 stays in the registry so you can inspect and fix it.",
        },
      ],
    },
    win: "v3 back in front of traffic, v4 preserved for a careful fix.",
    artifact: {
      id: "rollback-key",
      name: "Rollback Key",
      note: "restore the last known good version first",
    },
    xp: 30,
  },
  {
    id: "dp-04",
    order: 4,
    title: "Human in the Loop",
    scene: "the rooftop",
    goal: "A schema migration rewrites 1.2 million notes and is hard to undo. Decide who says go.",
    versions: [
      {
        id: "v5",
        label: "v5 · candidate",
        status: "previous",
        note: "adds summary_version; migration untested at production size",
      },
      {
        id: "v4",
        label: "v4 · current",
        status: "live",
        note: "reads both old and new summaries; 0.6% errors",
      },
      {
        id: "v3",
        label: "v3 · last good",
        status: "previous",
        note: "before the schema change; 6 days clean",
      },
    ],
    logs: [
      {
        id: "dp04-1",
        level: "info",
        text: "migration 014: add summary_version to notes",
      },
      {
        id: "dp04-2",
        level: "warn",
        text: "the migration rewrites 1.2 million rows",
      },
      {
        id: "dp04-3",
        level: "warn",
        text: "no dry run on a production-size copy",
      },
      {
        id: "dp04-4",
        level: "warn",
        text: "rollback requires restoring a 40 GB backup",
      },
      {
        id: "dp04-5",
        level: "info",
        text: "change window opens in 30 minutes",
      },
      {
        id: "dp04-6",
        level: "warn",
        text: "approvals: 0 of 2 required for high-risk changes",
      },
    ],
    metrics: [
      { label: "rows affected", value: "1.2 M", tone: "warn" },
      { label: "backup", value: "40 GB · 3 h old", tone: "good" },
      { label: "change risk", value: "high", tone: "bad" },
      { label: "approvals", value: "0 of 2", tone: "warn" },
    ],
    actions: [
      {
        id: "hold-approval",
        label: "Hold and request two approvals",
        hint: "dry-run on a copy; name the human who says go",
        kind: "approve",
        tone: "good",
        outcome:
          "The change is paused. A named reviewer approved a dry run on a copy; the migration waits for a second human and a fresh backup.",
      },
      {
        id: "migrate-now",
        label: "Run the migration now",
        hint: "the change window is open; move",
        kind: "deploy",
        versionId: "v5",
        tone: "bad",
        outcome:
          "The migration locked the notes table for 11 minutes. Reads timed out, and no named human had agreed to the risk.",
      },
      {
        id: "disable-checks",
        label: "Turn off checks so the migration finishes",
        hint: "checks are slowing the rollout",
        kind: "deploy",
        versionId: "v5",
        tone: "bad",
        outcome:
          "With checks off, a failed row count went unnoticed. The service served half-migrated notes until support found them.",
      },
    ],
    expectedAction: "hold-approval",
    question: {
      prompt: "What makes this migration a human decision?",
      options: [
        {
          id: "blast-radius",
          label: "It is large, hard to reverse, and needs a named approver",
          correct: true,
          feedback:
            "Yes. Size, reversibility, and a named human turn a deploy into a decision.",
        },
        {
          id: "sql",
          label: "It is written in SQL",
          correct: false,
          feedback:
            "The language is not the risk. The blast radius and the way back are.",
        },
        {
          id: "window",
          label: "The change window is open",
          correct: false,
          feedback:
            "A window is a time, not an approval. Someone still has to own the risk.",
        },
      ],
    },
    win: "The migration held for a dry run, two named approvals, and a fresh backup.",
    artifact: {
      id: "approval-gate",
      name: "Approval Gate",
      note: "risky changes wait for a named human",
    },
    xp: 30,
  },
  {
    id: "dp-05",
    order: 5,
    title: "The 30-Day Run",
    scene: "the rooftop",
    goal: "Run v5 for 30 days without watching the dashboard by hand. Set the limits before the first request.",
    versions: [
      {
        id: "v5",
        label: "v5 · candidate",
        status: "previous",
        note: "new summary cache; never run in production",
      },
      {
        id: "v4",
        label: "v4 · current",
        status: "live",
        note: "stable for 3 days; 0.6% errors",
      },
      {
        id: "v3",
        label: "v3 · last good",
        status: "previous",
        note: "before the cache work; 6 days clean",
      },
    ],
    logs: [
      {
        id: "dp05-1",
        level: "info",
        text: "v4 live · 3 days stable · 0.6% errors",
      },
      {
        id: "dp05-2",
        level: "info",
        text: "next release v5 changes the summary cache",
      },
      {
        id: "dp05-3",
        level: "warn",
        text: "no alert rule on error rate; the dashboard is checked by hand",
      },
      {
        id: "dp05-4",
        level: "warn",
        text: "model spend is uncapped",
      },
      {
        id: "dp05-5",
        level: "warn",
        text: "on-call rotation has no named escalation lead",
      },
      {
        id: "dp05-6",
        level: "info",
        text: "runbook draft: 5% canary · $60 budget · page at 2% errors",
      },
    ],
    metrics: [
      { label: "v4 uptime", value: "3 days", tone: "good" },
      { label: "error rate", value: "0.6%", tone: "good" },
      { label: "daily spend", value: "$4.80", tone: "good" },
      { label: "alert rules", value: "0", tone: "bad" },
    ],
    actions: [
      {
        id: "start-runbook",
        label: "Approve the 30-day runbook",
        hint: "5% canary · $60 budget · alert at 2% · escalate to a named lead",
        kind: "approve",
        tone: "good",
        outcome:
          "The runbook is signed. v5 starts at 5%, stops at the $60 budget, pages the on-call at 2% errors, and escalates to a named lead.",
      },
      {
        id: "be-careful",
        label: "Be careful and watch the dashboard",
        hint: "no canary, no budget, no alert rules",
        kind: "hold",
        tone: "warn",
        outcome:
          "Care is not a control. Nobody is paged at 3 a.m., and the first signal is a support ticket.",
      },
      {
        id: "unlimited-retries",
        label: "Allow unlimited retries for 30 days",
        hint: "more attempts should cover any failure",
        kind: "deploy",
        versionId: "v5",
        tone: "bad",
        outcome:
          "Unlimited retries turned one slow model into a queue of them. Spend passed the budget before any alert fired.",
      },
    ],
    expectedAction: "start-runbook",
    question: {
      prompt: "Which four controls make a 30-day run safe?",
      options: [
        {
          id: "four-controls",
          label: "A canary, a budget, an alert, and an escalation path",
          correct: true,
          feedback:
            "Yes. Limit the blast radius, cap the cost, notice failure, and name who acts.",
        },
        {
          id: "dashboard",
          label: "A dashboard, a stand-up, and a retry limit",
          correct: false,
          feedback:
            "A dashboard needs a threshold and someone to page. It is not a control on its own.",
        },
        {
          id: "capacity",
          label: "A longer change window and more servers",
          correct: false,
          feedback:
            "Time and capacity do not tell you when to stop or who to call.",
        },
      ],
    },
    win: "A canary, a budget, an alert, and a named escalation path for 30 days.",
    artifact: {
      id: "runbook",
      name: "Runbook",
      note: "alerts, budgets, and an escalation path",
    },
    xp: 35,
  },
];

export const deployLessonById = (id: string) =>
  DEPLOY_LESSONS.find((lesson) => lesson.id === id);

export const nextDeployLesson = (id: string) => {
  const index = DEPLOY_LESSONS.findIndex((lesson) => lesson.id === id);
  return index >= 0 ? DEPLOY_LESSONS[index + 1] : undefined;
};
