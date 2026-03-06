/* ------------------------------------------------------------------ */
/*  Shared FAQ data                                                   */
/*  Each page can import the full list or a tagged subset.            */
/* ------------------------------------------------------------------ */

import type { ReactNode } from "react";

export interface FaqItem {
  question: string;
  answer: ReactNode;
  /** Optional tags for filtering by page context */
  tags?: ("general" | "pricing" | "privacy" | "technical")[];
}

/** Comprehensive FAQ list — union of home and products page questions */
export const FAQ_ITEMS: FaqItem[] = [
  /* -- General / Privacy -- */
  {
    question: "Is my DNA data safe?",
    answer:
      "Absolutely. All genetic analysis runs entirely in your browser. Your DNA files are never uploaded to our servers, stored in any database, or shared with anyone. We physically cannot access your data.",
    tags: ["general", "privacy"],
  },
  {
    question: "What file formats do you support?",
    answer:
      "We support 23andMe, AncestryDNA, MyHeritage, and VCF (Variant Call Format) files. Just drag and drop your raw data file and we'll auto-detect the format.",
    tags: ["general", "technical"],
  },
  {
    question: "How accurate are the results?",
    answer:
      "Our carrier screening uses established Mendelian inheritance models with curated SNP data. Each result includes a confidence indicator. We always recommend consulting a genetic counselor for medical decisions.",
    tags: ["general", "technical"],
  },
  {
    question: "Do I need both parents' DNA?",
    answer:
      "Yes, for offspring prediction you need DNA files from both parents. This allows us to model inheritance patterns and calculate carrier risk probabilities accurately.",
    tags: ["general"],
  },

  /* -- Pricing -- */
  {
    question: "Is this a subscription?",
    answer:
      "No. Mergenix uses one-time pricing. Pay once, use forever. No monthly fees, no hidden charges, no renewals.",
    tags: ["general", "pricing"],
  },
  {
    question: "Can I upgrade later?",
    answer:
      "Yes! You can upgrade from Free to Premium or Pro at any time. You only pay the difference.",
    tags: ["pricing"],
  },
  {
    question: "What payment methods do you accept?",
    answer:
      "We accept all major credit cards via Stripe. All transactions are securely processed.",
    tags: ["pricing"],
  },
  {
    question: "Is there a refund policy?",
    answer: (
      <>
        Yes, we offer a 30-day money-back guarantee for technical issues,
        file format incompatibility, or analysis errors. If our platform
        cannot process your file or produces a processing error, contact{" "}
        <a
          href="mailto:support@mergenix.com"
          className="underline text-(--accent-teal) hover:underline focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-(--accent-teal) focus-visible:ring-offset-1 rounded-xs"
        >
          support@mergenix.com
        </a>{" "}
        within 30 days of purchase for a full refund. Please note: because
        genetic analysis results are inherently probabilistic estimates,
        refunds are not available solely on the basis of dissatisfaction
        with probabilistic outcomes.
      </>
    ),
    tags: ["pricing"],
  },
];

/** FAQ items suitable for the home page (general audience) */
export const HOME_FAQ = FAQ_ITEMS.filter(
  (item) => item.tags?.includes("general"),
);

/** FAQ items suitable for the products / pricing page */
export const PRICING_FAQ = FAQ_ITEMS.filter(
  (item) => item.tags?.includes("pricing"),
);
