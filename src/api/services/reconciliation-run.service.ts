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

import {
    createAuditEvent,
} from "../../db/repositories/reconciliation.repository.js";


import type {
    InvestigationModel,
} from "../../investigation/agent/types.js";

import { OpenAIInvestigationModel } from "../../investigation/providers/openai/openai-investigation-model.js";
import { GeminiInvestigationModel } from "../../investigation/providers/gemini/gemini-investigation-model.js";

export interface ReconciliationRunOptions {
    investigationModel?: InvestigationModel;
    investigationMaxIterations?: number;
    investigationTimeoutMs?: number;
}

export function resolveInvestigationModel(
    options: ReconciliationRunOptions,
): InvestigationModel | undefined {
    if (options.investigationModel) {
        return options.investigationModel;
    }

    const provider =
        process.env.AI_PROVIDER?.toLowerCase();

    if (provider === "gemini") {
        if (!process.env.GEMINI_API_KEY) {
            throw new Error(
                "GEMINI_API_KEY is required when AI_PROVIDER=gemini.",
            );
        }

        return new GeminiInvestigationModel();
    }

    if (provider === "openai") {
        if (!process.env.OPENAI_API_KEY) {
            throw new Error(
                "OPENAI_API_KEY is required when AI_PROVIDER=openai.",
            );
        }

        return new OpenAIInvestigationModel();
    }

    return undefined;
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

    await createAuditEvent({
        batchId,
        eventType: "RECONCILIATION_CREATED",
        message:
            `Reconciliation started for batch ${batchId}.`,
        metadata: JSON.stringify({
            batchId,
            transactionCount: transactions.length,
        }),
    });

    const results = [];

    const investigationModel = resolveInvestigationModel(options);

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
                        date: new Date(
                            `${transaction.transactionDate}T00:00:00.000Z`,
                        ),
                        reference:
                            transaction.reference ?? undefined,
                        vendor: transaction.vendor,
                    },
                },
                {
                    investigationModel,
                    investigationMaxIterations:
                        options.investigationMaxIterations,
                    investigationTimeoutMs:
                        options.investigationTimeoutMs,
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

        await createAuditEvent({
            batchId,
            eventType: "RECONCILIATION_CREATED",
            message:
                `Reconciliation completed for batch ${batchId}.`,
            metadata: JSON.stringify({
                batchId,
                processed: results.length,
                status: "COMPLETED",
            }),
        });

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

