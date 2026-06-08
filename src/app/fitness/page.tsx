export const dynamic = "force-dynamic";

import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { withRLS } from "@/lib/prisma-rls";
import { SessionCard } from "@/components/SessionCard";
import { RecommendationFeed } from "@/components/RecommendationFeed";
import { GoalManager } from "@/components/GoalManager";
import { WeeklySummary } from "@/components/WeeklySummary";
import { StreaksCard } from "@/components/StreaksCard";
import { ActivityDashboardSection } from "@/components/ActivityDashboardSection";

export default async function FitnessPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");
  const userId = session.user.id;

  const [sessions, recommendations, goals, profile] = await withRLS(userId, (db) =>
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
      Promise.resolve([]), // goals now fetched client-side by GoalManager
      db.userProfile.findFirst({ where: { userId } }),
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

      {!profile?.onboardingComplete && (
        <div className="rounded-xl border border-violet-800 bg-violet-900/20 p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-violet-300">Build your training profile</p>
            <p className="text-xs text-zinc-400 mt-0.5">Answer 9 quick questions so your agents know your goals, program, and equipment.</p>
          </div>
          <Link href="/onboarding" className="shrink-0 ml-4 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm px-4 py-2 font-medium transition-colors">
            Get started →
          </Link>
        </div>
      )}

      <section>
        <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-3">Your Stats</h2>
        <Suspense fallback={null}>
          <StreaksCard />
        </Suspense>
      </section>

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
        <GoalManager />
      </section>

      <ActivityDashboardSection />

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
