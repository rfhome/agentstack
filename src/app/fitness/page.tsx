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
import { CollapsibleSection } from "@/components/CollapsibleSection";
import { ActivityDashboardSection } from "@/components/ActivityDashboardSection";
import { LogActivityButton } from "@/components/LogActivityButton";

export default async function FitnessPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");
  const userId = session.user.id;

  const [sessions, recommendations, profile, recentActivities] = await withRLS(userId, (db) =>
    Promise.all([
      db.session.findMany({
        where: { userId },
        take: 4,
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
      db.userProfile.findFirst({ where: { userId } }),
      db.activity.findMany({
        where: { userId },
        orderBy: { date: "desc" },
        take: 4,
        select: { id: true, type: true, date: true, durationMin: true, distanceMi: true, avgHR: true, calories: true, notes: true },
      }),
    ])
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Fitness</h1>
        <div className="flex items-center gap-2">
          <LogActivityButton />
          <Link
            href="/fitness/log"
            className="rounded-lg bg-white text-zinc-950 px-4 py-2 text-sm font-semibold hover:bg-zinc-200 transition-colors"
          >
            Log Session
          </Link>
        </div>
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

      {/* Your Stats — always visible */}
      <section>
        <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-3">Your Stats</h2>
        <Suspense fallback={null}>
          <StreaksCard />
        </Suspense>
      </section>

      {/* This Week — collapsible */}
      <CollapsibleSection title="This Week">
        <Suspense fallback={null}>
          <WeeklySummary />
        </Suspense>
      </CollapsibleSection>

      {/* Recommendations — collapsible */}
      <CollapsibleSection title="Recommendations">
        <RecommendationFeed recommendations={recommendations} />
      </CollapsibleSection>

      {/* Goals — collapsible */}
      <CollapsibleSection title="Goals">
        <GoalManager />
      </CollapsibleSection>

      {/* Recent Activities — last 4, server-fetched */}
      <CollapsibleSection title="Recent Activities">
        <ActivityDashboardSection
          activities={recentActivities.map((a) => ({ ...a, date: a.date.toISOString() }))}
        />
      </CollapsibleSection>

      {/* Recent Sessions — last 4, collapsible */}
      <CollapsibleSection
        title="Recent Sessions"
        headerRight={
          <div className="flex items-center gap-4">
            <Link href="/fitness/progress" className="text-xs text-zinc-400 hover:text-white transition-colors">Progress →</Link>
            <Link href="/fitness/sessions" className="text-xs text-zinc-400 hover:text-white transition-colors">View all →</Link>
          </div>
        }
      >
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
      </CollapsibleSection>
    </div>
  );
}
