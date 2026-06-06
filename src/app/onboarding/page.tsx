import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { withRLS } from "@/lib/prisma-rls";
import { OnboardingWizard } from "./OnboardingWizard";
import type { ProgramConfig } from "@/lib/onboarding/types";

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");
  const userId = session.user.id;

  const profile = await withRLS(userId, (db) =>
    db.userProfile.findFirst({ where: { userId } })
  );

  const hasProfile = Boolean(profile?.onboardingComplete);
  const existingProgramConfig = (profile?.programConfig as unknown as ProgramConfig) ?? null;

  return (
    <OnboardingWizard
      hasProfile={hasProfile}
      existingProgramConfig={existingProgramConfig}
    />
  );
}
