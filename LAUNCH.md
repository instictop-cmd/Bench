# Launch checklist

Live: **https://bench-sepia.vercel.app**
Repo: **https://github.com/instictop-cmd/Bench** (public)

## What is in the product

- Prologue, 10 quests across two ranks, two deterministic boss trials
- Workshop: five `flow` lessons plus **The Runaway** boss, with a scripted FlowRuntime, trigger conditions, guards, a step budget, run log and deterministic validation
- Server Room: five `tool` lessons plus **The Overreach** boss, with mock tools, schemas, least-privilege scopes and a deterministic call log
- Observatory: five `eval` lessons plus **The Gauntlet** boss, with authored cases, deterministic checks, pass rates, regressions and a ship gate
- Rooftop: five `deploy` lessons plus **The Outage** boss, with a simulated version timeline, logs, metrics, rollback and approval gates
- Switchboard: five `connect` lessons plus **The Trojan Tool** boss, with mock MCP servers, raw JSON-RPC traces, `tools/list`, `tools/call`, resources, prompts and least-privilege scopes
- Exchange: five `request` lessons plus **The Silent 429** boss, with a deterministic HTTP console, 401/403, 429 backoff, pagination and webhook signatures
- Cockpit: five `operate` lessons plus **The Wildcard** boss, with a safe virtual filesystem, pipes, env vars, exit codes and git hygiene
- Launchpad: two capstones. Operator Studio builds a no-code Study Coach against a real read-only Bench Notes MCP server; Builder Studio builds a Research Desk with shell checks, the same MCP server, an eval gate and a runbook
- Real model calls through Agnes 3.0 Flash, streamed, scoped per quest and per flow step
- Signed session cookie, origin + JSON checks, moderation, per-session/IP/hour limits, daily cap, prompt cache, provider fallback, MCP rate limit and server allowlist
- Campus map, XP, notebook artifacts, share button, optional email capture
- Privacy, terms, AI disclosure, robots, sitemap, Open Graph image
- CI: lint, typecheck, build on every push

## Verify before launch

```bash
npm ci
npm run lint
npm run typecheck
npm run build
npm run ai:check      # provider status + latency
```

CI must be green on `main`. The production smoke test:

```bash
for p in campus complete connect/co-01 request/ca-01 pilot/pi-01 studio/operator studio/builder tool/tl-01 eval/en-01 deploy/dp-01 boss/op-boss boss/an-boss boss/ru-boss boss/in-boss boss/en-boss boss/ar-boss boss/co-boss boss/ca-boss boss/pi-boss privacy terms robots.txt sitemap.xml; do
  curl -s -o /dev/null -w "/$p -> %{http_code}\n" "https://bench-sepia.vercel.app/$p"
done
```

Security gates already verified:

- no session → `401`
- `Content-Type: text/plain` → `415`
- cross-site `Origin` / `Sec-Fetch-Site` → `403`
- security headers present: CSP `frame-ancestors`, `X-Frame-Options: DENY`, `X-Content-Type-Options`, Referrer-Policy, Permissions-Policy, HSTS
- key is server-side only; `.env.local` is gitignored; no secrets in git history

## Environment variables

Set in Vercel → Project → Settings → Environment Variables (Production and Preview):

| Name | Required | Notes |
| --- | --- | --- |
| `AI_API_KEY` | yes | Agnes key |
| `AI_BASE_URL` | yes | `https://apihub.agnes-ai.com/v1` |
| `AI_MODEL` | yes | `agnes-3.0-flash` |
| `SESSION_SECRET` | yes | `openssl rand -hex 32` |
| `AI_DAILY_CAP` | recommended | default `2000` |
| `NEXT_PUBLIC_SITE_URL` | recommended | canonical URL |
| `UPSTASH_REDIS_REST_URL` | recommended | shared rate limits |
| `UPSTASH_REDIS_REST_TOKEN` | recommended | shared rate limits |
| `NEXT_PUBLIC_SIGNUP_URL` | optional | Formspree/Tally endpoint for `{email, source}` |

Without Upstash, rate limits are per serverless instance. The Vercel firewall rule is the global backstop.

## Firewall (live)

The Vercel firewall rule is **live**:

> `AI proxy rate limit` — `/api/ai`, 120 requests / 60s per IP, deny for 1m

This is the global backstop behind the app-level session, IP and daily limits. 120/min keeps a 25-student workshop behind one campus NAT working while still capping abuse.

## Production verification (27 Nov 2026)

