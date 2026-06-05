// Flat ESLint config for the OpenMDIM monorepo.
//
// Includes an IMPORT-BOUNDARY STUB (CLAUDE.md §6 / BUILD-GOVERNANCE.md): cross-module
// access must go through a package's public entry point, never a deep path. The stub
// is wired now and tightened per-module as bounded contexts land in later WUs. Do not
// disable it.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/build/**',
      '**/node_modules/**',
      '**/coverage/**',
      '**/.next/**',
      '**/*.config.*',
      'packages/db/generated/**',
      'packages/db/prisma/**'
    ]
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts'],
    rules: {
      // Import-boundary stub: forbid deep cross-package access. A package must be
      // imported via its public entry ("@openmdim/<pkg>"), never an internal path.
      // Covers BOTH the workspace-alias form and relative paths that reach into
      // another package's internals. Tightened into per-context zones in WU-1+.
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              // Workspace alias: exact internal dir AND any deeper path.
              group: [
                '@openmdim/*/src',
                '@openmdim/*/src/**',
                '@openmdim/*/dist',
                '@openmdim/*/dist/**',
                '@openmdim/*/generated',
                '@openmdim/*/generated/**'
              ],
              message:
                'Import a package via its public entry (e.g. "@openmdim/domain"), never an internal path (src/dist/generated). import-boundary stub — see CLAUDE.md §6.'
            },
            {
              // Relative paths that reach into another package's/app's internals,
              // e.g. "../../packages/domain/src/x" or "../../../apps/api/src/y".
              group: [
                '**/packages/*/src',
                '**/packages/*/src/**',
                '**/packages/*/dist/**',
                '**/apps/*/src',
                '**/apps/*/src/**'
              ],
              message:
                'No cross-package deep relative imports — use the package public API. import-boundary stub — see CLAUDE.md §6.'
            },
            {
              // Cross-CONTEXT boundary (WU-1.3): a bounded context must reach another
              // context only via its service, never another context's repository.
              // Same-context imports use "./x.repository" (no folder name) and are NOT
              // matched; cross-context imports reference the folder ("../catalog/...").
              group: [
                '**/catalog/*.repository',
                '**/commercial/*.repository',
                '**/org/*.repository',
                '**/entitlement/*.repository',
                '**/costing/*.repository'
              ],
              message:
                "Cross-context access must go through that context's service, never its repository (WU-1.3 / CLAUDE.md §6)."
            }
          ]
        }
      ]
    }
  }
);
