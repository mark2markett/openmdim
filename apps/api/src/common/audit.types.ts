export type AuditAction = 'CREATE' | 'UPDATE' | 'DEACTIVATE';

/** Until app identity lands (WU-6), service writes are attributed to the system. */
export const SYSTEM_ACTOR = 'system';
