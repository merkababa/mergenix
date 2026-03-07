export default function AppLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading content"
      className="flex min-h-screen items-center justify-center"
    >
      <span className="sr-only">Loading...</span>
      <div className="w-full max-w-4xl animate-pulse space-y-4 px-6">
        <div className="h-8 w-1/3 rounded-lg" style={{ background: 'var(--bg-elevated)' }} />
        <div className="h-64 rounded-xl" style={{ background: 'var(--bg-elevated)' }} />
        <div className="grid grid-cols-2 gap-4">
          <div className="h-32 rounded-xl" style={{ background: 'var(--bg-elevated)' }} />
          <div className="h-32 rounded-xl" style={{ background: 'var(--bg-elevated)' }} />
        </div>
      </div>
    </div>
  );
}
