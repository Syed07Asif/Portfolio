import type { Metadata } from "next";
import { Inter, Sora } from "next/font/google";
import "@/styles/globals.css";
import { MotionProvider } from "@/components/motion/MotionProvider";

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

export const metadata: Metadata = {
  title: "Syed Asif — Analytics & ML Engineer",
  description: "Portfolio of Syed Asif, Analytics & ML Engineer.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`dark ${sora.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
