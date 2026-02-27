"use client";

import { cn } from "@/lib/utils";
import { GlassCard } from "@/components/ui/glass-card";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import { m } from "framer-motion";
import Link from "next/link";

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
  const motionProps = disableAnimation
    ? {}
    : {
        initial: { opacity: 0, y: 30 } as const,
        whileInView: { opacity: 1, y: 0 } as const,
        viewport: { once: true, margin: "-50px" } as const,
        transition: { duration: 0.5, ease: "easeOut" as const },
      };

  return (
    <m.div
      {...motionProps}
      className={cn("relative flex", className)}
    >
      {/* Popular badge — positioned above the card */}
      {popular && (
        <div className="absolute -top-3 left-1/2 z-10 -translate-x-1/2">
          <Badge
            variant="premium"
            className="whitespace-nowrap px-4 py-1 shadow-[0_0_20px_rgba(139,92,246,0.3)]"
          >
            <Sparkles className="mr-1 h-3 w-3" aria-hidden="true" />
            Most Popular
          </Badge>
        </div>
      )}

      <GlassCard
        variant="medium"
        hover="lift"
        className={cn(
          "flex w-full flex-col p-8",
          popular && "border-[rgba(139,92,246,0.2)]",
          cardClass,
        )}
      >
        {/* Gradient top bar */}
        <div
          className={cn(
            "absolute left-0 right-0 top-0 h-[2px] rounded-t-[20px]",
            barGradient,
          )}
          aria-hidden="true"
        />

        {/* Tier name */}
        <h3 className="mb-2 font-heading text-lg font-bold text-[var(--text-heading)]">
          {tier}
        </h3>

        {/* Price */}
        <div className="mb-1 flex items-baseline gap-1">
          <span className="font-heading text-4xl font-extrabold text-[var(--text-heading)]">
            {price}
          </span>
          <span className="text-sm text-[var(--text-muted)]">
            {priceNote}
          </span>
        </div>

        {/* Description */}
        <p className="mb-6 text-sm text-[var(--text-body)]">
          {description}
        </p>

        {/* Divider */}
        <hr className="mb-6 border-[var(--border-subtle)]" />

        {/* Feature list */}
        <ul role="list" className="mb-8 flex flex-1 flex-col gap-3">
          {features.map((feature) => (
            <li
              key={feature}
              className="flex items-start gap-2.5 text-sm text-[var(--text-body)]"
            >
              <Sparkles
                className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent-teal)]"
                aria-hidden="true"
              />
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        {/* CTA button */}
        <Link
          href={ctaHref}
          className={cn(
            buttonVariants({ variant: ctaVariant, size: "lg" }),
            "w-full",
          )}
        >
          {cta}
        </Link>
      </GlassCard>
    </m.div>
  );
}
