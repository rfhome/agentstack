# AgentStack — Feature Backlog

## In Progress
- Day 5: Railway deploy + production test

## Planned — Phase 2

### Security & Auth (Priority: Critical before multi-user)
- [ ] Add `userId` to all Prisma models (Session, Exercise, AgentLog, Recommendation, Goal, UserProfile)
- [ ] Auth layer via Auth.js (NextAuth) — email/password or OAuth
- [ ] All Prisma queries scoped by authenticated `userId`
- [ ] PostgreSQL Row-Level Security (RLS) policies — DB-level enforcement
- [ ] Note: AI analysis calls (Anthropic/OpenAI/Google) will receive session data — disclose in privacy policy

### Wearable Integrations
- [ ] **Oura Ring** — Personal Access Token auth, pull readiness score, HRV, sleep score; auto-populate session log
- [ ] **Fitbit** — OAuth 2.0, pull avgHeartRate, cardioLoad, activeZoneMinutes, durationMinutes; auto-populate session log

### Cardio Machine Photo Analysis
- [ ] Image upload on session log form (treadmill, bike, rower screenshots)
- [ ] Send to Gemini (Lens) for metric extraction: duration, distance, calories, HR, resistance
- [ ] Auto-populate form fields from image
- [ ] Lens includes image in recovery analysis

### ChatGPT History Import
- [ ] User uploads ChatGPT data export (JSON)
- [ ] Claude parses conversations and extracts structured session records
- [ ] Review step: user confirms/edits before records are saved
- [ ] Sessions imported with `source: "chatgpt_import"` flag
- [ ] Agents gain immediate historical context

## Planned — Phase 3
- [ ] Finance domain (portfolio, Roth conversion, retirement)
- [ ] Health domain (supplements, labs, longevity scoring)
- [ ] Work domain (project milestones, career)
- [ ] Cross-domain signals (Nexus flags poor sleep → affects both fitness recovery AND work focus)
- [ ] Agent debate mode
- [ ] Weekly digest email
- [ ] Oura API auto-sync (vs. manual token)
- [ ] Mobile app (Expo wrapper)
