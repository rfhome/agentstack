"use client";

import { useState } from "react";

type AgentResponse = {
  agentName: string;
  analysis: string;
  recommendations: string[];
  flags: string[];
  nextSession: string;
  latencyMs: number;
};

const AGENT_STYLES: Record<string, { border: string; badge: string; dot: string }> = {
  Pulse: { border: "border-blue-800", badge: "bg-blue-950 text-blue-300", dot: "bg-blue-400" },
  Forge: { border: "border-amber-800", badge: "bg-amber-950 text-amber-300", dot: "bg-amber-400" },
  Lens:  { border: "border-emerald-800", badge: "bg-emerald-950 text-emerald-300", dot: "bg-emerald-400" },
  Nexus: { border: "border-zinc-600", badge: "bg-zinc-800 text-zinc-200", dot: "bg-white" },
};

export function AgentPanel({ agents }: { agents: AgentResponse[] }) {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      {agents.map((agent) => {
        const style = AGENT_STYLES[agent.agentName] ?? AGENT_STYLES.Nexus;
        const isOpen = open === agent.agentName;

        return (
          <div key={agent.agentName} className={`rounded-xl border ${style.border} bg-zinc-900`}>
            <button
              onClick={() => setOpen(isOpen ? null : agent.agentName)}
              className="w-full flex items-center justify-between px-4 py-3 text-left"
            >
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${style.dot}`} />
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${style.badge}`}>
                  {agent.agentName}
                </span>
                <span className="text-xs text-zinc-500">{agent.latencyMs}ms</span>
              </div>
              <span className="text-zinc-500 text-sm">{isOpen ? "▲" : "▼"}</span>
            </button>

            {isOpen && (
              <div className="px-4 pb-4 space-y-3 text-sm">
                <p className="text-zinc-300 leading-relaxed">{agent.analysis}</p>

                {agent.recommendations.length > 0 && (
                  <div>
                    <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">Recommendations</p>
                    <ul className="space-y-1">
                      {agent.recommendations.map((r, i) => (
                        <li key={i} className="text-zinc-300 flex gap-2">
                          <span className="text-zinc-600 shrink-0">→</span> {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {agent.flags.filter(f => f !== "JSON parse failed — raw response stored").length > 0 && (
                  <div>
                    <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">Flags</p>
                    <ul className="space-y-1">
                      {agent.flags.map((f, i) => (
                        <li key={i} className="text-amber-400 flex gap-2 text-xs">
                          <span className="shrink-0">⚠</span> {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {agent.nextSession && (
                  <div>
                    <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">Next Session</p>
                    <p className="text-zinc-300">{agent.nextSession}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
