export type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

export type ApiField = {
  name: string;
  required: boolean;
  example: string;
  hint?: string;
};

export type ApiEndpoint = {
  id: string;
  service: string;
  method: HttpMethod;
  path: string;
  description: string;
  auth: "none" | "bearer";
  query: ApiField[];
  body: ApiField[];
};

export type RequestExpectation = {
  method: HttpMethod;
  path: string;
  query?: Record<string, string>;
  body?: Record<string, string>;
  auth?: boolean;
};

export type RequestChoice = {
  id: string;
  label: string;
  correct: boolean;
  feedback: string;
};

export type RequestLesson = {
  id: string;
  order: number;
  title: string;
  scene: string;
  goal: string;
  task: string;
  endpointId: string;
  expectation: RequestExpectation;
  question?: {
    prompt: string;
    options: RequestChoice[];
  };
  win: string;
  artifact: { id: string; name: string; note: string };
  xp: number;
};

export const API_ENDPOINTS: ApiEndpoint[] = [
  {
    id: "articles",
    service: "content",
    method: "GET",
    path: "/v1/articles",
    description:
      "Search the public article index. The topic is a query parameter, not part of the path.",
    auth: "none",
    query: [
      {
        name: "topic",
        required: true,
        example: "photosynthesis",
        hint: "the subject to search for",
      },
    ],
    body: [],
  },
  {
    id: "reading-list",
    service: "library",
    method: "GET",
    path: "/v1/reading-list",
    description:
      "Return items from the learner reading list. Each item nests its author. Read which fields are null and which are absent.",
    auth: "none",
    query: [
      {
        name: "limit",
        required: true,
        example: "3",
        hint: "items to return, from 1 to 10",
      },
    ],
    body: [],
  },
  {
    id: "me",
    service: "identity",
    method: "GET",
    path: "/v1/me",
    description:
      "Return the profile behind the token. Send Authorization: Bearer <token>. bench-demo-key has profile:read. bench-notes-key is a real key with the wrong scope.",
    auth: "bearer",
    query: [],
    body: [],
  },
  {
    id: "notes",
    service: "notes",
    method: "GET",
    path: "/v1/notes",
    description:
      "Read the notes feed one page at a time. Page 1 returns a next cursor. Later pages can be rate limited.",
    auth: "none",
    query: [
      {
        name: "page",
        required: true,
        example: "1",
        hint: "page number, starting at 1",
      },
    ],
    body: [],
  },
  {
    id: "webhook-test",
    service: "events",
    method: "POST",
    path: "/v1/webhooks/test",
    description:
      "Accept one signed test event. Signature rule: bench_ + event_id + _v1. Unsigned or mismatched events are rejected.",
    auth: "none",
    query: [],
    body: [
      {
        name: "event_id",
        required: true,
        example: "evt_2049",
        hint: "the unique event id",
      },
      {
        name: "signature",
        required: true,
        example: "bench_<event_id>_v1",
        hint: "bench_ plus the event id plus _v1",
      },
    ],
  },
];

