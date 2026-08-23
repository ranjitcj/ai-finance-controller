import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";

import { db } from "../../src/db/client.js";
import { persistCsv } from "../../src/ingestion/csv/csv.persistence.js";
import { batches, sourceFiles, transactions } from "../../src/db/schema/transaction.schema.js";

describe("CSV persistence", () => {
  it("persists valid CSV transactions and reports invalid rows", async () => {
    const csv = `externalId,amount,currency,date,reference,vendor
TXN-001,100.00,USD,2026-08-23,REF-001,Acme Corp
TXN-002,invalid,USD,2026-08-23,REF-002,Globex
TXN-003,200.00,USD,2026-08-22,REF-003,Initech`;

    const result = await persistCsv({
      fileName: "transactions.csv",
      fileHash: "integration-test-hash",
      content: csv,
    });

    expect(result.transactions).toHaveLength(2);
    expect(result.errors).toHaveLength(1);

    expect(result.errors[0]?.rowNumber).toBe(3);

    expect(result.transactions[0]?.externalId).toBe("TXN-001");
    expect(result.transactions[1]?.externalId).toBe("TXN-003");

    const persisted = await db
      .select()
      .from(transactions)
      .where(eq(transactions.batchId, result.batch.id));

    expect(persisted).toHaveLength(2);

    expect(persisted.some((transaction) => transaction.externalId === "TXN-001")).toBe(true);

    expect(persisted.some((transaction) => transaction.externalId === "TXN-003")).toBe(true);

    await db.delete(transactions).where(eq(transactions.batchId, result.batch.id));

    await db.delete(sourceFiles).where(eq(sourceFiles.batchId, result.batch.id));

    await db.delete(batches).where(eq(batches.id, result.batch.id));
  });
});
