# AgentStack

A personal multi-agent AI system. Currently focused on fitness — session logging, wearable integration, and analysis by a coordinated team of specialized AI agents.

Live: [agentstack.catalystedgeconnect.com](https://agentstack.catalystedgeconnect.com)

---

## What it does

You log a training session. Three AI agents analyze it in parallel:

- **Pulse** (Claude Sonnet) — precision fitness analyst: progressive overload tracking, per-exercise breakdown, HR zone classification, trend detection
- **Forge** (GPT-4o) — strength program architect: prescribes exact weights/sets/reps for your next session based on logged history and your defined program
- **Lens** (Gemini 2.5 Flash) — recovery and longevity specialist: uses Oura Ring readiness/HRV/sleep and Fitbit/Google Fit HR zones to assess whether you should push, back off, or rest

**Nexus** (Claude Sonnet) receives all three reports and synthesizes a single prioritized recommendation with concrete next actions.

The system gets sharper over time as session history accumulates. All agents receive your full training profile (goals, program structure, health history, current progressions) on every analysis.

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js (App Router, TypeScript) |
| Styling | Tailwind CSS |
| Database | PostgreSQL (Railway) via Prisma 7 + PrismaPg adapter |
| Auth | NextAuth v5 — email/password (email-verified) + Google OAuth |
| AI | Anthropic Claude, OpenAI GPT-4o, Google Gemini |
| Wearables | Oura Ring OAuth 2.0, Fitbit via Google Fit API, Apple Health via webhook |
| Deployment | Railway |

---

## Local setup

**Prerequisites:** Node 20+, a PostgreSQL database, API keys for Anthropic, OpenAI, and Google Gemini.

```bash
git clone https://github.com/rfhome/agentstack
cd agentstack
npm install
```

Create `.env.local`:

```env
DATABASE_URL="postgresql://..."
AUTH_SECRET="..."                  # generate with: openssl rand -base64 32

# AI providers
ANTHROPIC_API_KEY="sk-ant-..."
OPENAI_API_KEY="sk-proj-..."
GEMINI_API_KEY="AIza..."

# Auth
AUTH_URL="http://localhost:3000"

# Wearables (optional)
OURA_CLIENT_ID="..."
OURA_CLIENT_SECRET="..."
FITBIT_CLIENT_ID="..."             # Google OAuth client ID (Fitbit migrated to Google Health API)
FITBIT_CLIENT_SECRET="..."

# Google Sign-In (can reuse FITBIT_CLIENT_ID/SECRET if same Google Cloud project)
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
```

Apply the database schema:

```bash
npx prisma db push
```

Run the dev server:

```bash
npm run dev
```

---

## Key routes

| Route | Description |
|-------|-------------|
| `/fitness` | Dashboard — streaks, this-week stats, weekly Nexus summary, recommendations, last 4 sessions, last 4 activities; all sections collapsible |
| `/fitness/log` | Log a session — exercises with per-set weights, HR/AZM/duration/cardio load, cardio entries with machine photo analysis, rating, screenshots; Save Only or Save & Analyze |
| `/fitness/sessions` | History — Sessions \| Activities tabs; full expandable cards with per-agent breakdown and Nexus synthesis |
| `/fitness/progress` | Progress — 52-week training heatmap, personal records, Oura 28-day recovery trend, weight-over-time charts |
| `/settings` | Connect/disconnect Oura Ring, Fitbit, Apple Health webhook; tier badge; promo code redemption |
| `/profile` | Edit name and full training context (the markdown document all agents read); link to redo setup wizard |
| `/onboarding` | First-run wizard — goal, experience, program structure, gym type, injuries; generates AI coaching profile |

---

## Architecture

```
POST /api/analyze
  └─ Promise.allSettled([runPulse, runForge, runLens])
       ├─ Pulse  → Claude Sonnet — fitness analysis JSON
       ├─ Forge  → GPT-4o        — prescription JSON
       └─ Lens   → Gemini Flash  — recovery analysis JSON
  └─ runNexus(agentResponses + sessionContext)
       └─ Claude Sonnet — synthesized recommendation + nextActions
```

Agent inputs include: session data, last 4 sessions, active goals, user profile context, Oura data (if connected), Fitbit/Google Fit data (if connected), Apple Health daily metrics (if webhook is receiving data), recent standalone activities (last 10, within 7 days), and up to 4 workout screenshots (passed as vision blocks to image-capable models).

All agent responses and Nexus synthesis are stored in `AgentLog` and `Recommendation` tables, linked to the session.

---

## Wearable integration notes

**Oura Ring** — connects via OAuth 2.0 at dev.ouraring.com. Provides readiness score, HRV balance, sleep score, temperature deviation, deep/REM sleep duration. Injected into Lens and Pulse context on every analysis.

**Fitbit / Google Fit** — Fitbit's legacy developer portal closed new app registrations in 2026; integration now uses Google OAuth + Google Fit REST API. Provides avg/max heart rate, active minutes, heart points (AZM equivalent), steps. Requires Google Cloud project with Fitness API enabled.

**Apple Health** — no native iOS app required. Uses the free [Health Auto Export](https://www.healthautoexport.com/) app to POST daily metrics (HRV, resting HR, sleep hours, active calories, steps) and workouts to a personal webhook URL. Setup: Settings → Apple Health → copy webhook URL → paste into Health Auto Export automation. Connected status activates once the first payload is received.
