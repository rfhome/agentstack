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

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function ProgressPage() {
  const [exercises, setExercises] = useState<ExerciseProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/progress")
      .then(r => r.json())
      .then(data => {
        setExercises(data.exercises ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-6 h-6 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (exercises.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-white">Progress</h1>
        <p className="text-zinc-400 text-sm">
          Log at least 2 sessions with weights to see progress
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-white">Progress</h1>
      {exercises.map(ex => (
        <div key={ex.name} className="space-y-2">
          <h2 className="text-sm font-semibold text-zinc-200">{ex.name}</h2>
          <div className="rounded-xl bg-zinc-900 p-4">
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={ex.dataPoints.map(d => ({ ...d, label: formatDate(d.date) }))}>
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
    </div>
  );
}
