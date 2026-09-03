import { describe, expect, it } from "vitest";
import crypto from "node:crypto";
import { eq } from "drizzle-orm";

import { db } from "../../src/db/client.js";

import {
    batches,
    sourceFiles,
    transactions,
} from "../../src/db/schema/transaction.schema.js";

import {
    evidence,
    reconciliationResults,
} from "../../src/db/schema/reconciliation.schema.js";

import { reconciliationService } from "../../src/reconciliation/reconciliation.service.js";

describe("reconciliationService", () => {
    it("reconciles a transaction idempotently", async () => {
        const amount = "9876.54";
        const currency = "GBP";
        const transactionDate = "2026-08-23";

        const externalId = `SERVICE-${crypto.randomUUID()}`;
        const candidateExternalId = `CANDIDATE-${crypto.randomUUID()}`;
        const idempotencyKey = `service-${crypto.randomUUID()}`;

        let batchId: string | undefined;
        let sourceFileId: string | undefined;
        let transactionId: string | undefined;
        let candidateTransactionId: string | undefined;
        let resultId: string | undefined;

        try {
            /*
             * Batch
             */
            const [batch] = await db
                .insert(batches)
                .values({
                    status: "READY",
                })
                .returning();

            expect(batch).toBeDefined();
            batchId = batch!.id;

            /*
             * Source file
             */
            const [sourceFile] = await db
                .insert(sourceFiles)
                .values({
                    batchId: batch!.id,
                    fileName: `reconciliation-${crypto.randomUUID()}.csv`,
                    fileHash: crypto.randomUUID(),
                    rowCount: 2,
                })
                .returning();

            expect(sourceFile).toBeDefined();
            sourceFileId = sourceFile!.id;

            /*
             * Source transaction being reconciled.
             *
             * IMPORTANT:
             * Use the actual ID returned by the database.
             */
            const [transaction] = await db
                .insert(transactions)
                .values({
                    batchId: batch!.id,
                    sourceFileId: sourceFile!.id,
                    externalId,
                    amount,
                    currency,
                    transactionDate,
                    reference: "ref001",
                    vendor: "acme corp",
                    status: "PENDING",
                    sourceRowNumber: 2,
                })
                .returning();

            expect(transaction).toBeDefined();

            transactionId = transaction!.id;

            /*
             * Separate candidate transaction.
             *
             * This is the transaction retrieval should find.
             *
             * IMPORTANT:
             * Again, retain the actual database-generated ID.
             */
            const [candidateTransaction] = await db
                .insert(transactions)
                .values({
                    batchId: batch!.id,
                    sourceFileId: sourceFile!.id,
                    externalId: candidateExternalId,
                    amount,
                    currency,
                    transactionDate,
                    reference: "ref001",
                    vendor: "acme corp",
                    status: "PENDING",
                    sourceRowNumber: 3,
                })
                .returning();

            expect(candidateTransaction).toBeDefined();

            candidateTransactionId = candidateTransaction!.id;

            /*
             * Sanity checks:
             * Make sure both IDs actually exist in the database
             * before calling reconciliationService().
             */
            const [persistedTransaction] = await db
                .select({
                    id: transactions.id,
                })
                .from(transactions)
                .where(eq(transactions.id, transactionId));

            expect(persistedTransaction?.id).toBe(transactionId);

            const [persistedCandidate] = await db
                .select({
                    id: transactions.id,
                })
                .from(transactions)
                .where(eq(transactions.id, candidateTransactionId));

            expect(persistedCandidate?.id).toBe(candidateTransactionId);

            /*
             * Reconciliation input.
             *
             * IMPORTANT:
             * Pass the actual persisted transaction ID.
             */
            const input = {
                transactionId,
                idempotencyKey,
                currentState: "PENDING" as const,

                transaction: {
                    externalId,
                    amount,
                    currency,
                    date: new Date(
                        `${transactionDate}T00:00:00.000Z`,
                    ),
                    reference: "ref001",
                    vendor: "acme corp",
                },
            };

            /*
             * First reconciliation.
             */
            const first = await reconciliationService(input);

            expect(first.state).toBe("MATCHED");

            expect(first.candidates).toHaveLength(1);

            expect(first.result.transactionId).toBe(transactionId);

            expect(first.candidates[0]?.id).toBe(
                candidateTransactionId,
            );

            resultId = first.result.id;

            /*
             * Second reconciliation should be idempotent.
             */
            const second = await reconciliationService(input);

            expect(second.result.id).toBe(first.result.id);
            expect(second.state).toBe(first.state);

            /*
             * Exactly one reconciliation result for the
             * idempotency key.
             */
            const results = await db
                .select()
                .from(reconciliationResults)
                .where(
                    eq(
                        reconciliationResults.idempotencyKey,
                        idempotencyKey,
                    ),
                );

            expect(results).toHaveLength(1);

            expect(results[0]?.id).toBe(first.result.id);
            expect(results[0]?.status).toBe("MATCHED");

            /*
             * Persisted reconciliation result.
             */
            const [persisted] = await db
                .select()
                .from(reconciliationResults)
                .where(
                    eq(
                        reconciliationResults.id,
                        resultId,
                    ),
                );

            expect(persisted?.transactionId).toBe(transactionId);
            expect(persisted?.idempotencyKey).toBe(idempotencyKey);
            expect(persisted?.status).toBe("MATCHED");

            /*
             * Persisted evidence.
             */
            const persistedEvidence = await db
                .select()
                .from(evidence)
                .where(
                    eq(
                        evidence.reconciliationResultId,
                        first.result.id,
                    ),
                );

            expect(persistedEvidence).toHaveLength(5);

            expect(
                persistedEvidence.some(
                    (item) =>
                        item.field === "amount" &&
                        item.sourceValue === amount &&
                        item.candidateValue === amount,
                ),
            ).toBe(true);

            expect(
                persistedEvidence.some(
                    (item) =>
                        item.field === "currency" &&
                        item.sourceValue === currency &&
                        item.candidateValue === currency,
                ),
            ).toBe(true);

            expect(
                persistedEvidence.some(
                    (item) =>
                        item.field === "reference" &&
                        item.sourceValue === "ref001" &&
                        item.candidateValue === "ref001",
                ),
            ).toBe(true);

            expect(
                persistedEvidence.some(
                    (item) =>
                        item.field === "date" &&
                        item.sourceValue === transactionDate &&
                        item.candidateValue === transactionDate,
                ),
            ).toBe(true);

            expect(
                persistedEvidence.some(
                    (item) =>
                        item.field === "duplicate" &&
                        item.sourceValue === "1",
                ),
            ).toBe(true);
        } finally {
            /*
             * Delete reconciliation result first.
             *
             * Evidence and candidates cascade from it.
             */
            if (resultId) {
                await db
                    .delete(reconciliationResults)
                    .where(
                        eq(
                            reconciliationResults.id,
                            resultId,
                        ),
                    );
            }

            /*
             * Delete candidate transaction.
             */
            if (candidateTransactionId) {
                await db
                    .delete(transactions)
                    .where(
                        eq(
                            transactions.id,
                            candidateTransactionId,
                        ),
                    );
            }

            /*
             * Delete source transaction.
             */
            if (transactionId) {
                await db
                    .delete(transactions)
                    .where(
                        eq(
                            transactions.id,
                            transactionId,
                        ),
                    );
            }

            /*
             * Delete source file.
             */
            if (sourceFileId) {
                await db
                    .delete(sourceFiles)
                    .where(
                        eq(
                            sourceFiles.id,
                            sourceFileId,
                        ),
                    );
            }

            /*
             * Delete batch.
             */
            if (batchId) {
                await db
                    .delete(batches)
                    .where(
                        eq(
                            batches.id,
                            batchId,
                        ),
                    );
            }
        }
    });

    it("uses the existing Decision Policy for the final financial decision", async () => {
        const amount = "500.00";
        const currency = "GBP";
        const transactionDate = "2026-08-23";

        const externalId = `POLICY-SOURCE-${crypto.randomUUID()}`;
        const candidateExternalId = `POLICY-CANDIDATE-${crypto.randomUUID()}`;
        const idempotencyKey = `policy-${crypto.randomUUID()}`;

        let batchId: string | undefined;
        let sourceFileId: string | undefined;
        let transactionId: string | undefined;
        let candidateTransactionId: string | undefined;
        let resultId: string | undefined;

        try {
            const [batch] = await db
                .insert(batches)
                .values({
                    status: "READY",
                })
                .returning();

            expect(batch).toBeDefined();
            batchId = batch!.id;

            const [sourceFile] = await db
                .insert(sourceFiles)
                .values({
                    batchId: batch!.id,
                    fileName: `policy-${crypto.randomUUID()}.csv`,
                    fileHash: crypto.randomUUID(),
                    rowCount: 2,
                })
                .returning();

            expect(sourceFile).toBeDefined();
            sourceFileId = sourceFile!.id;

            const [sourceTransaction] = await db
                .insert(transactions)
                .values({
                    batchId: batch!.id,
                    sourceFileId: sourceFile!.id,
                    externalId,
                    amount,
                    currency,
                    transactionDate,
                    reference: "REF-001",
                    vendor: "acme corp",
                    status: "PENDING",
                    sourceRowNumber: 2,
                })
                .returning();

            expect(sourceTransaction).toBeDefined();
            transactionId = sourceTransaction!.id;

            const [candidateTransaction] = await db
                .insert(transactions)
                .values({
                    batchId: batch!.id,
                    sourceFileId: sourceFile!.id,
                    externalId: candidateExternalId,
                    amount,
                    currency,
                    transactionDate,
                    reference: "REF-999",
                    vendor: "acme corp",
                    status: "PENDING",
                    sourceRowNumber: 3,
                })
                .returning();

            expect(candidateTransaction).toBeDefined();
            candidateTransactionId = candidateTransaction!.id;

            const result = await reconciliationService({
                transactionId,
                idempotencyKey,
                currentState: "PENDING",
                transaction: {
                    externalId,
                    amount,
                    currency,
                    date: new Date(
                        `${transactionDate}T00:00:00.000Z`,
                    ),
                    reference: "REF-001",
                    vendor: "acme corp",
                },
            });

            /*
             * Decision Policy behavior:
             *
             * amount   PASS
             * currency PASS
             * reference FAIL
             * date     PASS
             *
             * Therefore:
             * REVIEW / REFERENCE_MISMATCH
             *
             * The old legacy implementation would have
             * incorrectly produced NO_MATCH.
             */
            expect(result.state).toBe("REVIEW_REQUIRED");

            expect(result.evaluations).toHaveLength(1);

            expect(
                result.evaluations[0]?.evidence.reference.result,
            ).toBe("FAIL");

            resultId = result.result.id;

            expect(result.result.status).toBe(
                "REVIEW_REQUIRED",
            );
        } finally {
            if (resultId) {
                await db
                    .delete(reconciliationResults)
                    .where(
                        eq(
                            reconciliationResults.id,
                            resultId,
                        ),
                    );
            }

            if (candidateTransactionId) {
                await db
                    .delete(transactions)
                    .where(
                        eq(
                            transactions.id,
                            candidateTransactionId,
                        ),
                    );
            }

            if (transactionId) {
                await db
                    .delete(transactions)
                    .where(
                        eq(
                            transactions.id,
                            transactionId,
                        ),
                    );
            }

            if (sourceFileId) {
                await db
                    .delete(sourceFiles)
                    .where(
                        eq(
                            sourceFiles.id,
                            sourceFileId,
                        ),
                    );
            }

            if (batchId) {
                await db
                    .delete(batches)
                    .where(
                        eq(
                            batches.id,
                            batchId,
                        ),
                    );
            }
        }
    });
});
