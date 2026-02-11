"use client";

import { useState } from "react";
import Link from "next/link";
import { Dna, Shield, Heart, Github, Twitter, Mail, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GlassCard } from "@/components/ui/glass-card";

const PRODUCT_LINKS = [
  { href: "/analysis", label: "Carrier Screening" },
  { href: "/analysis", label: "Trait Prediction" },
  { href: "/analysis", label: "Pharmacogenomics" },
  { href: "/products", label: "Pricing" },
];

const RESOURCE_LINKS = [
  { href: "/diseases", label: "Disease Catalog" },
  { href: "/glossary", label: "Glossary" },
  { href: "/about", label: "How It Works" },
];

const LEGAL_LINKS = [
  { href: "/legal#terms", label: "Terms of Service" },
  { href: "/legal#privacy", label: "Privacy Policy" },
  { href: "/legal#cookies", label: "Cookie Policy" },
];

const COMPANY_LINKS = [
  { href: "/about", label: "About Us" },
  { href: "/about#science", label: "Our Science" },
  { href: "/counseling", label: "Find a Counselor" },
];

const SOCIAL_LINKS = [
  {
    href: "https://github.com/mergenix",
    label: "GitHub",
    icon: Github,
    ariaLabel: "Mergenix on GitHub",
  },
  {
    href: "https://twitter.com/mergenix",
    label: "X (Twitter)",
    icon: Twitter,
    ariaLabel: "Mergenix on X (Twitter)",
  },
  {
    href: "mailto:hello@mergenix.com",
    label: "Email",
    icon: Mail,
    ariaLabel: "Email Mergenix",
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
      <h4 className="mb-4 font-heading text-sm font-semibold uppercase tracking-wider text-[var(--text-heading)]">
        {title}
      </h4>
      <ul className="space-y-2.5">
        {links.map((link) => (
          <li key={link.label}>
            <Link
              href={link.href}
              className="text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--accent-teal)]"
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

  const handleNewsletterSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubscribed(true);
  };

  return (
    <footer className="relative mt-auto border-t border-[var(--border-subtle)]">
      <div className="mx-auto max-w-7xl px-4 py-16 md:px-6">
        {/* Main grid */}
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-5">
          {/* Brand column */}
          <div className="lg:col-span-1">
            <Link href="/" className="flex items-center gap-2 no-underline">
              <Dna className="h-6 w-6 text-[var(--accent-teal)]" aria-hidden="true" />
              <span className="gradient-text-teal font-heading text-lg font-extrabold">
                Mergenix
              </span>
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-[var(--text-muted)]">
              Privacy-first genetic offspring analysis. Know your family&apos;s
              genetic future with confidence.
            </p>

            {/* Privacy badge */}
            <div className="mt-5 inline-flex items-center gap-2 rounded-xl border border-[rgba(6,214,160,0.12)] bg-[rgba(6,214,160,0.05)] px-3 py-2 backdrop-blur-sm">
              <Shield className="h-4 w-4 text-[var(--accent-teal)]" aria-hidden="true" />
              <span className="text-xs font-medium text-[var(--text-muted)]">
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
            <h4 className="mb-4 mt-8 font-heading text-sm font-semibold uppercase tracking-wider text-[var(--text-heading)]">
              Connect
            </h4>
            <div className="flex items-center gap-3">
              {SOCIAL_LINKS.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.ariaLabel}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-muted)] transition-all hover:border-[rgba(6,214,160,0.3)] hover:text-[var(--accent-teal)] hover:shadow-[0_0_12px_var(--glow-teal)]"
                >
                  <social.icon className="h-4 w-4" aria-hidden="true" />
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Newsletter signup */}
        <div className="mt-12">
          <GlassCard variant="subtle" hover="none" className="p-6 sm:p-8">
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
              <div className="text-center sm:text-left">
                <h4 className="font-heading text-base font-semibold text-[var(--text-heading)]">
                  Stay in the loop
                </h4>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  Get updates on new features, genetic research, and product launches.
                </p>
              </div>
              {isSubscribed ? (
                <div className="flex w-full max-w-sm items-center justify-center gap-2 rounded-xl border border-[rgba(6,214,160,0.2)] bg-[rgba(6,214,160,0.08)] px-4 py-3">
                  <CheckCircle className="h-5 w-5 text-[var(--accent-teal)]" aria-hidden="true" />
                  <span className="text-sm font-medium text-[var(--accent-teal)]">
                    Thanks! We&apos;ll be in touch.
                  </span>
                </div>
              ) : (
                <form
                  className="flex w-full max-w-sm items-start gap-2"
                  onSubmit={handleNewsletterSubmit}
                >
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
              )}
            </div>
          </GlassCard>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-[var(--border-subtle)] pt-8 sm:flex-row">
          <p className="text-xs text-[var(--text-dim)]">
            &copy; {new Date().getFullYear()} Mergenix. All rights reserved.
          </p>
          <div className="flex items-center gap-1 text-xs text-[var(--text-dim)]">
            <span>Made with</span>
            <Heart className="h-3 w-3 text-[var(--accent-rose)]" aria-hidden="true" />
            <span>for families everywhere</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
