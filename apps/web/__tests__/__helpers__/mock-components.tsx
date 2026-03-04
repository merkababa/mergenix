import type { ReactNode, HTMLAttributes, ButtonHTMLAttributes, InputHTMLAttributes } from 'react';

// ─── GlassCard ────────────────────────────────────────────────────────────────

interface MockGlassCardProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
  variant?: string;
  hover?: boolean;
  rainbow?: boolean;
  className?: string;
}

export function mockGlassCardFactory() {
  return {
    GlassCard: ({ children, className, variant: _v, hover: _h, rainbow: _r, ...props }: MockGlassCardProps) => (
      <div data-testid="glass-card" className={className} {...props}>{children}</div>
    ),
  };
}

// ─── Button ───────────────────────────────────────────────────────────────────

interface MockButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children?: ReactNode;
  isLoading?: boolean;
  variant?: string;
  size?: string;
  className?: string;
}

export function mockButtonFactory() {
  return {
    Button: ({ children, isLoading, disabled, className, variant: _v, size: _s, ...props }: MockButtonProps) => (
      <button disabled={disabled || isLoading} className={className} {...props}>
        {children}
      </button>
    ),
  };
}

// ─── SectionHeading ───────────────────────────────────────────────────────────

interface MockSectionHeadingProps {
  children?: ReactNode;
  title?: string;
  subtitle?: string;
  className?: string;
  badge?: string;
  id?: string;
}

export function mockSectionHeadingFactory() {
  return {
    SectionHeading: ({ title, subtitle, id }: MockSectionHeadingProps) => (
      <div>
        <h2 id={id}>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
    ),
  };
}

// ─── PageHeader ───────────────────────────────────────────────────────────────

interface MockPageHeaderProps {
  children?: ReactNode;
  title?: string;
  subtitle?: string;
  className?: string;
  breadcrumbs?: unknown;
}

export function mockPageHeaderFactory() {
  return {
    PageHeader: ({ title, subtitle }: MockPageHeaderProps) => (
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
    ),
  };
}

// ─── ScrollReveal ─────────────────────────────────────────────────────────────

interface MockScrollRevealProps {
  children?: ReactNode;
  className?: string;
  direction?: string;
  delay?: number;
}

export function mockScrollRevealFactory() {
  return {
    ScrollReveal: ({ children, className }: MockScrollRevealProps) => (
      <div className={className}>{children}</div>
    ),
  };
}

// ─── NextLink ─────────────────────────────────────────────────────────────────

interface MockNextLinkProps extends HTMLAttributes<HTMLAnchorElement> {
  children?: ReactNode;
  href?: string;
  className?: string;
}

export function mockNextLinkFactory() {
  return {
    default: ({ children, href, className, ...props }: MockNextLinkProps) => (
      <a href={href} className={className} {...props}>{children}</a>
    ),
  };
}

// ─── Input ────────────────────────────────────────────────────────────────────

interface MockInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: ReactNode;
}

export function mockInputFactory() {
  return {
    Input: ({ label, error, icon: _icon, ...props }: MockInputProps) => {
      const inputId = label?.toLowerCase().replace(/\s+/g, '-');
      return (
        <div>
          {label && <label htmlFor={inputId}>{label}</label>}
          <input id={inputId} aria-label={label} {...props} />
          {error && <p role="alert">{error}</p>}
        </div>
      );
    },
  };
}

// ─── Badge ────────────────────────────────────────────────────────────────────

interface MockBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  children?: ReactNode;
  variant?: string;
}

export function mockBadgeFactory(options?: { includeVariant?: boolean }) {
  return {
    Badge: ({ children, variant, ...props }: MockBadgeProps) => (
      <span
        data-testid={options?.includeVariant ? `badge-${variant}` : 'badge'}
        {...props}
      >
        {children}
      </span>
    ),
  };
}
