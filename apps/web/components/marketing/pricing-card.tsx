"use client";

import { cn } from "@/lib/utils";
import { GlassCard } from "@/components/ui/glass-card";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  ShieldCheck,
  Dna,
  FileType,
  Users,
  HeartPulse,
  Pill,
  TrendingUp,
  Mail,
  FlaskConical,
  FileText,
  Star,
  Database,
  BarChart2,
  MessageCircle,
  type LucideIcon,
} from "lucide-react";
import { m } from "motion/react";
import Link from "next/link";
import type { ReactElement } from "react";

// ---------------------------------------------------------------------------
// Semantic icon map: maps feature text substrings → icon component.
// Checked in order; first match wins. Falls back to Sparkles.
// IMPORTANT: match order matters — more specific patterns (e.g. "email support")
// must appear BEFORE broader ones (e.g. "email") to avoid premature matches.
// ---------------------------------------------------------------------------
interface FeatureIconEntry {
  /**
   * Pipe-separated lowercase substrings to match against the feature label.
   * Any match triggers this entry (OR logic). First entry in the array wins.
   */
  match: string;
  icon: ReactElement;
}

const FEATURE_ICON_CLASS = "mt-0.5 h-4 w-4 shrink-0 card-icon";

/** Helper: create a single-line FeatureIconEntry. */
function iconEntry(match: string, Icon: LucideIcon, color: string): FeatureIconEntry {
  return {
    match,
    icon: <Icon className={cn(FEATURE_ICON_CLASS, color)} aria-hidden="true" />,
  };
}

const FEATURE_ICON_MAP: FeatureIconEntry[] = [
  iconEntry("disease",                              ShieldCheck,    "text-(--accent-teal)"),
  iconEntry("trait",                                Dna,            "text-(--accent-cyan)"),
  iconEntry("file format",                          FileType,       "text-(--accent-violet)"),
  iconEntry("community",                            Users,          "text-(--text-muted)"),
  iconEntry("pharmacogenomic",                      Pill,           "text-(--accent-amber)"),
  iconEntry("polygenic",                            TrendingUp,     "text-(--accent-teal)"),
  // "email support" and "priority email" share the same icon — combined entry
  iconEntry("email support|priority email",         Mail,           "text-(--accent-violet)"),
  // "dedicated support" and "dedicated priority" share the same icon — combined entry
  iconEntry("dedicated support|dedicated priority", MessageCircle,  "text-(--accent-teal)"),
  iconEntry("clinvar",                              Database,       "text-(--accent-cyan)"),
  iconEntry("referral",                             FileText,       "text-(--accent-teal)"),
  iconEntry("pdf",                                  FileText,       "text-(--accent-amber)"),
  iconEntry("ethnicity",                            BarChart2,      "text-(--accent-cyan)"),
  iconEntry("punnett",                              FlaskConical,   "text-(--accent-teal)"),
  iconEntry("comparison",                           BarChart2,      "text-(--accent-violet)"),
  iconEntry("everything in",                        Star,           "text-(--accent-amber)"),
  iconEntry("health",                               HeartPulse,     "text-(--accent-rose)"),
];

/** Returns a semantic icon for the given feature label. Falls back to Sparkles. */
function getFeatureIcon(feature: string): ReactElement {
  const lower = feature.toLowerCase();
  for (const entry of FEATURE_ICON_MAP) {
    // Support pipe-separated match strings (OR logic) within a single entry
    const terms = entry.match.split("|");
    if (terms.some((term) => lower.includes(term))) {
      return entry.icon;
    }
  }
  // Default fallback
  return (
    <Sparkles
      className={cn(FEATURE_ICON_CLASS, "text-(--accent-teal)")}
      aria-hidden="true"
    />
  );
}

// ---------------------------------------------------------------------------
// Motion variants — card reveal + child stagger propagation (INFO 13)
// ---------------------------------------------------------------------------
// The parent card variant uses `when: "beforeChildren"` + `staggerChildren` so
// the feature list items animate AFTER the card slides in, triggered by the
// same viewport intersection. No independent `whileInView` on the feature list.

const CARD_VARIANTS = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: "easeOut" as const,
      when: "beforeChildren" as const,
      staggerChildren: 0.07,
      delayChildren: 0.15,
    },
  },
};

