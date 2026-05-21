"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AgentPanel } from "@/components/AgentPanel";

type Exercise = { name: string; sets: string; reps: string; weights: string; notes: string };
type CardioEntry = {
  tag: "warmup" | "finisher" | "standalone" | "";
  machine: "treadmill" | "bike" | "rower" | "elliptical" | "";
  durationMin: string;
  distanceMi: string;
  calories: string;
  avgHR: string;
  maxHR: string;
  analyzing: boolean;
  analyzed: boolean;
};
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
const DRAFT_KEY = "log-draft";

type Draft = {
  savedAt: string;
  date: string;
  cycleDay: string;
  cycleNumber: string;
  duration: string;
  avgHR: string;
  cardioLoad: string;
  azm: string;
  rating: string;
  notes: string;
  exercises: Exercise[];
  warmupItems: CheckItem[];
  finisherItems: CheckItem[];
  cardioEntries: CardioEntry[];
};

function emptyExercise(): Exercise {
  return { name: "", sets: "", reps: "", weights: "", notes: "" };
}

export default function LogSessionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

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
  const [cardioEntries, setCardioEntries] = useState<CardioEntry[]>([]);

  const [draft, setDraft] = useState<Draft | null>(null);
  const [showDraftBanner, setShowDraftBanner] = useState(false);

  const [savedSessionId, setSavedSessionId] = useState<number | null>(null);

  const [fillingFitbit, setFillingFitbit] = useState(false);
  const [loadingWorkout, setLoadingWorkout] = useState(false);
  const [prescription, setPrescription] = useState<Prescription | null>(null);
  const [images, setImages] = useState<{ data: string; mediaType: string; name: string }[]>([]);
  const [step, setStep] = useState<"idle" | "saving" | "analyzing" | "done" | "saved">("idle");
  const [analyzeStep, setAnalyzeStep] = useState(0);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState("");

  // Load existing session when opened via ?edit=ID
  useEffect(() => {
    const editId = searchParams.get("edit");
    if (!editId) return;
    const sessionId = parseInt(editId);
    if (isNaN(sessionId)) return;
    fetch(`/api/sessions/${sessionId}`)
      .then((r) => r.json())
      .then((s) => {
        setSavedSessionId(sessionId);
        setDate(s.date ? new Date(s.date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]);
        if (s.cycleDay != null) setCycleDay(String(s.cycleDay));
        if (s.cycleNumber != null) setCycleNumber(String(s.cycleNumber));
        if (s.durationMinutes != null) setDuration(String(s.durationMinutes));
        if (s.avgHeartRate != null) setAvgHR(String(s.avgHeartRate));
        if (s.cardioLoad != null) setCardioLoad(String(s.cardioLoad));
        if (s.activeZoneMinutes != null) setAzm(String(s.activeZoneMinutes));
        if (s.rating) setRating(s.rating);
        if (s.notes) setNotes(s.notes);
        if (s.exercises?.length) {
          setExercises(s.exercises.map((e: { name: string; sets: number | null; reps: string | null; weights: string | null; notes: string | null }) => ({
            name: e.name ?? "",
            sets: e.sets != null ? String(e.sets) : "",
            reps: e.reps ?? "",
            weights: e.weights ?? "",
            notes: e.notes ?? "",
          })));
        }
        if (s.cardioActivities?.length) {
          setCardioEntries(s.cardioActivities.map((c: { tag: string; machine: string; durationMin: number | null; distanceMi: number | null; calories: number | null; avgHR: number | null; maxHR: number | null }) => ({
            tag: c.tag as CardioEntry["tag"],
            machine: c.machine as CardioEntry["machine"],
            durationMin: c.durationMin != null ? String(c.durationMin) : "",
            distanceMi: c.distanceMi != null ? String(c.distanceMi) : "",
            calories: c.calories != null ? String(c.calories) : "",
            avgHR: c.avgHR != null ? String(c.avgHR) : "",
            maxHR: c.maxHR != null ? String(c.maxHR) : "",
            analyzing: false,
            analyzed: false,
          })));
        }
        if (s.images?.length) {
          setImages(s.images as { data: string; mediaType: string; name: string }[]);
        }
      })
      .catch(() => { /* ignore — user can fill manually */ });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load draft on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved) as Draft;
      const hasContent = parsed.exercises?.some((e) => e.name) || parsed.notes || parsed.cardioEntries?.length > 0;
      if (hasContent) {
        setDraft(parsed);
        setShowDraftBanner(true);
      }
    } catch { /* ignore */ }
  }, []);

  // Auto-save draft (debounced 500ms), only while form is active
  useEffect(() => {
    if (step !== "idle") return;
    const timer = setTimeout(() => {
      try {
        const draftData: Draft = {
          savedAt: new Date().toISOString(),
          date, cycleDay, cycleNumber, duration, avgHR, cardioLoad, azm, rating, notes,
          exercises, warmupItems, finisherItems, cardioEntries,
        };
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draftData));
      } catch { /* localStorage full or unavailable */ }
    }, 500);
    return () => clearTimeout(timer);
  }, [step, date, cycleDay, cycleNumber, duration, avgHR, cardioLoad, azm, rating, notes, exercises, warmupItems, finisherItems, cardioEntries]);

  function restoreDraft() {
    if (!draft) return;
    setDate(draft.date);
    setCycleDay(draft.cycleDay);
    setCycleNumber(draft.cycleNumber);
    setDuration(draft.duration);
    setAvgHR(draft.avgHR);
    setCardioLoad(draft.cardioLoad);
    setAzm(draft.azm);
    setRating(draft.rating);
    setNotes(draft.notes);
    setExercises(draft.exercises.length ? draft.exercises : [emptyExercise()]);
    setWarmupItems(draft.warmupItems);
    setFinisherItems(draft.finisherItems);
    setCardioEntries(draft.cardioEntries.map((c) => ({ ...c, analyzing: false })));
    setShowDraftBanner(false);
  }

  function discardDraft() {
    localStorage.removeItem(DRAFT_KEY);
    setDraft(null);
    setShowDraftBanner(false);
  }

  function updateExercise(i: number, field: keyof Exercise, value: string) {
    setExercises((prev) => prev.map((ex, idx) => (idx === i ? { ...ex, [field]: value } : ex)));
  }

  function deleteExercise(i: number) {
    setExercises((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleFillFromFitbit() {
    setFillingFitbit(true);
    try {
      const res = await fetch("/api/wearables/fitbit");
      if (!res.ok) return;
      const json = await res.json();
      if (!json.connected || !json.data) return;
      const d = json.data;
      if (d.avgHeartRate != null && !avgHR) setAvgHR(String(d.avgHeartRate));
      if (d.activeZoneMinutes != null && !azm) setAzm(String(d.activeZoneMinutes));
    } catch {
      // silent
    } finally {
      setFillingFitbit(false);
    }
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
    const url = savedSessionId ? `/api/sessions/${savedSessionId}` : "/api/sessions";
    const method = savedSessionId ? "PUT" : "POST";
    const sessionRes = await fetch(url, {
      method,
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
        cardioActivities: cardioEntries
          .filter(c => c.tag && c.machine)
          .map(c => ({
            tag: c.tag,
            machine: c.machine,
            durationMin: c.durationMin ? parseInt(c.durationMin) : undefined,
            distanceMi: c.distanceMi ? parseFloat(c.distanceMi) : undefined,
            calories: c.calories ? parseInt(c.calories) : undefined,
            avgHR: c.avgHR ? parseInt(c.avgHR) : undefined,
            maxHR: c.maxHR ? parseInt(c.maxHR) : undefined,
          })),
        images: images.length > 0 ? images : undefined,
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
      const sessionId = await saveSession();
      localStorage.removeItem(DRAFT_KEY);
      setSavedSessionId(sessionId);
      setStep("saved");
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
      localStorage.removeItem(DRAFT_KEY);
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

  if (step === "saved") {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Session saved</h1>
          <p className="text-sm text-zinc-500">What would you like to do next?</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 space-y-3">
          <button
            onClick={() => setStep("idle")}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white text-sm py-3 font-medium transition-colors text-left px-4 flex items-center gap-3"
          >
            <span className="text-lg">✎</span>
            <span>Continue editing this session</span>
          </button>
          <button
            onClick={handleSaveAndAnalyze}
            className="w-full rounded-lg bg-white text-zinc-950 hover:bg-zinc-200 text-sm py-3 font-medium transition-colors"
          >
            Analyze this session
          </button>
          <button
            onClick={() => router.push("/fitness")}
            className="w-full rounded-lg border border-zinc-800 text-zinc-500 hover:text-zinc-300 text-sm py-3 transition-colors"
          >
            Done — back to Fitness
          </button>
        </div>
      </div>
    );
  }

  if (step === "analyzing" || step === "saving") {
    const cycleLabel = cycleDay === "1" ? "Push" : cycleDay === "2" ? "Pull" : cycleDay === "3" ? "Legs" : cycleDay === "4" ? "Arms" : `Day ${cycleDay}`;
    const savedExercises = exercises.filter(ex => ex.name.trim());
    const savedCardio = cardioEntries.filter(c => c.tag && c.machine);
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center gap-3 py-6">
          <div className="w-8 h-8 border-2 border-zinc-600 border-t-white rounded-full animate-spin" />
          <p className="text-zinc-400 text-sm">
            {step === "saving" ? "Saving session..." : ANALYZING_STEPS[analyzeStep]}
          </p>
        </div>
        {/* Session summary so you can verify what was saved */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-zinc-500">{new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
              <p className="font-semibold text-white">{cycleLabel}{cycleNumber ? ` · Cycle ${cycleNumber}` : ""}</p>
            </div>
            <div className="text-right text-xs text-zinc-500 space-y-0.5">
              {duration && <p>{duration} min</p>}
              {avgHR && <p>{avgHR} bpm avg</p>}
              {rating && <p className="font-semibold text-zinc-300">{rating}</p>}
            </div>
          </div>
          {savedExercises.length > 0 && (
            <div className="space-y-1 border-t border-zinc-800 pt-3">
              {savedExercises.map((ex, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-zinc-300">{ex.name}</span>
                  <span className="text-zinc-500 tabular-nums text-xs">
                    {ex.sets && ex.reps ? `${ex.sets}×${ex.reps}` : ""}
                    {ex.weights ? ` @ ${ex.weights}` : ""}
                  </span>
                </div>
              ))}
            </div>
          )}
          {savedCardio.length > 0 && (
            <div className="space-y-1 border-t border-zinc-800 pt-3">
              <p className="text-xs text-zinc-500 uppercase tracking-wide">Cardio</p>
              {savedCardio.map((c, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-zinc-300 capitalize">{c.machine} <span className="text-zinc-500 normal-case">({c.tag})</span></span>
                  <span className="text-zinc-500 tabular-nums text-xs">
                    {c.durationMin ? `${c.durationMin}min` : ""}
                    {c.distanceMi ? ` · ${c.distanceMi}mi` : ""}
                    {c.avgHR ? ` · ${c.avgHR}bpm` : ""}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Log Session</h1>

      <div className="space-y-6">
        {/* Draft restore banner */}
        {showDraftBanner && draft && (
          <div className="rounded-xl border border-amber-800 bg-amber-900/20 p-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-amber-300">Unsaved draft found</p>
              <p className="text-xs text-zinc-400 mt-0.5">
                {new Date(draft.savedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={discardDraft} className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
                Discard
              </button>
              <button onClick={restoreDraft} className="text-xs rounded-lg bg-amber-600 hover:bg-amber-500 text-white px-3 py-1.5 font-medium transition-colors">
                Restore
              </button>
            </div>
          </div>
        )}

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
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-zinc-500">AZM</label>
                <button
                  type="button"
                  onClick={handleFillFromFitbit}
                  disabled={fillingFitbit}
                  className="text-xs text-zinc-500 hover:text-zinc-300 underline transition-colors disabled:opacity-50"
                >
                  {fillingFitbit ? "Filling..." : "Fill from Fitbit"}
                </button>
              </div>
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

        {/* Cardio activities */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Cardio</h2>
            <button
              type="button"
              onClick={() =>
                setCardioEntries((prev) => [
                  ...prev,
                  { tag: "", machine: "", durationMin: "", distanceMi: "", calories: "", avgHR: "", maxHR: "", analyzing: false, analyzed: false },
                ])
              }
              className="rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:text-white hover:border-zinc-500 transition-colors"
            >
              + Add
            </button>
          </div>
          <div className="space-y-3">
            {cardioEntries.map((entry, i) => {
              function updateCardio<K extends keyof CardioEntry>(field: K, value: CardioEntry[K]) {
                setCardioEntries((prev) => prev.map((c, idx) => (idx === i ? { ...c, [field]: value } : c)));
              }
              function removeCardio() {
                setCardioEntries((prev) => prev.filter((_, idx) => idx !== i));
              }
              async function handleCardioPhoto(e: React.ChangeEvent<HTMLInputElement>) {
                const file = e.target.files?.[0];
                if (!file) return;
                updateCardio("analyzing", true);
                try {
                  const reader = new FileReader();
                  const base64 = await new Promise<string>((resolve, reject) => {
                    reader.onload = () => resolve((reader.result as string).split(",")[1]);
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                  });
                  const res = await fetch("/api/analyze/cardio-photo", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ imageBase64: base64, mimeType: file.type, machine: entry.machine, tag: entry.tag }),
                  });
                  if (res.ok) {
                    const data = await res.json();
                    setCardioEntries((prev) =>
                      prev.map((c, idx) =>
                        idx === i
                          ? {
                              ...c,
                              durationMin: data.durationMin != null ? String(data.durationMin) : c.durationMin,
                              distanceMi: data.distanceMi != null ? String(data.distanceMi) : c.distanceMi,
                              calories: data.calories != null ? String(data.calories) : c.calories,
                              avgHR: data.avgHR != null ? String(data.avgHR) : c.avgHR,
                              maxHR: data.maxHR != null ? String(data.maxHR) : c.maxHR,
                              analyzing: false,
                              analyzed: true,
                            }
                          : c
                      )
                    );
                  } else {
                    updateCardio("analyzing", false);
                  }
                } catch {
                  updateCardio("analyzing", false);
                }
              }

              const tagOptions: { value: CardioEntry["tag"]; label: string }[] = [
                { value: "warmup", label: "Warmup" },
                { value: "finisher", label: "Finisher" },
                { value: "standalone", label: "Standalone" },
              ];
              const machineOptions: { value: CardioEntry["machine"]; label: string }[] = [
                { value: "treadmill", label: "Treadmill" },
                { value: "bike", label: "Bike" },
                { value: "rower", label: "Rower" },
                { value: "elliptical", label: "Elliptical" },
              ];

              return (
                <div key={i} className="rounded-lg border border-zinc-800 bg-zinc-900 p-3 space-y-3">
                  {/* Tag chips */}
                  <div className="flex flex-wrap gap-2">
                    {tagOptions.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => updateCardio("tag", entry.tag === opt.value ? "" : opt.value)}
                        className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                          entry.tag === opt.value
                            ? "bg-blue-600 text-white"
                            : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  {/* Machine chips */}
                  <div className="flex flex-wrap gap-2">
                    {machineOptions.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => updateCardio("machine", entry.machine === opt.value ? "" : opt.value)}
                        className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                          entry.machine === opt.value
                            ? "bg-zinc-700 text-white"
                            : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  {/* Photo upload — only when both tag and machine selected */}
                  {entry.tag && entry.machine && (
                    <div>
                      <label className="inline-flex items-center gap-2 cursor-pointer rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs text-zinc-300 hover:text-white hover:border-zinc-500 transition-colors">
                        {entry.analyzing ? (
                          <>
                            <span className="w-3 h-3 border border-zinc-500 border-t-white rounded-full animate-spin" />
                            Analyzing...
                          </>
                        ) : (
                          <>
                            {entry.analyzed ? "Re-analyze screen photo" : "Analyze screen photo"}
                          </>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={entry.analyzing}
                          onChange={handleCardioPhoto}
                        />
                      </label>
                    </div>
                  )}

                  {/* Metric fields */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-zinc-500 mb-1">Duration (min)</label>
                      <input
                        type="number"
                        value={entry.durationMin}
                        onChange={(e) => updateCardio("durationMin", e.target.value)}
                        placeholder="20"
                        min="0"
                        className="w-full rounded bg-zinc-800 border border-zinc-700 px-2 py-1.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-zinc-500 mb-1">Distance (mi)</label>
                      <input
                        type="number"
                        value={entry.distanceMi}
                        onChange={(e) => updateCardio("distanceMi", e.target.value)}
                        placeholder="1.5"
                        min="0"
                        step="0.01"
                        className="w-full rounded bg-zinc-800 border border-zinc-700 px-2 py-1.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-zinc-500 mb-1">Calories</label>
                      <input
                        type="number"
                        value={entry.calories}
                        onChange={(e) => updateCardio("calories", e.target.value)}
                        placeholder="180"
                        min="0"
                        className="w-full rounded bg-zinc-800 border border-zinc-700 px-2 py-1.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-zinc-500 mb-1">Avg HR</label>
                      <input
                        type="number"
                        value={entry.avgHR}
                        onChange={(e) => updateCardio("avgHR", e.target.value)}
                        placeholder="138"
                        min="0"
                        className="w-full rounded bg-zinc-800 border border-zinc-700 px-2 py-1.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-zinc-500 mb-1">Max HR</label>
                      <input
                        type="number"
                        value={entry.maxHR}
                        onChange={(e) => updateCardio("maxHR", e.target.value)}
                        placeholder="162"
                        min="0"
                        className="w-full rounded bg-zinc-800 border border-zinc-700 px-2 py-1.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
                      />
                    </div>
                  </div>

                  {/* Remove button */}
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={removeCardio}
                      className="text-zinc-600 hover:text-red-400 text-xs transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
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

        {/* Screenshot upload */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs text-zinc-500">Screenshots <span className="text-zinc-600">(Fitbit, machine summary, HR chart)</span></label>
            {images.length < 4 && (
              <label className="text-xs text-zinc-400 hover:text-white cursor-pointer transition-colors">
                + Add photo
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => {
                      const result = reader.result as string;
                      // result is "data:image/jpeg;base64,XXXX" — split off the prefix
                      const [prefix, data] = result.split(",");
                      const mediaType = prefix.match(/:(.*?);/)?.[1] ?? "image/jpeg";
                      setImages((prev) => [...prev, { data, mediaType, name: file.name }]);
                    };
                    reader.readAsDataURL(file);
                    e.target.value = ""; // reset so same file can be re-added
                  }}
                />
              </label>
            )}
          </div>
          {images.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {images.map((img, i) => (
                <div key={i} className="relative group">
                  <img
                    src={`data:${img.mediaType};base64,${img.data}`}
                    alt={img.name}
                    className="w-20 h-20 object-cover rounded-lg border border-zinc-700"
                  />
                  <button
                    type="button"
                    onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-zinc-800 border border-zinc-600 text-zinc-400 hover:text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ×
                  </button>
                  <p className="text-xs text-zinc-600 truncate w-20 mt-0.5">{img.name}</p>
                </div>
              ))}
            </div>
          )}
        </div>

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
