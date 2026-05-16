@AGENTS.md

# AgentStack — Development Guide for Claude

## Project overview
Multi-agent AI fitness platform. Next.js App Router + TypeScript + Tailwind + Prisma 7 + PostgreSQL on Railway. See README.md for full stack details and AGENTS.md for agent architecture.

## Critical patterns

### Auth
- Server components / API routes: `import { auth } from "@/auth"` → `const session = await auth()`
- Always check `session?.user?.id` and return 401 / redirect if missing
- Middleware at `src/middleware.ts` imports only `auth.config.ts` (Edge-safe, no bcrypt)
- Full auth with providers is in `src/auth.ts` (Node.js only)

### Database
- `import { prisma } from "@/lib/prisma"` — PrismaPg adapter, no libquery engine
- Migrations: schema changes go via `npx prisma db push` (dev) or manual SQL via `prisma db execute`
- **Never use upsert on nullable unique fields** — use findFirst + update/create instead
- All queries must be scoped by `userId`

### Prisma schema quirks
- `UserProfile.userId` is `String? @unique` (nullable for legacy backfill reasons) — use findFirst + update/create, not upsert
- `Session`, `Exercise`, `AgentLog`, `Recommendation`, `Goal` all have nullable `userId String?` for the same reason — always filter by userId

### Agents
- Agent files: `src/lib/agents/pulse.ts`, `forge.ts`, `lens.ts`, `orchestrator.ts`
- All agents return JSON. Use the fence-extraction pattern (see AGENTS.md) for robust parsing
- `weights` (String?) is the source of truth for per-set load — not `weightLbs` (legacy, often 0)
- Add `fitbitContext` and `ouraContext` as optional fields when extending AgentInput

### Wearables
- Token refresh logic lives in `src/lib/oura.ts` and `src/lib/fitbit.ts`
- Oura token exchange: body params with client_id/secret
- Fitbit/Google token exchange: body params (NOT Basic auth) — Google standard
- CSRF state: `Buffer.from(userId).toString("base64url")` — verified against active session in callback

### Styling
- Dark zinc theme throughout: `bg-zinc-950` page, `bg-zinc-900` cards, `border-zinc-800` borders
- Text: `text-white` headings, `text-zinc-300` body, `text-zinc-500` labels/metadata
- No emojis in UI unless explicitly requested
- No comments in code unless the WHY is non-obvious

### Environment variables
Required: `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY`  
Wearables: `OURA_CLIENT_ID`, `OURA_CLIENT_SECRET`, `FITBIT_CLIENT_ID`, `FITBIT_CLIENT_SECRET`  
Google Sign-In: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`  
Railway: also needs `AUTH_TRUST_HOST=true`

### dotenv in scripts
Scripts that run outside Next.js must use `config({ path: ".env.local", override: true })` — shell environment may have empty API keys that would otherwise block dotenv.

## Common mistakes to avoid
- Don't import from `@/auth` in Edge middleware — use `@/auth.config` only
- Don't use `response_format: { type: "json_object" }` on Claude — GPT-4o only
- Don't use `upsert` with nullable unique fields in Prisma
- Don't assume `weightLbs` is populated — always check `weights` string first
- Don't strip only leading/trailing fences — use the regex extraction pattern that handles preamble text
