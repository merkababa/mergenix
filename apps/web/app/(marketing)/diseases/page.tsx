import type { Metadata } from "next";
import { CatalogContent } from "./_components/catalog-content";
import { CARRIER_PANEL_COUNT_DISPLAY } from "@mergenix/genetics-data";

export const metadata: Metadata = {
  title: "Disease Catalog",
  description:
    `Browse our comprehensive database of ${CARRIER_PANEL_COUNT_DISPLAY} genetic conditions with carrier frequencies, inheritance models, and evidence-based confidence levels.`,
  openGraph: {
    title: "Disease Catalog",
    description:
      `Browse our comprehensive database of ${CARRIER_PANEL_COUNT_DISPLAY} genetic conditions with carrier frequencies, inheritance models, and evidence-based confidence levels.`,
    type: "website",
    siteName: "Mergenix",
  },
  twitter: {
    card: "summary_large_image",
    title: "Disease Catalog",
    description:
      `Browse ${CARRIER_PANEL_COUNT_DISPLAY} genetic conditions with carrier frequencies, inheritance models, and confidence levels.`,
  },
};

export default function DiseaseCatalogPage() {
  return <CatalogContent />;
}
