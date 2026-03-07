import { vi } from 'vitest';

// ─── Types ───────────────────────────────────────────────────────────────────

interface MockRouter {
  push: ReturnType<typeof vi.fn>;
  replace: ReturnType<typeof vi.fn>;
  refresh: ReturnType<typeof vi.fn>;
  back: ReturnType<typeof vi.fn>;
  forward: ReturnType<typeof vi.fn>;
  prefetch: ReturnType<typeof vi.fn>;
}

interface MockNextNavigation {
  useRouter: () => MockRouter;
  usePathname: () => string;
  useSearchParams: () => URLSearchParams;
  useParams: () => Record<string, string>;
  redirect: ReturnType<typeof vi.fn>;
}

interface MockNextNavigationOverrides {
  pathname?: string;
  searchParams?: URLSearchParams;
  params?: Record<string, string>;
  router?: Partial<MockRouter>;
}

// ─── Factory ─────────────────────────────────────────────────────────────────

/**
 * Creates a mock module for `next/navigation`.
 *
 * Default mocks:
 * - `useRouter` returns an object with `push`, `replace`, `refresh`, `back`, `forward`, `prefetch` (all `vi.fn()`)
 * - `usePathname` returns `'/'`
 * - `useSearchParams` returns `new URLSearchParams()`
 * - `useParams` returns `{}`
 * - `redirect` is a `vi.fn()`
 *
 * @param overrides - Optional overrides for individual return values.
 * @returns A mock module object suitable for `vi.mock('next/navigation', () => ...)`.
 *
 * @example
 * // Basic usage
 * vi.mock('next/navigation', () => mockNextNavigationFactory());
 *
 * @example
 * // With overrides
 * vi.mock('next/navigation', () => mockNextNavigationFactory({
 *   pathname: '/analysis',
 *   searchParams: new URLSearchParams('session_id=abc'),
 *   router: { push: customPushMock },
 * }));
 */
export function mockNextNavigationFactory(overrides?: MockNextNavigationOverrides): MockNextNavigation {
  const defaultRouter: MockRouter = {
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  };

  const router: MockRouter = overrides?.router
    ? { ...defaultRouter, ...overrides.router }
    : defaultRouter;

  return {
    useRouter: () => router,
    usePathname: () => overrides?.pathname ?? '/',
    useSearchParams: () => overrides?.searchParams ?? new URLSearchParams(),
    useParams: () => overrides?.params ?? {},
    redirect: vi.fn(),
  };
}
