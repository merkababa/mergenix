import { Suspense } from 'react';
import type { Metadata } from 'next';
import { CounselingContent } from './_components/counseling-content';

export const metadata: Metadata = {
  title: 'Find a Genetic Counselor | Mergenix',
  description:
    'Connect with board-certified genetic counselors through the NSGC directory to understand your Mergenix results.',
};

function CounselingSkeleton() {
  return (
    <div role="status" aria-busy="true" className="animate-pulse space-y-6">
      <span className="sr-only">Loading...</span>
      <div className="rounded-glass mx-auto h-32 max-w-md bg-(--bg-elevated)" />
      <div className="rounded-glass h-24 bg-(--bg-elevated)" />
      <div className="rounded-glass h-48 bg-(--bg-elevated)" />
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
