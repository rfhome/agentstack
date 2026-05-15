import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { cookies } from "next/headers";
import crypto from "crypto";

const OURA_AUTH_URL = "https://cloud.ouraring.com/oauth/authorize";
const SCOPES = "email personal daily heartrate workout tag";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/auth/signin", process.env.AUTH_URL ?? "http://localhost:3000"));
  }

  // CSRF state — stored in a cookie, verified in callback
  const state = crypto.randomBytes(16).toString("hex");
  const cookieStore = await cookies();
  cookieStore.set("oura_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600, // 10 min
    path: "/",
  });

  const redirectUri = `${process.env.AUTH_URL ?? "http://localhost:3000"}/api/wearables/oura/callback`;

  const url = new URL(OURA_AUTH_URL);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", process.env.OURA_CLIENT_ID!);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", SCOPES);
  url.searchParams.set("state", state);

  return NextResponse.redirect(url.toString());
}
