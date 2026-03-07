/**
 * Centralized SEO metadata for the Mergenix platform.
 *
 * All page-level metadata, structured data, and keyword lists are maintained
 * here so they can be imported by route-level `page.tsx` files and tested
 * independently.
 */

import type { Metadata } from "next";

/** Canonical site URL — falls back to production if the env var is not set. */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://mergenix.com";

// ─── Keywords ────────────────────────────────────────────────────────────────

/** Core SEO keywords for the Mergenix platform. */
export const SEO_KEYWORDS: string[] = [
  "genetic testing",
  "carrier screening",
  "offspring prediction",
  "DNA analysis",
  "pharmacogenomics",
  "polygenic risk score",
  "genetic counseling",
  "preconception screening",
  "trait prediction",
  "genetic risk assessment",
  "privacy-first genetics",
  "Mergenix",
];

// ─── JSON-LD Structured Data ────────────────────────────────────────────────

/** Schema.org SoftwareApplication structured data for the Mergenix platform. */
export const JSON_LD_SCHEMA: Record<string, unknown> = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Mergenix",
  applicationCategory: "HealthApplication",
  operatingSystem: "Web",
  description:
    "Privacy-first genetic offspring analysis platform. Compare two parents' DNA to predict offspring disease risk and traits.",
  url: SITE_URL,
  offers: [
    {
      "@type": "Offer",
      name: "Free",
      price: "0",
      priceCurrency: "USD",
      description: "Basic genetic analysis with core carrier screening.",
    },
    {
      "@type": "Offer",
      name: "Premium",
      price: "14.99",
      priceCurrency: "USD",
      description: "Advanced analysis with trait prediction and pharmacogenomics.",
    },
    {
      "@type": "Offer",
      name: "Pro",
      price: "34.99",
      priceCurrency: "USD",
      description: "Full-suite analysis with polygenic risk scores and detailed reports.",
    },
  ],
};

// ─── Default Metadata ───────────────────────────────────────────────────────

/** Default Next.js metadata applied at the root layout level. */
export const DEFAULT_METADATA: Metadata = {
  title: {
    default: "Mergenix — Explore Your Genetic Possibilities",
    template: "%s | Mergenix",
  },
  description:
    "Compare two parents' DNA to predict offspring disease risk and traits. Privacy-first genetic analysis that runs entirely in your browser.",
  keywords: SEO_KEYWORDS,
  openGraph: {
    title: "Mergenix — Explore Your Genetic Possibilities",
    description:
      "Privacy-first genetic offspring analysis. Your DNA never leaves your device.",
    url: SITE_URL,
    siteName: "Mergenix",
    type: "website",
    locale: "en_US",
    images: [
      {
        url: `${SITE_URL}/opengraph-image`,
        width: 1200,
        height: 630,
        alt: "Mergenix — Genetic Offspring Analysis",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Mergenix — Explore Your Genetic Possibilities",
    description:
      "Privacy-first genetic offspring analysis. Your DNA never leaves your device.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

// ─── Per-Page Metadata ──────────────────────────────────────────────────────

/** Route-specific title and description for each main page. */
export const PAGE_METADATA: Record<string, { title: string; description: string }> = {
  "/": {
    title: "Mergenix — Explore Your Genetic Possibilities",
    description:
      "Compare two parents' DNA to predict offspring disease risk and traits. Privacy-first genetic analysis in your browser.",
  },
  "/products": {
    title: "Products",
    description:
      "Explore Mergenix plans: carrier screening, trait prediction, pharmacogenomics, and polygenic risk scores.",
  },
  "/about": {
    title: "About Mergenix",
    description:
      "Learn about Mergenix's mission, science, and privacy-first approach to genetic offspring analysis.",
  },
  "/glossary": {
    title: "Genetics Glossary",
    description:
      "Plain-language definitions of genetic terms used in Mergenix results and reports.",
  },
  "/security": {
    title: "Security",
    description:
      "How Mergenix protects your genetic data with client-side processing and zero-upload architecture.",
  },
  "/sample-report": {
    title: "Sample Report",
    description:
      "Explore a sample Mergenix genetic analysis report with carrier screening, trait predictions, and more.",
  },
  "/privacy": {
    title: "Privacy Notice",
    description:
      "Mergenix privacy policy. Your DNA data never leaves your device. No server uploads, no third-party sharing.",
  },
  "/analysis": {
    title: "Genetic Analysis",
    description:
      "Upload your DNA files and run a comprehensive genetic analysis. Results are computed in your browser.",
  },
};
