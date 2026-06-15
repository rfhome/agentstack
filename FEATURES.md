# AgentStack — Feature Status

## Shipped

### Core fitness loop
- [x] Session logging — date, cycle day/number, duration, avg HR, cardio load, AZM, rating (A/B/C), notes
- [x] Cycle number auto-calculated server-side (last session with same cycleDay + 1; defaults to 1)
- [x] Exercise logging — name, sets, reps per-set string, per-set weights string, notes
- [x] Save-only (no analysis) vs Save & Analyze
- [x] Workout prescription — "Get Workout" fetches AI-generated session plan based on cycle day and profile
- [x] Pre-workout context field — free-text input passed to Forge before generating the plan (e.g. "golfing tomorrow", "left knee sore")
- [x] Warmup and finisher checklists on log page (populated from prescription)
- [x] X button clears exercise name; trash icon removes the row
- [x] Session notes visible in History card (expanded view)
- [x] Session template — "Last Push/Pull/Legs/Arms" button pre-fills exercises + weights from most recent matching session
- [x] Weight quick-add buttons — +2.5 / +5 / +10 append a new set weight by incrementing the last value in the per-set string
- [x] Draft auto-save (localStorage, 500ms debounce) — restored on next visit with date + time shown
- [x] PWA manifest + icons — add-to-home-screen on iOS/Android, opens standalone (no browser chrome)

### Multi-agent analysis
- [x] Pulse (Claude Sonnet) — progressive overload, per-exercise breakdown, HR zone analysis
- [x] Forge (GPT-4o) — next-session prescription with specific weights/sets/reps
- [x] Lens (Gemini 2.5 Flash) — recovery, longevity, Oura + Fitbit context
- [x] Nexus (Claude Sonnet) — synthesis + agent-suggested session rating (A/B/C) with one-line reason
- [x] All agent logs stored per session; robust JSON fence extraction prevents parse failures
- [x] Suggested rating shown after analysis — user can accept or override before it's saved

### Auth
- [x] Email + password sign-up / sign-in with email verification
- [x] Google OAuth sign-in
- [x] All data scoped to authenticated user
- [x] Forgot password — email link via Resend, 1-hour token, new password form at `/auth/reset-password`
- [x] Admin approval gate — new signups (credentials + Google) start as `status: "pending"`; admin receives email notification and approves at `/admin` with tier assignment; user receives approval email; pending users are held at `/auth/pending` and cannot access any protected route until approved

### Wearables
- [x] Oura Ring OAuth 2.0 — readiness, HRV, sleep score, deep/REM sleep, temperature deviation
- [x] Fitbit via Google Fit API — avg/max HR, active minutes, heart points (AZM), steps
- [x] Apple Health via webhook — Health Auto Export app POSTs daily metrics (HRV, resting HR, sleep hours, active kcal, steps) and workouts; workouts create Activity records; daily metrics stored as `AppleHealthDay` rows fed to Lens as `appleHealthContext`
- [x] Apple Health status shows "Connected" only after first real data payload received (not on record auto-creation)
- [x] All wearable data injected into agent context on every analysis
- [x] Wearable status and disconnect controls visible on Settings page

### History & progress
- [x] History page (/fitness/sessions) — Sessions | Activities tabs; expandable session cards with exercises, cardio, Nexus synthesis, per-agent accordion
- [x] "Run Analysis" button on unanalyzed sessions (inline, no page reload)
- [x] Progress charts (/fitness/progress) — max weight per exercise over time (recharts)
- [x] Analyzed / Not analyzed badge on session cards
- [x] Session cards show cardio load and AZM alongside duration and avg HR in the summary row
- [x] Cardio activities (machine, tag, HR, duration, distance, calories) shown in expanded session view

### Profile & goals
- [x] Profile editor (/profile) — edit name and full training context markdown
- [x] Goals tracker — target weight/reps per exercise, mark achieved
- [x] Recommendations feed on fitness dashboard

### Activity logging (standalone, non-gym)
- [x] Log Activity modal — type picker (Running, Walking, Hiking, Cycling, Pickleball, Tennis, etc.), date, duration, distance, avg HR, calories, notes
- [x] Wearable screenshot → Gemini vision auto-fills metrics (read-only analyze endpoint — does NOT save until user clicks Save)
- [x] Activities appear on dashboard (last 4) and History Activities tab (all)
- [x] Activity data fed to agents as `recentActivities` — Lens uses it as cumulative fatigue signal
- [x] Deep-link from dashboard "View all activities →" to History#activities tab

