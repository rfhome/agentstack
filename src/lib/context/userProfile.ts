import { prisma } from "../prisma";

export async function getUserContext(): Promise<string> {
  const profile = await prisma.userProfile.findUnique({ where: { id: 1 } });
  return profile?.context ?? "";
}
