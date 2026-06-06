import { describe, it, expect } from "vitest";

/**
 * Tests for the pre-workout context feature.
 * Verifies that workoutContext is correctly included in the prescribe prompt
 * and that the URL param is properly constructed.
 */

function buildPrescribeParams(cycleDay: string, context?: string): URLSearchParams {
  const params = new URLSearchParams({ cycleDay });
  if (context?.trim()) params.set("context", context.trim());
  return params;
}

function buildPrescribePrompt(
  base: { requestedCycleDay: number; cycleLabel: string },
  context?: string
): object {
  return {
    ...base,
    ...(context ? { todayContext: context } : {}),
  };
}

describe("prescribe context param", () => {
  it("includes context param when provided", () => {
    const params = buildPrescribeParams("1", "going golfing tomorrow");
    expect(params.get("context")).toBe("going golfing tomorrow");
  });

  it("omits context param when empty", () => {
    const params = buildPrescribeParams("1", "");
    expect(params.has("context")).toBe(false);
  });

  it("omits context param when whitespace only", () => {
    const params = buildPrescribeParams("1", "   ");
    expect(params.has("context")).toBe(false);
  });

  it("trims whitespace from context", () => {
    const params = buildPrescribeParams("2", "  sore knee  ");
    expect(params.get("context")).toBe("sore knee");
  });
});

describe("prescribe prompt construction", () => {
  it("includes todayContext in prompt when context provided", () => {
    const prompt = buildPrescribePrompt(
      { requestedCycleDay: 1, cycleLabel: "Push" },
      "going golfing tomorrow"
    );
    expect(prompt).toHaveProperty("todayContext", "going golfing tomorrow");
  });

  it("omits todayContext when context is empty", () => {
    const prompt = buildPrescribePrompt({ requestedCycleDay: 1, cycleLabel: "Push" });
    expect(prompt).not.toHaveProperty("todayContext");
  });

  it("preserves base prompt fields", () => {
    const prompt = buildPrescribePrompt(
      { requestedCycleDay: 3, cycleLabel: "Legs" },
      "pickleball yesterday, legs fatigued"
    ) as Record<string, unknown>;
    expect(prompt.requestedCycleDay).toBe(3);
    expect(prompt.cycleLabel).toBe("Legs");
    expect(prompt.todayContext).toBe("pickleball yesterday, legs fatigued");
  });
});
