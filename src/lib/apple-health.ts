/**
 * Apple Health / Health Auto Export webhook helpers.
 *
 * Health Auto Export sends a JSON payload like:
 * {
 *   "data": {
 *     "metrics": [
 *       { "name": "heart_rate_variability", "units": "ms",       "data": [{ "date": "2026-06-08", "value": 42.3 }] },
 *       { "name": "resting_heart_rate",     "units": "count/min","data": [{ "date": "2026-06-08", "value": 58   }] },
 *       { "name": "sleep_analysis",         "units": "hr",       "data": [{ "date": "2026-06-08", "value": 7.5  }] },
 *       { "name": "active_energy_burned",   "units": "kcal",     "data": [{ "date": "2026-06-08", "value": 620  }] },
 *       { "name": "step_count",             "units": "count",    "data": [{ "date": "2026-06-08", "value": 9450 }] }
 *     ],
 *     "workouts": [
 *       {
 *         "name": "Running",
 *         "start": "2026-06-08 06:30:00 -0800",
 *         "end":   "2026-06-08 07:15:00 -0800",
 *         "duration":      "45.2 mins",
 *         "distance":      "4.2 mi",
 *         "activeEnergy":  "420 kcal",
 *         "avgHeartRate":  "152 bpm",
 *         "maxHeartRate":  "178 bpm"
 *       }
 *     ]
 *   }
 * }
 */

type MetricEntry = { date?: string; value?: number; Avg?: number };

type RawMetric = {
  name: string;
  data: MetricEntry[];
};

type RawWorkout = {
  name?: string;
  start?: string;
  duration?: string;        // "45.2 mins"
  distance?: string;        // "4.2 mi"
  activeEnergy?: string;    // "420 kcal"
  avgHeartRate?: string;    // "152 bpm"
  maxHeartRate?: string;    // "178 bpm"
};

export type ParsedHealthDay = {
  date: string;             // YYYY-MM-DD
  hrv?: number;
  restingHR?: number;
  sleepHours?: number;
  activeKcal?: number;
  steps?: number;
};

export type ParsedWorkout = {
  type: string;
  date: string;             // YYYY-MM-DD
  durationMin: number | null;
  distanceMi: number | null;
  avgHR: number | null;
  maxHR: number | null;
  calories: number | null;
};

function parseFloat2(s: string | undefined): number | null {
  if (!s) return null;
  const n = parseFloat(s.replace(/[^\d.]/g, ""));
  return isNaN(n) ? null : n;
}

function parseInt2(s: string | undefined): number | null {
  if (!s) return null;
  const n = parseInt(s.replace(/[^\d]/g, ""), 10);
  return isNaN(n) ? null : n;
}

function toYMD(raw: string | undefined): string | null {
  if (!raw) return null;
  // "2026-06-08 06:30:00 -0800" → "2026-06-08"
  const m = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

/** Parse the raw Health Auto Export payload into per-day summaries and workouts. */
export function parseHealthExport(body: unknown): {
  days: ParsedHealthDay[];
  workouts: ParsedWorkout[];
} {
  const data = (body as { data?: { metrics?: RawMetric[]; workouts?: RawWorkout[] } })?.data;
  if (!data) return { days: [], workouts: [] };

  // --- metrics → per-day map ---
  const byDate: Record<string, ParsedHealthDay> = {};

  function ensure(date: string) {
    if (!byDate[date]) byDate[date] = { date };
    return byDate[date];
  }

  for (const metric of data.metrics ?? []) {
    for (const entry of metric.data ?? []) {
      const date = entry.date ?? "";
      const ymd = toYMD(date) ?? date.slice(0, 10);
      if (!ymd) continue;
      const val = entry.value ?? entry.Avg;
      if (val == null) continue;
      const day = ensure(ymd);

      switch (metric.name) {
        case "heart_rate_variability":   day.hrv       = val;        break;
        case "resting_heart_rate":       day.restingHR = Math.round(val); break;
        case "sleep_analysis":           day.sleepHours = val;       break;
        case "active_energy_burned":     day.activeKcal = Math.round(val); break;
        case "step_count":               day.steps      = Math.round(val); break;
      }
    }
  }

  // --- workouts ---
  const workouts: ParsedWorkout[] = (data.workouts ?? []).map((w) => {
    const date = toYMD(w.start) ?? new Date().toISOString().slice(0, 10);
    const durationMin = parseFloat2(w.duration);
    return {
      type: w.name ?? "Workout",
      date,
      durationMin: durationMin != null ? Math.round(durationMin) : null,
      distanceMi: parseFloat2(w.distance),
      avgHR: parseInt2(w.avgHeartRate),
      maxHR: parseInt2(w.maxHeartRate),
      calories: parseInt2(w.activeEnergy),
    };
  });

  return { days: Object.values(byDate), workouts };
}

/** Format recent Apple Health days as a Lens-readable context string. */
export function formatAppleHealthForLens(days: ParsedHealthDay[]): string {
  if (!days.length) return "";
  const lines = days.map((d) => {
    const parts: string[] = [`Date: ${d.date}`];
    if (d.hrv        != null) parts.push(`HRV: ${d.hrv.toFixed(1)} ms`);
    if (d.restingHR  != null) parts.push(`Resting HR: ${d.restingHR} bpm`);
    if (d.sleepHours != null) parts.push(`Sleep: ${d.sleepHours.toFixed(1)} hrs`);
    if (d.activeKcal != null) parts.push(`Active cal: ${d.activeKcal} kcal`);
    if (d.steps      != null) parts.push(`Steps: ${d.steps.toLocaleString()}`);
    return parts.join(" | ");
  });
  return `Apple Health (last ${days.length} days):\n${lines.join("\n")}`;
}
