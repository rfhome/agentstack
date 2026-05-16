import { NextResponse } from "next/server";
import { auth } from "@/auth";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const SCOPES = [
  "https://www.googleapis.com/auth/fitness.activity.read",
  "https://www.googleapis.com/auth/fitness.heart_rate.read",
].join(" ");

export async function GET() {
  const session = await auth();
  const base = process.env.AUTH_URL ?? "http://localhost:3000";

  if (!session?.user?.id) {
    return NextResponse.redirect(`${base}/auth/signin`);
  }

  const state = Buffer.from(session.user.id).toString("base64url");
  const redirectUri = `${base}/api/wearables/fitbit/callback`;

  const url = new URL(GOOGLE_AUTH_URL);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", process.env.FITBIT_CLIENT_ID!);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", SCOPES);
  url.searchParams.set("state", state);
  url.searchParams.set("access_type", "offline");   // get refresh token
  url.searchParams.set("prompt", "consent");         // force refresh token on re-auth

  return NextResponse.redirect(url.toString());
}
