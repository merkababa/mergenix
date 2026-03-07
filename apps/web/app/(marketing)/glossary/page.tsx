import type { Metadata } from 'next';
import { GlossaryContent } from './_components/glossary-content';

export const metadata: Metadata = {
  title: 'Genetic Glossary',
  description:
    'Understand genetic terms used in carrier screening, trait prediction, and pharmacogenomics analysis.',
  openGraph: {
    title: 'Genetic Glossary',
    description:
      'Understand genetic terms used in carrier screening, trait prediction, and pharmacogenomics analysis.',
    type: 'website',
    siteName: 'Mergenix',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Genetic Glossary',
    description:
      'Understand genetic terms used in carrier screening, trait prediction, and pharmacogenomics analysis.',
  },
};

export default function GlossaryPage() {
  return <GlossaryContent />;
}
