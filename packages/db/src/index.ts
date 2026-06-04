// @openmdim/db — Prisma datasource lives in prisma/schema.prisma.
// The generated client and repositories arrive in WU-1+. For now this package only
// declares which env vars Prisma reads, so consumers can document their config.
export const PRISMA_ENV = {
  /** Pooled connection used at runtime. */
  url: 'DATABASE_URL',
  /** Direct connection used by Prisma Migrate / introspection. */
  directUrl: 'DIRECT_URL'
} as const;
