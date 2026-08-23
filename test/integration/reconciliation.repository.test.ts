import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";

import { db } from "../../src/db/client.js";

import {
  createCandidate,
  createEvidence,
  createReconciliationResult,
} from "../../src/db/repositories/reconciliation.repository.js";

import { candidates, evidence } from "../../src/db/schema/reconciliation.schema.js";

import { batches, sourceFiles, transactions } from "../../src/db/schema/transaction.schema.js";

describe("reconciliation evidence", () => {
  it("persists candidates and evidence", async () => {
    const [batch] = await db
      .insert(batches)
      .values({
        status: "READY",
      })
      .returning();

    const [sourceFile] = await db
      .insert(sourceFiles)
      .values({
        batchId: batch!.id,
        fileName: "evidence-test.csv",
        fileHash: "evidence-test-hash",
        rowCount: 1,
      })
      .returning();

    const [transaction] = await db
      .insert(transactions)
      .values({
        batchId: batch!.id,
        sourceFileId: sourceFile!.id,
        externalId: "TXN-EVIDENCE-001",
        amount: "100.00",
        currency: "USD",
        transactionDate: "2026-08-23",
        reference: "REF-001",
        vendor: "Acme Corp",
        status: "PENDING",
        sourceRowNumber: 2,
      })
      .returning();

    const reconciliation = await createReconciliationResult({
      transactionId: transaction!.id,
      status: "MATCHED",
      confidence: 95,
      reason: "Strong deterministic match",
    });

    const candidate = await createCandidate({
      reconciliationResultId: reconciliation.id,
      transactionId: transaction!.id,
      score: 95,
      decision: "MATCH",
      reason: "Amount and reference match",
    });

    const evidenceRecord = await createEvidence({
      reconciliationResultId: reconciliation.id,
      candidateId: candidate.id,
      field: "amount",
      sourceValue: "100.00",
      candidateValue: "100.00",
      explanation: "Exact amount match",
    });

    expect(candidate.score).toBe(95);
    expect(candidate.decision).toBe("MATCH");

    expect(evidenceRecord.field).toBe("amount");
    expect(evidenceRecord.sourceValue).toBe("100.00");
    expect(evidenceRecord.candidateValue).toBe("100.00");

    await db.delete(evidence).where(eq(evidence.id, evidenceRecord.id));

    await db.delete(candidates).where(eq(candidates.id, candidate.id));

    await db.delete(transactions).where(eq(transactions.id, transaction!.id));

    await db.delete(sourceFiles).where(eq(sourceFiles.id, sourceFile!.id));

    await db.delete(batches).where(eq(batches.id, batch!.id));
  });
});
