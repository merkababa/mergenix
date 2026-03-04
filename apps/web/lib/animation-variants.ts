import type { Variants } from "motion/react";

/* ------------------------------------------------------------------ */
/*  Shared Motion animation variants                                   */
/*  Import these instead of defining inline variants per page.        */
/* ------------------------------------------------------------------ */

/** Fade in + slide up (24 px). Good for cards, paragraphs, CTAs. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" as const },
  },
};

/** Simple opacity fade. Good for section wrappers. */
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.6, ease: "easeOut" as const },
  },
};

/** Scale-in with slight shrink origin. Good for hero / mission cards. */
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.7, ease: "easeOut" as const },
  },
};

/**
 * Factory for stagger containers. Allows customizing the delay
 * between children while keeping the hidden/visible contract.
 *
 * @param staggerSeconds - delay between each child (default 0.1)
 */
export function createStaggerContainer(staggerSeconds = 0.1): Variants {
  return {
    hidden: {},
    visible: {
      transition: { staggerChildren: staggerSeconds },
    },
  };
}

/** Default stagger container (0.1 s between children). */
export const staggerContainer: Variants = createStaggerContainer(0.1);

/** Stagger item that fades up 30 px. Pairs with staggerContainer. */
export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" as const },
  },
};

/**
 * Card-level variant — same motion as staggerItem.
 * Exported as a semantic alias for readability in card grids.
 */
export const cardVariants: Variants = staggerItem;
