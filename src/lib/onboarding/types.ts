// ---------------------------------------------------------------------------
// Onboarding wizard — shared types
// ---------------------------------------------------------------------------

export type GoalType =
  | "build_muscle"
  | "lose_weight"
  | "stay_healthy"
  | "athletic_performance";

export type ExperienceLevel = "beginner" | "intermediate" | "advanced";

export type GymType =
  | "commercial"       // full-equipment commercial gym
  | "planet_fitness"   // Planet Fitness — no Olympic barbell, dumbbells ≤ 75 lbs
  | "home_gym"         // home setup (varies)
  | "bodyweight";      // minimal / no equipment

export interface CycleDay {
  day: number;
  label: string;    // e.g. "Push", "Pull", "Full Body"
  focus: string;    // e.g. "Chest, shoulders, triceps"
}

export interface ProgramConfig {
  daysPerWeek: number;
  goal: GoalType;
  goalLabel: string;
  experienceLevel: ExperienceLevel;
  injuries: string[];
  otherActivities: string;
  gymType: GymType;
  gymNotes: string;
  cycleStructure: CycleDay[];
}

/** Accumulated answers during the wizard — pre-generation */
export interface WizardDraft {
  name: string;
  daysPerWeek: number | null;
  goal: GoalType | null;
  experienceLevel: ExperienceLevel | null;
  injuries: string[];
  otherActivities: string;
  gymType: GymType | null;
  gymNotes: string;
}

export const GOAL_LABELS: Record<GoalType, string> = {
  build_muscle: "Build muscle",
  lose_weight: "Lose weight",
  stay_healthy: "Stay healthy",
  athletic_performance: "Athletic performance",
};

export const EXPERIENCE_LABELS: Record<ExperienceLevel, string> = {
  beginner: "Beginner (< 1 year)",
  intermediate: "Intermediate (1–3 years)",
  advanced: "Advanced (3+ years)",
};

export const GYM_LABELS: Record<GymType, string> = {
  commercial: "Full commercial gym",
  planet_fitness: "Planet Fitness",
  home_gym: "Home gym",
  bodyweight: "Bodyweight / minimal equipment",
};

export const INJURY_OPTIONS = [
  "Lower back",
  "Knees",
  "Shoulders",
  "Wrists",
  "Hips",
  "Neck",
];

export const ACTIVITY_OPTIONS = [
  "Pickleball",
  "Golf",
  "Running",
  "Cycling",
  "Hiking",
  "Swimming",
  "Tennis",
  "Basketball",
];
