export type PilotGit = {
  staged: string[];
  commits: { message: string; files: string[] }[];
};

export type PilotSetup = {
  cwd: string;
  files: Record<string, string>;
  dirs: string[];
  env: Record<string, string>;
  git: PilotGit;
};

export type PilotCheck = {
  id: string;
  label: string;
  command: string;
  outputIncludes?: string[];
  cwd?: string;
  exitCode?: number;
  fileExists?: string;
  fileMissing?: string;
  fileContains?: { path: string; text: string };
  gitStaged?: string[];
};

export type PilotChoice = {
  id: string;
  label: string;
  correct: boolean;
  feedback: string;
};

export type PilotLesson = {
  id: string;
  order: number;
  title: string;
  scene: string;
  goal: string;
  task: string;
  setup: PilotSetup;
  checks: PilotCheck[];
  question?: {
    prompt: string;
    options: PilotChoice[];
  };
  win: string;
  artifact: { id: string; name: string; note: string };
  xp: number;
};

export const PILOT_LESSONS: PilotLesson[] = [
  {
    id: "pi-01",
    order: 1,
    title: "Where Am I",
    scene: "the cockpit",
    goal: "Before you move, confirm where you stand and what is in the room.",
    task: "Find out where you are, list the room, then step into notes/.",
    setup: {
      cwd: "/home/pip",
      files: {
        "/home/pip/welcome.txt":
          "welcome, pilot.\nthis machine is a simulation.\nthe filesystem is yours to practice in.\n",
        "/home/pip/notes/day-01.md":
          "# day 01\n\n- run pwd before you move\n- run ls before you delete\n- read the output, not the hope\n",
        "/home/pip/notes/day-02.md":
          "# day 02\n\n- small commands compose\n- one pipe, one question\n",
        "/home/pip/archive/old-boot.txt":
          "boot 0.9\nstatus: retired\n",
      },
      dirs: ["/home/pip", "/home/pip/notes", "/home/pip/archive"],
      env: {
        HOME: "/home/pip",
        USER: "pip",
        MODE: "study",
        SHELL: "/bin/benchsh",
      },
      git: { staged: [], commits: [] },
    },
    checks: [
      {
        id: "locate",
        label: "pwd · confirm the room",
        command: "^pwd$",
        outputIncludes: ["/home/pip"],
        exitCode: 0,
      },
      {
        id: "list",
        label: "ls · see notes/ and the files",
        command: "^ls(?:\\s+-[a-zA-Z]+)*$",
        outputIncludes: ["notes"],
        exitCode: 0,
      },
      {
        id: "enter",
        label: "cd notes · move one level down",
        command: "^cd\\s+notes/?$",
        cwd: "/home/pip/notes",
        exitCode: 0,
      },
    ],
    question: {
      prompt: "Why run pwd and ls before you move or remove anything?",
      options: [
        {
          id: "required",
          label: "The shell refuses to run without them",
          correct: false,
          feedback:
            "No. The shell will happily run a wrong command from the wrong place.",
        },
        {
          id: "orient",
          label:
            "They show where you are and what is there, so the next command hits the right thing",
          correct: true,
          feedback:
            "Yes. Location and contents first, then the command.",
        },
        {
          id: "speed",
          label: "They make every later command faster",
          correct: false,
          feedback:
            "No. They cost a second and save you from acting on the wrong path.",
        },
      ],
    },
    win: "You looked before you moved.",
    artifact: {
      id: "path-map",
      name: "Path Map",
      note: "pwd before you move; ls before you delete",
    },
    xp: 35,
  },
  {
    id: "pi-02",
    order: 2,
    title: "Read and Search",
    scene: "the cockpit",
    goal: "Read a file, search it, then count the matches with a pipe.",
    task: "Read app.log, pull the ERROR lines, then count them through a pipe.",
    setup: {
      cwd: "/home/pip/logs",
      files: {
        "/home/pip/logs/app.log":
          "12:00:01 boot kernel ok\n12:00:02 ready on port 4000\n12:00:05 ERROR worker 2 lost the queue\n12:00:06 retry scheduled\n12:00:07 WARN queue depth 128\n12:00:09 ERROR retry limit reached\n12:00:11 ERROR worker 2 stopped\n",
        "/home/pip/logs/worker.log":
          "12:00:05 worker 1 handled 42 jobs\n12:00:09 worker 1 handled 7 jobs\n",
      },
      dirs: ["/home/pip", "/home/pip/logs"],
      env: {
        HOME: "/home/pip",
        USER: "pip",
        MODE: "study",
        SHELL: "/bin/benchsh",
      },
      git: { staged: [], commits: [] },
    },
    checks: [
      {
        id: "read",
        label: "cat app.log · read the whole log",
        command: "^cat\\s+app\\.log$",
        outputIncludes: ["boot kernel ok", "ERROR"],
        exitCode: 0,
      },
      {
        id: "search",
        label: "grep ERROR app.log · pull the error lines",
        command: "^grep\\s+ERROR\\s+app\\.log$",
        outputIncludes: ["12:00:05", "12:00:09", "12:00:11"],
        exitCode: 0,
      },
      {
        id: "count",
        label: "grep ERROR app.log | wc -l · count them",
        command: "^grep\\s+ERROR\\s+app\\.log\\s*\\|\\s*wc\\s+-l$",
        outputIncludes: ["3"],
        exitCode: 0,
      },
    ],
    question: {
      prompt: "You ran grep ERROR app.log | wc -l. What did the pipe do?",
      options: [
        {
          id: "handoff",
          label:
            "It handed the matching lines to wc, which counted them",
          correct: true,
          feedback:
            "Yes. One command produced lines; the next command counted them.",
        },
        {
          id: "separate",
          label: "It ran grep and wc on app.log separately",
          correct: false,
          feedback:
            "No. The first command produced the input for the second.",
        },
        {
          id: "save",
          label: "It wrote the matches to a new file",
          correct: false,
          feedback:
            "No. A pipe moves output forward; it does not create a file.",
        },
      ],
    },
    win: "Three commands, one answer.",
    artifact: {
      id: "output-pipe",
      name: "Output Pipe",
      note: "small commands compose into one answer",
    },
    xp: 35,
  },
  {
    id: "pi-03",
    order: 3,
    title: "Change Safely",
    scene: "the cockpit",
    goal: "Copy first, verify the copy, then rename and remove.",
    task:
      "Copy notes.md to notes.backup.md, rename draft.md to final.md, then remove old.txt.",
    setup: {
      cwd: "/home/pip",
      files: {
        "/home/pip/notes.md":
          "# notes\n\n- read before you remove\n- copy before you delete\n- verify the copy\n",
        "/home/pip/draft.md":
          "# draft\n\na rough opening paragraph.\n",
        "/home/pip/old.txt":
          "old scratch notes\nsafe to remove after the backup exists\n",
      },
      dirs: ["/home/pip"],
      env: {
        HOME: "/home/pip",
        USER: "pip",
        MODE: "study",
        SHELL: "/bin/benchsh",
      },
      git: { staged: [], commits: [] },
    },
    checks: [
      {
        id: "backup",
        label: "cp notes.md notes.backup.md · keep a copy",
        command: "^cp\\s+notes\\.md\\s+notes\\.backup\\.md$",
        fileExists: "/home/pip/notes.backup.md",
        fileContains: {
          path: "/home/pip/notes.backup.md",
          text: "copy before you delete",
        },
        exitCode: 0,
      },
      {
        id: "rename",
        label: "mv draft.md final.md · rename the draft",
        command: "^mv\\s+draft\\.md\\s+final\\.md$",
        fileExists: "/home/pip/final.md",
        fileMissing: "/home/pip/draft.md",
        exitCode: 0,
      },
      {
        id: "remove",
        label: "rm old.txt · remove the scratch file",
        command: "^rm\\s+old\\.txt$",
        fileMissing: "/home/pip/old.txt",
        exitCode: 0,
      },
    ],
    question: {
      prompt: "Why copy notes.md and check the copy before deleting anything?",
      options: [
        {
          id: "undo",
          label:
            "The copy is an undo you can verify before the original is touched",
          correct: true,
          feedback:
            "Yes. A backup you have read is evidence, not a guess.",
        },
        {
          id: "faster",
          label: "Copies make later commands run faster",
          correct: false,
          feedback:
            "No. The point is recovery, not speed.",
        },
        {
          id: "required",
          label: "rm will not delete a file that has a copy",
          correct: false,
          feedback:
            "No. rm does not check for backups. You have to make and verify one.",
        },
      ],
    },
    win: "A backup, a rename, a clean removal.",
    artifact: {
      id: "safe-delete",
      name: "Safe Delete",
      note: "copy, verify, then remove",
    },
    xp: 35,
  },
  {
    id: "pi-04",
    order: 4,
    title: "Exit and Environment",
    scene: "the cockpit",
    goal: "Set a variable, read it back, and handle a failed command without leaking a secret.",
    task:
      "Set MODE to study, read it back, then recover from a failed command with ||.",
    setup: {
      cwd: "/home/pip",
      files: {
        "/home/pip/.env":
          "MODE=lab\nAPI_KEY=simulated-not-a-real-key\n",
        "/home/pip/notes.md":
          "# environment\n\nexit codes steer the shell.\nsecrets stay in .env, out of commands and history.\n",
      },
      dirs: ["/home/pip"],
      env: {
        HOME: "/home/pip",
        USER: "pip",
        SHELL: "/bin/benchsh",
      },
      git: { staged: [], commits: [] },
    },
    checks: [
      {
        id: "set",
        label: "export MODE=study · set the session value",
        command: "^export\\s+MODE=study$",
        exitCode: 0,
      },
      {
        id: "read",
        label: "echo $MODE · read it back",
        command: "^echo\\s+\\$MODE$",
        outputIncludes: ["study"],
        exitCode: 0,
      },
      {
        id: "recover",
        label: "false || echo recovered · handle the failure",
        command: "^false\\s*\\|\\|\\s*echo\\s+recovered$",
        outputIncludes: ["recovered"],
        exitCode: 0,
      },
    ],
    question: {
      prompt:
        "false returns exit code 1. Which recovery is safe, and keeps secrets out of the shell?",
      options: [
        {
          id: "or",
          label:
            "Run false || echo recovered and keep the API key in .env",
          correct: true,
          feedback:
            "Yes. || handles the failure; the key never enters a command.",
        },
        {
          id: "export",
          label: "Export API_KEY so the failed command has more access",
          correct: false,
          feedback:
            "No. Exporting a secret widens the exposure and does not fix the failure.",
        },
        {
          id: "ignore",
          label: "Ignore exit codes; they are only decoration",
          correct: false,
          feedback:
            "No. Exit codes are how the shell decides what to run next.",
        },
      ],
    },
    win: "The failure was handled. The secret stayed out.",
    artifact: {
      id: "env-vault",
      name: "Env Vault",
      note: "exit codes steer the shell; secrets stay out of it",
    },
    xp: 35,
  },
  {
    id: "pi-05",
    order: 5,
    title: "Version Control",
    scene: "the cockpit",
    goal: "Stage one change, keep the secret out, and commit the reason.",
    task:
      'Inspect the repo, stage only notes.md, commit it with the message "add notes", then confirm .env is still untracked.',
    setup: {
      cwd: "/home/pip/project",
      files: {
        "/home/pip/project/notes.md":
          "# release notes\n\n- shell practice complete\n- no secrets in this file\n",
        "/home/pip/project/.env":
          "API_KEY=simulated-not-a-real-key\n",
      },
      dirs: ["/home/pip", "/home/pip/project"],
      env: {
        HOME: "/home/pip",
        USER: "pip",
        SHELL: "/bin/benchsh",
      },
      git: { staged: [], commits: [] },
    },
    checks: [
      {
        id: "inspect",
        label: "git status · see what is changed",
        command: "^git\\s+status$",
        outputIncludes: ["notes.md", ".env"],
        exitCode: 0,
      },
      {
        id: "stage",
        label: "git add notes.md · stage one file",
        command: "^git\\s+add\\s+notes\\.md$",
        gitStaged: ["notes.md"],
        exitCode: 0,
      },
      {
        id: "commit",
        label: 'git commit -m "add notes" · commit the change',
        command: "^git\\s+commit\\s+-m\\s+[\"']?add\\s+notes[\"']?$",
        outputIncludes: ["add notes"],
        exitCode: 0,
      },
      {
        id: "verify",
        label: "git status · confirm .env is still untracked",
        command: "^git\\s+status$",
        outputIncludes: [".env", "Untracked files"],
        gitStaged: [],
        exitCode: 0,
      },
    ],
    question: {
      prompt: "Which file must never be staged or committed?",
      options: [
        {
          id: "env",
          label: ".env — it holds secrets and belongs outside version control",
          correct: true,
          feedback:
            "Yes. Commit the reason, not the keys.",
        },
        {
          id: "notes",
          label: "notes.md — notes should never be committed",
          correct: false,
          feedback:
            "No. Notes are exactly the kind of change worth committing.",
        },
        {
          id: "all",
          label: "Everything — only compiled output belongs in a repo",
          correct: false,
          feedback:
            "No. Source and notes belong in the repo; secrets do not.",
        },
      ],
    },
    win: "One change staged and committed. The secret stayed untracked.",
    artifact: {
      id: "commit-card",
      name: "Commit Card",
      note: "stage one change, read the diff, commit the reason",
    },
    xp: 35,
  },
];

export const pilotLessonById = (id: string) =>
  PILOT_LESSONS.find((lesson) => lesson.id === id);

export const nextPilotLesson = (id: string) => {
  const index = PILOT_LESSONS.findIndex((lesson) => lesson.id === id);
  return index >= 0 ? PILOT_LESSONS[index + 1] : undefined;
};
