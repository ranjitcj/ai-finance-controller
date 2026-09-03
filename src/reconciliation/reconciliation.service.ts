import { findExactCandidates } from "../../src/reconciliation/retrieval/exact-retrieval.js";
import { evaluateDeterministicRules } from "../../src/reconciliation/rules/deterministic-engine.js";

import {
    transitionTransactionState,
    type TransactionState,
} from "../../src/reconciliation/state/transaction-state.js";

import type { NormalizedTransaction } from "../../src/domain/transaction/transaction.schema.js";
import type { DeterministicEvidence } from "../../src/reconciliation/rules/deterministic-evidence.js";
import {
    applyDecisionPolicy,
    type DecisionPolicyResult,
} from "../../src/reconciliation/policy/decision-policy.js";
import {
    createCandidate,
    createEvidence,
    createReconciliationResult,
    findReconciliationResultByIdempotencyKey,
} from "../../src/db/repositories/reconciliation.repository.js";

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

function decisionPolicyToTransactionState(
    policyResult: DecisionPolicyResult,
): "MATCHED" | "NO_MATCH" | "REVIEW_REQUIRED" {
    switch (policyResult.decision) {
        case "MATCH":
            return "MATCHED";

        case "NO_MATCH":
            return "NO_MATCH";

        case "REVIEW":
            return "REVIEW_REQUIRED";
    }
}

function calculateCandidateScore(
    evidence: DeterministicEvidence,
): number {
    const rules = [
        evidence.amount.result === "PASS",
        evidence.currency.result === "PASS",
        evidence.reference.result === "PASS",
        evidence.date.result === "PASS" ||
        evidence.date.result === "PASS_WITH_TOLERANCE",
        evidence.duplicate.result === "PASS",
    ];

    const passedRules = rules.filter(Boolean).length;

    return Math.round((passedRules / rules.length) * 100);
}

function toCandidateDecision(
    evidence: DeterministicEvidence,
): "MATCH" | "REJECT" | "REVIEW" {
    if (evidence.duplicate.result === "ESCALATE") {
        return "REVIEW";
    }

    if (
        evidence.amount.result === "FAIL" ||
        evidence.currency.result === "FAIL" ||
        evidence.reference.result === "FAIL" ||
        evidence.date.result === "FAIL"
    ) {
        return "REJECT";
    }

    return "MATCH";
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
     * Return the already persisted result if this request
     * has previously been processed.
     */
    const existingResult =
        await findReconciliationResultByIdempotencyKey(
            input.idempotencyKey,
        );

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
     * 1. Retrieve exact candidates.
     */
    const candidates = await findExactCandidates(
        input.transaction,
        input.transactionId,
    );

    /*
     * 2. PENDING → CANDIDATES_FOUND
     */
    const candidatesFoundState = transitionTransactionState(
        input.currentState,
        "CANDIDATES_FOUND",
    );

    const candidateCount = candidates.length;

    /*
     * 3. No candidates.
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
            evaluations: [],
            evidence,
            result,
        };
    }

    /*
     * 4. Evaluate every candidate using structured deterministic evidence.
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
            candidateReference:
                candidate.reference ?? undefined,

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
     * 5. Deterministic final decision.
     *
     * Multiple candidates are always REVIEW.
     * Otherwise use the deterministic policy decision.
     */
    let finalState: TransactionState;

    if (candidateCount > 1) {
        finalState = transitionTransactionState(
            candidatesFoundState,
            "REVIEW_REQUIRED",
        );
    } else {
        const policyResult = applyDecisionPolicy(
            first.evidence,
        );

        const policyState =
            decisionPolicyToTransactionState(
                policyResult,
            );

        finalState = transitionTransactionState(
            candidatesFoundState,
            policyState,
        );
    }

    /*
     * 6. Persist reconciliation result.
     *
     * Confidence is NOT an LLM probability.
     * It is only a deterministic evidence score.
     */
    const result = await createReconciliationResult({
        transactionId: input.transactionId,
        idempotencyKey: input.idempotencyKey,
        status: toReconciliationResultStatus(finalState),
        confidence:
            finalState === "MATCHED"
                ? calculateCandidateScore(first.evidence)
                : 0,
        reason:
            `Deterministic evidence evaluated. ` +
            `Final state: ${finalState}.`,
    });

    /*
     * 7. Persist candidate decisions and evidence.
     */
    for (const evaluation of candidateEvaluations) {
        /*
         * IMPORTANT:
         *
         * candidate.id is the PostgreSQL transaction primary key
         * returned by findExactCandidates().
         *
         * We explicitly use that persisted transaction ID here.
         */
        const candidateTransactionId =
            evaluation.candidate.id;

        const candidate = await createCandidate({
            reconciliationResultId: result.id,

            /*
             * FK:
             * candidates.transaction_id
             *       ↓
             * transactions.id
             */
            transactionId: candidateTransactionId,

            score: calculateCandidateScore(
                evaluation.evidence,
            ),

            decision: toCandidateDecision(
                evaluation.evidence,
            ),

            reason: "Deterministic evidence evaluated.",
        });

        await createEvidence({
            reconciliationResultId: result.id,
            candidateId: candidate.id,
            field: "amount",
            sourceValue:
                evaluation.evidence.amount.sourceAmount,
            candidateValue:
                evaluation.evidence.amount.candidateAmount,
            explanation:
                `Amount rule: ${evaluation.evidence.amount.result}`,
        });

        await createEvidence({
            reconciliationResultId: result.id,
            candidateId: candidate.id,
            field: "currency",
            sourceValue:
                evaluation.evidence.currency.sourceCurrency,
            candidateValue:
                evaluation.evidence.currency.candidateCurrency,
            explanation:
                `Currency rule: ${evaluation.evidence.currency.result}`,
        });

        await createEvidence({
            reconciliationResultId: result.id,
            candidateId: candidate.id,
            field: "reference",
            sourceValue:
                evaluation.evidence.reference
                    .normalizedSourceReference ??
                evaluation.evidence.reference
                    .sourceReference,
            candidateValue:
                evaluation.evidence.reference
                    .normalizedCandidateReference ??
                evaluation.evidence.reference
                    .candidateReference,
            explanation:
                `Reference rule: ${evaluation.evidence.reference.result}`,
        });

        await createEvidence({
            reconciliationResultId: result.id,
            candidateId: candidate.id,
            field: "date",
            sourceValue:
                evaluation.evidence.date.sourceDate,
            candidateValue:
                evaluation.evidence.date.candidateDate,
            explanation:
                `Date rule: ${evaluation.evidence.date.result}; ` +
                `difference=${evaluation.evidence.date.differenceInDays} days; ` +
                `tolerance=${evaluation.evidence.date.toleranceDays} days`,
        });

        await createEvidence({
            reconciliationResultId: result.id,
            candidateId: candidate.id,
            field: "duplicate",
            sourceValue: String(
                evaluation.evidence.duplicate.candidateCount,
            ),
            candidateValue: String(
                evaluation.evidence.duplicate.candidateCount,
            ),
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