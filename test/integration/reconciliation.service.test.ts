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
             * This is the transaction that retrieval should find.
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
             * Reconciliation input.
             */
            const input = {
                transactionId: transaction!.id,
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

            expect(first.result.transactionId).toBe(
                transaction!.id,
            );

            expect(first.candidates[0]?.id).toBe(
                candidateTransaction!.id,
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
                        resultId!,
                    ),
                );

            expect(persisted?.transactionId).toBe(
                transaction!.id,
            );

            expect(persisted?.idempotencyKey).toBe(
                idempotencyKey,
            );

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