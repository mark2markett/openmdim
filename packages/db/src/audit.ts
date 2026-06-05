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
    await writeAudit(tx, meta, entityId, changes);
    return result;
  });
}

/**
 * Write a single AuditEvent on an existing transaction. Used for multi-write
 * operations (e.g. creating child rows, cascade deactivations) so that EVERY
 * write gets its own audit row in the same transaction — not just the parent.
 */
export function writeAudit(
  tx: Tx,
  meta: AuditMeta,
  entityId: string,
  changes: unknown
): Promise<unknown> {
  return tx.auditEvent.create({
    data: {
      entityType: meta.entityType,
      entityId,
      action: meta.action,
      actor: meta.actor,
      changes: changes as object
    }
  });
}
