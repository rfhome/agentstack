import Link from "next/link";

export default async function CheckEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div className="w-14 h-14 rounded-full bg-zinc-800 flex items-center justify-center mx-auto">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <rect x="2" y="4" width="20" height="16" rx="2" stroke="#a1a1aa" strokeWidth="1.5"/>
            <path d="M2 8l10 6 10-6" stroke="#a1a1aa" strokeWidth="1.5" strokeLinejoin="round"/>
          </svg>
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-white">Check your email</h1>
          <p className="text-zinc-400 text-sm leading-relaxed">
            We sent a verification link to{" "}
            {email ? <span className="text-zinc-200 font-medium">{email}</span> : "your email address"}.
            Click the link to activate your account.
          </p>
        </div>
        <p className="text-xs text-zinc-600">
          The link expires in 24 hours. If you don&apos;t see it, check your spam folder.
        </p>
        <Link href="/auth/signin" className="text-sm text-zinc-400 hover:text-white underline underline-offset-2 transition-colors">
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
