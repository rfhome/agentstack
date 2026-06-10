"use client";

import { useState, useRef } from "react";

const ACTIVITY_TYPES = [
  "Running", "Walking", "Hiking", "Cycling",
  "Swimming", "Pickleball", "Tennis", "Basketball",
  "Golf", "Yoga", "Stretching", "Other",
];

type SavedActivity = {
  id: number;
  type: string;
  date: string;
  durationMin: number | null;
  distanceMi: number | null;
  avgHR: number | null;
  calories: number | null;
  notes: string | null;
};

function localToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function LogActivityModal({ onSaved }: { onSaved: (a: SavedActivity) => void }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("");
  const [customType, setCustomType] = useState("");
  const [date, setDate] = useState(localToday);
  const [duration, setDuration] = useState("");
  const [distance, setDistance] = useState("");
  const [avgHR, setAvgHR] = useState("");
  const [calories, setCalories] = useState("");
  const [notes, setNotes] = useState("");
  const [image, setImage] = useState<{ data: string; mediaType: string } | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  function handleClose() {
    setOpen(false);
    setType(""); setCustomType(""); setDate(localToday());
    setDuration(""); setDistance(""); setAvgHR(""); setCalories(""); setNotes("");
    setImage(null); setError("");
  }

  async function handleImage(file: File) {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      const [prefix, data] = dataUrl.split(",");
      const mediaType = prefix.match(/:(.*?);/)?.[1] ?? "image/jpeg";
      setImage({ data, mediaType });

      // Auto-analyze photo — uses a read-only endpoint that runs Gemini
      // but does NOT save to the DB (saving happens only when user clicks Save)
      if (!duration && !avgHR) {
        setAnalyzing(true);
        try {
          const res = await fetch("/api/activities/analyze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              imageData: data,
              imageMediaType: mediaType,
              activityType: type === "Other" ? (customType || "activity") : (type || "activity"),
            }),
          });
          if (res.ok) {
            const metrics = await res.json() as {
              durationMinutes: number | null;
              distanceMiles: number | null;
              avgHeartRate: number | null;
              calories: number | null;
            };
            if (metrics.durationMinutes) setDuration(String(metrics.durationMinutes));
            if (metrics.distanceMiles)   setDistance(String(metrics.distanceMiles));
            if (metrics.avgHeartRate)    setAvgHR(String(metrics.avgHeartRate));
            if (metrics.calories)        setCalories(String(metrics.calories));
          }
        } catch { /* ignore — user fills manually */ }
        setAnalyzing(false);
      }
    };
    reader.readAsDataURL(file);
  }

  async function handleSave() {
    const activityType = type === "Other" ? customType.trim() : type;
    if (!activityType || !date) { setError("Activity type and date are required"); return; }
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: activityType,
          date,
          durationMin: duration ? parseInt(duration) : null,
          distanceMi: distance ? parseFloat(distance) : null,
          avgHR: avgHR ? parseInt(avgHR) : null,
          calories: calories ? parseInt(calories) : null,
          notes: notes || null,
          imageData: image?.data ?? null,
          imageMediaType: image?.mediaType ?? null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      onSaved(data as SavedActivity);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  const activityType = type === "Other" ? customType : type;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white px-4 py-2 text-sm font-medium transition-colors"
      >
        + Activity
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={handleClose} />
          <div className="relative w-full max-w-sm rounded-2xl border border-zinc-700 bg-zinc-900 p-5 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">Log activity</h2>
              <button onClick={handleClose} className="text-zinc-500 hover:text-white text-xl leading-none">×</button>
            </div>

            {/* Activity type */}
            <div className="space-y-1.5">
              <label className="text-xs text-zinc-500">Activity</label>
              <div className="grid grid-cols-3 gap-1.5">
                {ACTIVITY_TYPES.map((t) => (
                  <button
                    key={t}
                    onClick={() => setType(t)}
                    className={`rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors ${
                      type === t
                        ? "border-white bg-white/10 text-white"
                        : "border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-white"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              {type === "Other" && (
                <input
                  type="text"
                  value={customType}
                  onChange={(e) => setCustomType(e.target.value)}
                  placeholder="e.g. Surfing, Volleyball..."
                  className="w-full mt-1.5 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
                  autoFocus
                />
              )}
            </div>

            {/* Date + duration row */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs text-zinc-500">Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-zinc-500">Duration (min)</label>
                <input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="60"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
                />
              </div>
            </div>

            {/* Metrics row */}
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <label className="text-xs text-zinc-500">Avg HR</label>
                <input type="number" value={avgHR} onChange={(e) => setAvgHR(e.target.value)} placeholder="145"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-zinc-500">Distance (mi)</label>
                <input type="number" step="0.01" value={distance} onChange={(e) => setDistance(e.target.value)} placeholder="3.1"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-zinc-500">Calories</label>
                <input type="number" value={calories} onChange={(e) => setCalories(e.target.value)} placeholder="420"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500" />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <label className="text-xs text-zinc-500">Notes (optional)</label>
              <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)}
                placeholder="How did it feel?"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500" />
            </div>

            {/* Photo upload */}
            <div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImage(f); }} />
              {image ? (
                <div className="flex items-center justify-between rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2">
                  <span className="text-xs text-zinc-300">
                    {analyzing ? "Analyzing screenshot..." : "Screenshot attached"}
                  </span>
                  <button onClick={() => setImage(null)} className="text-zinc-500 hover:text-white text-sm">×</button>
                </div>
              ) : (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="w-full rounded-lg border border-dashed border-zinc-700 text-zinc-500 hover:text-zinc-300 hover:border-zinc-500 py-2 text-xs transition-colors"
                >
                  {activityType
                    ? `Attach ${activityType} screenshot — auto-fills metrics`
                    : "Attach wearable screenshot — auto-fills metrics"}
                </button>
              )}
            </div>

            {error && <p className="text-xs text-red-400">{error}</p>}

            <button
              onClick={handleSave}
              disabled={!type || saving || analyzing}
              className="w-full rounded-xl bg-white text-zinc-950 py-2.5 text-sm font-bold hover:bg-zinc-200 disabled:opacity-40 transition-colors"
            >
              {saving ? "Saving..." : analyzing ? "Reading screenshot..." : "Save activity"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
