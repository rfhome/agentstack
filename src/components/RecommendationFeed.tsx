type Recommendation = {
  id: number;
  content: string;
  nextActions: unknown;
  createdAt: string | Date;
  session?: { cycleDay: number | null; rating: string | null } | null;
};

const CYCLE_LABELS: Record<number, string> = { 1: "Push", 2: "Pull", 3: "Legs", 4: "Arms" };

export function RecommendationFeed({ recommendations }: { recommendations: Recommendation[] }) {
  if (recommendations.length === 0) {
    return <p className="text-zinc-500 text-sm">No recommendations yet. Log a session to get started.</p>;
  }

  const latest = recommendations[0];
  const rest = recommendations.slice(1);

  return (
    <div className="space-y-4">
      {/* Hero: latest recommendation */}
      <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-5 space-y-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-white" />
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-200">Nexus</span>
          <span className="text-xs text-zinc-500">
            {new Date(latest.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            {latest.session?.cycleDay ? ` · ${CYCLE_LABELS[latest.session.cycleDay]}` : ""}
          </span>
        </div>
        <p className="text-zinc-200 leading-relaxed">{latest.content}</p>
        {Array.isArray(latest.nextActions) && latest.nextActions.length > 0 && (
          <ol className="space-y-2">
            {(latest.nextActions as string[]).map((action, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="shrink-0 w-5 h-5 rounded-full bg-zinc-800 text-zinc-400 text-xs flex items-center justify-center font-medium">
                  {i + 1}
                </span>
                <span className="text-zinc-300">{action}</span>
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* Older recommendations */}
      {rest.map((rec) => (
        <div key={rec.id} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500">
              {new Date(rec.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              {rec.session?.cycleDay ? ` · ${CYCLE_LABELS[rec.session.cycleDay]}` : ""}
            </span>
          </div>
          <p className="text-sm text-zinc-400 line-clamp-3">{rec.content}</p>
        </div>
      ))}
    </div>
  );
}
