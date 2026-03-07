/**
 * Tests for the custom ESLint rule: enforce-use-client
 *
 * PRIVACY: This rule ensures all files in privacy-sensitive paths
 * (analysis pages, genetics components) have "use client" directives
 * to prevent DNA data from leaking to the server via React Server Components.
 *
 * TDD: These tests are written FIRST, before the rule implementation.
 */
import { RuleTester } from 'eslint';
import { describe, it } from 'vitest';
import enforceUseClient from '../../eslint-rules/enforce-use-client';

// ESLint RuleTester configured for flat config
const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

describe('enforce-use-client ESLint rule', () => {
  it("should pass when 'use client' is the first statement", () => {
    ruleTester.run('enforce-use-client', enforceUseClient, {
      valid: [
        {
          code: `"use client";\n\nimport { useState } from "react";`,
          filename: 'apps/web/app/(app)/analysis/page.tsx',
        },
      ],
      invalid: [],
    });
  });

  it("should fail when 'use client' is missing from an analysis file", () => {
    ruleTester.run('enforce-use-client', enforceUseClient, {
      valid: [],
      invalid: [
        {
          code: `import { useState } from "react";\nexport default function Page() { return null; }`,
          filename: 'apps/web/app/(app)/analysis/page.tsx',
          errors: [
            {
              messageId: 'missingUseClient',
            },
          ],
        },
      ],
    });
  });

  it("should fail when 'use client' is missing from a genetics component", () => {
    ruleTester.run('enforce-use-client', enforceUseClient, {
      valid: [],
      invalid: [
        {
          code: `import { memo } from "react";\nexport const Foo = memo(function Foo() { return null; });`,
          filename: 'apps/web/components/genetics/results/carrier-tab.tsx',
          errors: [
            {
              messageId: 'missingUseClient',
            },
          ],
        },
      ],
    });
  });

  it("should fail when 'use client' is missing from a top-level genetics component", () => {
    ruleTester.run('enforce-use-client', enforceUseClient, {
      valid: [],
      invalid: [
        {
          code: `import { useState } from "react";\nexport function FileDropzone() { return null; }`,
          filename: 'apps/web/components/genetics/file-dropzone.tsx',
          errors: [
            {
              messageId: 'missingUseClient',
            },
          ],
        },
      ],
    });
  });

  it('should pass for files outside privacy-sensitive paths', () => {
    ruleTester.run('enforce-use-client', enforceUseClient, {
      valid: [
        {
          // This file is NOT in a privacy-sensitive path, so it should pass even without "use client"
          code: `import { useState } from "react";\nexport function Header() { return null; }`,
          filename: 'apps/web/components/layout/header.tsx',
        },
      ],
      invalid: [],
    });
  });

  it("should pass when 'use client' is present in a genetics component", () => {
    ruleTester.run('enforce-use-client', enforceUseClient, {
      valid: [
        {
          code: `"use client";\n\nimport { memo } from "react";\nexport const Foo = memo(function Foo() { return null; });`,
          filename: 'apps/web/components/genetics/results/carrier-tab.tsx',
        },
      ],
      invalid: [],
    });
  });

  it("should handle single-quoted 'use client' directive", () => {
    ruleTester.run('enforce-use-client', enforceUseClient, {
      valid: [
        {
          code: `'use client';\n\nimport { useState } from "react";`,
          filename: 'apps/web/app/(app)/analysis/page.tsx',
        },
      ],
      invalid: [],
    });
  });

  it('should fail for nested analysis paths', () => {
    ruleTester.run('enforce-use-client', enforceUseClient, {
      valid: [],
      invalid: [
        {
          code: `export default function ResultsPage() { return null; }`,
          filename: 'apps/web/app/(app)/analysis/results/page.tsx',
          errors: [
            {
              messageId: 'missingUseClient',
            },
          ],
        },
      ],
    });
  });

  it("should provide a fixable suggestion to add 'use client'", () => {
    ruleTester.run('enforce-use-client', enforceUseClient, {
      valid: [],
      invalid: [
        {
          code: `import { useState } from "react";`,
          filename: 'apps/web/app/(app)/analysis/page.tsx',
          errors: [
            {
              messageId: 'missingUseClient',
              suggestions: [
                {
                  messageId: 'addUseClient',
                  output: `"use client";\n\nimport { useState } from "react";`,
                },
              ],
            },
          ],
        },
      ],
    });
  });
});
