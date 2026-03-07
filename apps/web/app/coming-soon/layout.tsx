import type { Metadata } from 'next';
import { sora, lexend } from '@/lib/fonts';
import '../globals.css';

export const metadata: Metadata = {
  title: 'Coming Soon | Mergenix',
  description: "We're building something extraordinary.",
};

export default function ComingSoonLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`dark ${sora.variable} ${lexend.variable} min-h-screen antialiased`}
      style={{ background: 'var(--app-gradient)' }}
    >
      {children}
    </div>
  );
}
