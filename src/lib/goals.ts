/**
 * Pure goal-matching logic — no Prisma, safe to unit-test.
 * DB operations stay in the analyze route.
 */

/** Returns the highest weight used in a session exercise. */
export function getMaxWeight(weightLbs: number | null, weights: string | null): number {
  let max = weightLbs ?? 0;
  if (weights) {
    const parsed = weights
      .split(",")
      .map((w) => parseFloat(w.trim()))
      .filter((w) => !isNaN(w));
    if (parsed.length > 0) max = Math.max(max, ...parsed);
  }
  return max;
}

/** Case-insensitive substring match on exercise name vs goal exercise. */
export function exerciseMatchesGoal(exerciseName: string, goalExercise: string): boolean {
  const a = exerciseName.toLowerCase().trim();
  const b = goalExercise.toLowerCase().trim();
  return a.includes(b) || b.includes(a);
}

/** True when maxWeight meets or exceeds the target (or no weight target is set). */
export function meetsWeightTarget(maxWeight: number, targetWeightLbs: number | null): boolean {
  return targetWeightLbs == null || maxWeight >= targetWeightLbs;
}

/**
 * True when every set's reps meets or exceeds the first number in targetReps
 * (handles "10", "8-10", "12" formats). Returns true when either side is absent.
 */
export function meetsRepsTarget(sessionReps: string | null, targetReps: string | null): boolean {
  if (!targetReps) return true;
  if (!sessionReps) return false;
  const targetMin = parseInt(targetReps);
  if (isNaN(targetMin)) return true;
  const setReps = sessionReps
    .split(",")
    .map((r) => parseInt(r.trim()))
    .filter((r) => !isNaN(r));
  if (setReps.length === 0) return false;
  return Math.min(...setReps) >= targetMin;
}