// Feature list container — no own transition; propagates parent variant signal
const FEATURE_LIST_VARIANTS = {
  hidden: {},
  visible: {},
};

const FEATURE_ITEM_VARIANTS = {
  hidden: { opacity: 0, x: -10 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.3, ease: "easeOut" as const },
  },
};

// ---------------------------------------------------------------------------
// Props — backward-compatible; all existing callers continue to work
// ---------------------------------------------------------------------------
interface PricingCardProps {
  tier: string;
  price: string;
  priceNote: string;
  description: string;
  features: string[];
  cta: string;
  ctaHref: string;
  ctaVariant: "primary" | "violet" | "outline";
  popular?: boolean;
  barGradient: string;
  cardClass?: string;
  className?: string;
  /**
   * When true, disables the card's own whileInView animation.
   * Use this when the card is already inside a parent stagger
   * container to avoid double-animation.
   */
  disableAnimation?: boolean;
}

// ---------------------------------------------------------------------------
// PricingCard
// ---------------------------------------------------------------------------
export function PricingCard({
  tier,
  price,
  priceNote,
  description,
  features,
  cta,
  ctaHref,
  ctaVariant,
  popular = false,
  barGradient,
  cardClass,
  className,
  disableAnimation = false,
}: PricingCardProps) {
  // When animation is enabled, use named variants so children can participate
  // in Motion's propagation (staggerChildren via CARD_VARIANTS).
  const motionProps = disableAnimation
    ? {}
    : {
        variants: CARD_VARIANTS,
        initial: "hidden" as const,
        whileInView: "visible" as const,
        viewport: { once: true, margin: "-50px" } as const,
      };

  return (
    <m.div
      {...motionProps}
      data-popular={popular ? "true" : undefined}
      className={cn(
        "relative flex",
        popular && "lg:scale-[1.03] lg:z-10",
        className,
      )}
    >
      {/* Popular badge — positioned above the card */}
      {popular && (
        <div className="absolute -top-3 left-1/2 z-10 -translate-x-1/2">
          <Badge
            variant="premium"
            className="card-badge whitespace-nowrap px-4 py-1 shadow-[0_0_20px_rgba(139,92,246,0.3)]"
          >
            <Sparkles className="mr-1 h-3 w-3" aria-hidden="true" />
            Most Popular
          </Badge>
        </div>
      )}

      <GlassCard
        variant={popular ? "aurora" : "medium"}
        hover="lift"
        microInteractions
        className={cn(
          "flex w-full flex-col p-8",
          popular && [
            "border-[rgba(139,92,246,0.35)]",
            "shadow-[0_4px_30px_var(--shadow-ambient),0_0_60px_var(--glow-violet)]",
          ],
          cardClass,
        )}
      >
        {/* Gradient top bar */}
        <div
          className={cn(
            "absolute left-0 right-0 top-0 h-[2px] rounded-t-glass",
            barGradient,
          )}
          aria-hidden="true"
        />

        {/* Tier name */}
        <h3 className="mb-2 font-heading text-lg font-bold text-(--text-heading)">
          {tier}
        </h3>

        {/* Price */}
        <div className="mb-1 flex items-baseline gap-1">
          <span className="font-heading text-4xl font-extrabold text-(--text-heading)">
            {price}
          </span>
          <span className="text-sm text-(--text-muted)">{priceNote}</span>
        </div>

        {/* Description */}
        <p className="mb-6 text-sm text-(--text-body)">{description}</p>

        {/* Divider */}
        <hr className="mb-6 border-(--border-subtle)" />

        {/* Feature list — stagger triggered by parent card variant propagation */}
        <m.ul
          role="list"
          className="mb-8 flex flex-1 flex-col gap-3"
          variants={FEATURE_LIST_VARIANTS}
        >
          {features.map((feature) => (
            <m.li
              key={feature}
              variants={FEATURE_ITEM_VARIANTS}
              className="flex items-start gap-2.5 text-sm text-(--text-body)"
            >
              {getFeatureIcon(feature)}
              <span>{feature}</span>
            </m.li>
          ))}
        </m.ul>

        {/* CTA button */}
        <Link
          href={ctaHref}
          className={cn(buttonVariants({ variant: ctaVariant, size: "lg" }), "w-full")}
        >
          {cta}
        </Link>
      </GlassCard>
    </m.div>
  );
}
