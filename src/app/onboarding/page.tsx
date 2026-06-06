import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { withRLS } from "@/lib/prisma-rls";
import { OnboardingWizard } from "./OnboardingWizard";
import type { ProgramConfig } from "@/lib/onboarding/types";

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");
  const userId = session.user.id;

  const [profile, user] = await Promise.all([
    withRLS(userId, (db) => db.userProfile.findFirst({ where: { userId } })),
    prisma.user.findUnique({ where: { id: userId }, select: { tier: true } }),
  ]);

  const hasProfile = Boolean(profile?.onboardingComplete);
  const existingProgramConfig = (profile?.programConfig as unknown as ProgramConfig) ?? null;
  const tier = user?.tier ?? "free";

  return (
    <OnboardingWizard
      hasProfile={hasProfile}
      existingProgramConfig={existingProgramConfig}
      tier={tier}
    />
  );
}
