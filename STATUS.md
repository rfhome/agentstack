# AgentStack — Current Status

_Last updated: 2026-09-04_

## What this app is

Multi-agent AI fitness platform. Users log gym sessions, get AI analysis from four agents (Pulse/Claude, Forge/GPT-4o, Lens/Gemini, Nexus/Claude), track goals, and monitor recovery via wearables. Deployed on Railway (persistent Node.js + PostgreSQL). Admin-gated — new signups require approval before accessing the app.

## Stack

Next.js App Router · TypeScript · Tailwind · Prisma 7 · PostgreSQL · Railway  
Auth: NextAuth (credentials + Google OAuth)  
AI: Anthropic (Claude Sonnet 4.6), OpenAI (GPT-4o), Google (Gemini 2.5 Flash)  
Wearables: Oura Ring (OAuth), Fitbit/Google Fit (OAuth), Apple Health (webhook via Health Auto Export)

## Current state: healthy, in active use

The app is fully functional and being used daily. Core loop (log → analyze → review) is stable. Railway proxy timeout issue was resolved in a prior session via async fire-and-forget analysis (POST returns 202, client polls status endpoint every 3s).

## What was built / fixed in the last session (2026-09-04)

- **Post-session notes + standing directive on analysis screens** — the "Nexus synthesizing…" and "Analysis Complete" screens on `/fitness/log` previously showed only the pre-session note. Added matching read-only cards for post-session `notes` and the active `standingNote` (if any), reusing existing component state — no new API surface. `src/app/fitness/log/page.tsx`.
- **Docs catch-up** — the 2026-08-24 standing-directive/exercise-rotation commit had shipped without STATUS.md/FEATURES.md/CLAUDE.md updates; backfilled below.

## What was built / fixed in the previous session (2026-08-24)

- **Standing directive** — athletes can set a temporary, multi-session directive (e.g. "no PRs while adjusting to a wrist wrap") woven into every agent prompt (Pulse, Forge, Lens, Nexus) until it expires. New `GET/PUT/DELETE /api/standing-note` endpoint + editable card on the log page. Lazy expiry (compared to `now` on read), no cleanup job.
- **Exercise rotation tracking** — sessions track exercise novelty so Forge can proactively rotate in a fresh movement when a user's profile values variety and nothing new has appeared in 60+ days.

## Open follow-ups

### Needs action before next session
_(none — Railway cron and CRON_SECRET are confirmed working)_

### Near-term backlog
- [ ] **Help page screenshots** — user will take screenshots during a session and provide them; wire into `src/app/help/page.tsx` replacing `<Screenshot>` placeholder components with Next.js `<Image>` tags pointing to files in `public/`.
- [ ] **Pre-workout context on sessions history page** — `preWorkoutContext` still isn't selected/typed/rendered anywhere in the History flow (`src/app/fitness/sessions/page.tsx` → `HistoryTabs.tsx` → `SessionHistoryCard.tsx`); would need a Prisma select + serialize + type addition end-to-end. (Post-session `notes` is already shown there; `standingNote` is profile-level/current-only, not a historical session snapshot, so it doesn't belong on past-session views as-is.)
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
- `standingNote`/`standingNoteExpiresAt` live on `UserProfile`, not `Session` — it's the *current* directive, not a per-session snapshot; a past session's analysis screen won't show what was active when that session ran, only what's active now
- `UserProfile.userId` is `String? @unique` (nullable) — always use `findFirst + update/create`, never `upsert`
- Oura API v2 uses `day` field, not `date` — use `r.day ?? r.date` everywhere
- Never run `prisma migrate dev` — schema managed via `prisma db push`
- Railway runs persistent Node.js (not serverless) — fire-and-forget promises are safe
