import { ThemeProvider } from 'next-themes';
import { sora, lexend, jetbrainsMono } from '@/lib/fonts';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { AuthProvider } from '@/components/providers/auth-provider';
import { CookieConsentBanner } from '@/components/legal/cookie-consent-banner';
import { ErrorAnnouncer } from '@/components/a11y/error-announcer';
import { MotionProvider } from '@/components/providers/motion-provider';
import { DEFAULT_METADATA, JSON_LD_SCHEMA } from '@/lib/seo-metadata';
import './globals.css';

export const metadata = DEFAULT_METADATA;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${sora.variable} ${lexend.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD_SCHEMA) }}
        />
      </head>
      <body className="bg-(--app-gradient) font-body min-h-screen antialiased">
        <ThemeProvider
          attribute="data-theme"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <AuthProvider>
            <MotionProvider>
              <div className="z-1 relative flex min-h-screen flex-col">
                <a href="#main-content" className="skip-to-main">
                  Skip to main content
                </a>
                <ErrorAnnouncer />
                <Navbar />
                <main id="main-content" className="flex-1">
                  {children}
                </main>
                <Footer />
              </div>
              <CookieConsentBanner />
            </MotionProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
