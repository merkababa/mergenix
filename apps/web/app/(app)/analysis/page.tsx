import { Suspense } from 'react';
import type { Metadata } from 'next';
import { AnalysisContent } from './_components/analysis-content';

export const metadata: Metadata = {
  title: 'DNA Analysis | Mergenix',
  description:
    "Upload both parents' DNA files to predict offspring disease risk, carrier status, trait predictions, and more. All analysis runs in your browser — your data never leaves your device.",
  openGraph: {
    title: 'DNA Analysis | Mergenix',
    description:
      "Predict offspring disease risk, carrier status, and traits by uploading both parents' DNA files.",
    type: 'website',
    siteName: 'Mergenix',
  },
  twitter: {
    card: 'summary',
    title: 'DNA Analysis | Mergenix',
    description:
      "Predict offspring disease risk, carrier status, and traits by uploading both parents' DNA files.",
  },
};

function AnalysisSkeleton() {
  return (
    <div role="status" aria-busy="true" className="animate-pulse space-y-6">
      <span className="sr-only">Loading...</span>
      <div className="rounded-glass mx-auto h-10 w-64 bg-(--bg-elevated)" />
      <div className="rounded-glass h-48 bg-(--bg-elevated)" />
      <div className="rounded-glass h-32 bg-(--bg-elevated)" />
    </div>
  );
}

export default function AnalysisPage() {
  return (
    <Suspense fallback={<AnalysisSkeleton />}>
      <AnalysisContent />
    </Suspense>
  );
}
