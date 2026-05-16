import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const FITBIT_TOKEN_URL = "https://api.fitbit.com/oauth2/token";

export async function GET(req: NextRequest) {
  const base = process.env.AUTH_URL ?? "http://localhost:3000";
  const settingsUrl = `${base}/settings`;
  const errorUrl = `${base}/settings?error=fitbit_oauth_failed`;

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");

  if (!code) return NextResponse.redirect(errorUrl);

  // Get the authenticated user
  const session = await auth();
  if (!session?.user?.id) return NextResponse.redirect(`${base}/auth/signin`);

  // Verify state matches the current user (CSRF check without cookie dependency)
  const expectedState = Buffer.from(session.user.id).toString("base64url");
  if (state !== expectedState) return NextResponse.redirect(errorUrl);

  const redirectUri = `${base}/api/wearables/fitbit/callback`;

  const credentials = Buffer.from(
    `${process.env.FITBIT_CLIENT_ID!}:${process.env.FITBIT_CLIENT_SECRET!}`
  ).toString("base64");

  // Exchange code for tokens using Basic auth (Fitbit requires this)
  const tokenRes = await fetch(FITBIT_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!tokenRes.ok) {
    console.error("[fitbit/callback] token exchange failed:", tokenRes.status, await tokenRes.text());
    return NextResponse.redirect(errorUrl);
  }

  const tokens = (await tokenRes.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

  await prisma.wearableConnection.upsert({
    where: { userId_provider: { userId: session.user.id, provider: "fitbit" } },
    create: {
      userId: session.user.id,
      provider: "fitbit",
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
