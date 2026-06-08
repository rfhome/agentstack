"use client";

import { useState, useEffect } from "react";

type Goal = {
  id: number;
  exercise: string;
  targetWeightLbs: number | null;
  targetReps: string | null;
  achieved: boolean;
};

function GoalRow({ goal, onAchieve, onDelete }: {
  goal: Goal;
  onAchieve: (id: number) => void;
  onDelete: (id: number) => void;
}) {
  const [deleting, setDeleting] = useState(false);

  return (
    <div className={`flex items-center justify-between rounded-lg border bg-zinc-900 px-4 py-3 transition-opacity ${
      goal.achieved ? "border-zinc-800 opacity-50" : "border-zinc-800"
    }`}>
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={() => onAchieve(goal.id)}
          disabled={goal.achieved}
          title={goal.achieved ? "Achieved" : "Mark as achieved"}
          className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
            goal.achieved
              ? "border-emerald-500 bg-emerald-500"
              : "border-zinc-600 hover:border-emerald-500"
          }`}
        >
          {goal.achieved && (
            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
              <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </button>
        <span className={`text-sm truncate ${goal.achieved ? "line-through text-zinc-500" : "text-zinc-200"}`}>
          {goal.exercise}
        </span>
      </div>
      <div className="flex items-center gap-3 shrink-0 ml-3">
        {(goal.targetWeightLbs || goal.targetReps) && (
          <span className="text-sm text-zinc-400 tabular-nums">
            {goal.targetWeightLbs ? `${goal.targetWeightLbs}lbs` : ""}
            {goal.targetWeightLbs && goal.targetReps ? " × " : ""}
            {goal.targetReps ?? ""}
          </span>
        )}
        <button
          onClick={() => { setDeleting(true); onDelete(goal.id); }}
          disabled={deleting}
          className="text-zinc-600 hover:text-zinc-400 transition-colors text-lg leading-none"
          title="Remove goal"
        >
          ×
        </button>
      </div>
    </div>
  );
}

export function GoalManager() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  // Add form state
  const [exercise, setExercise] = useState("");
  const [targetWeight, setTargetWeight] = useState("");
  const [targetReps, setTargetReps] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/goals")
      .then((r) => r.json())
      .then((data: Goal[]) => { setGoals(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function handleAdd() {
    if (!exercise.trim()) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exercise,
          targetWeightLbs: targetWeight ? parseFloat(targetWeight) : null,
          targetReps: targetReps || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setGoals((prev) => [data, ...prev]);
      setExercise("");
      setTargetWeight("");
      setTargetReps("");
      setAdding(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleAchieve(id: number) {
    setGoals((prev) => prev.map((g) => g.id === id ? { ...g, achieved: true } : g));
    await fetch(`/api/goals/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ achieved: true }),
    });
  }

  async function handleDelete(id: number) {
    setGoals((prev) => prev.filter((g) => g.id !== id));
    await fetch(`/api/goals/${id}`, { method: "DELETE" });
  }

  const active = goals.filter((g) => !g.achieved);
  const achieved = goals.filter((g) => g.achieved);

  if (loading) return <p className="text-zinc-500 text-sm">Loading goals...</p>;

  return (
    <div className="space-y-3">
      {active.length === 0 && !adding && (
        <p className="text-zinc-500 text-sm">No active goals yet.</p>
      )}

      {active.map((g) => (
        <GoalRow key={g.id} goal={g} onAchieve={handleAchieve} onDelete={handleDelete} />
      ))}

      {/* Achieved goals — collapsed unless there are any */}
      {achieved.length > 0 && (
        <div className="space-y-2">
          {achieved.map((g) => (
            <GoalRow key={g.id} goal={g} onAchieve={handleAchieve} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {/* Add goal form */}
      {adding ? (
        <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-3 space-y-2.5">
          <input
            type="text"
            value={exercise}
            onChange={(e) => setExercise(e.target.value)}
            placeholder="Exercise (e.g. Lat Pulldown)"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <div className="flex gap-2">
            <input
              type="number"
              value={targetWeight}
              onChange={(e) => setTargetWeight(e.target.value)}
              placeholder="Target lbs (optional)"
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
            />
            <input
              type="text"
              value={targetReps}
              onChange={(e) => setTargetReps(e.target.value)}
              placeholder="Target reps (optional)"
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex items-center gap-2 pt-0.5">
            <button
              onClick={handleAdd}
              disabled={!exercise.trim() || saving}
              className="rounded-lg bg-white text-zinc-950 px-4 py-1.5 text-sm font-semibold hover:bg-zinc-200 disabled:opacity-40 transition-colors"
            >
              {saving ? "Saving..." : "Add goal"}
            </button>
            <button
              onClick={() => { setAdding(false); setExercise(""); setTargetWeight(""); setTargetReps(""); setError(""); }}
              className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="w-full rounded-lg border border-dashed border-zinc-700 text-zinc-500 hover:text-zinc-300 hover:border-zinc-500 py-2.5 text-sm transition-colors"
        >
          + Add goal
        </button>
      )}
    </div>
  );
}
