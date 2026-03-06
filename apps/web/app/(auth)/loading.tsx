export default function AuthLoading() {
  return (
    <div role="status" aria-live="polite" aria-label="Loading content" className="min-h-screen flex items-center justify-center">
      <span className="sr-only">Loading...</span>
      <div className="animate-pulse w-full max-w-md px-6 space-y-4">
        <div
          className="h-8 rounded-lg w-2/3 mx-auto"
          style={{ background: "var(--bg-elevated)" }}
        />
        <div
          className="h-4 rounded-sm w-1/2 mx-auto"
          style={{ background: "var(--bg-elevated)" }}
        />
        <div className="space-y-3 mt-8">
          <div
            className="h-10 rounded-lg"
            style={{ background: "var(--bg-elevated)" }}
          />
          <div
            className="h-10 rounded-lg"
            style={{ background: "var(--bg-elevated)" }}
          />
          <div
            className="h-12 rounded-lg"
            style={{ background: "var(--bg-elevated)" }}
          />
        </div>
      </div>
    </div>
  );
}
