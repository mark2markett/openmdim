import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'root',
    include: ['tests/**/*.test.ts'],
    environment: 'node'
  }
});
