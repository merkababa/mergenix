import type { Metadata } from "next";
import { SampleReportClient } from "./_components/sample-report-client";

export const metadata: Metadata = {
  title: "Sample Report",
  description:
    "Explore a sample Mergenix genetic analysis report with carrier screening, trait predictions, pharmacogenomics, and polygenic risk scores.",
  openGraph: {
    title: "Sample Report | Mergenix",
    description:
      "See what a Mergenix genetic analysis report looks like with sample data.",
    type: "website",
    siteName: "Mergenix",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sample Report | Mergenix",
    description:
      "See what a Mergenix genetic analysis report looks like with sample data.",
  },
};

export default function SampleReportPage() {
  return <SampleReportClient />;
}
