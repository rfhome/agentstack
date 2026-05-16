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
