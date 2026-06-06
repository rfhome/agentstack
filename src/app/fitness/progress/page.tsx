"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface DataPoint {
  date: string;
  maxWeight: number | null;
  totalSets: number | null;
}

interface ExerciseProgress {
  name: string;
  dataPoints: DataPoint[];
}

interface PR {
  name: string;
  maxWeight: number;
  date: string;
}

interface ProgressData {
  exercises: ExerciseProgress[];
  prs: PR[];
  trainingDays: string[];
}

// ─── Frequency heatmap ───────────────────────────────────────────────────────

const INTENSITY = ["bg-zinc-800", "bg-violet-900", "bg-violet-700", "bg-violet-500", "bg-violet-400"];

function buildHeatmapWeeks(trainingDays: string[]): { date: string; count: number }[][] {
  const daySet = new Set(trainingDays);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Start from the Sunday 52 weeks ago
  const start = new Date(today);
  start.setDate(start.getDate() - 52 * 7 - start.getDay());

  const weeks: { date: string; count: number }[][] = [];
  let week: { date: string; count: number }[] = [];
  const cursor = new Date(start);

  while (cursor <= today) {
    const iso = cursor.toISOString().split("T")[0];
    week.push({ date: iso, count: daySet.has(iso) ? 1 : 0 });
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  if (week.length) weeks.push(week);
  return weeks;
}

function FrequencyHeatmap({ trainingDays }: { trainingDays: string[] }) {
  const weeks = buildHeatmapWeeks(trainingDays);
  const totalDays = trainingDays.length;

  // Month labels: find the first week each month starts in
  const monthLabels: { label: string; col: number }[] = [];
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  weeks.forEach((week, i) => {
    const firstDay = new Date(week[0].date + "T00:00:00");
    if (firstDay.getDate() <= 7) {
      const last = monthLabels[monthLabels.length - 1];
      if (!last || last.label !== MONTHS[firstDay.getMonth()]) {
        monthLabels.push({ label: MONTHS[firstDay.getMonth()], col: i });
      }
    }
  });

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs text-zinc-500">{totalDays} training days in the last year</p>
        <div className="flex items-center gap-1 text-zinc-600">
          <span className="text-xs">Less</span>
          {INTENSITY.map((cls, i) => (
            <span key={i} className={`w-3 h-3 rounded-sm ${cls}`} />
          ))}
          <span className="text-xs">More</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-max">
          {/* Month labels */}
          <div className="flex mb-1 ml-0">
            {weeks.map((_, i) => {
              const label = monthLabels.find((m) => m.col === i);
              return (
                <div key={i} className="w-3.5 shrink-0 text-xs text-zinc-600 leading-none">
                  {label ? label.label : ""}
                </div>
              );
            })}
          </div>

          {/* Cells: 7 rows (Sun–Sat), N columns (weeks) */}
          {[0, 1, 2, 3, 4, 5, 6].map((dow) => (
            <div key={dow} className="flex gap-0.5 mb-0.5">
              {weeks.map((week, wi) => {
                const cell = week[dow];
                if (!cell) return <div key={wi} className="w-3 h-3 shrink-0" />;
                const cls = cell.count > 0 ? INTENSITY[2] : INTENSITY[0];
                return (
                  <div
                    key={wi}
                    title={cell.date}
                    className={`w-3 h-3 rounded-sm shrink-0 ${cls}`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Personal records ────────────────────────────────────────────────────────

function PRCard({ pr }: { pr: PR }) {
  const d = new Date(pr.date + "T00:00:00");
  const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" });
  return (
    <div className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-0">
      <span className="text-sm text-zinc-200 truncate mr-3">{pr.name}</span>
      <div className="text-right shrink-0">
        <span className="text-sm font-semibold text-white">{pr.maxWeight} lbs</span>
        <span className="text-xs text-zinc-600 ml-2">{label}</span>
      </div>
    </div>
  );
}

// ─── Weight chart ────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function ProgressPage() {
  const [data, setData] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/progress")
      .then((r) => r.json())
      .then((d: ProgressData) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-6 h-6 border-2 border-zinc-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const hasData = (data?.exercises?.length ?? 0) > 0 || (data?.trainingDays?.length ?? 0) > 0;

  if (!hasData) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-white">Progress</h1>
        <p className="text-zinc-400 text-sm">Log at least 2 sessions with weights to see progress charts.</p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <h1 className="text-2xl font-bold text-white">Progress</h1>

      {/* Frequency heatmap */}
      {(data?.trainingDays?.length ?? 0) > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Training Frequency</h2>
          <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4">
            <FrequencyHeatmap trainingDays={data!.trainingDays} />
          </div>
        </section>
      )}

      {/* Personal records */}
      {(data?.prs?.length ?? 0) > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Personal Records</h2>
          <div className="rounded-xl bg-zinc-900 border border-zinc-800 px-4 pt-2 pb-1">
            {data!.prs.map((pr) => (
              <PRCard key={pr.name} pr={pr} />
            ))}
          </div>
        </section>
      )}

      {/* Weight-over-time charts */}
      {(data?.exercises?.length ?? 0) > 0 && (
        <section className="space-y-6">
          <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Weight Over Time</h2>
          {data!.exercises.map((ex) => (
            <div key={ex.name} className="space-y-2">
              <h3 className="text-sm font-semibold text-zinc-200">{ex.name}</h3>
              <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4">
                <ResponsiveContainer width="100%" height={160}>
                  <LineChart data={ex.dataPoints.map((d) => ({ ...d, label: formatDate(d.date) }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: "#71717a", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: "#71717a", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      width={36}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#18181b",
                        border: "1px solid #3f3f46",
                        borderRadius: "8px",
                        color: "#f4f4f5",
                        fontSize: 12,
                      }}
                      formatter={(value) => [`${value} lbs`, "Max Weight"]}
                      labelFormatter={(label) => String(label)}
                    />
                    <Line
                      type="monotone"
                      dataKey="maxWeight"
                      stroke="#a78bfa"
                      strokeWidth={2}
                      dot={{ fill: "#a78bfa", r: 3, strokeWidth: 0 }}
                      activeDot={{ fill: "#a78bfa", r: 5, strokeWidth: 0 }}
                      connectNulls
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
