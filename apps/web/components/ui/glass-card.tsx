// Client component required for spotlight mouse tracking and micro-interaction hooks
"use client";

import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import {
  useCallback,
  useRef,
  type CSSProperties,
  type HTMLAttributes,
  type MouseEvent,
} from "react";

// ---------------------------------------------------------------------------
// Noise texture — inline SVG data URI (subtle, low opacity, no external file)
// ---------------------------------------------------------------------------
const NOISE_SVG_URI =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E\")";

// ---------------------------------------------------------------------------
// CVA variant definitions
// ---------------------------------------------------------------------------
const glassCardVariants = cva(
  [
    "relative overflow-hidden rounded-[20px] border transition-all duration-300",
    "shadow-[0_4px_30px_var(--shadow-ambient),inset_0_1px_0_var(--inset-highlight)]",
  ],
  {
    variants: {
      variant: {
        subtle: [
          "border-[rgba(148,163,184,0.05)] bg-[rgba(12,18,32,0.35)]",
          "[backdrop-filter:blur(8px)] [-webkit-backdrop-filter:blur(8px)]",
          "[[data-theme='light']_&]:bg-[rgba(255,255,255,0.4)]",
          "[[data-theme='light']_&]:border-[rgba(15,23,42,0.04)]",
        ],
        medium: [
          "border-[var(--glass-border)] bg-[var(--bg-glass)]",
          "[backdrop-filter:blur(var(--glass-blur))] [-webkit-backdrop-filter:blur(var(--glass-blur))]",
        ],
        strong: [
          "border-[rgba(148,163,184,0.12)] bg-[rgba(12,18,32,0.85)]",
          "[backdrop-filter:blur(24px)] [-webkit-backdrop-filter:blur(24px)]",
          "[[data-theme='light']_&]:bg-[rgba(255,255,255,0.9)]",
          "[[data-theme='light']_&]:border-[rgba(15,23,42,0.08)]",
        ],
        // D1.3 — new: frosted (saturate 180%)
        frosted: [
          "border-[var(--glass-border)] bg-[var(--bg-glass)]",
          "[backdrop-filter:blur(var(--glass-blur))_saturate(180%)]",
          "[-webkit-backdrop-filter:blur(var(--glass-blur))_saturate(180%)]",
          "[[data-theme='light']_&]:bg-[rgba(255,255,255,0.55)]",
        ],
        // D1.3 — new: aurora (animated shifting gradient via ::before pseudo)
        aurora: [
          "border-[rgba(139,92,246,0.15)] bg-[var(--bg-glass)]",
          "[backdrop-filter:blur(var(--glass-blur))] [-webkit-backdrop-filter:blur(var(--glass-blur))]",
          "glass-card--aurora",
        ],
      },
      hover: {
        none: "",
        glow: "hover:-translate-y-1 hover:shadow-[0_12px_40px_var(--shadow-elevated),0_0_30px_var(--glow-teal)] hover:border-[rgba(6,214,160,0.2)]",
        lift: "hover:-translate-y-1.5 hover:shadow-[0_16px_50px_var(--shadow-elevated)]",
        // D1.3 — new: gradient border sweep on hover
        sweep:
          "hover:-translate-y-1 hover:shadow-[0_12px_40px_var(--shadow-elevated)] glass-card--sweep",
      },
      rainbow: {
        true: "rainbow-bar",
        false: "",
      },
    },
    defaultVariants: {
      variant: "medium",
      hover: "glow",
      rainbow: false,
    },
  },
);

// ---------------------------------------------------------------------------
// Props — backward-compatible extension of the original interface
// ---------------------------------------------------------------------------
interface GlassCardProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof glassCardVariants> {
  /**
   * Enables mouse-tracking spotlight: a radial gradient that follows the
   * cursor, creating a localised inner-light effect using --mouse-x/--mouse-y.
   * @default false
   */
  spotlight?: boolean;
  /**
   * Renders a subtle SVG noise texture overlay at very low opacity.
   * Off by default — opt-in per card.
   * @default false
   */
  noiseOverlay?: boolean;
  /**
   * Opt-in to CSS micro-interactions: icon bounce (.card-icon children) and
   * badge slide-in (.card-badge children) on hover. Adds `group` class.
   * @default false
   */
  microInteractions?: boolean;
}

// ---------------------------------------------------------------------------
// GlassCard
// ---------------------------------------------------------------------------
export function GlassCard({
  className,
  variant,
  hover,
  rainbow,
  spotlight = false,
  noiseOverlay = false,
  microInteractions = false,
  children,
  onMouseMove,
  onMouseLeave,
  style,
  ...props
}: GlassCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  // Spotlight: track pointer position and write CSS custom properties
  const handleMouseMove = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      if (spotlight && cardRef.current) {
        const rect = cardRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        cardRef.current.style.setProperty("--mouse-x", `${x}%`);
        cardRef.current.style.setProperty("--mouse-y", `${y}%`);
      }
      onMouseMove?.(e);
    },
    [spotlight, onMouseMove],
  );

  const handleMouseLeave = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      if (spotlight && cardRef.current) {
        // Reset to centre for graceful fade-out
        cardRef.current.style.setProperty("--mouse-x", "50%");
        cardRef.current.style.setProperty("--mouse-y", "50%");
      }
      onMouseLeave?.(e);
    },
    [spotlight, onMouseLeave],
  );

  const spotlightVars = spotlight
    ? ({ "--mouse-x": "50%", "--mouse-y": "50%" } as CSSProperties)
    : {};

  return (
    <div
      ref={cardRef}
      className={cn(
        glassCardVariants({ variant, hover, rainbow }),
        (microInteractions || spotlight) && "group",
        className,
      )}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ ...spotlightVars, ...style }}
      {...props}
    >
      {/* Spotlight overlay — follows cursor via CSS custom properties */}
      {spotlight && (
        <div
          className="pointer-events-none absolute inset-0 z-10 rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{
            background:
              "radial-gradient(circle 200px at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(255,255,255,0.06), transparent 70%)",
          }}
          aria-hidden="true"
        />
      )}

      {/* Noise texture overlay — subtle grain at very low opacity */}
      {noiseOverlay && (
        <div
          className="pointer-events-none absolute inset-0 z-10 rounded-[inherit]"
          style={{
            backgroundImage: NOISE_SVG_URI,
            backgroundRepeat: "repeat",
            backgroundSize: "200px 200px",
            mixBlendMode: "overlay",
            opacity: 0.035,
          }}
          aria-hidden="true"
        />
      )}

      {children}
    </div>
  );
}
