/**
 * App layout — authenticated pages (analysis, account, subscription, counseling).
 * Will include auth check middleware and optional sidebar in the future.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto w-full max-w-7xl px-4 py-8 md:px-6 lg:py-12">{children}</div>;
}
