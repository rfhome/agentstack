import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json();
    if (!token || !password) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    if (password.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });

    const record = await prisma.passwordResetToken.findUnique({ where: { token } });
    if (!record || record.expiresAt < new Date()) {
      return NextResponse.json({ error: "Reset link has expired. Request a new one." }, { status: 400 });
    }

    const hashed = await bcrypt.hash(password, 12);
    await prisma.user.update({
      where: { id: record.userId },
      data: { password: hashed },
    });
    await prisma.passwordResetToken.delete({ where: { token } });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[POST /api/auth/reset-password]", err);
    return NextResponse.json({ error: "Failed to reset password" }, { status: 500 });
  }
}
