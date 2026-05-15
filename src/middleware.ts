import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isAuth = !!req.auth;
  const pathname = req.nextUrl.pathname;

  const isAuthPage = pathname.startsWith("/auth/");
  const isApiAuth = pathname.startsWith("/api/auth/");

  if (isAuthPage || isApiAuth) return NextResponse.next();
  if (!isAuth) {
    return NextResponse.redirect(new URL("/auth/signin", req.url));
  }
  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
