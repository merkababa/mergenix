"use client";

import dynamic from "next/dynamic";

// Lazy-load the content component so the large sample-report-data module
// (~1012 lines) is code-split into a separate chunk and excluded from the
// initial page bundle. ssr:false is valid here because this is a Client
// Component — framer-motion animations depend on the browser environment.
const SampleReportContent = dynamic(
  () =>
    import("./sample-report-content").then((m) => m.SampleReportContent),
  { ssr: false },
);

export function SampleReportClient() {
  return <SampleReportContent />;
}
