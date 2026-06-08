import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function VerifyPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const record = await prisma.emailVerification.findUnique({ where: { token } });

  if (!record || record.expiresAt < new Date()) {
    // Also handle already-verified — check user directly if record is missing
  }

  // Check if already verified
  if (record) {
    const user = await prisma.user.findUnique({
      where: { id: record.userId },
      select: { emailVerified: true },
    });
    if (user?.emailVerified) {
      redirect("/auth/signin?verified=1");
    }
  }

  if (!record || record.expiresAt < new Date()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 px-4">
        <div className="w-full max-w-sm space-y-4 text-center">
          <h1 className="text-xl font-bold text-white">Link expired</h1>
          <p className="text-zinc-400 text-sm">
            This verification link has expired or is invalid. Register again to get a new one.
          </p>
          <Link
            href="/auth/signup"
            className="inline-block rounded-lg bg-white text-zinc-950 px-6 py-2 text-sm font-semibold hover:bg-zinc-200 transition-colors"
          >
            Sign up again
          </Link>
        </div>
      </div>
    );
  }

  // Mark email as verified and delete the token
  await prisma.user.update({
    where: { id: record.userId },
    data: { emailVerified: new Date() },
  });
  await prisma.emailVerification.delete({ where: { token } });

  redirect("/auth/signin?verified=1");
}