export const REQUEST_LESSONS: RequestLesson[] = [
  {
    id: "ca-01",
    order: 1,
    title: "The Envelope",
    scene: "the exchange",
    goal: "Every API call is an envelope: a method, a path, headers, and a status. Read the whole thing.",
    task: "Send GET /v1/articles with topic=photosynthesis. Read the status and the body that come back.",
    endpointId: "articles",
    expectation: {
      method: "GET",
      path: "/v1/articles",
      query: { topic: "photosynthesis" },
    },
    question: {
      prompt: "The exchange returns 200 for the request. What does that status tell you?",
      options: [
        {
          id: "ok",
          label: "The request reached the service and it returned a response.",
          correct: true,
          feedback:
            "Yes. 200 means OK. It does not prove that every field was the right choice.",
        },
        {
          id: "created",
          label: "A new article was created on the server.",
          correct: false,
          feedback: "No. 201 means created. 200 means the request succeeded.",
        },
        {
          id: "cached",
          label: "The body came from a cache, so it can be ignored.",
          correct: false,
          feedback:
            "No. The status does not say where the body came from. Read the body.",
        },
      ],
    },
    win: "A method, a path, a query, and a status: the envelope is complete.",
    artifact: {
      id: "request-card",
      name: "Request Card",
      note: "method, URL, headers, status: the whole envelope",
    },
    xp: 35,
  },
  {
    id: "ca-02",
    order: 2,
    title: "The Payload",
    scene: "the exchange",
    goal: "A response is data with a shape. Missing and null are different answers.",
    task: "Send GET /v1/reading-list with limit=3. Compare finished_at across the three items.",
    endpointId: "reading-list",
    expectation: {
      method: "GET",
      path: "/v1/reading-list",
      query: { limit: "3" },
    },
    question: {
      prompt:
        "One item has finished_at: null. Another item has no finished_at key at all. What is the difference?",
      options: [
        {
          id: "explicit",
          label:
            "Null is present and says the value is empty. An absent key says the server did not send it.",
          correct: true,
          feedback:
            "Yes. Null is an explicit answer. Absence is missing data, and a client must handle both.",
        },
        {
          id: "same",
          label: "They mean the same thing. Both items were never finished.",
          correct: false,
          feedback:
            "No. The payloads are different. Null and missing are not interchangeable.",
        },
        {
          id: "broken",
          label: "The absent key is a server error, so the whole response is invalid.",
          correct: false,
          feedback:
            "No. A field can be absent by design. Read the shape before calling it broken.",
        },
      ],
    },
    win: "A nested payload read field by field, including what was not there.",
    artifact: {
      id: "json-lens",
      name: "JSON Lens",
      note: "missing and null are different answers",
    },
    xp: 35,
  },
  {
    id: "ca-03",
    order: 3,
    title: "The Key",
    scene: "the exchange",
    goal: "A token is a secret and a scope. Send it in the Authorization header, never in a URL.",
    task: "Send GET /v1/me with the bearer token bench-demo-key. Then read the profile that comes back.",
    endpointId: "me",
    expectation: {
      method: "GET",
      path: "/v1/me",
      auth: true,
    },
    question: {
      prompt: "Where should an API key live?",
      options: [
        {
          id: "env",
          label:
            "In an environment variable on the server, never in a URL or a repository.",
          correct: true,
          feedback:
            "Yes. Keys live in environment variables or a secret store. URLs and repos leak.",
        },
        {
          id: "query",
          label: "In the query string so it is easy to copy and share.",
          correct: false,
          feedback:
            "No. Query strings end up in logs, history, and referrer headers.",
        },
        {
          id: "html",
          label: "In the page HTML so the browser can reuse it.",
          correct: false,
          feedback:
            "No. Anything shipped to the browser is public. Keys stay on the server.",
        },
      ],
    },
    win: "One bearer header, one scoped key, no secret in the URL.",
    artifact: {
      id: "key-ring",
      name: "Key Ring",
      note: "keys live in env vars, never in a URL or a repo",
    },
    xp: 35,
  },
  {
    id: "ca-04",
    order: 4,
    title: "The Line",
    scene: "the exchange",
    goal: "A rate limit is an instruction. Honor Retry-After, then retry the same page.",
    task: "Read /v1/notes page 1 to pick up the next cursor, then fetch page 2. If the exchange returns 429, wait for Retry-After, then send page 2 again.",
    endpointId: "notes",
    expectation: {
      method: "GET",
      path: "/v1/notes",
      query: { page: "2" },
    },
    question: {
      prompt: "The exchange returns 429 with Retry-After: 3. What is the correct next move?",
      options: [
        {
          id: "backoff",
          label:
            "Wait at least 3 seconds, then retry the same read request with backoff.",
          correct: true,
          feedback:
            "Yes. Honor the header, back off, and keep the retry safe to repeat.",
        },
        {
          id: "loop",
          label: "Retry immediately in a tight loop until it works.",
          correct: false,
          feedback:
            "No. A tight loop adds load and can turn a short limit into a longer one.",
        },
        {
          id: "post",
          label: "Change the method to POST and send the page again.",
          correct: false,
          feedback:
            "No. Changing the method does not remove the limit, and a write can duplicate work.",
        },
      ],
    },
    win: "One 429 read, one honored Retry-After, one clean retry.",
    artifact: {
      id: "retry-policy",
      name: "Retry Policy",
      note: "honor 429, back off, and make retries idempotent",
    },
    xp: 35,
  },
  {
    id: "ca-05",
    order: 5,
    title: "The Event",
    scene: "the exchange",
    goal: "A webhook is an untrusted request until its signature checks out.",
    task: "Sign event_id evt_2049 with bench_ + event_id + _v1, then POST /v1/webhooks/test with event_id and signature.",
    endpointId: "webhook-test",
    expectation: {
      method: "POST",
      path: "/v1/webhooks/test",
      body: {
        event_id: "evt_2049",
        signature: "bench_evt_2049_v1",
      },
    },
    question: {
      prompt:
        "A signed webhook arrives twice with the same event_id. What should the receiver do?",
      options: [
        {
          id: "dedupe",
          label:
            "Verify the signature, then reject or ignore the replay using the event id.",
          correct: true,
          feedback:
            "Yes. Verify first, then deduplicate. A valid signature does not make a replay new.",
        },
        {
          id: "trust",
          label: "Trust the second one because it is signed too.",
          correct: false,
          feedback:
            "No. A signature proves who sent it, not that the event is new.",
        },
        {
          id: "skip",
          label: "Skip the signature check on retries to save time.",
          correct: false,
          feedback:
            "No. Retries are exactly when an attacker can replay an old event.",
        },
      ],
    },
    win: "One signature checked before one event was trusted.",
    artifact: {
      id: "webhook-verifier",
      name: "Webhook Verifier",
      note: "verify the signature before you trust the event",
    },
    xp: 35,
  },
];

export const requestLessonById = (id: string) =>
  REQUEST_LESSONS.find((lesson) => lesson.id === id);

export const nextRequestLesson = (id: string) => {
  const index = REQUEST_LESSONS.findIndex((lesson) => lesson.id === id);
  return index >= 0 ? REQUEST_LESSONS[index + 1] : undefined;
};

export const apiEndpointById = (id: string) =>
  API_ENDPOINTS.find((endpoint) => endpoint.id === id);
