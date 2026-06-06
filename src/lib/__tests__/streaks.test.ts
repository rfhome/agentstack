import { describe, it, expect } from "vitest";
import { weekStart, weekKey, computeStreaks } from "../streaks";

// ---------------------------------------------------------------------------
// weekStart
// ---------------------------------------------------------------------------

describe("weekStart", () => {
  it("returns the Monday for a Wednesday", () => {
    const d = new Date("2025-05-14T10:00:00"); // Wednesday
    const start = weekStart(d);
    expect(start.getDay()).toBe(1); // Monday
    expect(start.toISOString().slice(0, 10)).toBe("2025-05-12");
  });

  it("returns the same day for a Monday", () => {
    const d = new Date("2025-05-12T00:00:00"); // Monday
    const start = weekStart(d);
    expect(start.toISOString().slice(0, 10)).toBe("2025-05-12");
  });

  it("returns the previous Monday for a Sunday", () => {
    const d = new Date("2025-05-18T23:59:00"); // Sunday
    const start = weekStart(d);
    expect(start.toISOString().slice(0, 10)).toBe("2025-05-12");
  });
});

// ---------------------------------------------------------------------------
// weekKey
// ---------------------------------------------------------------------------

describe("weekKey", () => {
  it("returns YYYY-MM-DD for a date", () => {
    const d = new Date("2025-05-12T00:00:00Z");
    expect(weekKey(d)).toBe("2025-05-12");
  });
});

// ---------------------------------------------------------------------------
// computeStreaks
// ---------------------------------------------------------------------------

describe("computeStreaks", () => {
  // Use a fixed "now" so tests don't depend on wall-clock date.
  // "now" = Wednesday 2025-05-14; current week starts 2025-05-12.
  const NOW = new Date("2025-05-14T12:00:00");

  it("returns zero streak when no sessions", () => {
    const stats = computeStreaks([], NOW);
    expect(stats.currentStreak).toBe(0);
    expect(stats.longestStreak).toBe(0);
    expect(stats.totalSessions).toBe(0);
    expect(stats.thisWeekSessions).toBe(0);
    expect(stats.lastWeekSessions).toBe(0);
  });

  it("counts a single session this week as streak=1", () => {
    const stats = computeStreaks(["2025-05-13T10:00:00"], NOW);
    expect(stats.currentStreak).toBe(1);
    expect(stats.thisWeekSessions).toBe(1);
  });

  it("counts sessions from last week when none this week (grace period)", () => {
    // No session in current week (May 12-18), one in previous week (May 5-11)
    const stats = computeStreaks(["2025-05-07T10:00:00"], NOW);
    expect(stats.currentStreak).toBe(1);
    expect(stats.lastWeekSessions).toBe(1);
    expect(stats.thisWeekSessions).toBe(0);
  });

  it("streak extends across consecutive weeks", () => {
    const sessions = [
      "2025-05-13T10:00:00", // this week
      "2025-05-06T10:00:00", // last week
      "2025-04-29T10:00:00", // two weeks ago
      "2025-04-22T10:00:00", // three weeks ago
    ];
    const stats = computeStreaks(sessions, NOW);
    expect(stats.currentStreak).toBe(4);
  });

  it("streak resets after a gap week", () => {
    const sessions = [
      "2025-05-13T10:00:00", // this week
      "2025-05-06T10:00:00", // last week
      // gap week: Apr 28 – May 4
      "2025-04-22T10:00:00", // three weeks ago
    ];
    const stats = computeStreaks(sessions, NOW);
    expect(stats.currentStreak).toBe(2);
  });

  it("longestStreak reflects historical best", () => {
    const sessions = [
      // 3-week run in March
      "2025-03-04T10:00:00",
      "2025-03-11T10:00:00",
      "2025-03-18T10:00:00",
      // gap
      // 2-week run now
      "2025-05-06T10:00:00",
      "2025-05-13T10:00:00",
    ];
    const stats = computeStreaks(sessions, NOW);
    expect(stats.longestStreak).toBe(3);
    expect(stats.currentStreak).toBe(2);
  });

  it("multiple sessions in same week count as one streak week", () => {
    const sessions = [
      "2025-05-12T08:00:00",
      "2025-05-13T08:00:00",
      "2025-05-14T08:00:00",
    ];
    const stats = computeStreaks(sessions, NOW);
    expect(stats.currentStreak).toBe(1);
    expect(stats.thisWeekSessions).toBe(3);
    expect(stats.totalSessions).toBe(3);
  });

  it("totalSessions is a raw count", () => {
    const sessions = new Array(12).fill("2025-05-13T10:00:00");
    const stats = computeStreaks(sessions, NOW);
    expect(stats.totalSessions).toBe(12);
  });

  it("accepts Date objects as well as strings", () => {
    const stats = computeStreaks([new Date("2025-05-13T10:00:00")], NOW);
    expect(stats.currentStreak).toBe(1);
  });
});
