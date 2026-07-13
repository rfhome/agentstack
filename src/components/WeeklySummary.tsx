"use client";

import { useEffect, useState } from "react";

type WeeklySummaryData = {
  weekOf: string;
  headline: string;
  content: string;
  stats: { sessionsThisWeek: number; sessionsPrevWeek: number };
  nextActions: string[];
};

type StoredSummary = {
  id: number;
  content: string;
  nextActions: unknown;
  createdAt: string;
};

function parseStoredSummary(stored: StoredSummary): WeeklySummaryData | null {
  try {
    const actions = Array.isArray(stored.nextActions) ? (stored.nextActions as string[]) : [];
    return {
      weekOf: new Date(stored.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      headline: "",
      content: stored.content,
      stats: { sessionsThisWeek: 0, sessionsPrevWeek: 0 },
      nextActions: actions,
    };
  } catch {
    return null;
  }
}

function isNewThisWeek(createdAt: string | null): boolean {
  if (!createdAt) return false;
  const now = new Date();
  const lastSunday = new Date(now);
  lastSunday.setDate(now.getDate() - now.getDay());
  lastSunday.setHours(0, 0, 0, 0);
  return new Date(createdAt) >= lastSunday;
}

export function WeeklySummary() {
  const [summary, setSummary] = useState<WeeklySummaryData | null>(null);
  const [summaryCreatedAt, setSummaryCreatedAt] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string>("");
  const [quiet, setQuiet] = useState<string>("");

  useEffect(() => {
    fetch("/api/weekly-summary")
      .then((r) => r.json())
      .then((data: { summary: StoredSummary | null }) => {
        if (data.summary) {
          setSummary(parseStoredSummary(data.summary));
          setSummaryCreatedAt(data.summary.createdAt);
        }
      })
      .catch(() => {
        // silently ignore — no summary shown
      });
  }, []);

  async function generate() {
    setGenerating(true);
    setError("");
    setQuiet("");
    try {
      const res = await fetch("/api/weekly-summary", { method: "POST" });
      const body = await res.json() as { quiet?: string; error?: string } & Partial<WeeklySummaryData>;
      if (body.quiet) { setQuiet(body.quiet); return; }
      if (!res.ok) throw new Error(body.error ?? "Generation failed");
      setSummary(body as WeeklySummaryData);
      setSummaryCreatedAt(new Date().toISOString());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setGenerating(false);
    }
  }

  if (generating) {
    return (
      <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-5 flex items-center gap-3">
        <svg
          className="animate-spin h-4 w-4 text-zinc-400 shrink-0"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
        <span className="text-zinc-400 text-sm">Nexus is reviewing your week...</span>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="space-y-2">
        {quiet && <p className="text-zinc-500 text-sm">{quiet}</p>}
        {error && <p className="text-red-400 text-xs">{error}</p>}
        {!quiet && (
          <button
            onClick={generate}
            className="rounded-lg bg-zinc-800 text-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-700 transition-colors"
          >
            Generate weekly summary
          </button>
        )}
      </div>
    );
  }

  const isNew = isNewThisWeek(summaryCreatedAt);

  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-5 space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-white shrink-0" />
        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-200">Nexus</span>
        {summary.weekOf && (
          <span className="text-xs text-zinc-500">{summary.weekOf}</span>
        )}
        {isNew && (
          <span className="text-xs font-medium px-1.5 py-0.5 rounded-full bg-emerald-900/60 text-emerald-400 border border-emerald-800">
            New
          </span>
        )}
      </div>

      {/* Headline */}
      {summary.headline && (
        <p className="text-white font-semibold">{summary.headline}</p>
      )}

      {/* Narrative */}
      <p className="text-zinc-300 text-sm leading-relaxed">{summary.content}</p>

      {/* Stats row */}
      {(summary.stats.sessionsThisWeek > 0 || summary.stats.sessionsPrevWeek > 0) && (
        <p className="text-zinc-500 text-xs">
          {summary.stats.sessionsThisWeek} session{summary.stats.sessionsThisWeek !== 1 ? "s" : ""} this week
          {" · "}
          {summary.stats.sessionsPrevWeek} previous week
        </p>
      )}

      {/* Next actions */}
      {Array.isArray(summary.nextActions) && summary.nextActions.length > 0 && (
        <ol className="space-y-2">
          {(summary.nextActions as string[]).map((action, i) => (
            <li key={i} className="flex gap-3 text-sm">
              <span className="shrink-0 w-5 h-5 rounded-full bg-zinc-800 text-zinc-400 text-xs flex items-center justify-center font-medium">
                {i + 1}
              </span>
              <span className="text-zinc-300">{action}</span>
            </li>
          ))}
        </ol>
      )}

      {/* Regenerate */}
      <div className="pt-1">
        {error && <p className="text-red-400 text-xs mb-1">{error}</p>}
        <button
          onClick={generate}
          className="text-zinc-500 hover:text-zinc-300 text-xs transition-colors"
        >
          Regenerate
        </button>
      </div>
    </div>
  );
}
