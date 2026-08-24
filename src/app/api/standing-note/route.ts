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

    const profile = await withRLS(userId, (db) =>
      db.userProfile.findFirst({
        where: { userId },
        select: { standingNote: true, standingNoteExpiresAt: true },
      })
    );

    const expired = !!profile?.standingNoteExpiresAt && profile.standingNoteExpiresAt < new Date();

    return NextResponse.json({
      note: expired ? null : profile?.standingNote ?? null,
      expiresAt: expired ? null : profile?.standingNoteExpiresAt?.toISOString() ?? null,
    });
  } catch (err) {
    console.error("[GET /api/standing-note]", err);
    return NextResponse.json({ error: "Failed to fetch standing note" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const body = (await req.json()) as { note: string; days?: number | null };
    const note = body.note?.trim();
    if (!note) {
      return NextResponse.json({ error: "note is required" }, { status: 400 });
    }
    if (detectInjection(note)) {
      console.warn("[PUT /api/standing-note] Injection attempt", { userId });
      return NextResponse.json({ error: "Input contains disallowed content" }, { status: 400 });
    }

    const expiresAt =
      body.days != null ? new Date(Date.now() + body.days * 24 * 60 * 60 * 1000) : null;

    await withRLS(userId, async (db) => {
      const existing = await db.userProfile.findFirst({ where: { userId } });
      const data = { standingNote: note, standingNoteExpiresAt: expiresAt };
      if (existing) {
        await db.userProfile.update({ where: { id: existing.id }, data });
      } else {
        await db.userProfile.create({ data: { userId, ...data } });
      }
    });

    return NextResponse.json({ ok: true, note, expiresAt: expiresAt?.toISOString() ?? null });
  } catch (err) {
    console.error("[PUT /api/standing-note]", err);
    return NextResponse.json({ error: "Failed to save standing note" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    await withRLS(userId, async (db) => {
      const existing = await db.userProfile.findFirst({ where: { userId } });
      if (existing) {
        await db.userProfile.update({
          where: { id: existing.id },
          data: { standingNote: null, standingNoteExpiresAt: null },
        });
      }
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/standing-note]", err);
    return NextResponse.json({ error: "Failed to clear standing note" }, { status: 500 });
  }
}
