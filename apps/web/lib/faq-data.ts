/* ------------------------------------------------------------------ */
/*  Shared FAQ data                                                   */
/*  Each page can import the full list or a tagged subset.            */
/* ------------------------------------------------------------------ */

export interface FaqItem {
  question: string;
  answer: string;
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
    answer:
      "Yes, we offer a 30-day money-back guarantee. If you're not satisfied, contact us for a full refund.",
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
