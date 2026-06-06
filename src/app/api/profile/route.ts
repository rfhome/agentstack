import { NextRequest, NextResponse } from "next/server";
import { withRLS } from "@/lib/prisma-rls";
import { auth } from "@/auth";
import { detectInjection } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const profile = await withRLS(userId, (db) => db.userProfile.findFirst({ where: { userId } }));

    return NextResponse.json({
      name: profile?.name ?? "",
      context: profile?.context ?? "",
    });
  } catch (err) {
    console.error("[GET /api/profile]", err);
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { name, context } = (await req.json()) as { name: string; context: string };

    // Injection check — profile context is passed verbatim to all agents as userContext
    if (context && detectInjection(context)) {
      console.warn("[PUT /api/profile] Injection attempt in context field", { userId });
      return NextResponse.json({ error: "Input contains disallowed content" }, { status: 400 });
    }

    await withRLS(userId, async (db) => {
      const existing = await db.userProfile.findFirst({ where: { userId } });
      if (existing) {
        await db.userProfile.update({ where: { id: existing.id }, data: { name, context } });
      } else {
        await db.userProfile.create({ data: { userId, name, context } });
      }
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[PUT /api/profile]", err);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
