import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendApprovalEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  const session = await auth();
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!session?.user?.email || !adminEmail || session.user.email !== adminEmail) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId, tier } = await req.json();
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const validTiers = ["free", "beta", "premium"];
  const assignedTier = validTiers.includes(tier) ? tier : "free";

  const user = await prisma.user.update({
    where: { id: userId },
    data: { status: "active", tier: assignedTier },
    select: { email: true, name: true },
  });

  await sendApprovalEmail(user.email, user.name ?? "").catch(console.error);

  return NextResponse.json({ ok: true });
}
