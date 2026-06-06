import { describe, it, expect } from "vitest";

/**
 * Tests for the cardio photo field name normalization.
 * The /api/analyze/cardio-photo endpoint must return durationMin, distanceMi,
 * avgHR, maxHR — matching the form state field names exactly.
 */

type CardioPhotoResponse = {
  durationMin: number | null;
  distanceMi: number | null;
  calories: number | null;
  avgHR: number | null;
  maxHR: number | null;
};

/** Simulates the normalization the endpoint does before returning */
function normalizeCardioPhotoFields(raw: {
  durationMinutes?: number | null;
  distanceMiles?: number | null;
  calories?: number | null;
  avgHeartRate?: number | null;
  maxHeartRate?: number | null;
}): CardioPhotoResponse {
  return {
    durationMin: raw.durationMinutes ?? null,
    distanceMi: raw.distanceMiles ?? null,
    calories: raw.calories ?? null,
    avgHR: raw.avgHeartRate ?? null,
    maxHR: raw.maxHeartRate ?? null,
  };
}

describe("cardio photo field normalization", () => {
  it("maps durationMinutes → durationMin", () => {
    const result = normalizeCardioPhotoFields({ durationMinutes: 32 });
    expect(result.durationMin).toBe(32);
  });

  it("maps distanceMiles → distanceMi", () => {
    const result = normalizeCardioPhotoFields({ distanceMiles: 1.4 });
    expect(result.distanceMi).toBe(1.4);
  });

  it("maps avgHeartRate → avgHR", () => {
    const result = normalizeCardioPhotoFields({ avgHeartRate: 112 });
    expect(result.avgHR).toBe(112);
  });

  it("maps maxHeartRate → maxHR", () => {
    const result = normalizeCardioPhotoFields({ maxHeartRate: 145 });
    expect(result.maxHR).toBe(145);
  });

  it("passes calories through unchanged", () => {
    const result = normalizeCardioPhotoFields({ calories: 250 });
    expect(result.calories).toBe(250);
  });

  it("returns null for missing fields", () => {
    const result = normalizeCardioPhotoFields({});
    expect(result.durationMin).toBeNull();
    expect(result.distanceMi).toBeNull();
    expect(result.avgHR).toBeNull();
    expect(result.maxHR).toBeNull();
    expect(result.calories).toBeNull();
  });

  it("handles a full treadmill screen extraction", () => {
    const result = normalizeCardioPhotoFields({
      durationMinutes: 5,
      distanceMiles: 0.4,
      calories: 41,
      avgHeartRate: 98,
      maxHeartRate: 120,
    });
    expect(result).toEqual({
      durationMin: 5,
      distanceMi: 0.4,
      calories: 41,
      avgHR: 98,
      maxHR: 120,
    });
  });
});
