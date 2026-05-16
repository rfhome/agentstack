import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { withRLS } from "@/lib/prisma-rls";
import { OnboardingWizard } from "./OnboardingWizard";

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");
  const userId = session.user.id;

  const profile = await withRLS(userId, (db) =>
    db.userProfile.findFirst({ where: { userId } })
  );

  const hasProfile = Boolean(profile?.context);

  return <OnboardingWizard hasProfile={hasProfile} />;
}
