import type { Metadata } from 'next';
import { ProductsContent } from './_components/products-content';

export const metadata: Metadata = {
  title: 'Pricing',
  description:
    'Simple one-time pricing for Mergenix genetic analysis. Free, Premium, and Pro tiers available.',
  openGraph: {
    title: 'Pricing',
    description:
      'Simple one-time pricing for Mergenix genetic analysis. Free, Premium, and Pro tiers available.',
    type: 'website',
    siteName: 'Mergenix',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pricing',
    description:
      'Simple one-time pricing for Mergenix genetic analysis. Free, Premium, and Pro tiers available.',
  },
};

export default function ProductsPage() {
  return <ProductsContent />;
}
