"use client";

import { useState } from "react";
import { SessionHistoryCard } from "./SessionHistoryCard";
import { ActivityDashboardSection } from "./ActivityDashboardSection";

type AgentLog = {
  id: number;
  agentName: string;
  analysis?: string;
  recommendations: string[];
  flags: string[];
};

type SessionData = {
  id: number;
  date: string;
  cycleDay: number | null;
  cycleNumber: number | null;
  durationMinutes: number | null;
  avgHeartRate: number | null;
  activeZoneMinutes: number | null;
  cardioLoad: number | null;
  rating: string | null;
  notes: string | null;
  exercises: { id: number; name: string; sets: number | null; reps: string | null; weights: string | null; weightLbs: number | null }[];
  cardioActivities: { id: number; tag: string; machine: string; durationMin: number | null; distanceMi: number | null; calories: number | null; avgHR: number | null; maxHR: number | null }[];
  recommendation: { content: string; nextActions: string[] } | null;
  agentLogs: AgentLog[];
};

type ActivityData = {
  id: number;
  type: string;
  date: string;
  durationMin: number | null;
  distanceMi: number | null;
  avgHR: number | null;
  calories: number | null;
  notes: string | null;
};

export function HistoryTabs({
  sessions,
  activities,
}: {
  sessions: SessionData[];
  activities: ActivityData[];
}) {
  const [tab, setTab] = useState<"sessions" | "activities">("sessions");

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex gap-1 bg-zinc-900 rounded-xl p-1 w-fit">
        <button
          onClick={() => setTab("sessions")}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            tab === "sessions"
              ? "bg-white text-zinc-950"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          Sessions
          {sessions.length > 0 && (
            <span className={`ml-2 text-xs ${tab === "sessions" ? "text-zinc-500" : "text-zinc-600"}`}>
              {sessions.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab("activities")}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            tab === "activities"
              ? "bg-white text-zinc-950"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          Activities
          {activities.length > 0 && (
            <span className={`ml-2 text-xs ${tab === "activities" ? "text-zinc-500" : "text-zinc-600"}`}>
              {activities.length}
            </span>
          )}
        </button>
      </div>

      {/* Sessions tab */}
      {tab === "sessions" && (
        sessions.length === 0 ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center">
            <p className="text-zinc-400 text-sm">No sessions logged yet.</p>
            <p className="text-zinc-600 text-xs mt-1">Head to Fitness and log your first session.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((s) => (
              <SessionHistoryCard key={s.id} session={s} />
            ))}
          </div>
        )
      )}

      {/* Activities tab */}
      {tab === "activities" && (
        <ActivityDashboardSection activities={activities} hideViewAll />
      )}
    </div>
  );
}
