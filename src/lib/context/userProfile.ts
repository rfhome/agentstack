import { prisma } from "../prisma";
import type { RLSClient } from "../prisma-rls";

export async function getUserContext(
  userId: string,
  db: RLSClient | typeof prisma = prisma
): Promise<string> {
  const profile = await db.userProfile.findFirst({
    where: { userId },
  });
  return profile?.context ?? "";
}

// A temporary, athlete-set directive (e.g. "pause PR pursuit while adjusting to a wrist wrap")
// that persists across sessions without living in the permanent coaching profile.
// Returns null once past its expiry — callers don't need to check dates themselves.
export async function getStandingDirective(
  userId: string,
  db: RLSClient | typeof prisma = prisma
): Promise<string | null> {
  const profile = await db.userProfile.findFirst({
    where: { userId },
    select: { standingNote: true, standingNoteExpiresAt: true },
  });
  if (!profile?.standingNote) return null;
  if (profile.standingNoteExpiresAt && profile.standingNoteExpiresAt < new Date()) return null;
  return profile.standingNote;
}
