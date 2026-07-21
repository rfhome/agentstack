# AgentStack — Current Status

_Last updated: 2026-07-21_

## What this app is

Multi-agent AI fitness platform. Users log gym sessions, get AI analysis from four agents (Pulse/Claude, Forge/GPT-4o, Lens/Gemini, Nexus/Claude), track goals, and monitor recovery via wearables. Deployed on Railway (persistent Node.js + PostgreSQL). Admin-gated — new signups require approval before accessing the app.

## Stack

Next.js App Router · TypeScript · Tailwind · Prisma 7 · PostgreSQL · Railway  
Auth: NextAuth (credentials + Google OAuth)  
AI: Anthropic (Claude Sonnet 4.6), OpenAI (GPT-4o), Google (Gemini 2.5 Flash)  
Wearables: Oura Ring (OAuth), Fitbit/Google Fit (OAuth), Apple Health (webhook via Health Auto Export)

## Current state: healthy, in active use

The app is fully functional and being used daily. Core loop (log → analyze → review) is stable. Railway proxy timeout issue was resolved in a prior session via async fire-and-forget analysis (POST returns 202, client polls status endpoint every 3s).

## What was built / fixed in the last session (2026-07-21)

- **Weekly summary rendering fix** — Nexus was outputting preamble text before JSON; `max_tokens` was too low (1024) causing truncation before JSON closed. Fixed: raised to 4096, tightened prompt to suppress preamble.
- **Weekly summary auto-generation** — `POST /api/internal/weekly-summary-cron` secured by `CRON_SECRET`; loops all active users; skips users with no sessions that week (no fitness-shaming); skips users already summarized this week. Railway cron service created, scheduled `0 8 * * 0` (8am UTC Sunday).
- **Encouraging tone rules** — added explicit non-judgmental tone guardrails to the weekly summary system prompt.
- **"Looks like a rest week" message** — friendly 200 response (not 500) when user manually triggers summary on a week with no sessions.
- **"New" badge** — shown on weekly summary card when generated since the most recent Sunday.
- **Copyright footer** — `© [year] AgentStack. All rights reserved.` in root layout.
- **`/dev-cycle-finish` global skill** — created at `~/.claude/commands/dev-cycle-finish.md`; applies across all projects.

## What was built / fixed in the previous session (2026-07-12)

- **Weekly summary rendering fix** — Nexus was outputting preamble text before JSON; `max_tokens` was too low (1024) causing truncation before JSON closed. Fixed: raised to 4096, tightened prompt to suppress preamble.
- **Weekly summary auto-generation** — `POST /api/internal/weekly-summary-cron` secured by `CRON_SECRET`; loops all active users; skips users with no sessions that week (no fitness-shaming); skips users already summarized this week. Railway cron service created, scheduled `0 8 * * 0` (8am UTC Sunday).
- **Encouraging tone rules** — added explicit non-judgmental tone guardrails to the weekly summary system prompt.
- **"Looks like a rest week" message** — friendly 200 response (not 500) when user manually triggers summary on a week with no sessions.
- **"New" badge** — shown on weekly summary card when generated since the most recent Sunday.
- **Copyright footer** — `© [year] AgentStack. All rights reserved.` in root layout.

## Open follow-ups

### Needs action before next session
_(none — Railway cron and CRON_SECRET are confirmed working)_

### Near-term backlog
- [ ] **Help page screenshots** — user will take screenshots during a session and provide them; wire into `src/app/help/page.tsx` replacing `<Screenshot>` placeholder components with Next.js `<Image>` tags pointing to files in `public/`.
- [ ] **Pre-workout context on sessions history page** — currently displayed in the analyzing/done screen; consider showing it inline in past session detail views as well.
- [ ] **Goals editing UI** — edit target weight/reps on existing goals. Currently only add / mark-achieved / delete is supported (`src/app/profile/page.tsx`).
- [ ] **Web Push notifications** — notify user on phone when async analysis completes. Requires service worker + push subscription per device.
- [ ] **Privacy policy page** — app collects health data, wearable tokens, and email. Legally required in most jurisdictions before going public.

### Medium-term backlog
- [ ] **Notifications / digest** — "Your next workout is tomorrow — here's what Forge prescribes" as email or push
- [ ] **ChatGPT conversation import** — parse ChatGPT data export to seed historical session records
- [ ] **PostgreSQL Row-Level Security** — DB-level user isolation as a second enforcement layer
- [ ] **Invite / multi-user** — read-only trainer view

## Key file locations

| What | Where |
|------|-------|
| Agent definitions | `src/lib/agents/` (pulse, forge, lens, orchestrator, types) |
| Weekly summary logic | `src/lib/weekly-summary.ts` |
| Goal matching (pure) | `src/lib/goals.ts` |
| Async job store | `src/lib/analyze-jobs.ts` |
| Cron endpoint | `src/app/api/internal/weekly-summary-cron/route.ts` |
| Help page | `src/app/help/page.tsx` |
| Profile + goals UI | `src/app/profile/page.tsx` |
| Weekly summary component | `src/components/WeeklySummary.tsx` |
| Auth config (Edge-safe) | `src/auth.config.ts` |
| Dev patterns + gotchas | `CLAUDE.md` |
| Full feature list | `FEATURES.md` |

## Known quirks
- `preWorkoutContext` is saved to Session at creation time — it is NOT re-sent on re-analyze (the analyze route reads it from DB, not the client), so edits after the initial save are not reflected
- `UserProfile.userId` is `String? @unique` (nullable) — always use `findFirst + update/create`, never `upsert`
- Oura API v2 uses `day` field, not `date` — use `r.day ?? r.date` everywhere
- Never run `prisma migrate dev` — schema managed via `prisma db push`
- Railway runs persistent Node.js (not serverless) — fire-and-forget promises are safe
