import { describe, it, expect } from "vitest";
import { deriveProgramConfig, buildGeneratePrompt, parseGenerateResponse } from "../generate";

// ---------------------------------------------------------------------------
// deriveProgramConfig
// ---------------------------------------------------------------------------

describe("deriveProgramConfig", () => {
  it("maps strength goal to build_muscle", () => {
    const config = deriveProgramConfig({ primaryGoal: "strength", split: "ppla", equipment: "full", experience: "3-5y" });
    expect(config.goal).toBe("build_muscle");
    expect(config.goalLabel).toBe("Build muscle");
  });

  it("maps longevity goal to stay_healthy", () => {
    const config = deriveProgramConfig({ primaryGoal: "longevity", split: "fullbody", equipment: "full", experience: "beginner" });
    expect(config.goal).toBe("stay_healthy");
  });

  it("maps weight goal to lose_weight", () => {
    const config = deriveProgramConfig({ primaryGoal: "weight", split: "ul", equipment: "limited", experience: "1-2y" });
    expect(config.goal).toBe("lose_weight");
  });

  it("maps ppla split to 4-day Push/Pull/Legs/Arms cycle", () => {
    const config = deriveProgramConfig({ primaryGoal: "strength", split: "ppla", equipment: "full", experience: "5plus" });
    expect(config.cycleStructure).toHaveLength(4);
    expect(config.cycleStructure[0].label).toBe("Push");
    expect(config.cycleStructure[1].label).toBe("Pull");
    expect(config.cycleStructure[2].label).toBe("Legs");
    expect(config.cycleStructure[3].label).toBe("Arms");
    expect(config.daysPerWeek).toBe(4);
  });

  it("maps ppl split to 3-day cycle", () => {
    const config = deriveProgramConfig({ primaryGoal: "strength", split: "ppl", equipment: "full", experience: "3-5y" });
    expect(config.cycleStructure).toHaveLength(3);
    expect(config.cycleStructure.map(d => d.label)).toEqual(["Push", "Pull", "Legs"]);
    expect(config.daysPerWeek).toBe(3);
  });

  it("maps ul split to Upper/Lower 2-day cycle", () => {
    const config = deriveProgramConfig({ primaryGoal: "general", split: "ul", equipment: "full", experience: "1-2y" });
    expect(config.cycleStructure).toHaveLength(2);
    expect(config.cycleStructure[0].label).toBe("Upper");
    expect(config.cycleStructure[1].label).toBe("Lower");
  });

  it("maps fullbody to 2 Full Body days", () => {
    const config = deriveProgramConfig({ primaryGoal: "general", split: "fullbody", equipment: "home", experience: "beginner" });
    expect(config.cycleStructure.length).toBeGreaterThanOrEqual(2);
    expect(config.cycleStructure[0].label).toContain("Full Body");
  });

  it("maps equipment limited to planet_fitness", () => {
    const config = deriveProgramConfig({ primaryGoal: "strength", split: "ppla", equipment: "limited", experience: "5plus" });
    expect(config.gymType).toBe("planet_fitness");
  });

  it("maps equipment home to home_gym", () => {
    const config = deriveProgramConfig({ primaryGoal: "strength", split: "ul", equipment: "home", experience: "1-2y" });
    expect(config.gymType).toBe("home_gym");
  });

  it("maps experience 3-5y to advanced", () => {
    const config = deriveProgramConfig({ primaryGoal: "strength", split: "ppla", equipment: "full", experience: "3-5y" });
    expect(config.experienceLevel).toBe("advanced");
  });

  it("maps experience beginner to beginner", () => {
    const config = deriveProgramConfig({ primaryGoal: "general", split: "fullbody", equipment: "home", experience: "beginner" });
    expect(config.experienceLevel).toBe("beginner");
  });

  it("parses injuries string into array", () => {
    const config = deriveProgramConfig({
      primaryGoal: "strength",
      split: "ppla",
      equipment: "full",
      experience: "5plus",
      injuries: "lower back, knees",
    });
    expect(config.injuries).toEqual(["lower back", "knees"]);
  });

  it("returns empty injuries array when injuries field is absent", () => {
    const config = deriveProgramConfig({ primaryGoal: "strength", split: "ppla", equipment: "full", experience: "5plus" });
    expect(config.injuries).toEqual([]);
  });

  it("preserves otherActivities string", () => {
    const config = deriveProgramConfig({
      primaryGoal: "strength",
      split: "ppla",
      equipment: "full",
      experience: "5plus",
      otherActivities: "pickleball, golf",
    });
    expect(config.otherActivities).toBe("pickleball, golf");
  });

  it("uses fullbody as fallback for unknown split", () => {
    const config = deriveProgramConfig({ primaryGoal: "strength", split: "unknown_split", equipment: "full", experience: "5plus" });
    expect(config.cycleStructure[0].label).toContain("Full Body");
  });

  it("uses stay_healthy as fallback for unknown goal", () => {
    const config = deriveProgramConfig({ primaryGoal: "totally_unknown", split: "ppla", equipment: "full", experience: "5plus" });
    expect(config.goal).toBe("stay_healthy");
  });
});

// ---------------------------------------------------------------------------
// buildGeneratePrompt
// ---------------------------------------------------------------------------

describe("buildGeneratePrompt", () => {
  it("includes name in the prompt", () => {
    const prompt = buildGeneratePrompt({
      name: "Alice",
      daysPerWeek: 4,
      goal: "build_muscle",
      experienceLevel: "advanced",
      injuries: [],
      otherActivities: "",
      gymType: "commercial",
      gymNotes: "",
    });
    expect(prompt).toContain("Alice");
  });

  it("includes goal label in prompt", () => {
    const prompt = buildGeneratePrompt({
      name: "Bob",
      daysPerWeek: 3,
      goal: "lose_weight",
      experienceLevel: "beginner",
      injuries: [],
      otherActivities: "",
      gymType: "commercial",
      gymNotes: "",
    });
    expect(prompt).toContain("Lose weight");
  });

  it("includes gym notes when provided", () => {
    const prompt = buildGeneratePrompt({
      name: "Carol",
      daysPerWeek: 4,
      goal: "build_muscle",
      experienceLevel: "intermediate",
      injuries: [],
      otherActivities: "",
      gymType: "home_gym",
      gymNotes: "barbell, pull-up bar",
    });
    expect(prompt).toContain("barbell, pull-up bar");
  });
});

// ---------------------------------------------------------------------------
// parseGenerateResponse
// ---------------------------------------------------------------------------

describe("parseGenerateResponse", () => {
  it("parses a valid response", () => {
    const text = JSON.stringify({
      cycleStructure: [
        { day: 1, label: "Push", focus: "Chest, shoulders" },
        { day: 2, label: "Pull", focus: "Back, biceps" },
      ],
      profileMarkdown: "# Profile\nThis is a test profile with enough content.",
    });
    const result = parseGenerateResponse(text);
    expect(result.cycleStructure).toHaveLength(2);
    expect(result.cycleStructure[0].label).toBe("Push");
    expect(result.profileMarkdown).toContain("Profile");
  });

  it("returns fallback cycleStructure when response is malformed", () => {
    const result = parseGenerateResponse("not json at all");
    expect(result.cycleStructure.length).toBeGreaterThan(0);
  });

  it("returns fallback when cycleStructure is missing", () => {
    const result = parseGenerateResponse(JSON.stringify({ profileMarkdown: "# Profile\nsome content here" }));
    expect(result.cycleStructure.length).toBeGreaterThan(0);
  });
});
