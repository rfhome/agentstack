type Goal = {
  id: number;
  exercise: string;
  targetWeightLbs: number | null;
  targetReps: string | null;
  achieved: boolean;
};

export function GoalTracker({ goals }: { goals: Goal[] }) {
  const active = goals.filter((g) => !g.achieved);

  if (active.length === 0) {
    return <p className="text-zinc-500 text-sm">No active goals. Add goals to track progress.</p>;
  }

  return (
    <div className="space-y-2">
      {active.map((goal) => (
        <div key={goal.id} className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3">
          <span className="text-sm text-zinc-200">{goal.exercise}</span>
          <span className="text-sm text-zinc-400 tabular-nums">
            {goal.targetWeightLbs ? `${goal.targetWeightLbs}lbs` : ""}
            {goal.targetReps ? ` × ${goal.targetReps}` : ""}
          </span>
        </div>
      ))}
    </div>
  );
}
