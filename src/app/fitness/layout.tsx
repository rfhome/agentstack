import { requireActive } from "@/lib/auth-guard";

export default async function FitnessLayout({ children }: { children: React.ReactNode }) {
  await requireActive();
  return <>{children}</>;
}
