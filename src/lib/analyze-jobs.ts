import type { OrchestratorResult } from "./agents/types";

export type AchievedGoal = {
  exercise: string;
  prevTargetLbs: number;
  newTargetLbs: number;
};

export type AnalysisJobResult = OrchestratorResult & {
  achievedGoals?: AchievedGoal[];
};

type JobState =
  | { status: "processing" }
  | { status: "completed"; result: AnalysisJobResult }
  | { status: "failed"; error: string };

const jobs = new Map<number, JobState>();

export function setJob(sessionId: number, state: JobState): void {
  jobs.set(sessionId, state);
  if (state.status !== "processing") {
    setTimeout(() => jobs.delete(sessionId), 15 * 60 * 1000);
  }
}

export function getJob(sessionId: number): JobState | undefined {
  return jobs.get(sessionId);
}

export type { JobState };
