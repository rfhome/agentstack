import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Link from "next/link";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AgentStack",
  description: "Multi-agent intelligence system",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} h-full`}>
      <body className="min-h-full bg-zinc-950 text-zinc-100 antialiased">
        <nav className="border-b border-zinc-800 px-4 py-3 flex items-center gap-6">
          <Link href="/" className="font-semibold tracking-tight text-white">
            AgentStack
          </Link>
          <Link href="/fitness" className="text-sm text-zinc-400 hover:text-white transition-colors">
            Fitness
          </Link>
        </nav>
        <main className="max-w-2xl mx-auto px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
