import type { Metadata } from 'next';
import { HomeContent } from './_components/home-content';
import { MotionProvider } from '@/components/providers/motion-provider';

export const metadata: Metadata = {
  title: 'Mergenix — Know Your Genetic Future',
  description:
    "Compare two parents' DNA to predict offspring disease risk, traits, and drug responses. Privacy-first: your DNA never leaves your device.",
  openGraph: {
    title: 'Mergenix — Know Your Genetic Future',
    description:
      "Compare two parents' DNA to predict offspring disease risk, traits, and drug responses. Privacy-first: your DNA never leaves your device.",
    type: 'website',
    siteName: 'Mergenix',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Mergenix — Know Your Genetic Future',
    description:
      "Compare two parents' DNA to predict offspring disease risk, traits, and drug responses. Privacy-first.",
  },
};

export default function HomePage() {
  return (
    <MotionProvider>
      <HomeContent />
    </MotionProvider>
  );
}