### UX / mobile
- [x] Bottom nav bar (mobile-only) — Fitness, History, Progress, Settings tabs with active-state highlighting
- [x] In-app PWA install button — listens for `beforeinstallprompt`, auto-hides when already installed or running standalone
- [x] Active exercise card gets an orange border while any field inside it has focus — gym-visibility highlight
- [x] Fitbit fill button fills HR, AZM, and duration from today's Google Fit data in one tap
- [x] Cardio machine photo analysis — upload treadmill/bike/rower screenshot; Gemini extracts duration, distance, HR, calories and auto-populates the cardio entry form; shows red error state + "Analysis failed — try again" on failure
- [x] Dashboard sections collapsible (This Week, Recommendations, Goals, Recent Activities, Recent Sessions) — chevron toggle, defaults open
- [x] Log Activity button in dashboard header next to Log Session; refreshes server components on save
- [x] "Redo setup wizard" link on Profile page
- [x] Save & Analyze has 120s client timeout with readable fallback message ("session was saved — retry from History") instead of opaque browser "Failed to fetch"

### Deployment
- [x] Railway deployment with PostgreSQL
- [x] AUTH_TRUST_HOST for proxy headers
- [x] All env vars managed in Railway dashboard
- [x] nixpacks.toml — `npm install --omit=dev` to suppress deprecated `--production` flag warning
- [x] .hadolint.yaml — suppresses false-positive DL3025 / SC2154 warnings in Railway build logs

---

## Backlog

### Near-term
- [ ] **Async analysis + push notifications** — save session → background job → Web Push notification when agents finish → user taps to see results and accept rating. Eliminates the 30–60s blocking spinner. Requires service worker, Web Push subscription per device, and a job queue or polling endpoint.

### Medium-term
- [ ] **ChatGPT conversation import** — parse ChatGPT data export to seed historical session records
- [ ] **PostgreSQL Row-Level Security** — DB-level user isolation as a second enforcement layer on top of application-level `userId` filtering
- [ ] **Invite / multi-user** — allow a second user (e.g. trainer) to view read-only

### Productization (Phase 1 — Onboarding)
- [x] **Structured onboarding wizard** — 9-step guided setup (goal, experience, split, gym, injuries, activities) with back-nav and progress bar; pre-populates on re-run from existing programConfig
- [x] **AI-generated program structure** — Nexus/Claude generates full markdown coaching profile; `deriveProgramConfig()` maps answers to a typed `ProgramConfig` with `cycleStructure`; review step shows generated cycle days before confirmation
- [x] **Gym/equipment setup** — gym type stored in `programConfig.gymType`; supports commercial, Planet Fitness, home gym, bodyweight; coaching profile includes equipment constraints
- [x] **Dynamic cycle days** — log page fetches `programConfig.cycleStructure` on mount; cycle selector and template button reflect actual user program (falls back to Push/Pull/Legs/Arms)
- [x] **`onboardingComplete` flag** — UserProfile schema; fitness page banner uses it; existing users with profiles already marked as completed
- [x] **Wearable setup UX** — guided OAuth flow in onboarding wizard (connect Oura / Fitbit after review step); gated behind `tier !== "free"`

### Productization (Phase 2 — Retention)
- [x] **Streaks card** — `StreaksCard` on fitness dashboard: current week streak, this-week vs last-week delta, total sessions, goals achieved; computed by `computeStreaks()` in `src/lib/streaks.ts`; `GET /api/stats` returns stats
- [x] **Weekly summary** — `WeeklySummary` client component on fitness dashboard; `POST /api/weekly-summary` calls Nexus (Claude Sonnet) with this/prev week sessions + Oura recovery data; stored as `domain="weekly"` Recommendation; user triggers on demand; uses `extractJSON` + `wrapAgentInput` + `SECURITY_CANARY`
- [x] **Progress page enhancements** — workout frequency heatmap (52-week GitHub-style grid), personal records summary (all-time max weight per exercise), weight-over-time charts; `GET /api/progress` now returns `{ exercises, prs, trainingDays }`
- [x] **Access tiers + promo codes** — `User.tier` (`free`/`beta`/`premium`), `PromoCode` model, `POST /api/redeem`, tier badge + redeem UI on Settings; create codes via Railway SQL
- [x] **Multi-user readiness** — no hardcoded user assumptions; new credential signups redirect to `/onboarding`; empty states handled across all dashboard components; data fully scoped by `userId`
- [x] **Wearable setup step in onboarding** — guided OAuth connect buttons for Oura / Fitbit after the review step; gated behind `tier !== "free"`
- [x] **Recovery trend chart** — Oura 28-day readiness + sleep score line chart plus HRV chart on `/fitness/progress`; fixed Oura API v2 field name (`day` not `date`)
- [ ] **Notifications / digest** — "Your next workout is tomorrow — here's what Forge prescribes" as email or push

### Phase 3 — Beyond fitness
- [ ] Finance domain (portfolio tracking, Roth conversion planning, retirement modeling)
- [ ] Health domain (supplement tracking, lab results, longevity scoring)
- [ ] Work domain (project milestones, focus tracking)
- [ ] Cross-domain Nexus signals — poor sleep flagged in both fitness recovery AND work focus
- [ ] Weekly digest email
