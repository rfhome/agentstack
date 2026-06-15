import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, password: true },
    });

    // Always return 200 to avoid email enumeration
    if (!user?.password) return NextResponse.json({ ok: true });

    // Invalidate any existing tokens for this user
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });

    const token = await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    });

    await sendPasswordResetEmail(email, token.token);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[POST /api/auth/forgot-password]", err);
    return NextResponse.json({ error: "Failed to send reset email" }, { status: 500 });
  }
}
