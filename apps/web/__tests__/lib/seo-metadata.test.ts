import { describe, it, expect } from 'vitest';
import {
  PAGE_METADATA,
  DEFAULT_METADATA,
  SEO_KEYWORDS,
  JSON_LD_SCHEMA,
} from '../../lib/seo-metadata';

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('SEO Metadata', () => {
  it('PAGE_METADATA has entries for all main routes', () => {
    const expectedRoutes = [
      '/',
      '/products',
      '/about',
      '/glossary',
      '/security',
      '/sample-report',
      '/privacy',
      '/analysis',
    ];

    for (const route of expectedRoutes) {
      expect(PAGE_METADATA).toHaveProperty(route);
      expect(PAGE_METADATA[route].title).toBeTruthy();
      expect(PAGE_METADATA[route].description).toBeTruthy();
    }
  });

  it('all meta descriptions are under 160 characters', () => {
    for (const [route, meta] of Object.entries(PAGE_METADATA)) {
      expect(
        meta.description.length,
        `Description for route "${route}" is ${meta.description.length} chars (max 160)`,
      ).toBeLessThanOrEqual(160);
    }
  });

  it('JSON_LD_SCHEMA has correct @type SoftwareApplication', () => {
    expect(JSON_LD_SCHEMA['@context']).toBe('https://schema.org');
    expect(JSON_LD_SCHEMA['@type']).toBe('SoftwareApplication');
    expect(JSON_LD_SCHEMA.name).toBe('Mergenix');
    expect(JSON_LD_SCHEMA.applicationCategory).toBe('HealthApplication');
  });

  it('DEFAULT_METADATA includes site name "Mergenix"', () => {
    expect(DEFAULT_METADATA.openGraph?.siteName).toBe('Mergenix');
    expect(DEFAULT_METADATA.title).toBeDefined();
    // Title template should contain Mergenix
    if (typeof DEFAULT_METADATA.title === 'object' && DEFAULT_METADATA.title !== null) {
      const titleObj = DEFAULT_METADATA.title as { default: string; template: string };
      expect(titleObj.default).toContain('Mergenix');
      expect(titleObj.template).toContain('Mergenix');
    }
  });

  it('SEO_KEYWORDS contains at least 10 keywords', () => {
    expect(SEO_KEYWORDS.length).toBeGreaterThanOrEqual(10);
    // Every keyword should be a non-empty string
    for (const keyword of SEO_KEYWORDS) {
      expect(keyword).toBeTruthy();
      expect(typeof keyword).toBe('string');
    }
  });
});
