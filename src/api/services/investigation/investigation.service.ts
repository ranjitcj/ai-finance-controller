import {
    findTransactionById,
} from "../../../db/repositories/transaction.repository.js";

import {
    findReconciliationResultsByTransactionIds,
    findCandidatesByResultId,
    findEvidenceByResultId,
} from "../../../db/repositories/reconciliation.repository.js";

import {
    runBoundedInvestigation,
} from "../../../investigation/agent/bounded-agent.js";

import type {
    BoundedAgentResult,
} from "../../../investigation/agent/types.js";

import {
    resolveInvestigationModel,
} from "../reconciliation-run.service.js";

export interface InvestigateTransactionOptions {
    maxIterations?: number;
    timeoutMs?: number;
}

export interface InvestigateTransactionResult {
    transaction: {
        id: string;
        externalId: string;
        amount: string;
        currency: string;
        status: string;
    };

    reconciliation: {
        id: string;
        status: string;
        confidence: number | null;
        reason: string | null;
    };

    investigation: BoundedAgentResult;
}

export async function investigateTransaction(
    transactionId: string,
    options: InvestigateTransactionOptions = {},
): Promise<InvestigateTransactionResult> {
    const transaction =
        await findTransactionById(transactionId);

    if (!transaction) {
        throw new Error(
            `Transaction not found: ${transactionId}`,
        );
    }

    if (transaction.status !== "REVIEW_REQUIRED") {
        throw new Error(
            `Transaction is not eligible for AI investigation. Current status: ${transaction.status}`,
        );
    }

    const reconciliationResults =
        await findReconciliationResultsByTransactionIds([
            transaction.id,
        ]);

    const reconciliationResult =
        reconciliationResults[0];

    if (!reconciliationResult) {
        throw new Error(
            `No reconciliation result found for transaction: ${transactionId}`,
        );
    }

    if (
        reconciliationResult.status !==
        "REVIEW_REQUIRED"
    ) {
        throw new Error(
            `Transaction does not have a REVIEW_REQUIRED reconciliation result.`,
        );
    }

    const candidates =
        await findCandidatesByResultId(
            reconciliationResult.id,
        );

    const evidence =
        await findEvidenceByResultId(
            reconciliationResult.id,
        );

    const investigationModel =
        resolveInvestigationModel({});

    if (!investigationModel) {
        throw new Error(
            "AI investigation is not configured. Set AI_PROVIDER to openai or gemini.",
        );
    }

    /*
     * The model receives the already-persisted reconciliation
     * context as read-only investigation context.
     *
     * The model cannot directly modify the financial result.
     */
    const investigation =
        await runBoundedInvestigation(
            investigationModel,
            {
                transaction: {
                    id: transaction.id,
                    externalId: transaction.externalId,
                    amount: transaction.amount,
                    currency: transaction.currency,
                    transactionDate:
                        transaction.transactionDate,
                    reference:
                        transaction.reference,
                    vendor:
                        transaction.vendor,
                    status:
                        transaction.status,
                },

                reconciliation: {
                    id: reconciliationResult.id,
                    status: reconciliationResult.status,
                    confidence:
                        reconciliationResult.confidence,
                    reason:
                        reconciliationResult.reason,
                },

                candidates,

                deterministicEvidence:
                    evidence,

                /*
                 * Give the investigation tools the native
                 * Razorpay identifier they can use to retrieve
                 * additional persisted evidence.
                 */
                razorpay: {
                    externalId:
                        transaction.externalId,
                    batchId:
                        transaction.batchId,
                },
            },
            {
                maxIterations:
                    options.maxIterations,
                timeoutMs:
                    options.timeoutMs,
            },
        );

    return {
        transaction: {
            id: transaction.id,
            externalId:
                transaction.externalId,
            amount:
                transaction.amount,
            currency:
                transaction.currency,
            status:
                transaction.status,
        },

        reconciliation: {
            id:
                reconciliationResult.id,
            status:
                reconciliationResult.status,
            confidence:
                reconciliationResult.confidence,
            reason:
                reconciliationResult.reason,
        },

        investigation,
    };
}