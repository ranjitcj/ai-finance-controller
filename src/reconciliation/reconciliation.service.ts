import { findExactCandidates } from "./retrieval/exact-retrieval.js";
import { evaluateDeterministicRules } from "./rules/deterministic-engine.js";

import {
    createCandidate,
    createEvidence,
    createReconciliationResult,
    findReconciliationResultByIdempotencyKey,
} from "../db/repositories/reconciliation.repository.js";

import {
    transitionTransactionState,
    type TransactionState,
} from "./state/transaction-state.js";

import type { NormalizedTransaction } from "../domain/transaction/transaction.schema.js";

export interface ReconciliationServiceInput {
    transactionId: string;
    idempotencyKey: string;
    currentState: TransactionState;
    transaction: NormalizedTransaction;
}

type ReconciliationResultStatus =
    | "MATCHED"
    | "NO_MATCH"
    | "REVIEW_REQUIRED"
    | "FAILED";

function toReconciliationResultStatus(
    state:
        | "PENDING"
        | "CANDIDATES_FOUND"
        | "MATCHED"
        | "NO_MATCH"
        | "REVIEW_REQUIRED",
): ReconciliationResultStatus {
    switch (state) {
        case "MATCHED":
        case "NO_MATCH":
        case "REVIEW_REQUIRED":
            return state;

        case "PENDING":
        case "CANDIDATES_FOUND":
            throw new Error(
                `Cannot persist reconciliation result for non-terminal state: ${state}`,
            );
    }
}

