import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { sendAdminNewUserEmail } from "@/lib/email";
import { authConfig } from "./auth.config";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  callbacks: {
    authorized: authConfig.callbacks!.authorized,
    async signIn({ user, account }) {
      if (account?.provider === "google" && user.email) {
        const existing = await prisma.user.findUnique({ where: { email: user.email } });
        if (!existing) {
          await prisma.user.create({
            data: {
              email: user.email,
              name: user.name,
              emailVerified: new Date(),
              status: "pending",
            },
          });
          const adminEmail = process.env.ADMIN_EMAIL;
          if (adminEmail) {
            await sendAdminNewUserEmail(adminEmail, user.email, user.name ?? "").catch(console.error);
          }
        }
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        if (account?.provider === "google" && user.email) {
          // Map Google user to our DB user id
          const dbUser = await prisma.user.findUnique({
            where: { email: user.email },
            select: { id: true },
          });
          token.id = dbUser?.id ?? user.id;
        } else {
          token.id = user.id;
        }
      }
      return token;
    },
    session({ session, token }) {
      if (token.id) session.user.id = token.id as string;
      return session;
    },
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });
        if (!user?.password) return null;
        const valid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );
        if (!valid) return null;
        if (!user.emailVerified) return null;
        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
});