- **Full course run on the production URL: 45/45 lessons, 9/9 bosses, 2/2 studios, 1935 XP, 56 artifacts, all nine ranks `rank complete`**
- **Core ranks:** 10/10 quests, 2/2 bosses, 185 XP, 12 artifacts
- **Workshop:** `fl-01` through `fl-05` and The Runaway completed; 15/15 lessons after this rank
- **Server Room:** `tl-01` through `tl-05` and The Overreach completed; narrow-scope guard rejected `files.readwrite` for a write-only task, and an incomplete schema was rejected with a field error
- **Observatory:** `en-01` through `en-05` and The Gauntlet completed; deterministic reports showed pass rates, the v2 regression was caught, and the target candidate cleared every gate
- **Rooftop:** `dp-01` through `dp-05` and The Outage completed; each action produced a deterministic console result and the final runbook run cleared
- **Switchboard:** `co-01` through `co-05` and The Trojan Tool completed on production; the raw JSON-RPC trace showed `initialize`, `tools/list`, `tools/call` and `resources/read`; the mock rejected a bad scope, missing arguments and the poisoned shadow-notes server
- **Exchange:** `ca-01` through `ca-05` and The Silent 429 completed on production; 401 without a token, 429 with `Retry-After`, page 2 after backoff, and the signed webhook all behaved as authored
- **Cockpit:** `pi-01` through `pi-05` and The Wildcard completed on production; the virtual filesystem handled pipes, env vars, git staging and destructive-command recovery
- **Launchpad:** both studios completed on production. Operator Studio read the real Bench Notes MCP server through `initialize → tools/list → tools/call`; Builder Studio passed the shell checks and the same real MCP read, then filed both portfolios
- **MCP allowlist:** `POST /api/mcp/bench-notes` returns `200`; `POST /api/mcp/other` returns `404`
- **Course complete:** `/complete` shows 1935 XP, 45/45 lessons, 2/2 studios and 56/56 artifacts; the campus banner and all nine cards agree
- Flow path: build a flow, run it with real model output, validate order, trigger, guard and budget; invalid flows are rejected with a hint; provider refusal or failure uses the authored fallback; refusals are never cached
- Security gates: `401` no session, `415` wrong content type, `403` cross-site, moderation refusal
- Provider failure path: invalid key → authored reference answer → quest still completes
- CI green on `main`; build, lint and typecheck pass
- Vercel Web Analytics enabled; firewall rule live

## Simulated by design (Ranks 4–9)

- Tool calls run against `MockToolRuntime`; no real files, calendar or web access
- Eval suites run authored candidate outputs through deterministic `contains` / `equals` / `regex` / `maxWords` checks; the model is never the judge
- Deploys run a simulated console; no infrastructure is created or changed
- Connector lessons run against a deterministic MCP JSON-RPC mock; the Studio uses the real read-only `/api/mcp/bench-notes` endpoint through a server allowlist
- Caller lessons run against a deterministic API console; no real third-party API or key is used
- Pilot runs a safe virtual filesystem with a real command grammar; no host shell, network or real files
- Each runtime sits behind an interface (`ToolRuntime`, `EvalRuntime`, `DeployRuntime`, `McpRuntime`, `HttpRuntime`, `ShellRuntime`), so real adapters can replace the mock without rewriting the lessons

## Remaining external keys (not blockers)

- **Sentry**: create a project, add `SENTRY_DSN`, install `@sentry/nextjs`. Until then, errors are logged server-side and the app has a friendly error page.
- **Upstash**: create a free Redis database and add the two env vars. The limiter switches automatically.
- **Signup**: add a form endpoint to `NEXT_PUBLIC_SIGNUP_URL`; until then the campus shows a mailto beta-list link.
- **Contact email**: `instictop@gmail.com` appears in the legal pages and report links. Replace it with a project address before a wide launch.
- **Custom domain**: optional for the beta; point it in Vercel and update `NEXT_PUBLIC_SITE_URL`.
- **Agnes spend cap**: set a hard monthly limit in the Agnes dashboard.

## Launch day

1. Merge to `main`; CI green; `vercel --prod`.
2. Run the smoke test above on the production URL.
3. Open the prologue on an iPhone and a mid-range Android over mobile data.
4. Publish the firewall rule (above).
5. Post the campus link, run the 45-minute workshop, watch the funnel events in Vercel Analytics.
6. Reply to every report within two hours.

## Rollback

```bash
git revert <sha>
git push
vercel --prod
```

or promote the previous deployment from Vercel → Deployments.

## Metrics to watch

- Activation: landing → quest 01 complete, target ≥60%
- Time to first win: <4 min median
- Quest 01 completion ≥70%; rank 1 ≥35%
- Provider errors <2%, p95 <6s, cost <₹1.50/session
- D1 18%, D7 8% (directional until accounts exist)
