"use client";

import { useState } from "react";

type Exercise = {
  id: number;
  name: string;
  sets: number | null;
  reps: string | null;
  weights: string | null;
  weightLbs: number | null;
};

type AgentLog = {
  id: number;
  agentName: string;
  response: string;
};

type Recommendation = {
  content: string;
  nextActions: string[];
};

type Session = {
  id: number;
  date: string;
  cycleDay: number | null;
  cycleNumber: number | null;
  durationMinutes: number | null;
  avgHeartRate: number | null;
  rating: string | null;
  notes: string | null;
  exercises: Exercise[];
  recommendation: Recommendation | null;
  agentLogs: AgentLog[];
};

type ParsedAgent = {
  analysis?: string;
  recommendations?: string[];
  flags?: string[];
  nextSession?: string;
};

const CYCLE_LABELS: Record<number, string> = { 1: "Push", 2: "Pull", 3: "Legs", 4: "Arms" };

const RATING_BADGE: Record<string, string> = {
  A: "bg-emerald-900/50 text-emerald-400",
  B: "bg-amber-900/50 text-amber-400",
  C: "bg-red-900/50 text-red-400",
};

const AGENT_STYLES: Record<string, { border: string; badge: string; dot: string }> = {
  Pulse: { border: "border-blue-800", badge: "bg-blue-950 text-blue-300", dot: "bg-blue-400" },
  Forge: { border: "border-amber-800", badge: "bg-amber-950 text-amber-300", dot: "bg-amber-400" },
  Lens:  { border: "border-emerald-800", badge: "bg-emerald-950 text-emerald-300", dot: "bg-emerald-400" },
};

function parseAgentResponse(text: string): ParsedAgent {
  try {
    const fenceMatch = text.match(/```(?:json)?\n?([\s\S]*?)\n?```/);
    const objectMatch = text.match(/(\{[\s\S]*\})/);
    const clean = fenceMatch?.[1] ?? objectMatch?.[1] ?? text;
    return JSON.parse(clean) as ParsedAgent;
  } catch {
    return { analysis: text };
  }
}

