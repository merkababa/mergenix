export default function MarketingLoading() {
  return (
    <div role="status" aria-live="polite" aria-label="Loading content" className="min-h-screen">
      <span className="sr-only">Loading...</span>
      <div className="animate-pulse max-w-6xl mx-auto px-6 py-20 space-y-8">
        <div
          className="h-12 rounded-lg w-1/2 mx-auto"
          style={{ background: "var(--bg-elevated)" }}
        />
        <div
          className="h-6 rounded-sm w-2/3 mx-auto"
          style={{ background: "var(--bg-elevated)" }}
        />
        <div className="grid grid-cols-3 gap-6 mt-12">
          <div
            className="h-48 rounded-xl"
            style={{ background: "var(--bg-elevated)" }}
          />
          <div
            className="h-48 rounded-xl"
            style={{ background: "var(--bg-elevated)" }}
          />
          <div
            className="h-48 rounded-xl"
            style={{ background: "var(--bg-elevated)" }}
          />
        </div>
      </div>
    </div>
  );
}
