import type { Metadata } from "next";
import dynamic from "next/dynamic";

// Lazy-load the content component so the large sample-report-data module
// (~1012 lines) is code-split into a separate chunk and excluded from the
// initial page bundle. ssr:false is correct because the component uses
// framer-motion animations that depend on the browser environment.
const SampleReportContent = dynamic(
  () =>
    import("./_components/sample-report-content").then(
      (m) => m.SampleReportContent,
    ),
  { ssr: false },
);

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
  return <SampleReportContent />;
}
