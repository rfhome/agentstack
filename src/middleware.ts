import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

const { auth } = NextAuth(authConfig);
export default auth;

export const config = {
  // Exclude static Next.js assets, public PWA files (manifest, icons, SW), and favicon
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest\\.json|sw\\.js|icon.*\\.png).*)"],
};
