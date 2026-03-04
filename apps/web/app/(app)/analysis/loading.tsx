export default function AnalysisLoading() {
  return (
    <div role="status" aria-live="polite" aria-label="Loading content" className="min-h-screen flex items-center justify-center">
      <span className="sr-only">Loading...</span>
      <div className="animate-pulse space-y-6 w-full max-w-5xl px-6">
        <div
          className="h-10 rounded-lg w-1/4"
          style={{ background: "var(--bg-elevated)" }}
        />
        <div className="flex gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-10 rounded-lg w-24"
              style={{ background: "var(--bg-elevated)" }}
            />
          ))}
        </div>
        <div
          className="h-96 rounded-xl"
          style={{ background: "var(--bg-elevated)" }}
        />
      </div>
    </div>
  );
}
