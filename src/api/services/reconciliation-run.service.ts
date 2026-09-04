import {
    getBatch,
    updateBatchStatus,
} from "../../db/repositories/batch.repository.js";

import {
    findTransactionsByBatchId,
    transitionTransaction,
} from "../../db/repositories/transaction.repository.js";

import {
    reconciliationOrchestrator,
} from "../../reconciliation/reconciliation-orchestrator.js";

import type {
    InvestigationModel,
} from "../../investigation/agent/types.js";

export interface ReconciliationRunOptions {
    investigationModel?: InvestigationModel;
    investigationMaxIterations?: number;
    investigationTimeoutMs?: number;
}

export async function runReconciliation(
    batchId: string,
    options: ReconciliationRunOptions = {},
) {
    const batch = await getBatch(batchId);

    if (
        batch.status !== "READY" &&
        batch.status !== "COMPLETED"
    ) {
        throw new Error(
            `Batch cannot be reconciled from status ${batch.status}`,
        );
    }

    const transactions =
        await findTransactionsByBatchId(batchId);

    await updateBatchStatus(
        batchId,
        "RUNNING",
    );

    const results = [];

    try {
        for (const transaction of transactions) {
            if (transaction.status !== "PENDING") {
                continue;
            }

            const result = await reconciliationOrchestrator(
                {
                    transactionId: transaction.id,
                    idempotencyKey: `batch:${batchId}:transaction:${transaction.id}`,
                    currentState: transaction.status,
                    transaction: {
                        externalId: transaction.externalId,
                        amount: transaction.amount,
                        currency: transaction.currency,
                        date: new Date(`${transaction.transactionDate}T00:00:00.000Z`),
                        reference: transaction.reference ?? undefined,
                        vendor: transaction.vendor,
                    },
                },
                {
                    investigationModel: options.investigationModel,
                    investigationMaxIterations: options.investigationMaxIterations,
                    investigationTimeoutMs: options.investigationTimeoutMs,
                },
            );

            const reconciliationState = result.reconciliation.state;

            if (
                reconciliationState !== "CANDIDATES_FOUND" &&
                reconciliationState !== "MATCHED" &&
                reconciliationState !== "NO_MATCH" &&
                reconciliationState !== "REVIEW_REQUIRED"
            ) {
                throw new Error(
                    `Invalid final reconciliation state: ${reconciliationState}`,
                );
            }

            if (reconciliationState === "CANDIDATES_FOUND") {
                await transitionTransaction(
                    transaction.id,
                    "CANDIDATES_FOUND",
                );
            } else {
                await transitionTransaction(
                    transaction.id,
                    "CANDIDATES_FOUND",
                );

                await transitionTransaction(
                    transaction.id,
                    reconciliationState,
                );
            }

            results.push(result);
        }

        const completedBatch =
            await updateBatchStatus(
                batchId,
                "COMPLETED",
            );

        return {
            batch: completedBatch,
            processed: results.length,
            results,
        };
    } catch (error) {
        await updateBatchStatus(
            batchId,
            "FAILED",
        );

        throw error;
    }
}

