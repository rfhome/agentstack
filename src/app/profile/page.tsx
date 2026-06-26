"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

// ---------------------------------------------------------------------------
// Lightweight markdown renderer — handles the patterns the training context
// actually uses: h1/h2/h3, bold, bullet lists, horizontal rules, paragraphs.
// ---------------------------------------------------------------------------
function renderInline(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith("**") && part.endsWith("**")
      ? <strong key={i} className="text-white font-semibold">{part.slice(2, -2)}</strong>
      : <span key={i}>{part}</span>
  );
}

function MarkdownView({ text }: { text: string }) {
  if (!text.trim()) {
    return (
      <p className="text-zinc-500 italic text-sm">
        No training context yet. Click Edit to add your program, goals, and health history.
      </p>
    );
  }

  const lines = text.split("\n");
  const nodes: React.ReactNode[] = [];
  let listItems: string[] = [];
  let i = 0;

  function flushList() {
    if (listItems.length === 0) return;
    nodes.push(
      <ul key={`ul-${nodes.length}`} className="space-y-1 pl-4 list-none">
        {listItems.map((item, j) => (
          <li key={j} className="flex gap-2 text-sm text-zinc-300">
            <span className="text-zinc-600 shrink-0 mt-0.5">–</span>
            <span>{renderInline(item)}</span>
          </li>
        ))}
      </ul>
    );
    listItems = [];
  }

  while (i < lines.length) {
    const line = lines[i];

    if (/^#{1,3}\s/.test(line)) {
      flushList();
      const level = line.match(/^(#+)/)?.[1].length ?? 1;
      const content = line.replace(/^#+\s*/, "");
      if (level === 1) {
        nodes.push(<h2 key={i} className="text-base font-bold text-white mt-5 mb-1">{renderInline(content)}</h2>);
      } else if (level === 2) {
        nodes.push(<h3 key={i} className="text-sm font-semibold text-zinc-200 mt-4 mb-0.5">{renderInline(content)}</h3>);
      } else {
        nodes.push(<h4 key={i} className="text-sm font-medium text-zinc-300 mt-3">{renderInline(content)}</h4>);
      }
    } else if (/^[-*]\s/.test(line)) {
      listItems.push(line.replace(/^[-*]\s/, ""));
    } else if (/^---+$|^___+$/.test(line.trim())) {
      flushList();
      nodes.push(<hr key={i} className="border-zinc-800 my-3" />);
    } else if (line.trim() === "") {
      flushList();
    } else {
      flushList();
      nodes.push(
        <p key={i} className="text-sm text-zinc-300 leading-relaxed">
          {renderInline(line)}
        </p>
      );
    }

    i++;
  }

  flushList();
  return <div className="space-y-1.5">{nodes}</div>;
}

type Goal = {
  id: number;
  exercise: string;
  targetWeightLbs: number | null;
  targetReps: string | null;
  achieved: boolean;
  achievedAt: string | null;
};

export default function ProfilePage() {
  const [name, setName] = useState("");
  const [context, setContext] = useState("");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const [goals, setGoals] = useState<Goal[]>([]);
  const [addingGoal, setAddingGoal] = useState(false);
  const [newExercise, setNewExercise] = useState("");
  const [newWeight, setNewWeight] = useState("");
  const [newReps, setNewReps] = useState("");

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((data) => {
        setName(data.name ?? "");
        setContext(data.context ?? "");
        setDraft(data.context ?? "");
        if (!data.context) setEditing(true);
      });
    fetch("/api/goals")
      .then((r) => r.json())
      .then((data: Goal[]) => setGoals(data));
  }, []);

  async function handleAddGoal() {
    if (!newExercise.trim()) return;
    const res = await fetch("/api/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        exercise: newExercise.trim(),
        targetWeightLbs: newWeight ? parseFloat(newWeight) : null,
        targetReps: newReps.trim() || null,
      }),
    });
    if (res.ok) {
      const goal = await res.json() as Goal;
      setGoals((g) => [goal, ...g]);
      setNewExercise("");
      setNewWeight("");
      setNewReps("");
      setAddingGoal(false);
    }
  }

  async function handleMarkAchieved(id: number) {
    const res = await fetch(`/api/goals/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ achieved: true }),
    });
    if (res.ok) {
      setGoals((g) =>
        g.map((goal) =>
          goal.id === id ? { ...goal, achieved: true, achievedAt: new Date().toISOString() } : goal
        )
      );
    }
  }

  async function handleDeleteGoal(id: number) {
    const res = await fetch(`/api/goals/${id}`, { method: "DELETE" });
    if (res.ok) setGoals((g) => g.filter((goal) => goal.id !== id));
  }

  function handleEdit() {
    setDraft(context);
    setEditing(true);
    setStatus("idle");
  }

  function handleCancel() {
    setDraft(context);
    setEditing(false);
    setStatus("idle");
  }

  async function handleSave() {
    setStatus("saving");
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, context: draft }),
      });
      if (!res.ok) throw new Error("Save failed");
      setContext(draft);
      setEditing(false);
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 2000);
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-white">Profile</h1>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-zinc-300" htmlFor="name">
            Name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-600 text-sm"
            placeholder="Your name"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-300">Coaching profile</p>
              <p className="text-xs text-zinc-500 mt-0.5">
                What the agents read to understand your program, goals, and health history.
              </p>
            </div>
            {!editing && (
              <button
                onClick={handleEdit}
                className="text-xs px-3 py-1.5 rounded-lg border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 transition-colors shrink-0"
              >
                Edit
              </button>
            )}
          </div>

          {editing ? (
            <textarea
              id="context"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-600 text-sm font-mono resize-none overflow-y-auto"
              style={{ height: "600px" }}
              placeholder="Describe your training program, goals, and health history..."
              autoFocus
            />
          ) : (
            <div className="rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-4 min-h-[8rem] max-h-[600px] overflow-y-auto">
              <MarkdownView text={context} />
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {editing ? (
            <>
              <button
                onClick={handleSave}
                disabled={status === "saving"}
                className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {status === "saving" ? "Saving..." : "Save"}
              </button>
              {context && (
                <button
                  onClick={handleCancel}
                  className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  Cancel
                </button>
              )}
            </>
          ) : (
            status === "saved" && (
              <p className="text-sm text-emerald-400">Saved</p>
            )
          )}
          {status === "error" && (
            <p className="text-sm text-red-400">Failed to save. Please try again.</p>
          )}
        </div>
      </div>

      {/* Goals */}
      <div className="border-t border-zinc-800 pt-6 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-zinc-300">Strength Goals</p>
            <p className="text-xs text-zinc-500 mt-0.5">Tracked automatically during analysis.</p>
          </div>
          {!addingGoal && (
            <button
              onClick={() => setAddingGoal(true)}
              className="text-xs px-3 py-1.5 rounded-lg border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 transition-colors"
            >
              + Add
            </button>
          )}
        </div>

        {/* Active goals */}
        {goals.filter((g) => !g.achieved).length === 0 && !addingGoal && (
          <p className="text-xs text-zinc-600 italic">No active goals. Add one or run an analysis to auto-generate.</p>
        )}
        {goals.filter((g) => !g.achieved).map((goal) => (
          <div key={goal.id} className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2.5 gap-3">
            <div className="min-w-0">
              <span className="text-sm text-white">{goal.exercise}</span>
              {(goal.targetWeightLbs || goal.targetReps) && (
                <span className="text-xs text-zinc-500 ml-2">
                  {goal.targetWeightLbs ? `${goal.targetWeightLbs}lbs` : ""}
                  {goal.targetWeightLbs && goal.targetReps ? " × " : ""}
                  {goal.targetReps ? `${goal.targetReps} reps` : ""}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => handleMarkAchieved(goal.id)}
                title="Mark achieved"
                className="text-xs text-zinc-600 hover:text-emerald-400 transition-colors"
              >
                ✓
              </button>
              <button
                onClick={() => handleDeleteGoal(goal.id)}
                title="Delete goal"
                className="text-xs text-zinc-600 hover:text-red-400 transition-colors"
              >
                ✕
              </button>
            </div>
          </div>
        ))}

        {/* Add goal form */}
        {addingGoal && (
          <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-3 space-y-2">
            <input
              type="text"
              value={newExercise}
              onChange={(e) => setNewExercise(e.target.value)}
              placeholder="Exercise name"
              autoFocus
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-600 text-sm"
            />
            <div className="flex gap-2">
              <input
                type="number"
                value={newWeight}
                onChange={(e) => setNewWeight(e.target.value)}
                placeholder="Target lbs"
                className="w-1/2 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-600 text-sm"
              />
              <input
                type="text"
                value={newReps}
                onChange={(e) => setNewReps(e.target.value)}
                placeholder="Reps (e.g. 10)"
                className="w-1/2 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-600 text-sm"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAddGoal}
                disabled={!newExercise.trim()}
                className="flex-1 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg px-3 py-2 text-sm font-medium transition-colors disabled:opacity-40"
              >
                Add Goal
              </button>
              <button
                onClick={() => { setAddingGoal(false); setNewExercise(""); setNewWeight(""); setNewReps(""); }}
                className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors px-2"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Recently achieved */}
        {goals.filter((g) => g.achieved).length > 0 && (
          <div className="space-y-1.5 pt-1">
            <p className="text-xs text-zinc-600 uppercase tracking-wide">Recently achieved</p>
            {goals.filter((g) => g.achieved).slice(0, 5).map((goal) => (
              <div key={goal.id} className="flex items-center justify-between text-xs text-zinc-600">
                <span className="line-through">
                  {goal.exercise}
                  {goal.targetWeightLbs ? ` — ${goal.targetWeightLbs}lbs` : ""}
                  {goal.targetReps ? ` × ${goal.targetReps}` : ""}
                </span>
                {goal.achievedAt && (
                  <span className="text-emerald-700 shrink-0 ml-2">
                    ✓ {new Date(goal.achievedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-zinc-800 pt-4">
        <Link
          href="/onboarding"
          className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          ↺ Redo setup wizard
        </Link>
      </div>
    </div>
  );
}
