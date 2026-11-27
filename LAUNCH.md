# Launch checklist

Live: **https://bench-sepia.vercel.app**
Repo: **https://github.com/instictop-cmd/Bench** (private)

## What is in the product

- Prologue, 10 quests across two ranks, two deterministic boss trials
- Workshop: two `flow` lessons (Chain Two Steps, Carry a Variable) with a scripted FlowRuntime, run log and deterministic validation
- Real model calls through Agnes 3.0 Flash, streamed, scoped per quest
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
for p in campus quest/op-01 quest/an-01 boss/op-boss boss/an-boss privacy terms robots.txt sitemap.xml; do
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

- Full run on the production URL: **10/10 quests, 2/2 bosses, 185 XP, 12 artifacts**
- Both ranks show `rank complete`; campus completion banner appears
- **Workshop:** `fl-01` and `fl-02` completed on production; **215 XP, 14 artifacts, Workshop 2/2, 12/12 lessons**
- Flow path: build a flow, run it with real model output, validate order, save the artifact; invalid order is rejected with a hint; provider failure uses the authored fallback
- Security gates: `401` no session, `415` wrong content type, `403` cross-site, moderation refusal
- Provider failure path: invalid key → authored reference answer → quest still completes
- CI green on `main`; build, lint and typecheck pass
- Vercel Web Analytics enabled; firewall rule live

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
