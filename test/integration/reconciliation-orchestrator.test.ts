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
    reconciliationResults,
} from "../../src/db/schema/reconciliation.schema.js";

import {
    reconciliationOrchestrator,
} from "../../src/reconciliation/reconciliation-orchestrator.js";

describe("reconciliationOrchestrator", () => {
    it("runs the investigator for review-required reconciliation", async () => {
        const amount = "500.00";
        const currency = "GBP";
        const transactionDate = "2026-08-23";

        const externalId =
            `ORCH-SOURCE-${crypto.randomUUID()}`;

        const candidateExternalId =
            `ORCH-CANDIDATE-${crypto.randomUUID()}`;

        const idempotencyKey =
            `orch-${crypto.randomUUID()}`;

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
                    fileName:
                        `orchestrator-${crypto.randomUUID()}.csv`,
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
            candidateTransactionId =
                candidateTransaction!.id;

            const investigationModel = {
                decide: async () => ({
                    type: "FINAL" as const,
                    output: {
                        conclusion:
                            "additional investigation complete",
                    },
                }),
            };

            const result =
                await reconciliationOrchestrator(
                    {
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
                    },
                    {
                        investigationModel,
                    },
                );

            /*
             * Deterministic reconciliation identifies
             * a reference mismatch.
             *
             * Existing Decision Policy therefore produces
             * REVIEW_REQUIRED.
             */
            expect(
                result.reconciliation.state,
            ).toBe("REVIEW_REQUIRED");

            /*
             * The orchestrator sees REVIEW_REQUIRED and
             * invokes the bounded investigation agent.
             */
            expect(result.investigation).not.toBeNull();

            expect(
                result.investigation?.status,
            ).toBe("COMPLETED");

            expect(
                result.investigation?.output,
            ).toEqual({
                conclusion:
                    "additional investigation complete",
            });

            expect(
                result.policyReevaluation,
            ).not.toBeNull();

            expect(
                result.policyReevaluation?.decision.decision,
            ).toBe("REVIEW");

            expect(
                result.policyReevaluation?.decision.reasonCode,
            ).toBe("REFERENCE_MISMATCH");

            expect(
                result.policyReevaluation?.decision.score,
            ).toBe(60);

            resultId =
                result.reconciliation.result.id;

            expect(resultId).toBeDefined();
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

    it("does not run the investigator for a matched reconciliation", async () => {
        const amount = "1000.00";
        const currency = "GBP";
        const transactionDate = "2026-08-23";

        const externalId =
            `ORCH-MATCH-SOURCE-${crypto.randomUUID()}`;

        const candidateExternalId =
            `ORCH-MATCH-CANDIDATE-${crypto.randomUUID()}`;

        const idempotencyKey =
            `orch-match-${crypto.randomUUID()}`;

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
                    fileName:
                        `orchestrator-match-${crypto.randomUUID()}.csv`,
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
                    reference: "MATCH-001",
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
                    reference: "MATCH-001",
                    vendor: "acme corp",
                    status: "PENDING",
                    sourceRowNumber: 3,
                })
                .returning();

            expect(candidateTransaction).toBeDefined();
            candidateTransactionId =
                candidateTransaction!.id;

            const investigationModel = {
                decide: async () => {
                    throw new Error(
                        "Investigator should not run for MATCHED reconciliation.",
                    );
                },
            };

            const result =
                await reconciliationOrchestrator(
                    {
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
                            reference: "MATCH-001",
                            vendor: "acme corp",
                        },
                    },
                    {
                        investigationModel,
                    },
                );

            expect(
                result.reconciliation.state,
            ).toBe("MATCHED");

            expect(
                result.investigation,
            ).toBeNull();

            expect(
                result.policyReevaluation,
            ).toBeNull();

            resultId =
                result.reconciliation.result.id;
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