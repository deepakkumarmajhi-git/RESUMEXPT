import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { resolveAppUrl } from "@/lib/app-url";

export const metadata: Metadata = {
  metadataBase: new URL(resolveAppUrl()),
  title: {
    default: "ResumeXpt | AI Resume Analyzer & Interview Coach",
    template: "%s | ResumeXpt",
  },
  description:
    "Upload your resume, get ATS-ready analysis, generate interview sets, and practice with an AI interviewer in text or voice mode.",
  icons: {
    icon: "/resumexpt-tab-icon.svg",
    shortcut: "/resumexpt-tab-icon.svg",
    apple: "/resumexpt-tab-icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-scroll-behavior="smooth"
      className="h-full antialiased"
    >
      <body className="min-h-full bg-background text-foreground">
        <Providers>{children}</Providers>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
