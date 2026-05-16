import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { withRLS } from "@/lib/prisma-rls";
import { fetchFitbitData } from "@/lib/fitbit";

export const dynamic = "force-dynamic";

// GET — return connection status + today's data if connected
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const conn = await withRLS(session.user.id, (db) => db.wearableConnection.findUnique({
    where: { userId_provider: { userId: session.user.id, provider: "fitbit" } },
  }));

  if (!conn) return NextResponse.json({ connected: false });

  try {
    const data = await fetchFitbitData(session.user.id);
    return NextResponse.json({ connected: true, data });
  } catch (err) {
    return NextResponse.json({ connected: true, error: (err as Error).message });
  }
}

// DELETE — disconnect
export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await withRLS(session.user.id, (db) => db.wearableConnection.deleteMany({
    where: { userId: session.user.id, provider: "fitbit" },
  }));

  return NextResponse.json({ connected: false });
}
