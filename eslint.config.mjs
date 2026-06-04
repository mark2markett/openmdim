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
      // Import-boundary stub: forbid deep cross-package imports.
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@openmdim/*/src/*', '@openmdim/*/dist/*', '@openmdim/*/generated/*'],
              message:
                'Import a package via its public entry (e.g. "@openmdim/domain"), never a deep path. import-boundary stub — see CLAUDE.md §6.'
            },
            {
              group: ['**/../*/src/**', '../../*/src/**'],
              message:
                'No cross-package deep relative imports — use the package public API. import-boundary stub.'
            }
          ]
        }
      ]
    }
  }
);
