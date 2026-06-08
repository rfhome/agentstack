import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { withRLS } from "@/lib/prisma-rls";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;
  const { id } = await params;
  const goalId = parseInt(id);

  const body = (await req.json()) as { achieved?: boolean };

  const goal = await withRLS(userId, (db) =>
    db.goal.updateMany({
      where: { id: goalId, userId },
      data: {
        achieved: body.achieved ?? true,
        achievedAt: body.achieved ? new Date() : null,
      },
    })
  );

  if (goal.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;
  const { id } = await params;
  const goalId = parseInt(id);

  const result = await withRLS(userId, (db) =>
    db.goal.deleteMany({ where: { id: goalId, userId } })
  );

  if (result.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
