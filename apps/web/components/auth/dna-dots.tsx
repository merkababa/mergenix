'use client';

/**
 * Animated 5-dot DNA helix header.
 * Reusable across all auth pages (login, register, forgot-password, etc.)
 * Uses CSS keyframe animation (helixFloat) — must be defined in global CSS.
 */
export function DnaDots() {
  return (
    <div className="mb-6 flex justify-center gap-2" aria-hidden="true">
      {[0, 0.3, 0.6, 0.9, 1.2].map((delay, i) => (
        <div
          key={i}
          className="h-3.5 w-3.5 rounded-full"
          style={{
            background:
              i % 2 === 0
                ? 'linear-gradient(135deg, var(--accent-teal), var(--accent-cyan))'
                : 'linear-gradient(135deg, var(--accent-violet), var(--glow-violet))',
            boxShadow: i % 2 === 0 ? '0 0 12px var(--glow-teal)' : '0 0 12px var(--glow-violet)',
            animation: `helixFloat 2.2s ease-in-out infinite ${delay}s`,
          }}
        />
      ))}
    </div>
  );
}
