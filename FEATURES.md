# AgentStack — Feature Status

## Shipped

### Core fitness loop
- [x] Session logging — date, cycle day/number, duration, avg HR, cardio load, AZM, rating (A/B/C), notes
- [x] Exercise logging — name, sets, reps per-set string, per-set weights string, notes
- [x] Save-only (no analysis) vs Save & Analyze
- [x] Workout prescription — "Get Workout" fetches AI-generated session plan based on cycle day and profile
- [x] Pre-workout context field — free-text input passed to Forge before generating the plan (e.g. "golfing tomorrow", "left knee sore")
- [x] Warmup and finisher checklists on log page (populated from prescription)
- [x] X button clears exercise name; trash icon removes the row
- [x] Session notes visible in History card (expanded view)
- [x] Session template — "Last Push/Pull/Legs/Arms" button pre-fills exercises + weights from most recent matching session
- [x] Weight quick-add buttons — +2.5 / +5 / +10 append a new set weight by incrementing the last value in the per-set string
- [x] PWA manifest + icons — add-to-home-screen on iOS/Android, opens standalone (no browser chrome)

### Multi-agent analysis
- [x] Pulse (Claude Sonnet) — progressive overload, per-exercise breakdown, HR zone analysis
- [x] Forge (GPT-4o) — next-session prescription with specific weights/sets/reps
- [x] Lens (Gemini 2.5 Flash) — recovery, longevity, Oura + Fitbit context
- [x] Nexus (Claude Sonnet) — synthesis + agent-suggested session rating (A/B/C) with one-line reason
- [x] All agent logs stored per session; robust JSON fence extraction prevents parse failures
- [x] Suggested rating shown after analysis — user can accept or override before it's saved

### Auth
- [x] Email + password sign-up / sign-in
- [x] Google OAuth sign-in
- [x] All data scoped to authenticated user

### Wearables
- [x] Oura Ring OAuth 2.0 — readiness, HRV, sleep score, deep/REM sleep, temperature deviation
- [x] Fitbit via Google Fit API — avg/max HR, active minutes, heart points (AZM), steps
- [x] Both injected into agent context on every analysis
- [x] Wearable status and data visible on Settings page

### History & progress
- [x] Session history page (/fitness/sessions) — expandable cards with exercises, Nexus synthesis, per-agent accordion
- [x] "Run Analysis" button on unanalyzed sessions (inline, no page reload)
- [x] Progress charts (/fitness/progress) — max weight per exercise over time (recharts)
- [x] Analyzed / Not analyzed badge on session cards

### Profile & goals
- [x] Profile editor (/profile) — edit name and full training context markdown
- [x] Goals tracker — target weight/reps per exercise, mark achieved
- [x] Recommendations feed on fitness dashboard

### Deployment
- [x] Railway deployment with PostgreSQL
- [x] AUTH_TRUST_HOST for proxy headers
- [x] All env vars managed in Railway dashboard

---

## Backlog

### Near-term
- [ ] **Cardio machine photo analysis** — upload treadmill/bike/rower screenshot; Lens extracts duration, distance, HR, calories and auto-populates the session form
- [ ] **Auto-populate session metrics from Fitbit** — pull today's HR / AZM / duration directly into the log form when connected, so you don't have to type them

### Medium-term
- [ ] **ChatGPT conversation import** — parse ChatGPT data export to seed historical session records
- [ ] **Apple Health integration** — for richer iOS data (HRV, VO2 max, sleep stages) beyond what Google Fit surfaces
- [ ] **PostgreSQL Row-Level Security** — DB-level user isolation as a second enforcement layer
- [ ] **Invite / multi-user** — allow a second user (e.g. trainer) to view read-only

### Productization (Phase 1 — Onboarding)
- [x] **Structured onboarding wizard** — 9-step guided setup (goal, experience, split, gym, injuries, activities) with back-nav and progress bar; pre-populates on re-run from existing programConfig
- [x] **AI-generated program structure** — Nexus/Claude generates full markdown coaching profile; `deriveProgramConfig()` maps answers to a typed `ProgramConfig` with `cycleStructure`; review step shows generated cycle days before confirmation
- [x] **Gym/equipment setup** — gym type stored in `programConfig.gymType`; supports commercial, Planet Fitness, home gym, bodyweight; coaching profile includes equipment constraints
- [x] **Dynamic cycle days** — log page fetches `programConfig.cycleStructure` on mount; cycle selector and template button reflect actual user program (falls back to Push/Pull/Legs/Arms)
- [x] **`onboardingComplete` flag** — UserProfile schema; fitness page banner uses it; existing users with profiles already marked as completed
- [ ] **Wearable setup UX** — guided OAuth flow in onboarding wizard with big buttons, not buried in settings

### Productization (Phase 2 — Retention)
- [x] **Streaks card** — `StreaksCard` on fitness dashboard: current week streak, this-week vs last-week delta, total sessions, goals achieved; computed by `computeStreaks()` in `src/lib/streaks.ts`; `GET /api/stats` returns stats
- [x] **Weekly summary** — `WeeklySummary` client component on fitness dashboard; `POST /api/weekly-summary` calls Nexus (Claude Sonnet) with this/prev week sessions + Oura recovery data; stored as `domain="weekly"` Recommendation; user triggers on demand; uses `extractJSON` + `wrapAgentInput` + `SECURITY_CANARY`
- [x] **Progress page enhancements** — workout frequency heatmap (52-week GitHub-style grid), personal records summary (all-time max weight per exercise), weight-over-time charts; `GET /api/progress` now returns `{ exercises, prs, trainingDays }`
- [x] **Access tiers + promo codes** — `User.tier` (`free`/`beta`/`premium`), `PromoCode` model, `POST /api/redeem`, tier badge + redeem UI on Settings; create codes via Railway SQL
- [x] **Multi-user readiness** — no hardcoded user assumptions; new credential signups redirect to `/onboarding`; empty states handled across all dashboard components; data fully scoped by `userId`
- [ ] **Wearable setup UX in onboarding** — guided OAuth flow as a paid/beta feature (gated behind `tier !== "free"`)
- [ ] **Progress visualization** — recovery trend chart
- [ ] **Notifications / digest** — "Your next workout is tomorrow — here's what Forge prescribes" as email or push

### Phase 3 — Beyond fitness
- [ ] Finance domain (portfolio tracking, Roth conversion planning, retirement modeling)
- [ ] Health domain (supplement tracking, lab results, longevity scoring)
- [ ] Work domain (project milestones, focus tracking)
- [ ] Cross-domain Nexus signals — poor sleep flagged in both fitness recovery AND work focus
- [ ] Weekly digest email
