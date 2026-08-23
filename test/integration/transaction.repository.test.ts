import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";

import { db } from "../../src/db/client.js";
import { createTransaction } from "../../src/db/repositories/transaction.repository.js";
import { batches, sourceFiles, transactions } from "../../src/db/schema/transaction.schema.js";

describe("transaction repository", () => {
  it("persists a normalized transaction", async () => {
    const [batch] = await db
      .insert(batches)
      .values({
        status: "READY",
      })
      .returning();

    expect(batch).toBeDefined();

    const [sourceFile] = await db
      .insert(sourceFiles)
      .values({
        batchId: batch!.id,
        fileName: "test.csv",
        fileHash: "test-hash",
        rowCount: 1,
      })
      .returning();

    expect(sourceFile).toBeDefined();

    const created = await createTransaction({
      batchId: batch!.id,
      sourceFileId: sourceFile!.id,
      sourceRowNumber: 2,
      transaction: {
        externalId: "TXN-TEST-001",
        amount: "1250.00",
        currency: "USD",
        date: new Date("2026-08-23"),
        reference: "REF-TEST-001",
        vendor: "Acme Corp",
      },
    });

    expect(created.externalId).toBe("TXN-TEST-001");
    expect(created.amount).toBe("1250.00");
    expect(created.currency).toBe("USD");

    await db.delete(transactions).where(eq(transactions.id, created.id));

    await db.delete(sourceFiles).where(eq(sourceFiles.id, sourceFile!.id));

    await db.delete(batches).where(eq(batches.id, batch!.id));
  });
});
