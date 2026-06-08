import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { withRLS } from "@/lib/prisma-rls";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const goals = await withRLS(userId, (db) =>
    db.goal.findMany({
      where: { userId },
      orderBy: [{ achieved: "asc" }, { createdAt: "desc" }],
    })
  );

  return NextResponse.json(goals);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const { exercise, targetWeightLbs, targetReps } = (await req.json()) as {
    exercise?: string;
    targetWeightLbs?: number | null;
    targetReps?: string | null;
  };

  if (!exercise?.trim()) {
    return NextResponse.json({ error: "Exercise name is required" }, { status: 400 });
  }

  const goal = await withRLS(userId, (db) =>
    db.goal.create({
      data: {
        userId,
        exercise: exercise.trim(),
        targetWeightLbs: targetWeightLbs ?? null,
        targetReps: targetReps?.trim() || null,
      },
    })
  );

  return NextResponse.json(goal, { status: 201 });
}
