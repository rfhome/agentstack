"use client";

import { useEffect, useState } from "react";

type Stats = {
  currentStreak: number;
  longestStreak: number;
  totalSessions: number;
  thisWeekSessions: number;
  lastWeekSessions: number;
  goalsAchieved: number;
};

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-2xl font-bold text-white tabular-nums">{value}</span>
      <span className="text-xs text-zinc-400">{label}</span>
      {sub && <span className="text-xs text-zinc-600">{sub}</span>}
    </div>
  );
}

export function StreaksCard() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then((data: Stats) => setStats(data))
      .catch(() => {
        // silently ignore
      });
  }, []);

  if (!stats) return null;

  const streakLabel =
    stats.currentStreak === 0
      ? "No active streak"
      : stats.currentStreak === 1
      ? "1 week streak"
      : `${stats.currentStreak} week streak`;

  const sessionDelta = stats.thisWeekSessions - stats.lastWeekSessions;
  const deltaSub =
    stats.lastWeekSessions > 0
      ? sessionDelta > 0
        ? `+${sessionDelta} vs last week`
        : sessionDelta < 0
        ? `${sessionDelta} vs last week`
        : "same as last week"
      : undefined;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
        <Stat
          label={streakLabel}
          value={stats.currentStreak}
          sub={stats.longestStreak > stats.currentStreak ? `Best: ${stats.longestStreak}` : undefined}
        />
        <Stat
          label="This week"
          value={stats.thisWeekSessions}
          sub={deltaSub}
        />
        <Stat
          label="Total sessions"
          value={stats.totalSessions}
        />
        {stats.goalsAchieved > 0 && (
          <Stat
            label="Goals achieved"
            value={stats.goalsAchieved}
          />
        )}
      </div>
    </div>
  );
}
