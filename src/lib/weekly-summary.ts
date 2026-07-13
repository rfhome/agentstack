import Anthropic from "@anthropic-ai/sdk";
import { withRLS } from "@/lib/prisma-rls";
import { fetchOuraData, formatOuraForLens } from "@/lib/oura";
import { getUserContext } from "@/lib/context/userProfile";
import { extractJSON } from "@/lib/agents/parse";
import { wrapAgentInput, SECURITY_CANARY } from "@/lib/security";

export type WeeklySynthesis = {
  weekOf: string;
  headline: string;
  content: string;
  stats: { sessionsThisWeek: number; sessionsPrevWeek: number };
  nextActions: string[];
};

const WEEKLY_SUMMARY_SYSTEM_PROMPT = (userName: string) =>
  `You are Nexus generating a weekly training summary for ${userName}. Analyze the past 7 days of training data vs the previous 7 days. Synthesize: session count and volume trend, any PRs or regressions, recovery pattern from available wearable data, and one clear focus recommendation for the coming week.

Tone rules — these are non-negotiable:
- Always encouraging and forward-looking. Focus on what was accomplished, not what was missed.
- Never frame rest, lower volume, or fewer sessions as failure. Recovery is part of training.
- nextActions must be positive and actionable, never critical or guilt-inducing.
- If a week was lighter than usual, find the genuine positive angle (recovery, consistency, injury prevention) and look ahead.

Respond with ONLY a JSON object — no preamble, no explanation, no markdown fences. Output must start with { and end with }.

{
  "weekOf": "string — date range e.g. May 10–16",
  "headline": "string — one punchy sentence summarizing the week",
  "content": "string — 3-4 sentence narrative paragraph",
  "stats": { "sessionsThisWeek": number, "sessionsPrevWeek": number },
  "nextActions": ["string", "string", "string"]
}
${SECURITY_CANARY}`;

function slimSession(s: {
  date: Date;
  cycleDay?: number | null;
  durationMinutes?: number | null;
  avgHeartRate?: number | null;
  rating?: string | null;
  notes?: string | null;
  exercises: { name: string; sets?: number | null; reps?: string | null; weights?: string | null }[];
}) {
  return {
    date: s.date.toISOString().slice(0, 10),
    cycleDay: s.cycleDay ?? undefined,
    durationMin: s.durationMinutes ?? undefined,
    avgHR: s.avgHeartRate ?? undefined,
    rating: s.rating ?? undefined,
    notes: s.notes ? s.notes.slice(0, 200) : undefined,
    exercises: s.exercises.map((e) => ({
      name: e.name,
      sets: e.sets ?? undefined,
      reps: e.reps ?? undefined,
      weights: e.weights ?? undefined,
    })),
  };
}

export class NoSessionsError extends Error {
  constructor() { super("no_sessions_this_week"); }
}

export async function generateWeeklySummary(
  userId: string,
  userName: string
): Promise<WeeklySynthesis> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

  const [sessions, prevSessions, ouraConn, userContext] = await withRLS(userId, (db) =>
    Promise.all([
      db.session.findMany({
        where: { userId, date: { gte: sevenDaysAgo } },
        orderBy: { date: "desc" },
        take: 14,
        select: {
          date: true, cycleDay: true, durationMinutes: true,
          avgHeartRate: true, rating: true, notes: true,
          exercises: { select: { name: true, sets: true, reps: true, weights: true } },
        },
      }),
      db.session.findMany({
        where: { userId, date: { gte: fourteenDaysAgo, lt: sevenDaysAgo } },
        orderBy: { date: "desc" },
        take: 14,
        select: {
          date: true, cycleDay: true, durationMinutes: true,
          avgHeartRate: true, rating: true, notes: true,
          exercises: { select: { name: true, sets: true, reps: true, weights: true } },
        },
      }),
      db.wearableConnection.findUnique({
        where: { userId_provider: { userId, provider: "oura" } },
        select: { id: true },
      }),
      getUserContext(userId, db),
    ])
  );

  if (sessions.length === 0) throw new NoSessionsError();

  let ouraContext: string | undefined;
  if (ouraConn) {
    try {
      const ouraData = await fetchOuraData(userId);
      ouraContext = formatOuraForLens(ouraData);
    } catch {
      // Oura unavailable — proceed without it
    }
  }

  const rawInput = JSON.stringify({
    thisWeek: sessions.map(slimSession),
    previousWeek: prevSessions.map(slimSession),
    ...(ouraContext ? { ouraData: ouraContext } : {}),
    ...(userContext ? { userContext: userContext.slice(0, 2000) } : {}),
  });

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    system: WEEKLY_SUMMARY_SYSTEM_PROMPT(userName),
    messages: [{ role: "user", content: wrapAgentInput(rawInput) }],
  });

  const text = (msg.content[0] as { type: string; text: string }).text;

  const synthesis = extractJSON<WeeklySynthesis>(text, {
    weekOf: "",
    headline: "",
    content: text,
    stats: { sessionsThisWeek: sessions.length, sessionsPrevWeek: prevSessions.length },
    nextActions: [],
  });

  const safeNextActions = Array.isArray(synthesis.nextActions) ? synthesis.nextActions : [];

  await withRLS(userId, (db) =>
    db.recommendation.create({
      data: {
        userId,
        domain: "weekly",
        content: synthesis.content ?? "",
        nextActions: safeNextActions,
      },
    })
  );

  return synthesis;
}
