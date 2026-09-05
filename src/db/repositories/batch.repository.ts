import { db } from "../client.js";
import type { DbTransaction } from "../transaction.js";
import { batches } from "../schema/transaction.schema.js";
import { eq } from "drizzle-orm";

export type BatchStatus =
  | "UPLOADED"
  | "VALIDATING"
  | "READY"
  | "RUNNING"
  | "COMPLETED"
  | "FAILED";

export async function createBatch(
  executor: typeof db | DbTransaction = db,
) {
  const [batch] = await executor
    .insert(batches)
    .values({
      status: "UPLOADED",
    })
    .returning();

  if (!batch) {
    throw new Error("Failed to create batch");
  }

  return batch;
}

export async function updateBatchStatus(
  batchId: string,
  status: BatchStatus,
  executor: typeof db | DbTransaction = db,
) {
  const [updated] = await executor
    .update(batches)
    .set({
      status,
      updatedAt: new Date(),
    })
    .where(eq(batches.id, batchId))
    .returning();

  if (!updated) {
    throw new Error(`Batch not found: ${batchId}`);
  }

  return updated;
}

export async function getBatch(batchId: string) {
  const [batch] = await db
    .select()
    .from(batches)
    .where(eq(batches.id, batchId))
    .limit(1);

  if (!batch) {
    throw new Error(`Batch not found: ${batchId}`);
  }

  return batch;
}