"use client";

import { useState, useEffect, useCallback } from "react";
import { LogActivityModal } from "./LogActivityModal";

type Activity = {
  id: number;
  type: string;
  date: string;
  durationMin: number | null;
  distanceMi: number | null;
  avgHR: number | null;
  calories: number | null;
  notes: string | null;
};

const TYPE_ICONS: Record<string, string> = {
  Running: "🏃",
  Walking: "🚶",
  Hiking: "🥾",
  Cycling: "🚴",
  Swimming: "🏊",
  Pickleball: "🏓",
  Tennis: "🎾",
  Basketball: "🏀",
  Golf: "⛳",
  Yoga: "🧘",
  Stretching: "🤸",
};

function activityIcon(type: string) {
  return TYPE_ICONS[type] ?? "⚡";
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function ActivityRow({ a }: { a: Activity }) {
  const chips: string[] = [];
  if (a.durationMin) chips.push(`${a.durationMin} min`);
  if (a.distanceMi)  chips.push(`${a.distanceMi} mi`);
  if (a.avgHR)       chips.push(`${a.avgHR} bpm`);
  if (a.calories)    chips.push(`${a.calories} cal`);

  return (
    <div className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3">
      <span className="text-xl shrink-0">{activityIcon(a.type)}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-white truncate">{a.type}</span>
          <span className="text-xs text-zinc-500 shrink-0">{formatDate(a.date)}</span>
        </div>
        {chips.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {chips.map((c) => (
              <span key={c} className="text-xs text-zinc-400 bg-zinc-800 rounded-md px-1.5 py-0.5">{c}</span>
            ))}
          </div>
        )}
        {a.notes && <p className="text-xs text-zinc-500 mt-1 truncate">{a.notes}</p>}
      </div>
    </div>
  );
}

export function ActivityDashboardSection() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActivities = useCallback(async () => {
    try {
      const res = await fetch("/api/activities");
      if (res.ok) {
        const data = await res.json() as Activity[];
        setActivities(data.slice(0, 5));
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchActivities(); }, [fetchActivities]);

  function handleSaved(a: Activity) {
    setActivities((prev) => [a, ...prev].slice(0, 5));
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Activities</h2>
        <LogActivityModal onSaved={handleSaved} />
      </div>

      {loading ? (
        <div className="h-16 rounded-xl bg-zinc-900 animate-pulse" />
      ) : activities.length === 0 ? (
        <p className="text-zinc-500 text-sm">No activities yet. Log a run, pickleball match, or anything outside the gym.</p>
      ) : (
        <div className="space-y-2">
          {activities.map((a) => (
            <ActivityRow key={a.id} a={a} />
          ))}
        </div>
      )}
    </section>
  );
}
