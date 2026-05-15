import { NextRequest, NextResponse } from "next/server";
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
    const data = await fetchOuraData(conn.accessToken);
    return NextResponse.json({ connected: true, data });
  } catch (err) {
    return NextResponse.json({ connected: true, error: (err as Error).message });
  }
}

// POST — save or update PAT
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { token } = await req.json();
  if (!token) return NextResponse.json({ error: "token required" }, { status: 400 });

  // Validate token works before saving
  try {
    await fetchOuraData(token);
  } catch {
    return NextResponse.json({ error: "Could not connect to Oura — check your Personal Access Token." }, { status: 422 });
  }

  await prisma.wearableConnection.upsert({
    where: { userId_provider: { userId: session.user.id, provider: "oura" } },
    create: { userId: session.user.id, provider: "oura", accessToken: token },
    update: { accessToken: token },
  });

  return NextResponse.json({ connected: true });
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
