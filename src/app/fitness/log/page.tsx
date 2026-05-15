"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AgentPanel } from "@/components/AgentPanel";

type Exercise = { name: string; sets: string; reps: string; weightLbs: string };
type AgentResponse = {
  agentName: string; analysis: string; recommendations: string[];
  flags: string[]; nextSession: string; latencyMs: number;
};
type AnalysisResult = {
  recommendation: { content: string; nextActions: string[] };
  agentResponses: AgentResponse[];
};

const ANALYZING_STEPS = ["Pulse analyzing...", "Forge reviewing...", "Nexus synthesizing..."];

function emptyExercise(): Exercise {
  return { name: "", sets: "", reps: "", weightLbs: "" };
}

export default function LogSessionPage() {
  const router = useRouter();

  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [cycleDay, setCycleDay] = useState("1");
  const [cycleNumber, setCycleNumber] = useState("");
  const [duration, setDuration] = useState("");
  const [avgHR, setAvgHR] = useState("");
  const [cardioLoad, setCardioLoad] = useState("");
  const [azm, setAzm] = useState("");
  const [rating, setRating] = useState("");
  const [notes, setNotes] = useState("");
  const [exercises, setExercises] = useState<Exercise[]>([emptyExercise()]);

  const [step, setStep] = useState<"idle" | "saving" | "analyzing" | "done">("idle");
  const [analyzeStep, setAnalyzeStep] = useState(0);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState("");

  function updateExercise(i: number, field: keyof Exercise, value: string) {
    setExercises((prev) => prev.map((ex, idx) => (idx === i ? { ...ex, [field]: value } : ex)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setStep("saving");

    try {
      const sessionRes = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session: {
            date,
            cycleDay: cycleDay ? parseInt(cycleDay) : undefined,
            cycleNumber: cycleNumber ? parseInt(cycleNumber) : undefined,
            durationMinutes: duration ? parseInt(duration) : undefined,
            avgHeartRate: avgHR ? parseInt(avgHR) : undefined,
            cardioLoad: cardioLoad ? parseInt(cardioLoad) : undefined,
            activeZoneMinutes: azm ? parseInt(azm) : undefined,
            rating: rating || undefined,
            notes: notes || undefined,
          },
          exercises: exercises
            .filter((ex) => ex.name.trim())
            .map((ex) => ({
              name: ex.name.trim(),
              sets: ex.sets ? parseInt(ex.sets) : undefined,
              reps: ex.reps || undefined,
              weightLbs: ex.weightLbs ? parseFloat(ex.weightLbs) : undefined,
            })),
        }),
      });

      const { sessionId } = await sessionRes.json();
      setStep("analyzing");

      // Cycle through agent status messages while waiting
      const interval = setInterval(() => {
        setAnalyzeStep((s) => (s + 1) % ANALYZING_STEPS.length);
      }, 3000);

      const analyzeRes = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });

      clearInterval(interval);
      const data = await analyzeRes.json();

      if (!analyzeRes.ok) throw new Error(data.error ?? "Analysis failed");

      setResult(data);
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStep("idle");
    }
  }

  if (step === "done" && result) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Analysis Complete</h1>
          <p className="text-sm text-zinc-500">Nexus has reviewed your session.</p>
        </div>

        {/* Nexus synthesis */}
        <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-white" />
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-200">Nexus</span>
          </div>
          <p className="text-zinc-200 leading-relaxed">{result.recommendation.content}</p>
          {result.recommendation.nextActions.length > 0 && (
            <ol className="space-y-2">
              {result.recommendation.nextActions.map((action, i) => (
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

        {/* Agent breakdown */}
        <div>
          <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">Agent Breakdown</h2>
          <AgentPanel agents={result.agentResponses} />
        </div>

        <button
          onClick={() => router.push("/fitness")}
          className="w-full rounded-lg bg-zinc-800 text-white px-4 py-3 text-sm font-semibold hover:bg-zinc-700 transition-colors"
        >
          Back to Fitness
        </button>
      </div>
    );
  }

  if (step === "analyzing" || step === "saving") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-8 h-8 border-2 border-zinc-600 border-t-white rounded-full animate-spin" />
        <p className="text-zinc-400 text-sm">
          {step === "saving" ? "Saving session..." : ANALYZING_STEPS[analyzeStep]}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Log Session</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Session metadata */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-600" />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Cycle Day</label>
              <select value={cycleDay} onChange={(e) => setCycleDay(e.target.value)}
                className="w-full rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-600">
                <option value="1">1 — Push</option>
                <option value="2">2 — Pull</option>
                <option value="3">3 — Legs</option>
                <option value="4">4 — Arms</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Cycle #</label>
              <input type="number" value={cycleNumber} onChange={(e) => setCycleNumber(e.target.value)}
                placeholder="e.g. 3" min="1"
                className="w-full rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600" />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Duration (min)</label>
              <input type="number" value={duration} onChange={(e) => setDuration(e.target.value)}
                placeholder="e.g. 55" min="1"
                className="w-full rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Avg HR</label>
              <input type="number" value={avgHR} onChange={(e) => setAvgHR(e.target.value)}
                placeholder="142"
                className="w-full rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600" />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Cardio Load</label>
              <input type="number" value={cardioLoad} onChange={(e) => setCardioLoad(e.target.value)}
                placeholder="87"
                className="w-full rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600" />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">AZM</label>
              <input type="number" value={azm} onChange={(e) => setAzm(e.target.value)}
                placeholder="34"
                className="w-full rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600" />
            </div>
          </div>

          <div>
            <label className="block text-xs text-zinc-500 mb-1">Rating</label>
            <div className="flex gap-2">
              {["A", "B", "C"].map((r) => (
                <button key={r} type="button" onClick={() => setRating(rating === r ? "" : r)}
                  className={`w-10 h-10 rounded-lg text-sm font-bold transition-colors ${
                    rating === r
                      ? r === "A" ? "bg-emerald-500 text-white" : r === "B" ? "bg-amber-500 text-white" : "bg-red-500 text-white"
                      : "bg-zinc-900 border border-zinc-800 text-zinc-400"
                  }`}>
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs text-zinc-500 mb-1">Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="How did it feel? Anything to flag?"
              rows={2}
              className="w-full rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600 resize-none" />
          </div>
        </div>

        {/* Exercises */}
        <div>
          <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-3">Exercises</h2>
          <div className="space-y-2">
            {exercises.map((ex, i) => (
              <div key={i} className="rounded-lg border border-zinc-800 bg-zinc-900 p-3 space-y-2">
                <div className="flex gap-2">
                  <input value={ex.name} onChange={(e) => updateExercise(i, "name", e.target.value)}
                    placeholder="Exercise name"
                    className="flex-1 rounded bg-zinc-800 border border-zinc-700 px-2 py-1.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500" />
                  {exercises.length > 1 && (
                    <button type="button" onClick={() => setExercises((prev) => prev.filter((_, idx) => idx !== i))}
                      className="text-zinc-600 hover:text-zinc-400 px-2">✕</button>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <input value={ex.sets} onChange={(e) => updateExercise(i, "sets", e.target.value)}
                    placeholder="Sets" type="number" min="1"
                    className="rounded bg-zinc-800 border border-zinc-700 px-2 py-1.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500" />
                  <input value={ex.reps} onChange={(e) => updateExercise(i, "reps", e.target.value)}
                    placeholder="Reps e.g. 8,8,6"
                    className="rounded bg-zinc-800 border border-zinc-700 px-2 py-1.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500" />
                  <input value={ex.weightLbs} onChange={(e) => updateExercise(i, "weightLbs", e.target.value)}
                    placeholder="lbs" type="number" min="0" step="2.5"
                    className="rounded bg-zinc-800 border border-zinc-700 px-2 py-1.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500" />
                </div>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => setExercises((prev) => [...prev, emptyExercise()])}
            className="mt-2 w-full rounded-lg border border-dashed border-zinc-700 py-2 text-sm text-zinc-500 hover:text-zinc-300 hover:border-zinc-500 transition-colors">
            + Add Exercise
          </button>
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button type="submit"
          className="w-full rounded-lg bg-white text-zinc-950 px-4 py-3 font-semibold hover:bg-zinc-200 transition-colors">
          Save & Analyze
        </button>
      </form>
    </div>
  );
}
