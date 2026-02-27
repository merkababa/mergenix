"use client";

import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { m } from "framer-motion";

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

export function PageHeader({
  title,
  subtitle,
  breadcrumbs,
  className,
}: PageHeaderProps) {
  return (
    <m.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={cn("mb-8 text-center", className)}
    >
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav
          aria-label="Breadcrumb"
          className="mb-4 flex items-center justify-center gap-1 text-sm font-body text-[var(--text-muted)]"
        >
          <Link
            href="/"
            className="transition-colors hover:text-[var(--accent-teal)]"
          >
            Home
          </Link>
          {breadcrumbs.map((crumb, i) => (
            <span key={crumb.href} className="flex items-center gap-1">
              <ChevronRight className="h-3 w-3" />
              {i === breadcrumbs.length - 1 ? (
                <span className="text-[var(--accent-teal)]">
                  {crumb.label}
                </span>
              ) : (
                <Link
                  href={crumb.href}
                  className="transition-colors hover:text-[var(--accent-teal)]"
                >
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
        <p className="mx-auto mt-3 max-w-2xl font-body text-base text-[var(--text-muted)] md:text-lg">
          {subtitle}
        </p>
      )}
    </m.div>
  );
}
