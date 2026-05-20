import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withRLS } from "@/lib/prisma-rls";
import { auth } from "@/auth";
import { fetchOuraRecovery } from "@/lib/oura";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sessions = await withRLS(session.user.id, (db) => db.session.findMany({
      where: { userId: session.user.id },
      take: 10,
      orderBy: { date: "desc" },
      include: { exercises: true },
    }));
    return NextResponse.json(sessions);
  } catch (err) {
    console.error("[GET /api/sessions]", err);
    return NextResponse.json({ error: "Failed to fetch sessions" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authSession = await auth();
    if (!authSession?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

    const sessionDate = session.date
      ? new Date(session.date).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0];

    const created = await withRLS(authSession.user.id, (db) => db.session.create({
      data: {
        ...session,
        userId: authSession.user.id,
        date: session.date ? new Date(session.date + "T12:00:00.000Z") : new Date(),
        exercises: {
          create: exercises ?? [],
        },
        cardioActivities: {
          create: (cardioActivities ?? []).map(c => ({ ...c, userId: authSession.user.id })),
        },
      },
      include: { exercises: true, cardioActivities: true },
    }));

    // Fetch Oura recovery data for this session date in the background (non-blocking)
    const ouraConn = await prisma.wearableConnection.findUnique({
      where: { userId_provider: { userId: authSession.user.id, provider: "oura" } },
      select: { id: true },
    });
    if (ouraConn) {
      fetchOuraRecovery(authSession.user.id, sessionDate)
        .then((recovery) =>
          prisma.session.update({
            where: { id: created.id },
            data: { wearableSnapshot: JSON.parse(JSON.stringify({ oura: recovery, savedAt: new Date().toISOString() })) },
          })
        )
        .catch(() => {}); // silent — wearable data is best-effort
    }

    return NextResponse.json({ sessionId: created.id, session: created }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/sessions]", err);
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
  }
}
