import type { Metadata, Viewport } from "next";
import { Geist, Hedvig_Letters_Serif } from "next/font/google";
import Link from "next/link";
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
  themeColor: "#0c0c0c",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geist.variable} ${hedvig.variable} h-full`}>
      <body className="flex min-h-full flex-col bg-background font-sans text-foreground">
        {children}
        <footer className="mx-auto flex w-full max-w-xl gap-4 border-t border-border px-4 pt-2 pb-8">
          <Link
            href="/rules"
            className="inline-flex min-h-11 items-center text-sm text-muted-foreground hover:text-foreground"
          >
            Content rules
          </Link>
          <Link
            href="/privacy"
            className="inline-flex min-h-11 items-center text-sm text-muted-foreground hover:text-foreground"
          >
            Privacy
          </Link>
        </footer>
      </body>
    </html>
  );
}
