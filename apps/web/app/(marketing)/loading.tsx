export default function MarketingLoading() {
  return (
    <div role="status" aria-live="polite" aria-label="Loading content" className="min-h-screen">
      <span className="sr-only">Loading...</span>
      <div className="mx-auto max-w-6xl animate-pulse space-y-8 px-6 py-20">
        <div
          className="mx-auto h-12 w-1/2 rounded-lg"
          style={{ background: 'var(--bg-elevated)' }}
        />
        <div
          className="mx-auto h-6 w-2/3 rounded-sm"
          style={{ background: 'var(--bg-elevated)' }}
        />
        <div className="mt-12 grid grid-cols-3 gap-6">
          <div className="h-48 rounded-xl" style={{ background: 'var(--bg-elevated)' }} />
          <div className="h-48 rounded-xl" style={{ background: 'var(--bg-elevated)' }} />
          <div className="h-48 rounded-xl" style={{ background: 'var(--bg-elevated)' }} />
        </div>
      </div>
    </div>
  );
}
