export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { withRLS } from "@/lib/prisma-rls";
import { HistoryTabs } from "@/components/HistoryTabs";

const AGENT_NAMES = ["Pulse", "Forge", "Lens"];

// ---------------------------------------------------------------------------
// Server-side agent response parser
// Extracts { analysis, recommendations, flags } from a raw LLM response string.
// Running this on the server means we never ship unparseable JSON to the client.
// ---------------------------------------------------------------------------
function sanitizeJsonControlChars(str: string): string {
  let inString = false;
  let escaped = false;
  let result = "";
  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    if (escaped) { result += c; escaped = false; continue; }
    if (c === "\\" && inString) { result += c; escaped = true; continue; }
    if (c === '"') { result += c; inString = !inString; continue; }
    if (inString) {
      if (c === "\n") { result += "\\n"; continue; }
      if (c === "\r") { result += "\\r"; continue; }
      if (c === "\t") { result += "\\t"; continue; }
    }
    result += c;
  }
  return result;
}

function tryParseAgentJSON(candidate: string): { analysis?: string; recommendations?: string[]; flags?: string[] } | null {
  for (const s of [candidate, sanitizeJsonControlChars(candidate)]) {
    try {
      const obj = JSON.parse(s) as Record<string, unknown>;
      if (typeof obj === "object" && obj !== null) return obj as { analysis?: string; recommendations?: string[]; flags?: string[] };
    } catch { /* try next */ }
  }
  return null;
}

function parseAgentResponseServer(text: string): { analysis?: string; recommendations?: string[]; flags?: string[] } {
  // 1. Direct parse
  const direct = tryParseAgentJSON(text.trim());
  if (direct) return direct;

  // 2. Markdown fence
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fenceMatch?.[1]) {
    const fenced = tryParseAgentJSON(fenceMatch[1].trim());
    if (fenced) return fenced;
  }

  // 3. Balanced-brace extraction (handles missing closing fence, preamble text)
  const start = text.indexOf("{");
  if (start !== -1) {
    let depth = 0, inStr = false, esc = false;
    for (let i = start; i < text.length; i++) {
      const c = text[i];
      if (esc) { esc = false; continue; }
      if (c === "\\" && inStr) { esc = true; continue; }
      if (c === '"') { inStr = !inStr; continue; }
      if (!inStr) {
        if (c === "{") depth++;
        else if (c === "}") {
          depth--;
          if (depth === 0) {
            const extracted = tryParseAgentJSON(text.slice(start, i + 1));
            if (extracted) return extracted;
            break;
          }
        }
      }
    }
  }

  // 4. Regex fallback — extract analysis field directly.
  //    Two variants: closed string (normal) and open-ended (truncated response, no closing ").
  const aMatchClosed = text.match(/"analysis"\s*:\s*"((?:[^"\\]|\\[\s\S])*)"/);
  if (aMatchClosed) return { analysis: aMatchClosed[1].replace(/\\n/g, "\n").replace(/\\t/g, "\t") };
  const aMatchOpen = text.match(/"analysis"\s*:\s*"((?:[^"\\]|\\[\s\S])*)/);
  if (aMatchOpen?.[1]) return { analysis: aMatchOpen[1].replace(/\\n/g, "\n").replace(/\\t/g, "\t") + " [truncated]" };

  return { analysis: text };
}

export default async function SessionsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");
  const userId = session.user.id;

  const [sessions, activities] = await withRLS(userId, (db) => Promise.all([
    db.session.findMany({
      where: { userId },
      orderBy: { date: "desc" },
      include: {
        exercises: true,
        cardioActivities: true,
        recommendations: { orderBy: { createdAt: "desc" }, take: 1 },
        agentLogs: {
          where: { agentName: { in: AGENT_NAMES } },
          orderBy: { createdAt: "desc" },
          select: { id: true, agentName: true, response: true, createdAt: true },
        },
      },
    }),
    db.activity.findMany({
      where: { userId },
      orderBy: { date: "desc" },
      select: { id: true, type: true, date: true, durationMin: true, distanceMi: true, avgHR: true, calories: true, notes: true },
    }),
  ]));

  const serialized = sessions.map((s) => {
    const seenAgents = new Set<string>();
    const latestAgentLogs = s.agentLogs.filter((log) => {
      if (seenAgents.has(log.agentName)) return false;
      seenAgents.add(log.agentName);
      return true;
    });

    return {
      id: s.id,
      date: s.date.toISOString(),
      cycleDay: s.cycleDay,
      cycleNumber: s.cycleNumber,
      durationMinutes: s.durationMinutes,
      avgHeartRate: s.avgHeartRate,
      activeZoneMinutes: s.activeZoneMinutes,
      cardioLoad: s.cardioLoad,
      rating: s.rating,
      notes: s.notes,
      exercises: s.exercises.map((ex) => ({
        id: ex.id,
        name: ex.name,
        sets: ex.sets,
        reps: ex.reps,
        weights: ex.weights,
        weightLbs: ex.weightLbs,
      })),
      cardioActivities: s.cardioActivities.map((c) => ({
        id: c.id,
        tag: c.tag,
        machine: c.machine,
        durationMin: c.durationMin,
        distanceMi: c.distanceMi,
        calories: c.calories,
        avgHR: c.avgHR,
        maxHR: c.maxHR,
      })),
      recommendation: s.recommendations[0]
        ? {
            content: s.recommendations[0].content,
            nextActions: s.recommendations[0].nextActions as string[],
          }
        : null,
      agentLogs: latestAgentLogs.map((log) => {
        const parsed = parseAgentResponseServer(log.response);
        return {
          id: log.id,
          agentName: log.agentName,
          analysis: typeof parsed.analysis === "string" ? parsed.analysis : undefined,
          recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations as string[] : [],
          flags: Array.isArray(parsed.flags) ? parsed.flags as string[] : [],
        };
      }),
    };
  });

  const serializedActivities = activities.map((a) => ({ ...a, date: a.date.toISOString() }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">History</h1>
      <HistoryTabs sessions={serialized} activities={serializedActivities} />
    </div>
  );
}
