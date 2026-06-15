import { requireActive } from "@/lib/auth-guard";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  await requireActive();
  return <>{children}</>;
}
