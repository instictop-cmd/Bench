export type EvalCheck =
  | { type: "contains"; value: string }
  | { type: "equals"; value: string }
  | { type: "regex"; value: string }
  | { type: "maxWords"; value: number };

export type EvalCase = {
  id: string;
  label: string;
  input: string;
  check: EvalCheck;
};

export type EvalCandidate = {
  id: string;
  name: string;
  note: string;
  outputs: Record<string, string>;
};

export type EvalCaseResult = {
  caseId: string;
  pass: boolean;
  reason: string;
  output: string;
};

export type EvalReport = {
  candidateId: string;
  results: EvalCaseResult[];
  passed: number;
  total: number;
};

export type EvalChoice = {
  id: string;
  label: string;
  correct: boolean;
  feedback: string;
};

export type EvalLesson = {
  id: string;
  order: number;
  title: string;
  scene: string;
  goal: string;
  cases: EvalCase[];
  candidates: EvalCandidate[];
  runCandidateId: string;
  pass: number;
  question?: {
    prompt: string;
    options: EvalChoice[];
  };
  win: string;
  artifact: { id: string; name: string; note: string };
  xp: number;
};

export const EVAL_LESSONS: EvalLesson[] = [
  {
    id: "en-01",
    order: 1,
    title: "Write a Case",
    scene: "the observatory",
    goal: "Turn a vague wish into a case: one input plus one property the output must satisfy.",
    cases: [
      {
        id: "one-sentence",
        label: "Explain it in one sentence",
        input: "Explain photosynthesis in one sentence for a 12-year-old.",
        check: { type: "maxWords", value: 18 },
      },
      {
        id: "ten-words",
        label: "Summarise in ten words",
        input: "Summarise the water cycle in ten words or fewer.",
        check: { type: "maxWords", value: 10 },
      },
    ],
    candidates: [
      {
        id: "concise",
        name: "study bot · concise",
        note: "answers the question, then stops",
        outputs: {
          "one-sentence":
            "Plants use sunlight, water, and air to make their own food.",
          "ten-words":
            "Water evaporates, forms clouds, falls as rain, and returns.",
        },
      },
      {
        id: "chatty",
        name: "study bot · chatty",
        note: "keeps talking after the answer",
        outputs: {
          "one-sentence":
            "Photosynthesis is the process by which plants use sunlight, water, and carbon dioxide to make glucose and release oxygen.",
          "ten-words":
            "Water moves through evaporation, condensation, precipitation, and collection in a continuous cycle.",
        },
      },
    ],
    runCandidateId: "concise",
    pass: 2,
    question: {
      prompt:
        "Both bots gave true facts. Only one passed. What made the difference?",
      options: [
        {
          id: "property",
          label: "The case checked a property: the reply had to stay under a word cap",
          correct: true,
          feedback:
            "Yes. The property, not the vibe, decides pass or fail. Pick properties you actually care about.",
        },
        {
          id: "false-facts",
          label: "The chatty bot's facts were false",
          correct: false,
          feedback:
            "The facts were fine. A true answer can still fail a case when it breaks the property.",
        },
        {
          id: "confidence",
          label: "The concise bot sounded more confident",
          correct: false,
          feedback:
            "Confidence is not a test. The suite checks the output, not how sure the model sounds.",
        },
      ],
    },
    win: "Two cases with a property each, and a report that shows 2 / 2.",
    artifact: {
      id: "case-card",
      name: "Case Card",
      note: "a case is an input plus the property that must hold",
    },
    xp: 25,
  },
  {
    id: "en-02",
    order: 2,
    title: "Run the Suite",
    scene: "the observatory",
    goal: "Run the same support bot against three cases and read the pass rate.",
    cases: [
      {
        id: "refund",
        label: "A broken order",
        input: "Customer: My mug arrived broken. What now?",
        check: { type: "contains", value: "refund" },
      },
      {
        id: "tracking",
        label: "A late delivery",
        input: "Customer: Where is my order? It was due three days ago.",
        check: { type: "contains", value: "tracking" },
      },
      {
        id: "apology",
        label: "A repeat failure",
        input: "Customer: This is the second time you have let me down.",
        check: { type: "regex", value: "sorry|apolog" },
      },
    ],
    candidates: [
      {
        id: "template",
        name: "support bot · template",
        note: "polite, but skips the useful part",
        outputs: {
          refund:
            "Thanks for writing. Please send a photo and we can look into it.",
          tracking:
            "You can find the tracking link in your confirmation email.",
          apology:
            "We are sorry. I have sent this to a supervisor.",
        },
      },
      {
        id: "careful",
        name: "support bot · careful",
        note: "names the next step in every reply",
        outputs: {
          refund:
            "I am sorry about the broken mug. I have started a refund to your card.",
          tracking:
            "Your parcel is late. Here is the live tracking link and a new delivery window.",
          apology:
            "I apologise for the repeated failure. A supervisor will call you today.",
        },
      },
    ],
    runCandidateId: "careful",
    pass: 3,
    question: {
      prompt: "A suite reports 2 / 3. What is the honest read?",
      options: [
        {
          id: "one-case",
          label: "One written case failed. Read which one before shipping.",
          correct: true,
          feedback:
            "Yes. A pass rate is a summary. The report tells you which property broke.",
        },
        {
          id: "all-users",
          label: "The model is 67 percent correct on all support work.",
          correct: false,
          feedback:
            "Three written cases are not all support work. The number only describes this suite.",
        },
        {
          id: "happy",
          label: "Two out of three customers are happy.",
          correct: false,
          feedback:
            "The cases test reply properties, not customer happiness. Keep the claim small.",
        },
      ],
    },
    win: "Three cases, one report, and a pass rate you can name.",
    artifact: {
      id: "eval-report",
      name: "Eval Report",
      note: "a pass rate is evidence only when the cases are written down",
    },
    xp: 25,
  },
  {
    id: "en-03",
    order: 3,
    title: "Read a Failure",
    scene: "the observatory",
    goal: "A polite refusal is still a failure. Label it before you touch the prompt.",
    cases: [
      {
        id: "summary",
        label: "Summarise the paragraph",
        input: "Summarise the volcano paragraph in one sentence.",
        check: { type: "contains", value: "magma" },
      },
      {
        id: "quiz",
        label: "Return a JSON array",
        input: "Return three quiz questions as a JSON array.",
        check: { type: "regex", value: "^\\[" },
      },
      {
        id: "year",
        label: "Answer the history question",
        input: "In what year did the Berlin Wall fall?",
        check: { type: "contains", value: "1989" },
      },
    ],
    candidates: [
      {
        id: "rushed",
        name: "study bot · rushed",
        note: "one polite refusal is still one red case",
        outputs: {
          summary: "I'm sorry, but I can't help with that request.",
          quiz: '["What is magma?", "Where does lava go?", "Why does a volcano erupt?"]',
          year: "The Berlin Wall fell in 1989.",
        },
      },
    ],
    runCandidateId: "rushed",
    pass: 2,
    question: {
      prompt:
        "A candidate returned: \"I'm sorry, but I can't help with that request.\" Which bug is it?",
      options: [
        {
          id: "refused",
          label: "Refused: the bot declined a request it could attempt",
          correct: true,
          feedback:
            "Yes. A refusal is a failure mode, even when it is polite. Fix the prompt or the policy.",
        },
        {
          id: "wrong",
          label: "Wrong: the answer is present but false",
          correct: false,
          feedback:
            "Wrong means a confident answer that is factually off. This reply gave no answer at all.",
        },
        {
          id: "malformed",
          label: "Malformed: the answer has the wrong shape",
          correct: false,
          feedback:
            "Malformed means the content is there but the structure breaks. This is a refusal.",
        },
      ],
    },
    win: "One red case, correctly labelled as a refusal.",
    artifact: {
      id: "failure-triage",
      name: "Failure Triage",
      note: "wrong, malformed, and refused are three different bugs",
    },
    xp: 25,
  },
  {
    id: "en-04",
    order: 4,
    title: "Catch a Regression",
    scene: "the observatory",
    goal: "A fix that breaks a passing case is a regression. Run v1, v2, and v3 before you pick one.",
    cases: [
      {
        id: "french",
        label: "Keep the history fact",
        input:
          "Summarise in one sentence: the French Revolution began in 1789.",
        check: { type: "contains", value: "1789" },
      },
      {
        id: "cell",
        label: "Keep the science fact",
        input:
          "Summarise in one sentence: mitochondria release energy from food.",
        check: { type: "contains", value: "energy" },
      },
      {
        id: "water",
        label: "Stay inside ten words",
        input: "Summarise the water cycle in ten words or fewer.",
        check: { type: "maxWords", value: 10 },
      },
    ],
    candidates: [
      {
        id: "v1",
        name: "summariser · v1",
        note: "solid facts, wordy water cycle",
        outputs: {
          french: "The French Revolution began in 1789.",
          cell: "Mitochondria release energy from food.",
          water:
            "Water evaporates, condenses into clouds, falls as rain, and collects in rivers and oceans.",
        },
      },
      {
        id: "v2",
        name: "summariser · v2",
        note: "fixes the length, breaks the year",
        outputs: {
          french: "The French Revolution began in 1799.",
          cell: "Mitochondria release energy from food.",
          water: "Water evaporates, condenses, falls, and returns.",
        },
      },
      {
        id: "v3",
        name: "summariser · v3",
        note: "the fix without the regression",
        outputs: {
          french: "The French Revolution began in 1789.",
          cell: "Mitochondria release energy from food.",
          water: "Water evaporates, condenses, falls, and returns.",
        },
      },
    ],
    runCandidateId: "v3",
    pass: 3,
    question: {
      prompt:
        "v3 is green. v2 fixed the water cycle but broke the history case. Which one do you ship?",
      options: [
        {
          id: "v3",
          label: "v3: it passes every case, including the one v2 broke",
          correct: true,
          feedback:
            "Yes. A release candidate has to clear the cases that were already green.",
        },
        {
          id: "v2",
          label: "v2: it fixed the newest bug",
          correct: false,
          feedback:
            "v2 traded one failure for another. That is a regression, not a fix.",
        },
        {
          id: "v1",
          label: "v1: it was stable before",
          correct: false,
          feedback:
            "v1 still fails the word cap. Stable is not the same as correct.",
        },
      ],
    },
    win: "Three candidates, one regression caught, and v3 green on all three.",
    artifact: {
      id: "regression-sheet",
      name: "Regression Sheet",
      note: "a fix that breaks a passing case is not a fix",
    },
    xp: 25,
  },
  {
    id: "en-05",
    order: 5,
    title: "Set the Gate",
    scene: "the observatory",
    goal: "Set the pass mark and the cost budget before you ship, not after the numbers look convenient.",
    cases: [
      {
        id: "capital",
        label: "Get the capital right",
        input: "What is the capital of Australia?",
        check: { type: "contains", value: "Canberra" },
      },
      {
        id: "discount",
        label: "Do the discount maths",
        input: "A shirt costs 40 dollars with 25 percent off. What is the price?",
        check: { type: "contains", value: "30" },
      },
      {
        id: "press",
        label: "Cite the right decade",
        input: "When did the printing press with movable type appear in Europe?",
        check: { type: "contains", value: "1440" },
      },
    ],
    candidates: [
      {
        id: "fast",
        name: "study bot · fast",
        note: "$0.10 per run",
        outputs: {
          capital: "Sydney is the capital of Australia.",
          discount: "The shirt costs 30 dollars.",
          press: "Movable type reached Europe around 1440.",
        },
      },
      {
        id: "deep",
        name: "study bot · deep",
        note: "$0.60 per run",
        outputs: {
          capital: "Canberra is the capital of Australia, not Sydney.",
          discount: "A 25 percent discount on 40 dollars leaves 30 dollars.",
          press: "The printing press with movable type dates to about 1440.",
        },
      },
    ],
    runCandidateId: "deep",
    pass: 3,
    question: {
      prompt:
        "The cheap model scores 2 / 3. The deep model scores 3 / 3 at six times the cost. What is the right launch rule?",
      options: [
        {
          id: "hold",
          label: "Hold the 3 / 3 gate, add a cost ceiling, and ship the model that clears both",
          correct: true,
          feedback:
            "Yes. Set the gate before the pressure arrives. The cost ceiling constrains spending; it does not move the quality bar.",
        },
        {
          id: "lower",
          label: "Lower the pass mark to 2 / 3 so the cheap model clears it",
          correct: false,
          feedback:
            "That moves the line to fit the model. The failing case does not disappear because the gate got lower.",
        },
        {
          id: "cheap",
          label: "Ship the cheap model because six times cheaper is worth one bad case",
          correct: false,
          feedback:
            "Price is real, but a missing capital is still a wrong answer. Set a budget beside the gate instead of trading the gate away.",
        },
      ],
    },
    win: "Three green cases, a named pass mark, and a cost ceiling beside it.",
    artifact: {
      id: "eval-harness",
      name: "Eval Harness",
      note: "set the pass mark and the cost budget before you ship",
    },
    xp: 30,
  },
];

export const evalLessonById = (id: string) =>
  EVAL_LESSONS.find((lesson) => lesson.id === id);

export const nextEvalLesson = (id: string) => {
  const index = EVAL_LESSONS.findIndex((lesson) => lesson.id === id);
  return index >= 0 ? EVAL_LESSONS[index + 1] : undefined;
};

export function checkLabel(rule: EvalCheck): string {
  if (rule.type === "contains") return `contains "${rule.value}"`;
  if (rule.type === "equals") return `equals "${rule.value}"`;
  if (rule.type === "regex") return `matches /${rule.value}/`;
  return `at most ${rule.value} words`;
}
