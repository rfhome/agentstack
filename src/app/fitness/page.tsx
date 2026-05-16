export const dynamic = "force-dynamic";

import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { withRLS } from "@/lib/prisma-rls";
import { SessionCard } from "@/components/SessionCard";
import { RecommendationFeed } from "@/components/RecommendationFeed";
import { GoalTracker } from "@/components/GoalTracker";
import { WeeklySummary } from "@/components/WeeklySummary";

export default async function FitnessPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");
  const userId = session.user.id;

  const [sessions, recommendations, goals] = await withRLS(userId, (db) =>
    Promise.all([
      db.session.findMany({
        where: { userId },
        take: 10,
        orderBy: { date: "desc" },
        include: {
          exercises: true,
          recommendations: { select: { id: true }, take: 1 },
        },
      }),
      db.recommendation.findMany({
        where: { userId },
        take: 5,
        orderBy: { createdAt: "desc" },
        include: { session: { select: { cycleDay: true, rating: true } } },
      }),
      db.goal.findMany({ where: { userId, achieved: false } }),
    ])
  );

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
        <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-3">This Week</h2>
        <Suspense fallback={null}>
          <WeeklySummary />
        </Suspense>
      </section>

      <section>
        <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-3">Recommendations</h2>
        <RecommendationFeed recommendations={recommendations} />
      </section>

      <section>
        <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-3">Goals</h2>
        <GoalTracker goals={goals} />
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Recent Sessions</h2>
          <div className="flex items-center gap-4">
            <Link href="/fitness/progress" className="text-xs text-zinc-400 hover:text-white transition-colors">
              Progress →
            </Link>
            <Link href="/fitness/sessions" className="text-xs text-zinc-400 hover:text-white transition-colors">
              View all →
            </Link>
          </div>
        </div>
        {sessions.length === 0 ? (
          <p className="text-zinc-500 text-sm">No sessions yet.</p>
        ) : (
          <div className="space-y-3">
            {sessions.map((s) => (
              <SessionCard
                key={s.id}
                session={{ ...s, date: s.date.toISOString(), analyzed: s.recommendations.length > 0 }}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
