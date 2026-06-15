import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!session?.user?.email || !adminEmail || session.user.email !== adminEmail) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    where: { status: "pending" },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, email: true, createdAt: true, tier: true },
  });

  return NextResponse.json({ users });
}
