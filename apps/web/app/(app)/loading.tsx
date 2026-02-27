export default function AppLoading() {
  return (
    <div role="status" aria-label="Loading content" className="min-h-screen flex items-center justify-center">
      <span className="sr-only">Loading...</span>
      <div className="animate-pulse space-y-4 w-full max-w-4xl px-6">
        <div
          className="h-8 rounded-lg w-1/3"
          style={{ background: "var(--bg-elevated)" }}
        />
        <div
          className="h-64 rounded-xl"
          style={{ background: "var(--bg-elevated)" }}
        />
        <div className="grid grid-cols-2 gap-4">
          <div
            className="h-32 rounded-xl"
            style={{ background: "var(--bg-elevated)" }}
          />
          <div
            className="h-32 rounded-xl"
            style={{ background: "var(--bg-elevated)" }}
          />
        </div>
      </div>
    </div>
  );
}
