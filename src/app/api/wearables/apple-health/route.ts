import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { withRLS } from "@/lib/prisma-rls";
import { prisma } from "@/lib/prisma";


export const dynamic = "force-dynamic";

// ─── GET — return connection status & webhook URL ──────────────────────────
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const conn = await withRLS(userId, (db) =>
    db.wearableConnection.findUnique({
      where: { userId_provider: { userId, provider: "apple_health" } },
    })
  );

  const baseUrl = process.env.NEXTAUTH_URL ?? process.env.AUTH_URL ?? "";

  if (!conn) {
    // Auto-create the connection record with a fresh token so the URL is ready immediately
    const token = crypto.randomUUID().replace(/-/g, "");
    await withRLS(userId, (db) =>
      db.wearableConnection.create({
        data: { userId, provider: "apple_health", accessToken: token },
      })
    );
    return NextResponse.json({
      connected: false,
      webhookUrl: `${baseUrl}/api/wearables/apple-health/ingest?token=${token}`,
    });
  }

  return NextResponse.json({
    connected: true,
    webhookUrl: `${baseUrl}/api/wearables/apple-health/ingest?token=${conn.accessToken}`,
  });
}

// ─── DELETE — disconnect ───────────────────────────────────────────────────
export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  await withRLS(userId, (db) =>
    db.wearableConnection.deleteMany({
      where: { userId, provider: "apple_health" },
    })
  );

  // Also purge historical snapshots so a reconnect starts fresh
  await prisma.appleHealthDay.deleteMany({ where: { userId } });

  return NextResponse.json({ connected: false });
}
