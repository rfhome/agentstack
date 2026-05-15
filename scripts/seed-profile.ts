import { config } from "dotenv";
config({ path: ".env.local" });

import { prisma } from "../src/lib/prisma";

const USER_CONTEXT = `
# Roberto — Training Profile (Planet Fitness, Chili NY)

## Program Structure: 4-Day Push/Pull/Legs/Arms Cycle

### Day 1 — Push (Chest / Shoulders / Triceps)
- Smith Machine Incline Press (primary lift) — progressive sets: 12,10,8,6 with increasing weight each set
- Machine Shoulder Press
- Cable Rope Pushdowns (triceps)
- Smith Machine Incline Push-ups (bodyweight finisher)
- Note: shoulder tightness is a known flag on lateral raises — monitor carefully

### Day 2 — Pull (Back / Biceps)
- Lat Pulldown (primary lift) — current working sets: 95×12, 110×10, 120×8, 130×6-8
- Seated Cable Row — current: 80×12, 95×10, 110×8, 120×6-8
- Face Pulls (shoulder health / rear delts) — 3×12-15
- Cable Bicep Curls — progressive: 25/30/35/40
- Pull-ups (bodyweight, when available)

### Day 3 — Legs
- Machine Leg Press (primary lift)
- Smith Machine Squat
- Machine Leg Extension
- Seated Leg Curl — quads ahead of hamstrings, hamstrings are the current limiter
- Calf Extension
- Vertical Knee Raise (core)

### Day 4 — Arms
- Barbell Curl (primary)
- Hammer Curl
- Cable Bicep work
- Tricep isolation (pushdowns, overhead)

## Rating System
- A = PR achieved, felt strong and explosive, energy high
- B = Solid session, manageable effort, good form — this is the target zone for sustainable strength building
- C = Cut short, poor recovery, or something was off

## Training Principles
- Progressive overload: track weights weekly and increase when top set is hit cleanly
- For Smith Machine Incline Press: progressive loading per set (not flat weight) — e.g. 25/30/35/40
- Slow eccentric (3-second negative) on key lifts for hypertrophy and injury prevention
- Pull-ups: vary tempo — normal / slow negative / explosive — for neural strength carryover
- Machine availability at Planet Fitness sometimes requires exercise substitution

## Cardio
- Done before or after lifting (5-6 min treadmill warm-up standard)
- Tracks: duration, avg HR, cardio load, Active Zone Minutes (Fitbit)
- Dog walks count as LISS cardio

## Recovery & Longevity (HIGH PRIORITY)
- Uses Oura Ring: tracks readiness score, HRV, sleep score nightly
- Brain health is an explicit training priority — not just aesthetics or performance
- Family history of Parkinson's disease — neurological health must be factored into all recovery and longevity assessments
- BDNF optimization through moderate-intensity resistance training is a known goal
- Sleep quality and HRV are primary recovery signals — flag when readiness is low before recommending intensity increases

## Supplements (context for Lens)
- Thorne Zinc Picolinate 15mg
- Stress B-Complex

## Equipment Context
- Planet Fitness: selectorized machines, Smith machines, 30-min circuit, cable station, cardio deck
- No free barbells (except curl bar)
- Dumbbells available
`.trim();

const GOALS = [
  { exercise: "Smith Machine Incline Press", targetWeightLbs: 55, targetReps: "8" },
  { exercise: "Flat Dumbbell Press", targetWeightLbs: 45, targetReps: "10" },
  { exercise: "Lat Pulldown", targetWeightLbs: 140, targetReps: "8" },
  { exercise: "Seated Cable Row", targetWeightLbs: 130, targetReps: "8" },
  { exercise: "Cable Bicep Curl", targetWeightLbs: 45, targetReps: "8" },
  { exercise: "Machine Leg Press", targetWeightLbs: 200, targetReps: "10" },
  { exercise: "Seated Leg Curl", targetWeightLbs: 110, targetReps: "10" },
];

async function main() {
  // Upsert UserProfile (id=1 is the singleton)
  await prisma.userProfile.upsert({
    where: { id: 1 },
    update: { context: USER_CONTEXT },
    create: { id: 1, name: "Roberto", context: USER_CONTEXT },
  });
  console.log("✓ UserProfile seeded");

  // Clear old goals and insert fresh
  await prisma.goal.deleteMany({});
  await prisma.goal.createMany({ data: GOALS });
  console.log(`✓ ${GOALS.length} goals seeded`);

  const profile = await prisma.userProfile.findUnique({ where: { id: 1 } });
  console.log(`\nProfile context length: ${profile?.context.length} chars`);
  console.log("Goals:");
  GOALS.forEach(g => console.log(`  ${g.exercise} → ${g.targetWeightLbs}lbs × ${g.targetReps}`));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
