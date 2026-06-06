import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import AuthProvider from "@/components/AuthProvider";
import NavUser from "@/components/NavUser";
import BottomNav from "@/components/BottomNav";
import { ServiceWorkerRegistrar } from "@/components/ServiceWorkerRegistrar";
import { InstallButton } from "@/components/InstallButton";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AgentStack",
  description: "Multi-agent intelligence system",
  manifest: "/manifest.json",
  // apple-touch-icon for iOS and Android Chrome fallback
  icons: {
    apple: "/icon-192.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} h-full`}>
      <body className="min-h-full bg-zinc-950 text-zinc-100 antialiased">
        <ServiceWorkerRegistrar />
        <AuthProvider>
          {/* Top bar */}
          <nav className="border-b border-zinc-800 px-4 py-3 flex items-center gap-6">
            <Link href="/" className="font-semibold tracking-tight text-white shrink-0">
              AgentStack
            </Link>

            {/* Desktop links — hidden on mobile */}
            <div className="hidden md:flex items-center gap-6 flex-1">
              <Link href="/fitness" className="text-sm text-zinc-400 hover:text-white transition-colors">
                Fitness
              </Link>
              <Link href="/fitness/sessions" className="text-sm text-zinc-400 hover:text-white transition-colors">
                History
              </Link>
              <Link href="/fitness/progress" className="text-sm text-zinc-400 hover:text-white transition-colors">
                Progress
              </Link>
              <Link href="/settings" className="text-sm text-zinc-400 hover:text-white transition-colors">
                Settings
              </Link>
              <Link href="/profile" className="text-sm text-zinc-400 hover:text-white transition-colors">
                Profile
              </Link>
            </div>

            <InstallButton />
            <NavUser />
          </nav>

          {/* Bottom nav — visible on mobile only */}
          <BottomNav />

          {/* Add bottom padding on mobile so content clears the bottom nav */}
          <main className="max-w-2xl mx-auto px-4 py-6 pb-24 md:pb-6">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
