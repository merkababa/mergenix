import { Suspense } from "react";
import type { Metadata } from "next";
import { CounselingContent } from "./_components/counseling-content";

export const metadata: Metadata = {
  title: "Find a Genetic Counselor | Mergenix",
  description:
    "Connect with board-certified genetic counselors through the NSGC directory to understand your Mergenix results.",
};

function CounselingSkeleton() {
  return (
    <div role="status" aria-busy="true" className="animate-pulse space-y-6">
      <span className="sr-only">Loading...</span>
      <div className="mx-auto h-32 max-w-md rounded-glass bg-(--bg-elevated)" />
      <div className="h-24 rounded-glass bg-(--bg-elevated)" />
      <div className="h-48 rounded-glass bg-(--bg-elevated)" />
    </div>
  );
}

export default function CounselingPage() {
  return (
    <Suspense fallback={<CounselingSkeleton />}>
      <CounselingContent />
    </Suspense>
  );
}
