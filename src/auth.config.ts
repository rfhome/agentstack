import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/auth/signin",
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.id) session.user.id = token.id as string;
      return session;
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isAuthPage = nextUrl.pathname.startsWith("/auth/");
      const isApiAuth = nextUrl.pathname.startsWith("/api/auth/");
      // Token-authenticated webhooks — no session required
      const isPublicWebhook = nextUrl.pathname.startsWith("/api/wearables/apple-health/ingest");
      const isHelpPage = nextUrl.pathname === "/help";
      const isInternalCron = nextUrl.pathname.startsWith("/api/internal/");
      if (isAuthPage || isApiAuth || isPublicWebhook || isHelpPage || isInternalCron) return true;
      return isLoggedIn;
    },
  },
  providers: [],
};
