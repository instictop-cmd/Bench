# Launch checklist

Live: **https://bench-sepia.vercel.app**
Repo: **https://github.com/instictop-cmd/Bench** (private)

## What is in the product

- Prologue, 10 quests across two ranks, two deterministic boss trials
- Workshop: five `flow` lessons plus **The Runaway** boss, with a scripted FlowRuntime, trigger conditions, guards, a step budget, run log and deterministic validation
- Server Room: five `tool` lessons plus **The Overreach** boss, with mock tools, schemas, least-privilege scopes and a deterministic call log
- Observatory: five `eval` lessons plus **The Gauntlet** boss, with authored cases, deterministic checks, pass rates, regressions and a ship gate
- Rooftop: five `deploy` lessons plus **The Outage** boss, with a simulated version timeline, logs, metrics, rollback, approval gates and a course-complete page
- Real model calls through Agnes 3.0 Flash, streamed, scoped per quest and per flow step
- Signed session cookie, origin + JSON checks, moderation, per-session/IP/hour limits, daily cap, prompt cache, provider fallback
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
for p in campus complete tool/tl-01 eval/en-01 deploy/dp-01 boss/op-boss boss/an-boss boss/ru-boss boss/in-boss boss/en-boss boss/ar-boss privacy terms robots.txt sitemap.xml; do
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

- **Full course run on the production URL: 30/30 lessons, 6/6 bosses, 870 XP, 36 artifacts, all six ranks `rank complete`**
- **Core ranks:** 10/10 quests, 2/2 bosses, 185 XP, 12 artifacts
- **Workshop:** `fl-01` through `fl-05` and The Runaway completed on production; 15/15 lessons after this rank
- **Server Room:** `tl-01` through `tl-05` and The Overreach completed on production; narrow-scope guard rejected `files.readwrite` for a write-only task, and an incomplete schema was rejected with a field error
- **Observatory:** `en-01` through `en-05` and The Gauntlet completed on production; deterministic reports showed pass rates, the v2 regression was caught, and the target candidate cleared every gate
- **Rooftop:** `dp-01` through `dp-05` and The Outage completed on production; each action produced a deterministic console result and the final runbook run cleared
- **Course complete:** `/complete` shows 870 XP, 30/30 lessons and 36/36 artifacts; the campus banner and all six cards agree
- Flow path: build a flow, run it with real model output, validate order, trigger, guard and budget; invalid flows are rejected with a hint; provider refusal or failure uses the authored fallback; refusals are never cached
- Security gates: `401` no session, `415` wrong content type, `403` cross-site, moderation refusal
- Provider failure path: invalid key → authored reference answer → quest still completes
- CI green on `main`; build, lint and typecheck pass
- Vercel Web Analytics enabled; firewall rule live

## Simulated by design (Rank 4–6)

- Tool calls run against `MockToolRuntime`; no real files, calendar or web access
- Eval suites run authored candidate outputs through deterministic `contains` / `equals` / `regex` / `maxWords` checks; the model is never the judge
- Deploys run a simulated console; no infrastructure is created or changed
- Each runtime sits behind an interface (`ToolRuntime`, `EvalRuntime`, `DeployRuntime`), so MCP, live evals and a sandboxed deploy can replace the adapter without rewriting the lessons

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
