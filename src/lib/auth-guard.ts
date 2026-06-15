import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export async function requireActive(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { status: true },
  });

  if (!user || user.status !== "active") redirect("/auth/pending");
  return session.user.id;
}