export async function reconciliationService(
    input: ReconciliationServiceInput,
) {
    if (input.currentState !== "PENDING") {
        throw new Error(
            `Transaction must be PENDING before reconciliation. Current state: ${input.currentState}`,
        );
    }

    /*
     * Idempotency:
     * If this request was already processed, return the existing
     * reconciliation result instead of creating another one.
     */
    const existingResult =
        await findReconciliationResultByIdempotencyKey(input.idempotencyKey);

    if (existingResult) {
        return {
            state: existingResult.status,
            candidates: [],
            evaluations: [],
            result: existingResult,
            idempotent: true,
        };
    }

    /*
     * 1. Exact candidate retrieval
     */
    const candidates = await findExactCandidates(input.transaction);

    /*
     * 2. PENDING → CANDIDATES_FOUND
     */
    const candidatesFoundState = transitionTransactionState(
        input.currentState,
        "CANDIDATES_FOUND",
    );

    const candidateCount = candidates.length;

    /*
     * 3. No candidates
     */
    if (candidateCount === 0) {
        const evidence = evaluateDeterministicRules({
            sourceAmount: input.transaction.amount,
            candidateAmount: input.transaction.amount,

            sourceCurrency: input.transaction.currency,
            candidateCurrency: input.transaction.currency,

            sourceReference: input.transaction.reference,
            candidateReference: input.transaction.reference,

            sourceDate: input.transaction.date,
            candidateDate: input.transaction.date,

            candidateCount: 0,
        });

        const finalState = transitionTransactionState(
            candidatesFoundState,
            "NO_MATCH",
        );

        const result = await createReconciliationResult({
            transactionId: input.transactionId,
            idempotencyKey: input.idempotencyKey,
            status: toReconciliationResultStatus(finalState),
            confidence: 0,
            reason: `Deterministic reconciliation completed with state ${finalState}.`,
        });

        return {
            state: finalState,
            candidates,
            evidence,
            result,
        };
    }

    /*
     * 4. Evaluate every candidate
     */
    const candidateEvaluations = candidates.map((candidate) => {
        const candidateDate = new Date(
            `${candidate.transactionDate}T00:00:00.000Z`,
        );

        const evidence = evaluateDeterministicRules({
            sourceAmount: input.transaction.amount,
            candidateAmount: candidate.amount,

            sourceCurrency: input.transaction.currency,
            candidateCurrency: candidate.currency,

            sourceReference: input.transaction.reference,
            candidateReference: candidate.reference ?? undefined,

            sourceDate: input.transaction.date,
            candidateDate,

            candidateCount,
        });

        return {
            candidate,
            evidence,
        };
    });

    const first = candidateEvaluations[0];

    if (!first) {
        throw new Error(
            "Candidate evaluation unexpectedly returned empty",
        );
    }

    /*
     * 5. Determine final transaction state
     */
    let finalState: TransactionState;

    if (candidateCount > 1) {
        finalState = transitionTransactionState(
            candidatesFoundState,
            "REVIEW_REQUIRED",
        );
    } else if (first.evidence.decision === "MATCH") {
        finalState = transitionTransactionState(
            candidatesFoundState,
            "MATCHED",
        );
    } else if (first.evidence.decision === "ESCALATE") {
        finalState = transitionTransactionState(
            candidatesFoundState,
            "REVIEW_REQUIRED",
        );
    } else {
        finalState = transitionTransactionState(
            candidatesFoundState,
            "NO_MATCH",
        );
    }

    /*
     * 6. Persist reconciliation result
     */
    const result = await createReconciliationResult({
        transactionId: input.transactionId,
        idempotencyKey: input.idempotencyKey,
        status: toReconciliationResultStatus(finalState),
        confidence: finalState === "MATCHED" ? 1 : 0,
        reason: `Deterministic reconciliation completed with state ${finalState}.`,
    });

    /*
     * 7. Persist candidate decisions
     */
    for (const evaluation of candidateEvaluations) {
        const candidateDecision =
            evaluation.evidence.decision === "MATCH"
                ? "MATCH"
                : evaluation.evidence.decision === "ESCALATE"
                    ? "REVIEW"
                    : "REJECT";

        const candidate = await createCandidate({
            reconciliationResultId: result.id,
            transactionId: evaluation.candidate.id,
            score:
                evaluation.evidence.decision === "MATCH"
                    ? 1
                    : 0,
            decision: candidateDecision,
            reason: evaluation.evidence.decision,
        });

        await createEvidence({
            reconciliationResultId: result.id,
            candidateId: candidate.id,
            field: "amount",
            sourceValue: evaluation.evidence.amount.sourceAmount,
            candidateValue: evaluation.evidence.amount.candidateAmount,
            explanation: `Amount rule: ${evaluation.evidence.amount.result}`,
        });

        await createEvidence({
            reconciliationResultId: result.id,
            candidateId: candidate.id,
            field: "currency",
            sourceValue: evaluation.evidence.currency.sourceCurrency,
            candidateValue: evaluation.evidence.currency.candidateCurrency,
            explanation: `Currency rule: ${evaluation.evidence.currency.result}`,
        });

        await createEvidence({
            reconciliationResultId: result.id,
            candidateId: candidate.id,
            field: "reference",
            sourceValue:
                evaluation.evidence.reference.normalizedSourceReference ??
                evaluation.evidence.reference.sourceReference,
            candidateValue:
                evaluation.evidence.reference.normalizedCandidateReference ??
                evaluation.evidence.reference.candidateReference,
            explanation: `Reference rule: ${evaluation.evidence.reference.result}`,
        });

        await createEvidence({
            reconciliationResultId: result.id,
            candidateId: candidate.id,
            field: "date",
            sourceValue: evaluation.evidence.date.sourceDate,
            candidateValue: evaluation.evidence.date.candidateDate,
            explanation:
                `Date rule: ${evaluation.evidence.date.result}; ` +
                `difference=${evaluation.evidence.date.differenceInDays} days; ` +
                `tolerance=${evaluation.evidence.date.toleranceDays} days`,
        });

        await createEvidence({
            reconciliationResultId: result.id,
            candidateId: candidate.id,
            field: "duplicate",
            sourceValue: String(evaluation.evidence.duplicate.candidateCount),
            candidateValue: String(evaluation.evidence.duplicate.candidateCount),
            explanation:
                `Duplicate rule: ${evaluation.evidence.duplicate.result}`,
        });
    }

    return {
        state: finalState,
        candidates,
        evaluations: candidateEvaluations,
        result,
    };
}