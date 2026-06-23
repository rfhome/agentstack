import type { OrchestratorResult } from "./agents/types";

type JobState =
  | { status: "processing" }
  | { status: "completed"; result: OrchestratorResult }
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
