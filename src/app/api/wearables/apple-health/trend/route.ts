import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const since = new Date();
  since.setDate(since.getDate() - 28);
  const sinceStr = since.toISOString().split("T")[0];

  const days = await prisma.appleHealthDay.findMany({
    where: { userId: session.user.id, date: { gte: sinceStr } },
    orderBy: { date: "asc" },
    select: { date: true, hrv: true, restingHR: true, sleepHours: true },
  });

  return NextResponse.json({ trend: days });
}
