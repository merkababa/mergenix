import type { JSX, SVGAttributes } from 'react';

type MockIconProps = SVGAttributes<SVGSVGElement> & {
  [key: string]: unknown;
};

/**
 * Creates a map of named lucide-react icon mocks.
 * Pass icon names as they appear in lucide-react exports (PascalCase).
 * Each icon renders as <svg data-testid="icon-{lowercase-kebab-name}" />.
 *
 * Usage:
 *   vi.mock('lucide-react', () => mockLucideIcons('Shield', 'Lock', 'Mail'));
 */
export function mockLucideIcons(...iconNames: string[]): Record<string, (props: MockIconProps) => JSX.Element> {
  const icons: Record<string, (props: MockIconProps) => JSX.Element> = {};
  for (const name of iconNames) {
    const testId = name
      .replace(/([A-Z])/g, (m, letter, offset) => (offset > 0 ? `-${letter}` : letter))
      .toLowerCase();
    icons[name] = (props: MockIconProps) => <svg data-testid={`icon-${testId}`} {...props} />;
  }
  return icons;
}
