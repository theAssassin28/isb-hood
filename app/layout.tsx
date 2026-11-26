import type { Metadata, Viewport } from "next";
import { Geist, Hedvig_Letters_Serif } from "next/font/google";
import { DemoBanner } from "@/components/demo-banner";
import { LegalLinks } from "@/components/legal-links";
import { THEME_SCRIPT } from "@/lib/theme";
import "./globals.css";

// Body in Geist (Stella), titles in Hedvig Letters Serif (Kero). Self-hosted by Next at build time.
const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
const hedvig = Hedvig_Letters_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-hedvig",
});

export const metadata: Metadata = {
  title: "ISB Hood",
  description:
    "What earlier ISB batches learned about courses and careers, with reasons, and the author one question away.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f6f9" },
    { media: "(prefers-color-scheme: dark)", color: "#0e1116" },
  ],
  colorScheme: "dark light",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: THEME_SCRIPT may set data-theme before React loads.
    <html
      lang="en"
      className={`${geist.variable} ${hedvig.variable} h-full`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col bg-background font-sans text-foreground">
        <DemoBanner />
        {children}
        {/* Desktop only. On phones these links sit at the end of sign-in and My
            activity (PhoneLegalLinks), not under every screen. */}
        <footer className="mx-auto hidden w-full max-w-6xl gap-4 border-t border-border px-4 pt-2 pb-8 lg:flex lg:px-8">
          <LegalLinks />
        </footer>
      </body>
    </html>
  );
}
