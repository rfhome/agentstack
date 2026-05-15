-- Seed UserProfile (singleton row id=1)
INSERT INTO "UserProfile" (id, name, context, "updatedAt")
VALUES (
  1,
  'Roberto',
  E'# Roberto — Training Profile (Planet Fitness, Chili NY)\n\n## Program Structure: 4-Day Push/Pull/Legs/Arms Cycle\n\n### Day 1 — Push (Chest / Shoulders / Triceps)\n- Smith Machine Incline Press (primary lift) — progressive sets: 12,10,8,6 with increasing weight each set\n- Machine Shoulder Press\n- Cable Rope Pushdowns (triceps)\n- Smith Machine Incline Push-ups (bodyweight finisher)\n- Note: shoulder tightness is a known flag on lateral raises — monitor carefully\n\n### Day 2 — Pull (Back / Biceps)\n- Lat Pulldown (primary lift) — current working sets: 95x12, 110x10, 120x8, 130x6-8\n- Seated Cable Row — current: 80x12, 95x10, 110x8, 120x6-8\n- Face Pulls (shoulder health / rear delts) — 3x12-15\n- Cable Bicep Curls — progressive: 25/30/35/40\n- Pull-ups (bodyweight, when available)\n\n### Day 3 — Legs\n- Machine Leg Press (primary lift)\n- Smith Machine Squat\n- Machine Leg Extension\n- Seated Leg Curl — quads ahead of hamstrings, hamstrings are the current limiter\n- Calf Extension\n- Vertical Knee Raise (core)\n\n### Day 4 — Arms\n- Barbell Curl (primary)\n- Hammer Curl\n- Cable Bicep work\n- Tricep isolation (pushdowns, overhead)\n\n## Rating System\n- A = PR achieved, felt strong and explosive, energy high\n- B = Solid session, manageable effort, good form — this is the target zone\n- C = Cut short, poor recovery, or something was off\n\n## Training Principles\n- Progressive overload: increase weight when top set is hit cleanly\n- Smith Machine Incline Press: progressive loading per set — e.g. 25/30/35/40\n- Slow eccentric (3-second negative) on key lifts\n- Pull-ups: vary tempo for neural strength carryover\n- Machine availability at Planet Fitness sometimes requires substitution\n\n## Cardio\n- 5-6 min treadmill warm-up standard\n- Tracks: duration, avg HR, cardio load, Active Zone Minutes (Fitbit)\n- Dog walks count as LISS cardio\n\n## Recovery & Longevity (HIGH PRIORITY)\n- Uses Oura Ring: readiness score, HRV, sleep score nightly\n- Brain health is an explicit training priority\n- Family history of Parkinson''s disease — neurological health must always be factored in\n- BDNF optimization through moderate-intensity resistance training is a known goal\n- Sleep quality and HRV are primary recovery signals\n\n## Supplements\n- Thorne Zinc Picolinate 15mg\n- Stress B-Complex\n\n## Equipment\n- Planet Fitness: selectorized machines, Smith machines, cable station, cardio deck\n- No free barbells (except curl bar), dumbbells available',
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  context = EXCLUDED.context,
  "updatedAt" = NOW();

-- Seed Goals
DELETE FROM "Goal";

INSERT INTO "Goal" (exercise, "targetWeightLbs", "targetReps", achieved, "createdAt")
VALUES
  ('Smith Machine Incline Press', 55, '8', false, NOW()),
  ('Flat Dumbbell Press', 45, '10', false, NOW()),
  ('Lat Pulldown', 140, '8', false, NOW()),
  ('Seated Cable Row', 130, '8', false, NOW()),
  ('Cable Bicep Curl', 45, '8', false, NOW()),
  ('Machine Leg Press', 200, '10', false, NOW()),
  ('Seated Leg Curl', 110, '10', false, NOW());
