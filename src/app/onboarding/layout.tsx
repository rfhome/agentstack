import { requireActive } from "@/lib/auth-guard";

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  await requireActive();
  return <>{children}</>;
}
