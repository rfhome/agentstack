import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { withRLS } from "@/lib/prisma-rls";
import { fetchOuraTrend } from "@/lib/oura";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const authSession = await auth();
    if (!authSession?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = authSession.user.id;

    // Check if Oura is connected before hitting the API
    const conn = await withRLS(userId, (db) =>
      db.wearableConnection.findUnique({
        where: { userId_provider: { userId, provider: "oura" } },
        select: { id: true },
      })
    );

    if (!conn) {
      return NextResponse.json({ connected: false, trend: [] });
    }

    const trend = await fetchOuraTrend(userId, 28);
    return NextResponse.json({ connected: true, trend });
  } catch (err) {
    console.error("[GET /api/wearables/oura/trend]", err);
    // Return empty trend on error — the chart just won't render
    return NextResponse.json({ connected: false, trend: [] });
  }
}
