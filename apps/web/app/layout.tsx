import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import { sora, lexend, jetbrainsMono } from "@/lib/fonts";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { AuthProvider } from "@/components/providers/auth-provider";
import { CookieConsentBanner } from "@/components/legal/cookie-consent-banner";
import { MotionProvider } from "./(marketing)/_components/motion-provider";
import { CARRIER_PANEL_COUNT_DISPLAY } from "@mergenix/genetics-data";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Mergenix — Know Your Genetic Future",
    template: "%s | Mergenix",
  },
  description:
    "Compare two parents' DNA to predict offspring disease risk and traits. " +
    `Your DNA never leaves your device. Screen ${CARRIER_PANEL_COUNT_DISPLAY} diseases, predict 79 traits, ` +
    "pharmacogenomics, and polygenic risk scoring.",
  keywords: [
    "genetic testing",
    "carrier screening",
    "offspring prediction",
    "DNA analysis",
    "pharmacogenomics",
    "polygenic risk score",
    "Mergenix",
  ],
  openGraph: {
    title: "Mergenix — Know Your Genetic Future",
    description:
      `Privacy-first genetic offspring analysis. Screen ${CARRIER_PANEL_COUNT_DISPLAY} diseases, predict 79 traits. Your DNA never leaves your device.`,
    url: "https://mergenix.com",
    siteName: "Mergenix",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Mergenix — Know Your Genetic Future",
    description:
      `Privacy-first genetic offspring analysis. Screen ${CARRIER_PANEL_COUNT_DISPLAY} diseases, predict 79 traits.`,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${sora.variable} ${lexend.variable} ${jetbrainsMono.variable}`}
    >
      <body className="min-h-screen bg-[var(--app-gradient)] font-body antialiased">
        <ThemeProvider
          attribute="data-theme"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <AuthProvider>
            <div className="relative z-[1] flex min-h-screen flex-col">
              <Navbar />
              <main id="main-content" className="flex-1">{children}</main>
              <Footer />
            </div>
            <MotionProvider>
              <CookieConsentBanner />
            </MotionProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
