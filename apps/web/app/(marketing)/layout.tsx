import { MotionProvider } from "@/components/providers/motion-provider";

/**
 * Marketing layout — full-width pages (products, about, legal, diseases, glossary).
 * No sidebar, no auth check. Just the standard navbar + footer from the root layout.
 * Wrapped in MotionProvider so all Framer Motion animations respect prefers-reduced-motion.
 */
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MotionProvider>
      <div className="mx-auto w-full max-w-7xl px-4 py-8 md:px-6 lg:py-12">
        {children}
      </div>
    </MotionProvider>
  );
}
