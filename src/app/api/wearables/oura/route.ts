import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { fetchOuraData } from "@/lib/oura";

export const dynamic = "force-dynamic";

// GET — return connection status + today's data if connected
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const conn = await prisma.wearableConnection.findUnique({
    where: { userId_provider: { userId: session.user.id, provider: "oura" } },
  });

  if (!conn) return NextResponse.json({ connected: false });

  try {
    const data = await fetchOuraData(session.user.id);
    return NextResponse.json({ connected: true, data });
  } catch (err) {
    return NextResponse.json({ connected: true, error: (err as Error).message });
  }
}

// DELETE — disconnect
export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.wearableConnection.deleteMany({
    where: { userId: session.user.id, provider: "oura" },
  });

  return NextResponse.json({ connected: false });
}
