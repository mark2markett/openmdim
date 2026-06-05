// @openmdim/db — Prisma client + generated types. The schema (prisma/schema.prisma)
// is the source of truth for the data model. Mutations go through services that wrap
// writes + an AuditEvent in one transaction (see withAudit, added in WU-1 Task 5).
export * from './client';
export { withAudit, type AuditMeta } from './audit';

export const PRISMA_ENV = {
  /** Pooled connection used at runtime. */
  url: 'DATABASE_URL',
  /** Direct connection used by Prisma Migrate / introspection. */
  directUrl: 'DIRECT_URL'
} as const;
