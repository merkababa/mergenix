import type { Metadata } from 'next';
import { CancelContent } from './_components/cancel-content';

export const metadata: Metadata = {
  title: 'Payment Cancelled | Mergenix',
  description: 'Your Mergenix payment was cancelled. No charges were made.',
};

export default function PaymentCancelPage() {
  return <CancelContent />;
}
