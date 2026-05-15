import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { SessionCard } from "@/components/SessionCard";
import { RecommendationFeed } from "@/components/RecommendationFeed";

const CYCLE_LABELS: Record<number, string> = { 1: "Push", 2: "Pull", 3: "Legs", 4: "Arms" };

export default async function DashboardPage() {
  const [lastSession, latestRec, weekSessions] = await Promise.all([
    prisma.session.findFirst({
      orderBy: { date: "desc" },
      include: { exercises: true },
    }),
    prisma.recommendation.findFirst({
      orderBy: { createdAt: "desc" },
      include: { session: { select: { cycleDay: true, rating: true } } },
    }),
    prisma.session.findMany({
      where: { date: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
    }),
  ]);

  const nextCycleDay = lastSession?.cycleDay ? (lastSession.cycleDay % 4) + 1 : 1;
  const nextLabel = CYCLE_LABELS[nextCycleDay];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-sm text-zinc-500">
            {weekSessions.length} session{weekSessions.length !== 1 ? "s" : ""} this week
            {lastSession?.cycleDay ? ` · Next: ${nextLabel}` : ""}
          </p>
        </div>
        <Link
          href="/fitness/log"
          className="rounded-lg bg-white text-zinc-950 px-4 py-2 text-sm font-semibold hover:bg-zinc-200 transition-colors"
        >
          Log Session
        </Link>
      </div>

      {latestRec && (
        <section>
          <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">Latest Recommendation</h2>
          <RecommendationFeed recommendations={[latestRec]} />
        </section>
      )}

      {lastSession && (
        <section>
          <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">Last Session</h2>
          <SessionCard session={{ ...lastSession, date: lastSession.date.toISOString() }} />
        </section>
      )}

      {!lastSession && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center space-y-3">
          <p className="text-zinc-400">No sessions logged yet.</p>
          <Link href="/fitness/log" className="text-white underline text-sm">
            Log your first session
          </Link>
        </div>
      )}
    </div>
  );
}
