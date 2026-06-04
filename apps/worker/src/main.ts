import { Queue, type QueueOptions } from 'bullmq';

// BullMQ bootstrap (WU-0): declares the connection config and a queue name, but
// registers NO jobs and opens NO connection at startup. The queue is only created
// on demand via createInventoryQueue(); real workers/jobs arrive in WU-1+.

const redisUrl = new URL(process.env.REDIS_URL ?? 'redis://localhost:6379');

const connection: QueueOptions['connection'] = {
  host: redisUrl.hostname,
  port: Number(redisUrl.port || 6379)
};

export const INVENTORY_QUEUE = 'openmdim:inventory';

/** Lazily construct the inventory queue. Not called at bootstrap (no eager connect). */
export function createInventoryQueue(): Queue {
  return new Queue(INVENTORY_QUEUE, { connection });
}

function bootstrap(): void {
  console.log(
    `OpenMDIM worker bootstrap ready (queue="${INVENTORY_QUEUE}", redis=${redisUrl.host}). No jobs registered yet.`
  );
}

bootstrap();
