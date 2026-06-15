import { requireActive } from "@/lib/auth-guard";

export default async function ProfileLayout({ children }: { children: React.ReactNode }) {
  await requireActive();
  return <>{children}</>;
}
