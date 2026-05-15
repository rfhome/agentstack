export interface SessionSummary {
  date: string;
  cycleDay: number;
  durationMinutes: number;
  avgHeartRate: number;
  cardioLoad: number;
  activeZoneMinutes: number;
  rating?: string;
  notes?: string;
  exercises: {
    name: string;
    sets: number;
    reps: string;
    weightLbs: number;
  }[];
}

export interface AgentInput {
  sessionId?: number;
  userId?: string;
  sessionData: SessionSummary;
  recentHistory: SessionSummary[];
  goals: { exercise: string; targetWeightLbs: number; targetReps: string }[];
  userContext: string;
}

export interface AgentResponse {
  agentName: string;
  model: string;
  domain: string;
  analysis: string;
  recommendations: string[];
  flags: string[];
  nextSession: string;
  latencyMs: number;
}

export interface OrchestratorResult {
  recommendation: {
    content: string;
    nextActions: string[];
  };
  agentResponses: AgentResponse[];
}
