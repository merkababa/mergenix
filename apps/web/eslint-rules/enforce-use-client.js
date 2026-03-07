/**
 * ESLint rule: enforce-use-client
 *
 * PRIVACY ENFORCEMENT: Ensures all files in privacy-sensitive paths have
 * "use client" as their first directive. In Next.js 15, files without
 * "use client" run as React Server Components — meaning DNA data could
 * be processed on the server, violating the core privacy contract.
 *
 * Protected paths:
 *   - apps/web/app/(app)/analysis/** — the analysis page and sub-routes
 *   - apps/web/components/genetics/** — all genetics-related components
 */

/** @type {import("eslint").Rule.RuleModule} */
const rule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Enforce "use client" directive in privacy-sensitive files that handle genetic/DNA data',
      recommended: true,
    },
    hasSuggestions: true,
    messages: {
      missingUseClient:
        'Files in privacy-sensitive paths MUST have "use client" as the first directive. ' +
        'DNA data must NEVER reach the server. ' +
        'Without this directive, Next.js will treat this as a Server Component.',
      addUseClient: 'Add "use client" directive at the top of the file',
    },
    schema: [],
  },
  create(context) {
    // Normalize path separators to forward slashes for cross-platform support
    const filename = context.filename.replace(/\\/g, '/');

    // Check if this file is in a privacy-sensitive path
    const isPrivacySensitive =
      filename.includes('app/(app)/analysis/') || filename.includes('components/genetics/');

    if (!isPrivacySensitive) {
      return {};
    }

    let hasUseClientDirective = false;

    return {
      // Check the very first expression statement in the program
      ExpressionStatement(node) {
        if (
          node.parent.type === 'Program' &&
          node.parent.body[0] === node &&
          node.expression.type === 'Literal' &&
          node.expression.value === 'use client'
        ) {
          hasUseClientDirective = true;
        }
      },

      'Program:exit'(programNode) {
        if (!hasUseClientDirective) {
          context.report({
            node: programNode,
            messageId: 'missingUseClient',
            suggest: [
              {
                messageId: 'addUseClient',
                fix(fixer) {
                  return fixer.insertTextBefore(programNode, '"use client";\n\n');
                },
              },
            ],
          });
        }
      },
    };
  },
};

module.exports = rule;
