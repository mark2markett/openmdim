import type { PrismaClient } from './client';

/** Interactive-transaction client type (the `tx` passed to $transaction). */
type Tx = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0];

export interface AuditMeta {
  entityType: string;
  action: 'CREATE' | 'UPDATE' | 'DEACTIVATE';
  actor: string;
}

/**
 * Runs `work` and an AuditEvent insert inside ONE transaction (CLAUDE.md §6 — every
 * write emits an AuditEvent atomically). `describe` maps the work result to the audit
 * row's entityId + changes. If anything throws, BOTH the write and the audit row roll
 * back — there is never an orphan audit row or an unaudited write.
 */
export async function withAudit<T>(
  prisma: PrismaClient,
  meta: AuditMeta,
  work: (tx: Tx) => Promise<T>,
  describe: (result: T) => { entityId: string; changes: unknown }
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    const result = await work(tx);
    const { entityId, changes } = describe(result);
    await tx.auditEvent.create({
      data: {
        entityType: meta.entityType,
        entityId,
        action: meta.action,
        actor: meta.actor,
        changes: changes as object
      }
    });
    return result;
  });
}
