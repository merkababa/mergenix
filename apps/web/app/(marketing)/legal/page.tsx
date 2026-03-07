import type { Metadata } from 'next';
import { LegalContent } from './_components/legal-content';

export const metadata: Metadata = {
  title: 'Legal',
  description:
    'Mergenix Terms of Service, Privacy Policy, and Cookie Policy. Your DNA never leaves your device.',
  openGraph: {
    title: 'Legal',
    description:
      'Mergenix Terms of Service, Privacy Policy, and Cookie Policy. Your DNA never leaves your device.',
    type: 'website',
    siteName: 'Mergenix',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Legal',
    description:
      'Mergenix Terms of Service, Privacy Policy, and Cookie Policy. Your DNA never leaves your device.',
  },
};

export default function LegalPage() {
  return <LegalContent />;
}
