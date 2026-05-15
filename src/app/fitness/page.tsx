import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { SessionCard } from "@/components/SessionCard";
import { RecommendationFeed } from "@/components/RecommendationFeed";
import { GoalTracker } from "@/components/GoalTracker";

export default async function FitnessPage() {
  const [sessions, recommendations, goals] = await Promise.all([
    prisma.session.findMany({
      take: 10,
      orderBy: { date: "desc" },
      include: { exercises: true },
    }),
    prisma.recommendation.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { session: { select: { cycleDay: true, rating: true } } },
    }),
    prisma.goal.findMany({ where: { achieved: false } }),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Fitness</h1>
        <Link
          href="/fitness/log"
          className="rounded-lg bg-white text-zinc-950 px-4 py-2 text-sm font-semibold hover:bg-zinc-200 transition-colors"
        >
          Log Session
        </Link>
      </div>

      <section>
        <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-3">Recommendations</h2>
        <RecommendationFeed recommendations={recommendations} />
      </section>

      <section>
        <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-3">Goals</h2>
        <GoalTracker goals={goals} />
      </section>

      <section>
        <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-3">Session History</h2>
        {sessions.length === 0 ? (
          <p className="text-zinc-500 text-sm">No sessions yet.</p>
        ) : (
          <div className="space-y-3">
            {sessions.map((s) => (
              <SessionCard
                key={s.id}
                session={{ ...s, date: s.date.toISOString() }}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
