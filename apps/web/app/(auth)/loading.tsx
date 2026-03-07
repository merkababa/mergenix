export default function AuthLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading content"
      className="flex min-h-screen items-center justify-center"
    >
      <span className="sr-only">Loading...</span>
      <div className="w-full max-w-md animate-pulse space-y-4 px-6">
        <div
          className="mx-auto h-8 w-2/3 rounded-lg"
          style={{ background: 'var(--bg-elevated)' }}
        />
        <div
          className="mx-auto h-4 w-1/2 rounded-sm"
          style={{ background: 'var(--bg-elevated)' }}
        />
        <div className="mt-8 space-y-3">
          <div className="h-10 rounded-lg" style={{ background: 'var(--bg-elevated)' }} />
          <div className="h-10 rounded-lg" style={{ background: 'var(--bg-elevated)' }} />
          <div className="h-12 rounded-lg" style={{ background: 'var(--bg-elevated)' }} />
        </div>
      </div>
    </div>
  );
}
