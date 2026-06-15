import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { sendVerificationEmail, sendAdminNewUserEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const { name, email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const hashed = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { name, email, password: hashed, status: "pending" },
    });

    const verification = await prisma.emailVerification.create({
      data: {
        userId: user.id,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    await sendVerificationEmail(email, verification.token);

    const adminEmail = process.env.ADMIN_EMAIL;
    if (adminEmail) {
      await sendAdminNewUserEmail(adminEmail, email, name ?? "").catch(console.error);
    }

    return NextResponse.json({ id: user.id, email: user.email }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/auth/register]", err);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
