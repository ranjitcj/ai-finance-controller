import type { DeterministicEvidence } from "../rules/deterministic-evidence.js";
import {
    reconciliationReasonCodes,
    type ReconciliationReasonCode,
} from "./reason-codes.js";

export type FinalDecision = "MATCH" | "REVIEW" | "NO_MATCH";

export interface DecisionPolicyResult {
    decision: FinalDecision;
    reasonCode: ReconciliationReasonCode;
    score: number;
}

export function applyDecisionPolicy(
    evidence: DeterministicEvidence,
): DecisionPolicyResult {
    if (evidence.amount.result === "FAIL") {
        return {
            decision: "NO_MATCH",
            reasonCode: reconciliationReasonCodes.AMOUNT_MISMATCH,
            score: 0,
        };
    }

    if (evidence.currency.result === "FAIL") {
        return {
            decision: "NO_MATCH",
            reasonCode: reconciliationReasonCodes.CURRENCY_MISMATCH,
            score: 0,
        };
    }

    if (evidence.duplicate.result === "ESCALATE") {
        return {
            decision: "REVIEW",
            reasonCode: reconciliationReasonCodes.MULTIPLE_CANDIDATES,
            score: 0,
        };
    }

    if (evidence.reference.result === "PASS") {
        return {
            decision: "MATCH",
            reasonCode: reconciliationReasonCodes.EXACT_REFERENCE_MATCH,
            score: 100,
        };
    }

    if (
        evidence.reference.result === "SKIPPED" &&
        evidence.date.result === "PASS"
    ) {
        return {
            decision: "MATCH",
            reasonCode:
                reconciliationReasonCodes.EXACT_AMOUNT_CURRENCY_DATE_MATCH,
            score: 90,
        };
    }

    if (evidence.date.result === "PASS_WITH_TOLERANCE") {
        return {
            decision: "REVIEW",
            reasonCode: reconciliationReasonCodes.DATE_WITHIN_TOLERANCE,
            score: 75,
        };
    }

    if (evidence.reference.result === "FAIL") {
        return {
            decision: "REVIEW",
            reasonCode: reconciliationReasonCodes.REFERENCE_MISMATCH,
            score: 60,
        };
    }

    return {
        decision: "REVIEW",
        reasonCode: reconciliationReasonCodes.INSUFFICIENT_EVIDENCE,
        score: 50,
    };
}