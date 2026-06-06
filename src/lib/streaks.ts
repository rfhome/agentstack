/**
 * Pure functions for computing training streaks and milestones.
 * No Prisma or Next.js imports — fully testable in Vitest.
 */

/** Returns the Monday (00:00 local) of the week containing `date`. */
export function weekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday, 1 = Monday…
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Returns a YYYY-MM-DD key for a week, given the Monday start date. */
export function weekKey(monday: Date): string {
  return monday.toISOString().slice(0, 10);
}

/**
 * Given an array of session date strings (ISO or Date), compute:
 *   - currentStreak: consecutive weeks with ≥1 session going backwards from "now"
 *   - longestStreak: all-time max consecutive active weeks
 *   - totalSessions: total session count
 *   - thisWeekSessions: sessions since the start of the current week
 *   - lastWeekSessions: sessions in the previous calendar week
 */
export interface StreakStats {
  currentStreak: number;
  longestStreak: number;
  totalSessions: number;
  thisWeekSessions: number;
  lastWeekSessions: number;
}

export function computeStreaks(sessionDates: (string | Date)[], now: Date = new Date()): StreakStats {
  const totalSessions = sessionDates.length;

  const thisMonday = weekStart(now);
  const lastMonday = new Date(thisMonday);
  lastMonday.setDate(lastMonday.getDate() - 7);

  // Build a Set of active week keys
  const activeWeeks = new Set<string>();
  let thisWeekSessions = 0;
  let lastWeekSessions = 0;

  for (const raw of sessionDates) {
    const d = typeof raw === "string" ? new Date(raw) : raw;
    const monday = weekStart(d);
    activeWeeks.add(weekKey(monday));

    if (monday.getTime() === thisMonday.getTime()) {
      thisWeekSessions++;
    } else if (monday.getTime() === lastMonday.getTime()) {
      lastWeekSessions++;
    }
  }

  // Compute current streak: walk backwards week by week from the current week.
  // If the current week has no sessions, we still start from "last week" (grace period —
  // user might not have trained yet this week). Either way, the streak is the longest
  // unbroken chain of weeks ending at or before now.
  let currentStreak = 0;
  const cursor = new Date(thisMonday);
  // If no session this week, start checking from last week
  if (!activeWeeks.has(weekKey(cursor))) {
    cursor.setDate(cursor.getDate() - 7);
  }
  while (activeWeeks.has(weekKey(cursor))) {
    currentStreak++;
    cursor.setDate(cursor.getDate() - 7);
  }

  // Compute longest streak: sort unique weeks and find max run
  const sortedWeeks = Array.from(activeWeeks).sort();
  let longestStreak = 0;
  let run = 0;

  for (let i = 0; i < sortedWeeks.length; i++) {
    if (i === 0) {
      run = 1;
    } else {
      // Check if this week is exactly 7 days after the previous
      const prev = new Date(sortedWeeks[i - 1]);
      const curr = new Date(sortedWeeks[i]);
      const diff = (curr.getTime() - prev.getTime()) / (7 * 24 * 60 * 60 * 1000);
      run = diff === 1 ? run + 1 : 1;
    }
    if (run > longestStreak) longestStreak = run;
  }

  return {
    currentStreak,
    longestStreak,
    totalSessions,
    thisWeekSessions,
    lastWeekSessions,
  };
}
