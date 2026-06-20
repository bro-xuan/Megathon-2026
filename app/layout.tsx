import type { Metadata } from "next";
import { Inter, Manrope, IBM_Plex_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"], weight: ["700"] });
const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Greenroom — grounded mock interviews",
  description:
    "A voice-native mock interviewer for high-stakes finance, grounded in cited real-company data. It catches your bluffs.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${manrope.variable} ${plexMono.variable} h-full`}
    >
      <body className="min-h-full flex flex-col bg-canvas text-ink">
        {children}
        <footer className="bg-footer text-white">
          <div className="container-page py-[2rem] text-[0.8rem] text-white/70 flex items-center justify-between gap-4 flex-wrap">
            <span>
              Grounded in <strong className="text-white/90">Cala.ai</strong> cited data · Voice by{" "}
              <strong className="text-white/90">Vapi</strong> · Greenroom
            </span>
            {/* Demo insurance: one click to the precomputed perfect debrief, offline-safe. */}
            <Link href="/debrief/mock-stripe" className="text-white/40 hover:text-white/90 transition-colors">
              Sample debrief →
            </Link>
          </div>
        </footer>
      </body>
    </html>
  );
}
