// Prisma client singleton + re-export of the generated types/enums.
// The generated client lives in ../generated/client (gitignored; produced by
// `prisma generate`). CI regenerates it before typecheck/test.
import { PrismaClient } from '../generated/client';

export const prisma = new PrismaClient();
export * from '../generated/client';
