/**
 * Marketing layout — full-width pages (products, about, legal, diseases, glossary).
 * No sidebar, no auth check. Just the standard navbar + footer from the root layout.
 * MotionProvider is provided by the root layout — no need to wrap again here.
 */
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto w-full max-w-7xl px-4 py-8 md:px-6 lg:py-12">{children}</div>;
}
