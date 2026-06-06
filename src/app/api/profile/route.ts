import { NextRequest, NextResponse } from "next/server";
import { withRLS } from "@/lib/prisma-rls";
import { prisma } from "@/lib/prisma";
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
    const [profile, user] = await Promise.all([
      withRLS(userId, (db) => db.userProfile.findFirst({ where: { userId } })),
      prisma.user.findUnique({ where: { id: userId }, select: { tier: true } }),
    ]);

    return NextResponse.json({
      name: profile?.name ?? "",
      context: profile?.context ?? "",
      programConfig: profile?.programConfig ?? null,
      onboardingComplete: profile?.onboardingComplete ?? false,
      tier: user?.tier ?? "free",
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
    const body = (await req.json()) as {
      name: string;
      context: string;
      programConfig?: unknown;
      onboardingComplete?: boolean;
    };
    const { name, context, programConfig, onboardingComplete } = body;

    // Injection check — profile context is passed verbatim to all agents as userContext
    if (context && detectInjection(context)) {
      console.warn("[PUT /api/profile] Injection attempt in context field", { userId });
      return NextResponse.json({ error: "Input contains disallowed content" }, { status: 400 });
    }

    await withRLS(userId, async (db) => {
      const existing = await db.userProfile.findFirst({ where: { userId } });
      const data = {
        name,
        context,
        ...(programConfig !== undefined
          ? { programConfig: JSON.parse(JSON.stringify(programConfig)) }
          : {}),
        ...(onboardingComplete !== undefined ? { onboardingComplete } : {}),
      };
      if (existing) {
        await db.userProfile.update({ where: { id: existing.id }, data });
      } else {
        await db.userProfile.create({ data: { userId, ...data } });
      }
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[PUT /api/profile]", err);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
