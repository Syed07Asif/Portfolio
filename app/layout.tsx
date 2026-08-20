import type { Metadata } from "next";
import { Inter, Sora } from "next/font/google";
import "@/styles/globals.css";
import { MotionProvider } from "@/components/motion/MotionProvider";
import { Toaster } from "@/components/ui";
import { METADATA_BASE } from "@/lib/seo";

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

/**
 * True root layout — shared by *everything*, including `/admin`. Deliberately
 * minimal: `<html>`/`<body>`, fonts, reduced-motion setup, and the toast
 * host, nothing content-specific. The public site's chrome (Navbar, Footer,
 * skip link, page transitions, and the siteSettings-driven title/description)
 * used to live here, but moved to `app/(site)/layout.tsx` in Phase 17 so
 * `/admin` routes render with their own shell instead of being wrapped in
 * the public site's header/footer — Next's route groups are what make a
 * single top-level segment (`/admin`) opt out of a sibling group's layout.
 * `metadataBase` stays here since both trees need it (canonical/OG URL
 * resolution), with a generic fallback title every route can override.
 */
export const metadata: Metadata = {
  metadataBase: METADATA_BASE,
  title: "Syed Asif",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`dark ${sora.variable} ${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <MotionProvider>{children}</MotionProvider>
        <Toaster />
      </body>
    </html>
  );
}
