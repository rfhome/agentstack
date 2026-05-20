import { NextRequest, NextResponse } from "next/server";
import { withRLS } from "@/lib/prisma-rls";
import { auth } from "@/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authSession = await auth();
    if (!authSession?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = authSession.user.id;
    const { id } = await params;
    const sessionId = parseInt(id);
    if (isNaN(sessionId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const session = await withRLS(userId, (db) =>
      db.session.findUnique({
        where: { id: sessionId, userId },
        include: { exercises: true, cardioActivities: true },
      })
    );
    if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(session);
  } catch (err) {
    console.error("[GET /api/sessions/[id]]", err);
    return NextResponse.json({ error: "Failed to fetch session" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authSession = await auth();
    if (!authSession?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = authSession.user.id;
    const { id } = await params;
    const sessionId = parseInt(id);
    if (isNaN(sessionId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const body = await req.json();
    const { session, exercises, cardioActivities } = body as {
      session: {
        date?: string;
        cycleDay?: number;
        cycleNumber?: number;
        durationMinutes?: number;
        avgHeartRate?: number;
        cardioLoad?: number;
        activeZoneMinutes?: number;
        rating?: string;
        notes?: string;
      };
      exercises: {
        name: string;
        sets?: number;
        reps?: string;
        weights?: string;
        weightLbs?: number;
        notes?: string;
      }[];
      cardioActivities?: {
        tag: string;
        machine: string;
        durationMin?: number;
        distanceMi?: number;
        calories?: number;
        avgHR?: number;
        maxHR?: number;
        notes?: string;
      }[];
    };

    await withRLS(userId, async (db) => {
      // Verify ownership
      const existing = await db.session.findUnique({ where: { id: sessionId, userId } });
      if (!existing) throw new Error("Not found");

      // Replace exercises and cardio in one transaction
      await db.exercise.deleteMany({ where: { sessionId } });
      await db.cardioActivity.deleteMany({ where: { sessionId } });

      await db.session.update({
        where: { id: sessionId },
        data: {
          ...session,
          date: session.date ? new Date(session.date + "T12:00:00.000Z") : undefined,
          exercises: { create: exercises ?? [] },
          cardioActivities: {
            create: (cardioActivities ?? []).map((c) => ({ ...c, userId })),
          },
        },
      });
    });

    return NextResponse.json({ sessionId });
  } catch (err) {
    console.error("[PUT /api/sessions/[id]]", err);
    return NextResponse.json({ error: "Failed to update session" }, { status: 500 });
  }
}
