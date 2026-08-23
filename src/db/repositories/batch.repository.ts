import { db } from "../client.js";
import { batches } from "../schema/transaction.schema.js";

export async function createBatch() {
  const [batch] = await db
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
