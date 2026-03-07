'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Dna, Shield, Heart, Github, Twitter, Mail, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GlassCard } from '@/components/ui/glass-card';
import { CpraSpiModal } from '@/components/legal/cpra-spi-modal';

const PRODUCT_LINKS = [
  { href: '/analysis', label: 'Carrier Screening' },
  { href: '/analysis', label: 'Trait Prediction' },
  { href: '/analysis', label: 'Pharmacogenomics' },
  { href: '/products', label: 'Pricing' },
];

const RESOURCE_LINKS = [
  { href: '/diseases', label: 'Disease Catalog' },
  { href: '/glossary', label: 'Glossary' },
  { href: '/about', label: 'How It Works' },
  { href: '/security', label: 'Security' },
  { href: '/sample-report', label: 'Sample Report' },
];

const LEGAL_LINKS = [
  { href: '/legal#terms', label: 'Terms of Service' },
  { href: '/legal#privacy', label: 'Privacy Policy' },
  { href: '/legal#cookies', label: 'Cookie Policy' },
];

const COMPANY_LINKS = [
  { href: '/about', label: 'About Us' },
  { href: '/about#science', label: 'Our Science' },
  { href: '/counseling', label: 'Find a Counselor' },
];

const SOCIAL_LINKS = [
  {
    href: 'https://github.com/mergenix',
    label: 'GitHub',
    icon: Github,
    ariaLabel: 'Mergenix on GitHub',
  },
  {
    href: 'https://twitter.com/mergenix',
    label: 'X (Twitter)',
    icon: Twitter,
    ariaLabel: 'Mergenix on X (Twitter)',
  },
  {
    href: 'mailto:hello@mergenix.com',
    label: 'Email',
    icon: Mail,
    ariaLabel: 'Email Mergenix',
  },
];

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { href: string; label: string }[];
}) {
  return (
    <div>
      <h3 className="font-heading text-(--text-heading) mb-4 text-sm font-semibold uppercase tracking-wider">
        {title}
      </h3>
      <ul className="space-y-2.5">
        {links.map((link) => (
          <li key={link.label}>
            <Link
              href={link.href}
              className="text-(--text-muted) hover:text-(--accent-teal) text-sm transition-colors"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Footer() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [showCpraSpiModal, setShowCpraSpiModal] = useState(false);

  const handleNewsletterSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubscribed(true);
  };

  const handleOpenCpraSpiModal = () => {
    setShowCpraSpiModal(true);
  };

  const handleCloseCpraSpiModal = () => {
    setShowCpraSpiModal(false);
  };

  return (
    <footer className="border-(--border-subtle) relative mt-auto border-t">
      <div className="mx-auto max-w-7xl px-4 py-16 md:px-6">
        {/* Main grid */}
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-5">
          {/* Brand column */}
          <div className="lg:col-span-1">
            <Link href="/" className="flex items-center gap-2 no-underline">
              <Dna className="text-(--accent-teal) h-6 w-6" aria-hidden="true" />
              <span className="font-heading text-(--text-heading) text-lg font-extrabold tracking-[-0.03em]">
                Mergenix
              </span>
            </Link>

            {/* Brand tagline */}
            <p className="font-heading text-(--accent-teal) mt-2 text-xs font-semibold uppercase tracking-widest opacity-80">
              Genetics Meets Insight
            </p>

            {/* Decorative separator */}
            <div className="bg-linear-to-r from-(--accent-teal) my-4 h-px w-12 rounded-full to-transparent opacity-40" />

            <p className="text-(--text-muted) text-sm leading-relaxed">
              Privacy-first genetic offspring analysis. Explore your family&apos;s genetic
              possibilities with confidence.
            </p>

            {/* Privacy badge */}
            <div className="backdrop-blur-xs mt-5 inline-flex items-center gap-2 rounded-xl border border-[rgba(6,214,160,0.12)] bg-[rgba(6,214,160,0.05)] px-3 py-2">
              <Shield className="text-(--accent-teal) h-4 w-4" aria-hidden="true" />
              <span className="text-(--text-muted) text-xs font-medium">
                Your DNA Never Leaves Your Device
              </span>
            </div>
          </div>

          {/* Link columns */}
          <FooterColumn title="Product" links={PRODUCT_LINKS} />
          <FooterColumn title="Resources" links={RESOURCE_LINKS} />
          <FooterColumn title="Legal" links={LEGAL_LINKS} />
          <div>
            <FooterColumn title="Company" links={COMPANY_LINKS} />

            {/* Connect / Social */}
            <h3 className="font-heading text-(--text-heading) mb-4 mt-8 text-sm font-semibold uppercase tracking-wider">
              Connect
            </h3>
            <div className="flex items-center gap-3">
              {SOCIAL_LINKS.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.ariaLabel}
                  className="border-(--border-subtle) bg-(--bg-elevated) text-(--text-muted) hover:text-(--accent-teal) flex h-9 min-h-[44px] w-9 min-w-[44px] items-center justify-center rounded-xl border transition-all hover:border-[rgba(6,214,160,0.3)] hover:shadow-sm"
                >
                  <social.icon className="h-4 w-4" aria-hidden="true" />
                </a>
              ))}
            </div>

            {/* Contact emails */}
            <h3 className="font-heading text-(--text-heading) mb-4 mt-8 text-sm font-semibold uppercase tracking-wider">
              Contact
            </h3>
            <ul className="space-y-2.5">
              <li>
                <a
                  href="mailto:hello@mergenix.com"
                  className="text-(--text-muted) hover:text-(--accent-teal) flex items-center gap-2 text-sm transition-colors"
                >
                  <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                  hello@mergenix.com
                </a>
              </li>
              <li>
                <a
                  href="mailto:support@mergenix.com"
                  className="text-(--text-muted) hover:text-(--accent-teal) flex items-center gap-2 text-sm transition-colors"
                >
                  <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                  support@mergenix.com
                </a>
              </li>
              <li>
                <a
                  href="mailto:privacy@mergenix.com"
                  className="text-(--text-muted) hover:text-(--accent-teal) flex items-center gap-2 text-sm transition-colors"
                >
                  <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                  privacy@mergenix.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Newsletter signup */}
        <div className="mt-12">
          <GlassCard variant="subtle" hover="none" className="p-6 sm:p-8">
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
              <div className="text-center sm:text-left">
                <h3 className="font-heading text-(--text-heading) text-base font-semibold">
                  Stay in the loop
                </h3>
                <p className="text-(--text-muted) mt-1 text-sm">
                  Get updates on new features, genetic research, and product launches.
                </p>
              </div>
              {isSubscribed ? (
                <div
                  role="status"
                  aria-live="polite"
                  className="flex w-full max-w-sm items-center justify-center gap-2 rounded-xl border border-[rgba(6,214,160,0.2)] bg-[rgba(6,214,160,0.08)] px-4 py-3"
                >
                  <CheckCircle className="text-(--accent-teal) h-5 w-5" aria-hidden="true" />
                  <span className="text-(--accent-teal) text-sm font-medium">
                    Thanks! We&apos;ll be in touch.
                  </span>
                </div>
              ) : (
                <div className="flex w-full max-w-sm flex-col">
                  <form className="flex w-full items-start gap-2" onSubmit={handleNewsletterSubmit}>
                    <Input
                      type="email"
                      placeholder="you@example.com"
                      aria-label="Email address for newsletter"
                      required
                      className="flex-1"
                    />
                    <Button variant="primary" size="md" type="submit">
                      Subscribe
                    </Button>
                  </form>
                  <p className="text-(--text-muted) mt-2 text-xs">
                    We send product updates only.{' '}
                    <Link href="/privacy" className="hover:text-(--text-body) underline">
                      Privacy Policy
                    </Link>
                  </p>
                </div>
              )}
            </div>
          </GlassCard>
        </div>

        {/* Bottom bar */}
        <div className="border-(--border-subtle) mt-12 flex flex-col items-center justify-between gap-4 border-t pt-8 sm:flex-row">
          <p className="text-(--text-dim) text-xs">
            &copy; {new Date().getFullYear()} Mergenix. All rights reserved.
          </p>
          <div className="text-(--text-dim) flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs">
            {/* CPRA Sensitive Personal Information link — shown on all pages */}
            <button
              type="button"
              onClick={handleOpenCpraSpiModal}
              className="text-(--text-dim) hover:text-(--text-muted) focus-visible:outline-hidden focus-visible:ring-(--accent-teal) rounded-xs inline-flex min-h-[44px] items-center text-xs underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-offset-1"
            >
              Limit the Use of My Sensitive Personal Information
            </button>
            <div className="flex items-center gap-1">
              <span>Made with</span>
              <Heart className="text-(--accent-rose) h-3 w-3" aria-hidden="true" />
              <span>for families everywhere</span>
            </div>
          </div>
        </div>
      </div>

      {/* CPRA SPI Modal — portal would be ideal but inline is sufficient for now */}
      {showCpraSpiModal && <CpraSpiModal onClose={handleCloseCpraSpiModal} />}
    </footer>
  );
}
