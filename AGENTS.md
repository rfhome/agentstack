# AgentStack — Agent Architecture

## Overview

Four agents collaborate on every analysis. Three specialists run in parallel (Promise.allSettled), then a synthesizer integrates their outputs.

```
User session data + wearable context
        │
        ├──▶ Pulse  (Claude Sonnet)   fitness analysis
        ├──▶ Forge  (GPT-4o)          program prescription
        └──▶ Lens   (Gemini 2.5 Flash) recovery + longevity
                │
                └──▶ Nexus (Claude Sonnet)  synthesis → recommendation
```

All agents are fail-soft: if one throws, the others proceed. Nexus requires at least one agent to succeed.

---

## Agent inputs

Every agent receives an `AgentInput` object:

```typescript
interface AgentInput {
  sessionId?: number;
  userId?: string;
  sessionData: SessionSummary;       // today's session
  recentHistory: SessionSummary[];   // last 4 sessions
  goals: Goal[];                     // active goals (not yet achieved)
  userContext: string;               // full training profile markdown
  ouraContext?: string;              // formatted Oura readiness/sleep/HRV
  fitbitContext?: string;            // formatted Google Fit HR/AZM/steps
  appleHealthContext?: string;       // formatted Apple Health daily metrics (HRV, resting HR, sleep, steps)
  recentActivities?: RecentActivity[]; // standalone activities (runs, pickleball, etc.) — last 10, within 7 days
  images?: SessionImage[];           // workout screenshots (base64 + mediaType + name) — up to 4
}

interface SessionSummary {
  date: string;
  cycleDay: number;
  durationMinutes: number;
  avgHeartRate: number;
  cardioLoad: number;
  activeZoneMinutes: number;
  rating?: string;
  notes?: string;
  exercises: {
    name: string;
    sets: number;
    reps: string;       // e.g. "12,10,8,6"
    weightLbs: number;  // legacy field (may be 0)
    weights?: string;   // per-set weights string — source of truth, e.g. "95,95,100"
  }[];
  cardioActivities: {
    tag: string;        // "warmup" | "finisher" | "standalone"
    machine: string;    // "treadmill" | "bike" | "rower" | "elliptical"
    durationMin?: number | null;
    distanceMi?: number | null;
    calories?: number | null;
    avgHR?: number | null;
  }[];
}
```

---

## Pulse — Fitness Analyst
**Model:** Claude Sonnet  
**File:** `src/lib/agents/pulse.ts`

Analyzes session performance with emphasis on:
- Per-exercise breakdown using `weights` field as source of truth (not `weightLbs`)
- Progressive overload vs. recent history — what moved, what stalled, any PRs
- HR zone classification using Fitbit data when available (Fat Burn / Cardio / Peak minutes)
- Energy/effort inference from rating, notes, and HR
- Cardio activities breakdown (warmup/finisher/standalone, machine, HR, duration)
- Best and worst exercise of the session

**Image handling:** strips `images` from JSON text, passes them as separate Anthropic vision content blocks so screenshots are readable without inflating the text prompt.

Returns JSON: `{ analysis, recommendations, flags, nextSession, ... }`

---

## Forge — Program Architect
**Model:** GPT-4o  
**File:** `src/lib/agents/forge.ts`

Prescribes the next session with:
- Exact weights, sets, and reps for each movement
- Uses the exercises the athlete actually performed — does NOT substitute generics
- Reads `weights` string to determine actual load (e.g. "95,95,100" → working weight 95–100 lbs)
- Respects the user's defined program structure from `userContext`

**Image handling:** strips `images` before `JSON.stringify` — Forge is text-only (GPT-4o receives a JSON string, not a vision request), and embedding base64 blobs in the text prompt would blow the 128k context window.

Returns JSON: `{ analysis, recommendations, flags, nextSession, ... }`

---

## Lens — Recovery & Longevity Specialist
**Model:** Gemini 2.5 Flash  
**File:** `src/lib/agents/lens.ts`

Assesses through the lens of long-term health:
- Oura = how ready the athlete was going in (readiness, HRV, sleep score, temperature deviation)
- Fitbit = how hard they actually worked (HR, heart points, active minutes)
- Apple Health = additional recovery signal (HRV trend, resting HR, sleep hours, steps)
- Flags insufficient recovery, overreaching, consecutive high-load days
- Incorporates brain health / neurological longevity context from user profile
- Considers standalone activities (pickleball, golf, dog walks) as cumulative fatigue via `recentActivities`

**Image handling:** strips `images` from JSON text, passes them as Gemini `inlineData` parts — base64 embedded in JSON text would exceed Gemini's token limit and silently kill the agent.

Returns JSON: `{ analysis, recommendations, flags, nextSession, ... }`

---

## Nexus — Synthesizer
**Model:** Claude Sonnet  
**File:** `src/lib/agents/orchestrator.ts`

Receives all fulfilled agent responses plus session context. Resolves conflicts, weighs perspectives, and returns:

```json
{
  "content": "2–4 sentence synthesis paragraph",
  "nextActions": ["string", "string", "string"],
  "suggestedRating": "A" | "B" | "C",
  "ratingReason": "one sentence explaining the rating"
}
```

Stored as a `Recommendation` record linked to the session. The `suggestedRating` is surfaced to the user after analysis — they can accept it or pick a different one, which triggers a `PATCH /api/sessions/:id` to save the rating.

---

## JSON parsing

All agents are instructed to return raw JSON (no markdown fences). Server-side agent runners use the shared `extractJSON<T>()` utility in `src/lib/agents/parse.ts`.

The History UI (`SessionHistoryCard`) uses a more robust `parseAgentResponse()` because the raw LLM response is stored verbatim and can arrive with (1) markdown fences, (2) preamble text before the JSON, or (3) literal unescaped newlines/tabs inside string values. Its strategy:

1. Try `JSON.parse(text)` directly (most common path)
2. Try markdown fence extraction with the regex `/```(?:json)?\s*([\s\S]*?)\s*```/`
3. Try balanced-brace extraction: walk character-by-character from the first `{`, tracking string boundaries and escape sequences, to find the exact closing `}` — handles preamble text and missing closing fences
4. For each candidate string, also try `sanitizeJsonControlChars(candidate)` which escapes literal `\n`/`\r`/`\t` that appear inside string values before calling `JSON.parse`
5. Fallback: `{ analysis: rawText }`

`isValidRating()` from `parse.ts` validates A/B/C rating values.

---

## Storage

Each agent run creates an `AgentLog` row:
- `agentName`, `model`, `domain`
- `prompt` — full JSON input
- `response` — raw model output
- `latencyMs`
- linked to `sessionId` and `userId`

Nexus synthesis creates a `Recommendation` row linked to the session.

---

## Next.js version note

This project uses Next.js App Router. APIs, conventions, and file structure differ from Pages Router. Read `node_modules/next/dist/docs/` before making structural changes.
