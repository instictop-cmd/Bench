import type { HttpMethod } from "@/game/request";

export type HttpRequest = {
  method: HttpMethod;
  path: string;
  query: Record<string, string>;
  headers: Record<string, string>;
  body?: string;
};

export type HttpResponse = {
  status: number;
  headers: Record<string, string>;
  body: string;
  ms: number;
};

export interface HttpRuntime {
  send(request: HttpRequest): Promise<HttpResponse>;
  reset?(): void;
}

const MS = {
  articles: 38,
  readingList: 44,
  me: 27,
  notes: 51,
  webhook: 63,
  invalid: 12,
  missing: 9,
} as const;

const NOTES_PAGES: Record<
  number,
  { notes: Array<Record<string, string | number>>; next: string | null }
> = {
  1: {
    notes: [
      {
        id: "note-01",
        title: "Read the envelope first",
        body: "Method, path, headers, status. Then read the body.",
      },
      {
        id: "note-02",
        title: "A null is not a missing key",
        body: "An explicit null is an answer. An absent field is missing data.",
      },
    ],
    next: "/v1/notes?page=2",
  },
  2: {
    notes: [
      {
        id: "note-03",
        title: "Back off when asked",
        body: "A 429 is an instruction. Read Retry-After before the next call.",
      },
      {
        id: "note-04",
        title: "Signatures before trust",
        body: "Verify the sender before the event changes anything.",
      },
    ],
    next: "/v1/notes?page=3",
  },
  3: {
    notes: [
      {
        id: "note-05",
        title: "Retries must be safe",
        body: "A read can be repeated. A write needs an idempotency key.",
      },
    ],
    next: null,
  },
};

function splitPath(path: string): {
  pathname: string;
  query: Record<string, string>;
} {
  const [rawPath, rawQuery = ""] = path.split("?");
  const withSlash = rawPath.trim() || "/";
  const pathname = withSlash.replace(/\/+$/, "") || "/";
  const query: Record<string, string> = {};

  for (const [key, value] of new URLSearchParams(rawQuery)) {
    query[key] = value;
  }

  return { pathname, query };
}

function param(params: Record<string, string>, name: string): string {
  return (params[name] ?? "").trim();
}

function bearerToken(headers: Record<string, string>): string {
  const entry = Object.entries(headers).find(
    ([key]) => key.toLowerCase() === "authorization",
  );
  if (!entry) return "";
  const match = entry[1].trim().match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() ?? "";
}

function parseJsonBody(raw?: string): Record<string, unknown> | null {
  if (!raw || !raw.trim()) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
}

