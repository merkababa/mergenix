'use client';

import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { m } from 'motion/react';

interface Breadcrumb {
  label: string;
  href: string;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: Breadcrumb[];
  className?: string;
}

export function PageHeader({ title, subtitle, breadcrumbs, className }: PageHeaderProps) {
  return (
    <m.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={cn('mb-8 text-center', className)}
    >
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav
          aria-label="Breadcrumb"
          className="font-body text-(--text-muted) mb-4 flex items-center justify-center gap-1 text-sm"
        >
          <Link href="/" className="hover:text-(--accent-teal) transition-colors">
            Home
          </Link>
          {breadcrumbs.map((crumb, i) => (
            <span key={crumb.href} className="flex items-center gap-1">
              <ChevronRight className="h-3 w-3" />
              {i === breadcrumbs.length - 1 ? (
                <span className="text-(--accent-teal)" aria-current="page">
                  {crumb.label}
                </span>
              ) : (
                <Link href={crumb.href} className="hover:text-(--accent-teal) transition-colors">
                  {crumb.label}
                </Link>
              )}
            </span>
          ))}
        </nav>
      )}

      <h1 className="gradient-text font-heading text-3xl font-extrabold md:text-4xl lg:text-5xl">
        {title}
      </h1>

      {subtitle && (
        <p className="font-body text-(--text-muted) mx-auto mt-3 max-w-2xl text-base md:text-lg">
          {subtitle}
        </p>
      )}
    </m.div>
  );
}
