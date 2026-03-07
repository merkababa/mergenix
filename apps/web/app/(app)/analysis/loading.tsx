export default function AnalysisLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading content"
      className="flex min-h-screen items-center justify-center"
    >
      <span className="sr-only">Loading...</span>
      <div className="w-full max-w-5xl animate-pulse space-y-6 px-6">
        <div className="h-10 w-1/4 rounded-lg" style={{ background: 'var(--bg-elevated)' }} />
        <div className="flex gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-10 w-24 rounded-lg"
              style={{ background: 'var(--bg-elevated)' }}
            />
          ))}
        </div>
        <div className="h-96 rounded-xl" style={{ background: 'var(--bg-elevated)' }} />
      </div>
    </div>
  );
}
