import { describe, it, expect } from "vitest";
import {
  exerciseMatchesGoal,
  getMaxWeight,
  meetsWeightTarget,
  meetsRepsTarget,
} from "../goals";

describe("exerciseMatchesGoal", () => {
  it("matches exact name", () => {
    expect(exerciseMatchesGoal("Barbell Curl", "Barbell Curl")).toBe(true);
  });

  it("matches when exercise name contains goal name", () => {
    expect(exerciseMatchesGoal("EZ Bar Curl", "Curl")).toBe(true);
  });

  it("matches when goal name contains exercise name", () => {
    expect(exerciseMatchesGoal("Curl", "EZ Bar Curl")).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(exerciseMatchesGoal("barbell curl", "Barbell Curl")).toBe(true);
    expect(exerciseMatchesGoal("BENCH PRESS", "bench press")).toBe(true);
  });

  it("trims whitespace before comparing", () => {
    expect(exerciseMatchesGoal("  Bench Press  ", "Bench Press")).toBe(true);
  });

  it("returns false for unrelated exercises", () => {
    expect(exerciseMatchesGoal("Squat", "Bench Press")).toBe(false);
  });
});

describe("getMaxWeight", () => {
  it("returns weightLbs when no weights string", () => {
    expect(getMaxWeight(45, null)).toBe(45);
  });

  it("returns max from weights string", () => {
    expect(getMaxWeight(0, "35,40,45,45")).toBe(45);
  });

  it("returns max across weightLbs and weights string", () => {
    expect(getMaxWeight(50, "35,40,45")).toBe(50);
  });

  it("ignores non-numeric entries in weights string", () => {
    expect(getMaxWeight(0, "35,,45,abc")).toBe(45);
  });

  it("returns 0 when both are null/empty", () => {
    expect(getMaxWeight(null, null)).toBe(0);
    expect(getMaxWeight(null, "")).toBe(0);
  });
});

describe("meetsWeightTarget", () => {
  it("passes when no target is set", () => {
    expect(meetsWeightTarget(0, null)).toBe(true);
    expect(meetsWeightTarget(100, null)).toBe(true);
  });

  it("passes when weight equals target", () => {
    expect(meetsWeightTarget(45, 45)).toBe(true);
  });

  it("passes when weight exceeds target", () => {
    expect(meetsWeightTarget(50, 45)).toBe(true);
  });

  it("fails when weight is below target", () => {
    expect(meetsWeightTarget(40, 45)).toBe(false);
  });
});

describe("meetsRepsTarget", () => {
  it("passes when no target is set", () => {
    expect(meetsRepsTarget("10,10,8", null)).toBe(true);
    expect(meetsRepsTarget(null, null)).toBe(true);
  });

  it("passes when min session reps meets target", () => {
    expect(meetsRepsTarget("12,12,10", "10")).toBe(true);
  });

  it("passes when all sets hit target exactly", () => {
    expect(meetsRepsTarget("10,10,10", "10")).toBe(true);
  });

  it("fails when any set is below target (min reps check)", () => {
    expect(meetsRepsTarget("12,12,8", "10")).toBe(false);
  });

  it("handles range target like '8-10' by using the first number", () => {
    expect(meetsRepsTarget("8,8,8", "8-10")).toBe(true);
    expect(meetsRepsTarget("7,8,8", "8-10")).toBe(false);
  });

  it("fails when session reps is null but target exists", () => {
    expect(meetsRepsTarget(null, "10")).toBe(false);
  });

  it("passes when target reps is non-numeric", () => {
    expect(meetsRepsTarget("10,10", "AMRAP")).toBe(true);
  });
});
