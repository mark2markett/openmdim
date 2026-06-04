import { describe, it, expect } from 'vitest';

// WU-0 placeholder test: proves the test runner is wired into CI. Real unit and
// integration tests (against a real Postgres via Testcontainers) arrive in WU-1+.
describe('repo smoke', () => {
  it('runs the test runner', () => {
    expect(1 + 1).toBe(2);
  });
});
