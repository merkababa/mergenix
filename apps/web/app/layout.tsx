import { cookies } from 'next/headers';
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

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const hasBypass = cookieStore.has('site-bypass');
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
      <body className="bg-(--app-gradient) font-body min-h-screen antialiased" data-bypassed={hasBypass ? 'true' : undefined}>
        {/* Ambient glow orbs — fixed background layer for frosted-glass blur effects */}
        <div className="pointer-events-none fixed inset-0 z-0" aria-hidden="true">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(6,214,160,0.08)_0%,transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(139,92,246,0.06)_0%,transparent_50%)]" />
        </div>
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
                <Navbar isBypassed={hasBypass} />
                <main id="main-content" className="flex-1">
                  {children}
                </main>
                <Footer isBypassed={hasBypass} />
              </div>
              <CookieConsentBanner />
            </MotionProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
