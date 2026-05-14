import { config } from "dotenv";
config({ path: ".env.local" });

import { runOrchestrator } from "../src/lib/agents/orchestrator";
import type { AgentInput } from "../src/lib/agents/types";

const mockInput: AgentInput = {
  sessionData: {
    date: "2026-05-13",
    cycleDay: 1,
    durationMinutes: 58,
    avgHeartRate: 142,
    cardioLoad: 87,
    activeZoneMinutes: 34,
    rating: "B",
    notes: "Felt strong on incline press, shoulder a bit tight on lat raises",
    exercises: [
      { name: "Incline Smith Machine Press", sets: 4, reps: "8,8,8,6", weightLbs: 45 },
      { name: "Flat Dumbbell Press", sets: 3, reps: "10,10,8", weightLbs: 40 },
      { name: "Cable Lateral Raise", sets: 3, reps: "12,12,10", weightLbs: 15 },
      { name: "Tricep Pushdown", sets: 3, reps: "12,12,12", weightLbs: 50 },
    ],
  },
  recentHistory: [
    {
      date: "2026-05-11",
      cycleDay: 4,
      durationMinutes: 52,
      avgHeartRate: 138,
      cardioLoad: 72,
      activeZoneMinutes: 28,
      rating: "A",
      exercises: [
        { name: "Barbell Curl", sets: 4, reps: "10,10,8,8", weightLbs: 55 },
        { name: "Hammer Curl", sets: 3, reps: "12,12,10", weightLbs: 30 },
      ],
    },
  ],
  goals: [
    { exercise: "Incline Smith Machine Press", targetWeightLbs: 55, targetReps: "8" },
    { exercise: "Flat Dumbbell Press", targetWeightLbs: 45, targetReps: "10" },
    { exercise: "Lat Pulldown", targetWeightLbs: 140, targetReps: "10" },
  ],
  userContext: "Push/Pull/Legs/Arms cycle. Prioritizes brain health and longevity. Tracks Fitbit metrics.",
};

async function main() {
  console.log("Running orchestrator with mock Push Day 1 session...\n");
  const result = await runOrchestrator(mockInput);

  console.log("=== AGENT RESPONSES ===");
  for (const agent of result.agentResponses) {
    console.log(`\n[${agent.agentName}] (${agent.latencyMs}ms)`);
    console.log(`Analysis: ${agent.analysis}`);
    console.log(`Next Session: ${agent.nextSession}`);
    if (agent.flags.length) console.log(`Flags: ${agent.flags.join(", ")}`);
  }

  console.log("\n=== NEXUS SYNTHESIS ===");
  console.log(result.recommendation.content);
  console.log("\nNext Actions:");
  result.recommendation.nextActions.forEach((a, i) => console.log(`  ${i + 1}. ${a}`));
  console.log("\nAll responses saved to Postgres.");
}

main().catch((err) => {
  console.error("Orchestrator test failed:", err.message);
  process.exit(1);
});
