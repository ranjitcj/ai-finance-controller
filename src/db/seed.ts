import { db } from "./client.js";
import {
  batches,
  sourceFiles,
  transactions,
} from "./schema/transaction.schema.js";
import {
  candidates,
  evidence,
  exceptions,
  reconciliationResults,
  auditEvents,
} from "./schema/reconciliation.schema.js";

async function seed() {
  console.log("Seeding development database...");

  const [batch] = await db
    .insert(batches)
    .values({
      status: "READY",
    })
    .returning();

  if (!batch) {
    throw new Error("Failed to create seed batch");
  }

  const [sourceFile] = await db
    .insert(sourceFiles)
    .values({
      batchId: batch.id,
      fileName: "seed-transactions.csv",
      fileHash: "seed-development-file",
      rowCount: 2,
    })
    .returning();

  if (!sourceFile) {
    throw new Error("Failed to create seed source file");
  }

  const createdTransactions = await db
    .insert(transactions)
    .values([
      {
        batchId: batch.id,
        sourceFileId: sourceFile.id,
        externalId: "SEED-TXN-001",
        amount: "1250.00",
        currency: "USD",
        transactionDate: "2026-08-20",
        reference: "SEED-REF-001",
        vendor: "Acme Corp",
        status: "MATCHED",
        sourceRowNumber: 2,
      },
      {
        batchId: batch.id,
        sourceFileId: sourceFile.id,
        externalId: "SEED-TXN-002",
        amount: "850.50",
        currency: "USD",
        transactionDate: "2026-08-21",
        reference: "SEED-REF-002",
        vendor: "Globex Inc",
        status: "REVIEW_REQUIRED",
        sourceRowNumber: 3,
      },
    ])
    .returning();

  const matchedTransaction = createdTransactions[0];
  const reviewTransaction = createdTransactions[1];

  if (!matchedTransaction || !reviewTransaction) {
    throw new Error("Failed to create seed transactions");
  }

  const [matchedResult] = await db
    .insert(reconciliationResults)
    .values({
      transactionId: matchedTransaction.id,
      idempotencyKey: `seed-matched-${matchedTransaction.id}`,
      status: "MATCHED",
      confidence: 100,
      reason: "Seeded deterministic match",
    })
    .returning();

  if (!matchedResult) {
    throw new Error("Failed to create seed reconciliation result");
  }

  const [candidate] = await db
    .insert(candidates)
    .values({
      reconciliationResultId: matchedResult.id,
      transactionId: matchedTransaction.id,
      score: 95,
      decision: "MATCH",
      reason: "Seed amount and reference match",
    })
    .returning();

  if (!candidate) {
    throw new Error("Failed to create seed candidate");
  }

  await db.insert(evidence).values({
    reconciliationResultId: matchedResult.id,
    candidateId: candidate.id,
    field: "amount",
    sourceValue: "1250.00",
    candidateValue: "1250.00",
    explanation: "Exact amount match",
  });

  const [reviewResult] = await db
    .insert(reconciliationResults)
    .values({
      transactionId: reviewTransaction.id,
      idempotencyKey: `seed-review-${reviewTransaction.id}`,
      status: "REVIEW_REQUIRED",
      confidence: 0,
      reason: "Seeded review case",
    })
    .returning();

  if (!reviewResult) {
    throw new Error("Failed to create review reconciliation result");
  }

  const [exception] = await db
    .insert(exceptions)
    .values({
      transactionId: reviewTransaction.id,
      reconciliationResultId: reviewResult.id,
      severity: "MEDIUM",
      code: "AMOUNT_MISMATCH",
      message: "Seed transaction requires manual review.",
    })
    .returning();

  if (!exception) {
    throw new Error("Failed to create seed exception");
  }

  await db.insert(auditEvents).values([
    {
      batchId: batch.id,
      eventType: "BATCH_CREATED",
      message: "Seed batch created.",
    },
    {
      batchId: batch.id,
      transactionId: matchedTransaction.id,
      eventType: "RECONCILIATION_CREATED",
      message: "Seed matched reconciliation created.",
      metadata: JSON.stringify({
        reconciliationResultId: matchedResult.id,
      }),
    },
    {
      batchId: batch.id,
      transactionId: reviewTransaction.id,
      eventType: "EXCEPTION_CREATED",
      message: "Seed review exception created.",
      metadata: JSON.stringify({
        exceptionId: exception.id,
      }),
    },
  ]);

  console.log("Seed complete.");
  console.log(`Batch: ${batch.id}`);
  console.log(`Source file: ${sourceFile.id}`);
  console.log(`Transactions: ${createdTransactions.length}`);
}

seed()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    process.exit();
  });