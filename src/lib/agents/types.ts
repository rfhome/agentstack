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
    weights?: string;
  }[];
  cardioActivities?: {
    tag: string;
    machine: string;
    durationMin: number | null;
    distanceMi: number | null;
    calories: number | null;
    avgHR: number | null;
  }[];
}

export interface SessionImage {
  data: string;       // base64-encoded image data
  mediaType: string;  // e.g. "image/jpeg", "image/png"
  name: string;       // original filename
}

export interface RecentActivity {
  type: string;
  date: string;       // YYYY-MM-DD
  durationMin: number | null;
  distanceMi: number | null;
  avgHR: number | null;
  calories: number | null;
  notes: string | null;
}

export interface AgentInput {
  sessionId?: number;
  userId?: string;
  sessionData: SessionSummary;
  recentHistory: SessionSummary[];
  goals: { exercise: string; targetWeightLbs: number; targetReps: string }[];
  userContext: string;
  preWorkoutContext?: string; // athlete's note entered before requesting the workout plan
  ouraContext?: string;
  fitbitContext?: string;
  appleHealthContext?: string;          // formatted Apple Health daily summaries (last 7 days)
  recentActivities?: RecentActivity[]; // non-gym activities logged in the past 7 days
  images?: SessionImage[]; // workout screenshots (e.g. Fitbit HR chart, machine summary)
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
  suggestedRating?: "A" | "B" | "C";
  ratingReason?: string;
}
