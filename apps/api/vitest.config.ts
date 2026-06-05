import { defineConfig } from 'vitest/config';

export default defineConfig({
  // NestJS uses TS legacy decorators + reflected metadata; make esbuild emit both
  // so the DI container and route decorators work under the test transform.
  esbuild: {
    target: 'es2022',
    tsconfigRaw: {
      compilerOptions: {
        experimentalDecorators: true,
        emitDecoratorMetadata: true,
        useDefineForClassFields: false
      }
    }
  },
  test: {
    name: 'api',
    include: ['test/**/*.e2e.test.ts', 'test/integration/**/*.it.test.ts'],
    environment: 'node',
    // Integration tests share one real Postgres locally (compose) — run files
    // sequentially so truncate-between-tests can't clobber a parallel file.
    fileParallelism: false,
    testTimeout: 120000,
    hookTimeout: 120000
  }
});
