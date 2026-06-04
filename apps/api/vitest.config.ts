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
    name: 'api-e2e',
    include: ['test/**/*.e2e.test.ts'],
    environment: 'node'
  }
});
