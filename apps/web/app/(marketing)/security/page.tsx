import type { Metadata } from 'next';
import { SecurityContent } from './_components/security-content';

export const metadata: Metadata = {
  title: 'Security',
  description:
    'Learn how Mergenix protects your genetic data with zero-knowledge architecture. Your DNA never leaves your browser.',
  openGraph: {
    title: 'Security — Mergenix',
    description:
      'Learn how Mergenix protects your genetic data with zero-knowledge architecture. Your DNA never leaves your browser.',
    type: 'website',
    siteName: 'Mergenix',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Security — Mergenix',
    description:
      'Learn how Mergenix protects your genetic data with zero-knowledge architecture. Your DNA never leaves your browser.',
  },
};

export default function SecurityPage() {
  return <SecurityContent />;
}
