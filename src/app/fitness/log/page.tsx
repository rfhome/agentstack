"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AgentPanel } from "@/components/AgentPanel";

type Exercise = { name: string; sets: string; reps: string; weights: string; notes: string };
type CheckItem = { label: string; done: boolean };
type AgentResponse = {
  agentName: string; analysis: string; recommendations: string[];
  flags: string[]; nextSession: string; latencyMs: number;
};
type AnalysisResult = {
  recommendation: { content: string; nextActions: string[] };
  agentResponses: AgentResponse[];
};
type Prescription = {
  cycleLabel: string;
  focusStatement: string;
  warmup: { name: string; detail: string }[];
  exercises: { name: string; sets: number; reps: string; weights: string; focus: string }[];
  finisher?: { label: string; items: string[] };
  cardio?: { label: string; options: string[]; note: string };
  todaysGoal: string;
};

const ANALYZING_STEPS = ["Pulse analyzing...", "Forge reviewing...", "Nexus synthesizing..."];

function emptyExercise(): Exercise {
  return { name: "", sets: "", reps: "", weights: "", notes: "" };
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
  const [warmupItems, setWarmupItems] = useState<CheckItem[]>([]);
  const [finisherItems, setFinisherItems] = useState<CheckItem[]>([]);

  const [loadingWorkout, setLoadingWorkout] = useState(false);
  const [prescription, setPrescription] = useState<Prescription | null>(null);
  const [step, setStep] = useState<"idle" | "saving" | "analyzing" | "done">("idle");
  const [analyzeStep, setAnalyzeStep] = useState(0);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState("");

  function updateExercise(i: number, field: keyof Exercise, value: string) {
    setExercises((prev) => prev.map((ex, idx) => (idx === i ? { ...ex, [field]: value } : ex)));
  }

  function deleteExercise(i: number) {
    setExercises((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleGetWorkout() {
    setLoadingWorkout(true);
    setPrescription(null);
    try {
      const res = await fetch(`/api/prescribe?cycleDay=${cycleDay}`);
      const data: Prescription = await res.json();
      if (data.exercises?.length) {
        setExercises(
          data.exercises.map((e) => ({
            name: e.name ?? "",
            sets: e.sets ? String(e.sets) : "",
            reps: e.reps ?? "",
            weights: e.weights ?? "",
            notes: e.focus ?? "",
          }))
        );
      }
      if (data.warmup?.length) {
        setWarmupItems(data.warmup.map((w) => ({ label: `${w.name} — ${w.detail}`, done: false })));
      }
      if (data.finisher?.items?.length) {
        setFinisherItems(data.finisher.items.map((item) => ({ label: item, done: false })));
      }
      setPrescription(data);
    } catch {
      // silent — user can fill in manually
    } finally {
      setLoadingWorkout(false);
    }
  }

  async function saveSession(): Promise<number> {
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
            weights: ex.weights || undefined,
            notes: ex.notes || undefined,
          })),
      }),
    });
    if (!sessionRes.ok) throw new Error("Failed to save session");
    const { sessionId } = await sessionRes.json();
    return sessionId as number;
  }

  async function handleSaveOnly() {
    setError("");
    setStep("saving");
    try {
      await saveSession();
      router.push("/fitness");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStep("idle");
    }
  }

  async function handleSaveAndAnalyze() {
    setError("");
    setStep("saving");
    try {
      const sessionId = await saveSession();
      setStep("analyzing");

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

      <div className="space-y-6">
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

        {/* Prescription panel */}
        {prescription && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-3 text-sm">
            <div>
              <p className="text-xs font-medium text-amber-400 uppercase tracking-wide mb-1">{prescription.cycleLabel} Day</p>
              <p className="text-zinc-300 leading-relaxed">{prescription.focusStatement}</p>
            </div>
            {prescription.todaysGoal && (
              <p className="text-xs text-zinc-400 italic border-t border-zinc-800 pt-3">{prescription.todaysGoal}</p>
            )}
          </div>
        )}

        {/* Warmup checklist */}
        {warmupItems.length > 0 && (
          <div>
            <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">Warm-up</h2>
            <div className="space-y-1.5">
              {warmupItems.map((item, i) => (
                <label key={i} className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={item.done}
                    onChange={() => setWarmupItems((prev) => prev.map((w, idx) => idx === i ? { ...w, done: !w.done } : w))}
                    className="mt-0.5 accent-emerald-500 shrink-0"
                  />
                  <span className={`text-sm transition-colors ${item.done ? "line-through text-zinc-600" : "text-zinc-300"}`}>
                    {item.label}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Exercises */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Exercises</h2>
            <button type="button" onClick={handleGetWorkout} disabled={loadingWorkout}
              className="flex items-center gap-1.5 rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:text-white hover:border-zinc-500 transition-colors disabled:opacity-50">
              {loadingWorkout ? (
                <><span className="w-3 h-3 border border-zinc-500 border-t-white rounded-full animate-spin" /> Loading...</>
              ) : (
                <><span>⚡</span> Get Workout</>
              )}
            </button>
          </div>
          <div className="space-y-2">
            {exercises.map((ex, i) => (
              <div key={i} className="rounded-lg border border-zinc-800 bg-zinc-900 p-3 space-y-2">
                <div className="flex gap-2 items-center">
                  <div className="relative flex-1">
                    <input
                      value={ex.name}
                      onChange={(e) => updateExercise(i, "name", e.target.value)}
                      placeholder="Exercise name"
                      className="w-full rounded bg-zinc-800 border border-zinc-700 px-2 py-1.5 pr-7 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
                    />
                    {ex.name && (
                      <button
                        type="button"
                        onClick={() => updateExercise(i, "name", "")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 text-xs leading-none"
                        tabIndex={-1}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteExercise(i)}
                    className="text-zinc-700 hover:text-red-500 transition-colors px-1 shrink-0"
                    title="Remove exercise"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                      <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <input value={ex.sets} onChange={(e) => updateExercise(i, "sets", e.target.value)}
                    placeholder="Sets" type="number" min="1"
                    className="rounded bg-zinc-800 border border-zinc-700 px-2 py-1.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500" />
                  <input value={ex.reps} onChange={(e) => updateExercise(i, "reps", e.target.value)}
                    placeholder="8,8,8,6"
                    className="rounded bg-zinc-800 border border-zinc-700 px-2 py-1.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500" />
                  <input value={ex.weights} onChange={(e) => updateExercise(i, "weights", e.target.value)}
                    placeholder="45,45,50"
                    className="rounded bg-zinc-800 border border-zinc-700 px-2 py-1.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500" />
                </div>
                {ex.notes && (
                  <p className="text-xs text-zinc-500 italic px-0.5">{ex.notes}</p>
                )}
              </div>
            ))}
          </div>
          <button type="button" onClick={() => setExercises((prev) => [...prev, emptyExercise()])}
            className="mt-2 w-full rounded-lg border border-dashed border-zinc-700 py-2 text-sm text-zinc-500 hover:text-zinc-300 hover:border-zinc-500 transition-colors">
            + Add Exercise
          </button>
        </div>

        {/* Finisher checklist */}
        {finisherItems.length > 0 && (
          <div>
            <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">
              {prescription?.finisher?.label ?? "Finisher"}
            </h2>
            <div className="space-y-1.5">
              {finisherItems.map((item, i) => (
                <label key={i} className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={item.done}
                    onChange={() => setFinisherItems((prev) => prev.map((f, idx) => idx === i ? { ...f, done: !f.done } : f))}
                    className="mt-0.5 accent-amber-500 shrink-0"
                  />
                  <span className={`text-sm transition-colors ${item.done ? "line-through text-zinc-600" : "text-zinc-300"}`}>
                    {item.label}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Cardio options */}
        {prescription?.cardio && (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3 space-y-1 text-sm">
            <p className="text-xs text-zinc-500 uppercase tracking-wide mb-2">{prescription.cardio.label}</p>
            <ul className="space-y-1">
              {prescription.cardio.options.map((opt, i) => (
                <li key={i} className="text-zinc-400 flex gap-2">
                  <span className="text-zinc-600 shrink-0">·</span>{opt}
                </li>
              ))}
            </ul>
            {prescription.cardio.note && (
              <p className="text-xs text-zinc-500 italic mt-1">{prescription.cardio.note}</p>
            )}
          </div>
        )}

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleSaveOnly}
            className="flex-1 rounded-lg bg-zinc-800 border border-zinc-700 text-white px-4 py-3 text-sm font-semibold hover:bg-zinc-700 transition-colors"
          >
            Save Session
          </button>
          <button
            type="button"
            onClick={handleSaveAndAnalyze}
            className="flex-1 rounded-lg bg-white text-zinc-950 px-4 py-3 text-sm font-semibold hover:bg-zinc-200 transition-colors"
          >
            Save & Analyze
          </button>
        </div>
      </div>
    </div>
  );
}
