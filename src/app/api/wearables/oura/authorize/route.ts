import { NextResponse } from "next/server";
import { auth } from "@/auth";

const OURA_AUTH_URL = "https://cloud.ouraring.com/oauth/authorize";
const SCOPES = "email personal daily heartrate workout tag";

export async function GET() {
  const session = await auth();
  const base = process.env.AUTH_URL ?? "http://localhost:3000";

  if (!session?.user?.id) {
    return NextResponse.redirect(`${base}/auth/signin`);
  }

  // Encode userId in state — verified in callback against the active session
  const state = Buffer.from(session.user.id).toString("base64url");
  const redirectUri = `${base}/api/wearables/oura/callback`;

  const url = new URL(OURA_AUTH_URL);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", process.env.OURA_CLIENT_ID!);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", SCOPES);
  url.searchParams.set("state", state);

  return NextResponse.redirect(url.toString());
}
