import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

const OURA_TOKEN_URL = "https://api.ouraring.com/oauth/token";

export async function GET(req: NextRequest) {
  const base = process.env.AUTH_URL ?? "http://localhost:3000";
  const settingsUrl = `${base}/settings`;
  const errorUrl = `${base}/settings?error=oura_oauth_failed`;

  // Verify CSRF state
  const cookieStore = await cookies();
  const savedState = cookieStore.get("oura_oauth_state")?.value;
  const returnedState = req.nextUrl.searchParams.get("state");
  if (!savedState || savedState !== returnedState) {
    return NextResponse.redirect(errorUrl);
  }
  cookieStore.delete("oura_oauth_state");

  const code = req.nextUrl.searchParams.get("code");
  if (!code) return NextResponse.redirect(errorUrl);

  const session = await auth();
  if (!session?.user?.id) return NextResponse.redirect(`${base}/auth/signin`);

  const redirectUri = `${base}/api/wearables/oura/callback`;

  // Exchange code for tokens
  const tokenRes = await fetch(OURA_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: process.env.OURA_CLIENT_ID!,
      client_secret: process.env.OURA_CLIENT_SECRET!,
    }),
  });

  if (!tokenRes.ok) return NextResponse.redirect(errorUrl);

  const tokens = await tokenRes.json() as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    token_type: string;
  };

  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

  await prisma.wearableConnection.upsert({
    where: { userId_provider: { userId: session.user.id, provider: "oura" } },
    create: {
      userId: session.user.id,
      provider: "oura",
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt,
    },
    update: {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt,
    },
  });

  return NextResponse.redirect(settingsUrl);
}
