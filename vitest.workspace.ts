import { defineWorkspace } from 'vitest/config';

// Monorepo test workspace: root cross-cutting tests (smoke + DB integration) plus
// each app's own suite (e.g. the API e2e). `vitest run` at the root runs them all.
export default defineWorkspace(['./vitest.config.ts', './apps/api/vitest.config.ts']);
