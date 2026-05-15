/**
 * One-time script: links all existing data to the first registered user.
 * Run once after signing up: npx ts-node --project tsconfig.scripts.json scripts/backfill-user.ts
 */
import { config } from "dotenv";
config({ path: ".env.local", override: true });

import { prisma } from "../src/lib/prisma";

async function main() {
  const user = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });
  if (!user) {
    console.error("No user found — sign up first, then run this script.");
    process.exit(1);
  }

  console.log(`Backfilling all data to user: ${user.email} (${user.id})`);

  const [sessions, goals, recommendations, agentLogs, profile] = await Promise.all([
    prisma.session.updateMany({ where: { userId: null }, data: { userId: user.id } }),
    prisma.goal.updateMany({ where: { userId: null }, data: { userId: user.id } }),
    prisma.recommendation.updateMany({ where: { userId: null }, data: { userId: user.id } }),
    prisma.agentLog.updateMany({ where: { userId: null }, data: { userId: user.id } }),
    prisma.userProfile.updateMany({ where: { userId: null }, data: { userId: user.id } }),
  ]);

  console.log(`Sessions:        ${sessions.count}`);
  console.log(`Goals:           ${goals.count}`);
  console.log(`Recommendations: ${recommendations.count}`);
  console.log(`Agent logs:      ${agentLogs.count}`);
  console.log(`User profile:    ${profile.count}`);
  console.log("Done.");
}

main().catch((e) => { console.error(e); process.exit(1); });
