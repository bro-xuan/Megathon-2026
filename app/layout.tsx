import type { Metadata } from "next";
import { Inter, Manrope, IBM_Plex_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { BrandMark } from "./components/brand-mark";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"], weight: ["700"] });
const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Greenroom: practice any hard conversation",
  description:
    "A voice-native room to rehearse the conversations you dread, out loud, against someone who pushes back. Grounded in cited sources where facts matter, scored when you're done.",
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
        {/* Slim sticky chrome — frames every screen as one product, not a deck of pages. */}
        <header className="sticky top-0 z-50 border-b border-border bg-canvas/80 backdrop-blur-md">
          <div className="container-page h-[3.4rem] flex items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-2 group">
              <span className="shadow-sm rounded-[0.45rem] transition-transform group-hover:-translate-y-px">
                <BrandMark size={24} className="block rounded-[0.45rem]" />
              </span>
              <span className="font-display text-[1.05rem] tracking-tight">Greenroom</span>
            </Link>
            <div className="flex items-center gap-4 text-[0.8rem]">
              <span className="badge-live hidden sm:inline-flex">grounded in cited sources</span>
              <Link
                href="/debrief/mock-stripe"
                className="text-muted hover:text-ink transition-colors font-medium"
              >
                Sample debrief →
              </Link>
            </div>
          </div>
        </header>

        {children}

        <footer className="bg-footer text-white mt-auto">
          <div className="container-page py-[2.5rem] flex flex-col gap-6">
            <div className="flex items-end justify-between gap-6 flex-wrap">
              <div className="flex flex-col gap-2">
                <span className="font-display text-[1.6rem] tracking-tight text-white">
                  Practice the conversation before it counts.
                </span>
                <span className="text-white/55 text-[0.85rem]">
                  Voice-native rehearsal, grounded in cited sources.
                </span>
              </div>
              <Link href="/start" className="btn-accent text-[0.9rem]">
                Start an interview →
              </Link>
            </div>
            <div className="border-t border-white/10 pt-5 text-[0.78rem] text-white/45 flex items-center justify-between gap-4 flex-wrap">
              <span>
                Grounded in <strong className="text-white/80">Cala.ai</strong> cited sources · Voice by{" "}
                <strong className="text-white/80">Vapi</strong>
              </span>
              <Link href="/debrief/mock-stripe" className="text-white/40 hover:text-white/90 transition-colors">
                See a sample debrief →
              </Link>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
