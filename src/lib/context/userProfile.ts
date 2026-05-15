import { prisma } from "../prisma";

export async function getUserContext(userId: string): Promise<string> {
  const profile = await prisma.userProfile.findFirst({
    where: { userId },
  });
  return profile?.context ?? "";
}
