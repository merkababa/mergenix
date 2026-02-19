# Mergenix Web (Frontend)

Next.js 15 frontend for the Mergenix Genetic Analysis Platform.

## Tech Stack

- **Framework:** Next.js 15 (App Router, React 19)
- **Language:** TypeScript 5.7+
- **Styling:** Tailwind CSS 4 + CSS custom properties
- **State:** Zustand (client), TanStack Query (server)
- **Validation:** Zod
- **Animation:** Framer Motion
- **Charts:** Recharts
- **Testing:** Vitest + React Testing Library (unit), Playwright (E2E)

## Getting Started

### Prerequisites

- Node.js >= 20.0.0
- pnpm >= 9.0.0

### Setup

From the **monorepo root** (`<project-root>`):

```bash
# Install all dependencies
pnpm install

# Start the dev server (all apps)
pnpm dev

# Or start just the frontend
cd apps/web
pnpm dev
```

The app runs at [http://localhost:3000](http://localhost:3000).

### Environment Variables

Copy `.env.rewrite.example` from the repo root and set the `NEXT_PUBLIC_*` variables:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_SENTRY_DSN=...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000
```

## Development Commands

```bash
# Development server (with Turbopack)
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Lint (ESLint)
pnpm lint

# Type check
pnpm typecheck

# Unit tests
pnpm test

# E2E tests (requires running API)
pnpm test:e2e
```

## Project Structure

```
apps/web/
├── app/              # Next.js App Router pages & layouts
│   ├── globals.css   # Global styles + Tailwind + CSS custom properties
│   └── layout.tsx    # Root layout with providers
├── components/       # React components
│   ├── layout/       # Navbar, footer, theme toggle, page header
│   └── ui/           # Shared UI primitives
├── lib/              # Utilities and shared logic
│   ├── stores/       # Zustand stores (analysis, auth)
│   ├── fonts.ts      # Font configuration
│   └── utils.ts      # General utilities (cn, etc.)
├── next.config.ts    # Next.js configuration
├── tailwind.config.ts # Tailwind CSS configuration
├── tsconfig.json     # TypeScript configuration
└── postcss.config.js # PostCSS configuration
```

## Theme System

The app uses a bioluminescent laboratory theme with dark/light mode support via `next-themes`. CSS custom properties define all theme tokens in `globals.css`.

## Shared Packages

- `@mergenix/shared-types` — TypeScript types shared between frontend and backend