export function SessionHistoryCard({ session }: { session: Session }) {
  const [expanded, setExpanded] = useState(false);
  const [openAgent, setOpenAgent] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{ recommendation: Recommendation; agentLogs: AgentLog[] } | null>(null);
  const [analyzeError, setAnalyzeError] = useState("");

  async function handleAnalyze() {
    setAnalyzing(true);
    setAnalyzeError("");
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: session.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Analysis failed");
      setAnalysisResult({
        recommendation: data.recommendation,
        agentLogs: data.agentResponses.map((r: { agentName: string; analysis: string; recommendations: string[]; latencyMs: number }, i: number) => ({
          id: i,
          agentName: r.agentName,
          response: JSON.stringify(r),
        })),
      });
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  }

  const date = new Date(session.date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const cycleLabel = session.cycleDay ? CYCLE_LABELS[session.cycleDay] ?? `Day ${session.cycleDay}` : "Session";
  const analyzed = session.agentLogs.length > 0 || session.recommendation !== null || analysisResult !== null;
  const displayRecommendation = analysisResult?.recommendation ?? session.recommendation;
  const displayAgentLogs = analysisResult?.agentLogs ?? session.agentLogs;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full text-left px-4 py-4"
      >
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs text-zinc-500">{date}</span>
            <h3 className="font-semibold text-white">
              {cycleLabel}
              {session.cycleNumber ? (
                <span className="text-zinc-400 font-normal"> · Cycle {session.cycleNumber}</span>
              ) : null}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {analyzed && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-violet-900/40 text-violet-400">
                Analyzed
              </span>
            )}
            {session.rating && (
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${RATING_BADGE[session.rating] ?? "bg-zinc-800 text-zinc-400"}`}>
                {session.rating}
              </span>
            )}
            <span className="text-zinc-500 text-xs ml-1">{expanded ? "▾" : "▸"}</span>
          </div>
        </div>

        <div className="flex gap-4 text-xs text-zinc-500 mt-1.5">
          {session.durationMinutes ? <span>{session.durationMinutes}min</span> : null}
          {session.avgHeartRate ? <span>{session.avgHeartRate}bpm avg HR</span> : null}
          {session.exercises.length > 0 ? (
            <span>{session.exercises.length} exercise{session.exercises.length !== 1 ? "s" : ""}</span>
          ) : null}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-zinc-800 pt-4">
          {session.exercises.length > 0 && (
            <div className="space-y-1">
              {session.exercises.map((ex) => (
                <div key={ex.id} className="flex justify-between text-sm">
                  <span className="text-zinc-300">{ex.name}</span>
                  <span className="text-zinc-500 tabular-nums">
                    {ex.sets && ex.reps ? `${ex.sets}×${ex.reps}` : ""}
                    {ex.weights
                      ? ` @ ${ex.weights}`
                      : ex.weightLbs
                      ? ` @ ${ex.weightLbs}lbs`
                      : ""}
                  </span>
                </div>
              ))}
            </div>
          )}

          {!analyzed && !analyzing && (
            <div>
              {analyzeError && <p className="text-red-400 text-xs mb-2">{analyzeError}</p>}
              <button
                onClick={handleAnalyze}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-sm py-2 transition-colors"
              >
                Run Analysis
              </button>
            </div>
          )}

          {analyzing && (
            <div className="flex items-center gap-3 py-2">
              <div className="w-4 h-4 border-2 border-zinc-600 border-t-white rounded-full animate-spin" />
              <span className="text-zinc-400 text-sm">Agents analyzing...</span>
            </div>
          )}

          {displayRecommendation && (
            <div className="rounded-xl bg-zinc-800 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-white" />
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-zinc-700 text-zinc-200">
                  Nexus
                </span>
              </div>
              <p className="text-zinc-200 text-sm leading-relaxed">{displayRecommendation.content}</p>
              {displayRecommendation.nextActions.length > 0 && (
                <ol className="space-y-2">
                  {displayRecommendation.nextActions.map((action, i) => (
                    <li key={i} className="flex gap-3 text-sm">
                      <span className="shrink-0 w-5 h-5 rounded-full bg-zinc-700 text-zinc-400 text-xs flex items-center justify-center font-medium">
                        {i + 1}
                      </span>
                      <span className="text-zinc-300">{action}</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          )}

          {displayAgentLogs.length > 0 && (
            <div className="space-y-2">
              {displayAgentLogs.map((log) => {
                const style = AGENT_STYLES[log.agentName] ?? AGENT_STYLES.Pulse;
                const parsed = parseAgentResponse(log.response);
                const isOpen = openAgent === `${session.id}-${log.agentName}`;

                return (
                  <div key={log.id} className={`rounded-xl border ${style.border} bg-zinc-900`}>
                    <button
                      onClick={() => setOpenAgent(isOpen ? null : `${session.id}-${log.agentName}`)}
                      className="w-full flex items-center justify-between px-4 py-3 text-left"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${style.dot}`} />
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${style.badge}`}>
                          {log.agentName}
                        </span>
                      </div>
                      <span className="text-zinc-500 text-xs">{isOpen ? "▾" : "▸"}</span>
                    </button>

                    {isOpen && (
                      <div className="px-4 pb-4 space-y-3 text-sm border-t border-zinc-800 pt-3">
                        {parsed.analysis ? (
                          <p className="text-zinc-300 leading-relaxed">{parsed.analysis}</p>
                        ) : null}
                        {parsed.recommendations && parsed.recommendations.length > 0 && (
                          <div>
                            <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1.5">Recommendations</p>
                            <ul className="space-y-1">
                              {parsed.recommendations.map((r, i) => (
                                <li key={i} className="text-zinc-300 flex gap-2">
                                  <span className="text-zinc-600 shrink-0">→</span> {r}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
