export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { withRLS } from "@/lib/prisma-rls";
import { SessionHistoryCard } from "@/components/SessionHistoryCard";

const AGENT_NAMES = ["Pulse", "Forge", "Lens"];

export default async function SessionsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");
  const userId = session.user.id;

  const sessions = await withRLS(userId, (db) => db.session.findMany({
    where: { userId },
    orderBy: { date: "desc" },
    include: {
      exercises: true,
      cardioActivities: true,
      recommendations: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      agentLogs: {
        where: { agentName: { in: AGENT_NAMES } },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          agentName: true,
          response: true,
          createdAt: true,
        },
      },
    },
  }));

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
      agentLogs: latestAgentLogs.map((log) => ({
        id: log.id,
        agentName: log.agentName,
        response: log.response,
      })),
    };
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Session History</h1>

      {serialized.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center">
          <p className="text-zinc-400 text-sm">No sessions logged yet.</p>
          <p className="text-zinc-600 text-xs mt-1">Head to Fitness and log your first session.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {serialized.map((s) => (
            <SessionHistoryCard key={s.id} session={s} />
          ))}
        </div>
      )}
    </div>
  );
}