function textField(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export class MockHttpRuntime implements HttpRuntime {
  private calls = 0;

  private notesPageTwoAttempts = 0;

  reset(): void {
    this.calls = 0;
    this.notesPageTwoAttempts = 0;
  }

  async send(request: HttpRequest): Promise<HttpResponse> {
    this.calls += 1;
    const requestId = `req_${String(this.calls).padStart(4, "0")}`;
    const { pathname, query } = splitPath(request.path);
    const params = { ...query, ...request.query };

    if (pathname === "/v1/articles") {
      if (request.method !== "GET") {
        return this.methodNotAllowed("GET", requestId);
      }
      return this.articles(params, requestId);
    }

    if (pathname === "/v1/reading-list") {
      if (request.method !== "GET") {
        return this.methodNotAllowed("GET", requestId);
      }
      return this.readingList(params, requestId);
    }

    if (pathname === "/v1/me") {
      if (request.method !== "GET") {
        return this.methodNotAllowed("GET", requestId);
      }
      return this.me(request.headers, requestId);
    }

    if (pathname === "/v1/notes") {
      if (request.method !== "GET") {
        return this.methodNotAllowed("GET", requestId);
      }
      return this.notes(params, requestId);
    }

    if (pathname === "/v1/webhooks/test") {
      if (request.method !== "POST") {
        return this.methodNotAllowed("POST", requestId);
      }
      return this.webhook(request.body, requestId);
    }

    return this.respond(
      404,
      { error: "not_found", path: pathname },
      MS.missing,
      requestId,
    );
  }

  private articles(
    params: Record<string, string>,
    requestId: string,
  ): HttpResponse {
    const topic = param(params, "topic");

    if (!topic) {
      return this.respond(
        400,
        {
          error: "missing_topic",
          message: "The topic query parameter is required.",
        },
        MS.invalid,
        requestId,
      );
    }

    return this.respond(
      200,
      {
        topic,
        count: 2,
        articles: [
          {
            id: "art-01",
            title: "Light into sugar",
            minutes: 6,
            kind: "explainer",
          },
          {
            id: "art-02",
            title: "Inside the chloroplast",
            minutes: 9,
            kind: "diagram",
          },
        ],
      },
      MS.articles,
      requestId,
    );
  }

  private readingList(
    params: Record<string, string>,
    requestId: string,
  ): HttpResponse {
    const rawLimit = param(params, "limit");
    const limit = Number(rawLimit);

    if (!rawLimit || !Number.isInteger(limit) || limit < 1 || limit > 10) {
      return this.respond(
        400,
        {
          error: "invalid_limit",
          message: "limit must be a whole number from 1 to 10.",
        },
        MS.invalid,
        requestId,
      );
    }

    const items = [
      {
        id: "read-01",
        title: "The Quiet Protocol",
        author: { id: "au-01", name: "Mira Chen" },
        finished_at: "2026-10-12",
      },
      {
        id: "read-02",
        title: "Headers and Habits",
        author: { id: "au-02", name: "Ivo Park" },
        finished_at: null,
      },
      {
        id: "read-03",
        title: "Retries, Not Regrets",
        author: { id: "au-03", name: "Nadia Rao" },
      },
    ];

    return this.respond(
      200,
      {
        limit,
        total: items.length,
        items: items.slice(0, limit),
      },
      MS.readingList,
      requestId,
    );
  }

  private me(
    headers: Record<string, string>,
    requestId: string,
  ): HttpResponse {
    const token = bearerToken(headers);

    if (!token) {
      return this.respond(
        401,
        {
          error: "missing_token",
          message: "Send Authorization: Bearer <token>.",
        },
        MS.me,
        requestId,
        { "www-authenticate": 'Bearer realm="bench"' },
      );
    }

    if (token === "bench-demo-key") {
      return this.respond(
        200,
        {
          user: {
            id: "usr_42",
            name: "Bench Learner",
            role: "caller",
          },
          scopes: ["profile:read", "notes:read"],
        },
        MS.me,
        requestId,
      );
    }

    if (token === "bench-notes-key") {
      return this.respond(
        403,
        {
          error: "insufficient_scope",
          message: "This key is real, but it cannot read the profile.",
          required: "profile:read",
          scopes: ["notes:read"],
        },
        MS.me,
        requestId,
      );
    }

    return this.respond(
      401,
      {
        error: "invalid_token",
        message: "The bearer token is not recognized.",
      },
      MS.me,
      requestId,
      { "www-authenticate": 'Bearer error="invalid_token"' },
    );
  }

  private notes(
    params: Record<string, string>,
    requestId: string,
  ): HttpResponse {
    const rawPage = param(params, "page");
    const page = rawPage ? Number(rawPage) : 1;

    if (!Number.isInteger(page) || page < 1) {
      return this.respond(
        400,
        {
          error: "invalid_page",
          message: "page must be a whole number starting at 1.",
        },
        MS.invalid,
        requestId,
      );
    }

    if (page === 2 && this.notesPageTwoAttempts === 0) {
      this.notesPageTwoAttempts = 1;
      return this.respond(
        429,
        {
          error: "rate_limited",
          page: 2,
          retry_after: 3,
          message: "Too many page requests. Retry the same page after 3s.",
        },
        MS.notes,
        requestId,
        { "retry-after": "3" },
      );
    }

    const entry = NOTES_PAGES[page];

    if (!entry) {
      return this.respond(
        200,
        { page, per_page: 2, notes: [], next: null },
        MS.notes,
        requestId,
        { next: "" },
      );
    }

    return this.respond(
      200,
      {
        page,
        per_page: 2,
        notes: entry.notes,
        next: entry.next,
      },
      MS.notes,
      requestId,
      { next: entry.next ?? "" },
    );
  }

  private webhook(rawBody: string | undefined, requestId: string): HttpResponse {
    const body = parseJsonBody(rawBody);

    if (!body) {
      return this.respond(
        400,
        {
          error: "invalid_json",
          message: "Send a JSON object with event_id and signature.",
        },
        MS.invalid,
        requestId,
      );
    }

    const eventId = textField(body.event_id);
    const signature = textField(body.signature);

    if (!eventId || !signature) {
      return this.respond(
        400,
        {
          error: "missing_fields",
          message: "event_id and signature are both required.",
        },
        MS.invalid,
        requestId,
      );
    }

    const expected = `bench_${eventId}_v1`;

    if (signature !== expected) {
      return this.respond(
        401,
        {
          error: "invalid_signature",
          message: "The signature does not match this event.",
          rule: "bench_ + event_id + _v1",
        },
        MS.webhook,
        requestId,
      );
    }

    return this.respond(
      200,
      {
        received: true,
        event_id: eventId,
        verified: true,
        replay_window: "5m",
      },
      MS.webhook,
      requestId,
    );
  }

  private methodNotAllowed(allow: string, requestId: string): HttpResponse {
    return this.respond(
      405,
      {
        error: "method_not_allowed",
        message: `Use ${allow} for this path.`,
        allow,
      },
      MS.invalid,
      requestId,
      { allow },
    );
  }

  private respond(
    status: number,
    body: unknown,
    ms: number,
    requestId: string,
    headers: Record<string, string> = {},
  ): HttpResponse {
    return {
      status,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "x-request-id": requestId,
        ...headers,
      },
      body: JSON.stringify(body),
      ms,
    };
  }
}

export const httpRuntime: HttpRuntime = new MockHttpRuntime();
