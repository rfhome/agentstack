-- PostgreSQL Row-Level Security policies for AgentStack
-- Run once against the database: psql $DATABASE_URL -f prisma/rls.sql
--
-- Strategy: set_config('app.current_user_id', userId, TRUE) at the start of
-- each transaction (transaction-local, resets on commit/rollback). All user-
-- scoped tables enforce isolation via USING policies. FORCE ROW LEVEL SECURITY
-- overrides the default superuser bypass (required on Railway, where the app
-- connects as the DB owner).

-- ── Session ──────────────────────────────────────────────────────────────────
ALTER TABLE "Session" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Session" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS session_user_isolation ON "Session";
CREATE POLICY session_user_isolation ON "Session"
  USING ("userId" = current_setting('app.current_user_id', TRUE));

-- ── Exercise (no userId column — joins through Session) ───────────────────────
ALTER TABLE "Exercise" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Exercise" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS exercise_user_isolation ON "Exercise";
CREATE POLICY exercise_user_isolation ON "Exercise"
  USING (
    EXISTS (
      SELECT 1 FROM "Session"
      WHERE "Session".id = "Exercise"."sessionId"
        AND "Session"."userId" = current_setting('app.current_user_id', TRUE)
    )
  );

-- ── CardioActivity ────────────────────────────────────────────────────────────
ALTER TABLE "CardioActivity" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CardioActivity" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cardio_user_isolation ON "CardioActivity";
CREATE POLICY cardio_user_isolation ON "CardioActivity"
  USING ("userId" = current_setting('app.current_user_id', TRUE));

-- ── AgentLog ──────────────────────────────────────────────────────────────────
ALTER TABLE "AgentLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AgentLog" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS agent_log_user_isolation ON "AgentLog";
CREATE POLICY agent_log_user_isolation ON "AgentLog"
  USING ("userId" = current_setting('app.current_user_id', TRUE));

-- ── Recommendation ────────────────────────────────────────────────────────────
ALTER TABLE "Recommendation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Recommendation" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS recommendation_user_isolation ON "Recommendation";
CREATE POLICY recommendation_user_isolation ON "Recommendation"
  USING ("userId" = current_setting('app.current_user_id', TRUE));

-- ── Goal ──────────────────────────────────────────────────────────────────────
ALTER TABLE "Goal" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Goal" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS goal_user_isolation ON "Goal";
CREATE POLICY goal_user_isolation ON "Goal"
  USING ("userId" = current_setting('app.current_user_id', TRUE));

-- ── WearableConnection ────────────────────────────────────────────────────────
ALTER TABLE "WearableConnection" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WearableConnection" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS wearable_user_isolation ON "WearableConnection";
CREATE POLICY wearable_user_isolation ON "WearableConnection"
  USING ("userId" = current_setting('app.current_user_id', TRUE));

-- ── UserProfile ───────────────────────────────────────────────────────────────
ALTER TABLE "UserProfile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserProfile" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_profile_isolation ON "UserProfile";
CREATE POLICY user_profile_isolation ON "UserProfile"
  USING ("userId" = current_setting('app.current_user_id', TRUE));
