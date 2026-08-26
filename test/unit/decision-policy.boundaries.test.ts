import { describe, expect, it } from "vitest";

import { applyDecisionPolicy } from "../../src/reconciliation/policy/decision-policy.js";
import type { DeterministicEvidence } from "../../src/reconciliation/rules/deterministic-evidence.js";

function baseEvidence(): DeterministicEvidence {
    return {
        amount: {
            rule: "AMOUNT",
            result: "PASS",
            sourceAmount: "100.00",
            candidateAmount: "100.00",
        },

        currency: {
            rule: "CURRENCY",
            result: "PASS",
            sourceCurrency: "USD",
            candidateCurrency: "USD",
        },

        reference: {
            rule: "REFERENCE",
            result: "PASS",
            sourceReference: "REF-001",
            candidateReference: "REF-001",
            normalizedSourceReference: "ref001",
            normalizedCandidateReference: "ref001",
        },

        date: {
            rule: "DATE",
            result: "PASS",
            sourceDate: "2026-08-20",
            candidateDate: "2026-08-20",
            differenceInDays: 0,
            toleranceDays: 1,
        },

        duplicate: {
            rule: "DUPLICATE",
            result: "PASS",
            candidateCount: 1,
        },
    };
}

describe("decision policy boundaries", () => {
    it("never MATCHES when amount fails", () => {
        const result = applyDecisionPolicy({
            ...baseEvidence(),
            amount: {
                rule: "AMOUNT",
                result: "FAIL",
                sourceAmount: "100.00",
                candidateAmount: "100.01",
            },
        });

        expect(result.decision).toBe("NO_MATCH");
        expect(result.reasonCode).toBe("AMOUNT_MISMATCH");
    });

    it("never MATCHES when currency fails", () => {
        const result = applyDecisionPolicy({
            ...baseEvidence(),
            currency: {
                rule: "CURRENCY",
                result: "FAIL",
                sourceCurrency: "USD",
                candidateCurrency: "EUR",
            },
        });

        expect(result.decision).toBe("NO_MATCH");
        expect(result.reasonCode).toBe("CURRENCY_MISMATCH");
    });

    it("never MATCHES multiple candidates", () => {
        const result = applyDecisionPolicy({
            ...baseEvidence(),
            duplicate: {
                rule: "DUPLICATE",
                result: "ESCALATE",
                candidateCount: 2,
            },
        });

        expect(result.decision).toBe("REVIEW");
        expect(result.reasonCode).toBe("MULTIPLE_CANDIDATES");
    });

    it("does not let a matching reference override an amount mismatch", () => {
        const result = applyDecisionPolicy({
            ...baseEvidence(),
            amount: {
                rule: "AMOUNT",
                result: "FAIL",
                sourceAmount: "100.00",
                candidateAmount: "999.00",
            },
        });

        expect(result.decision).toBe("NO_MATCH");
        expect(result.reasonCode).toBe("AMOUNT_MISMATCH");
    });

    it("does not let a matching reference override a currency mismatch", () => {
        const result = applyDecisionPolicy({
            ...baseEvidence(),
            currency: {
                rule: "CURRENCY",
                result: "FAIL",
                sourceCurrency: "USD",
                candidateCurrency: "INR",
            },
        });

        expect(result.decision).toBe("NO_MATCH");
        expect(result.reasonCode).toBe("CURRENCY_MISMATCH");
    });

    it("returns MATCH at the exact-reference boundary", () => {
        const result = applyDecisionPolicy(baseEvidence());

        expect(result.decision).toBe("MATCH");
        expect(result.reasonCode).toBe("EXACT_REFERENCE_MATCH");
        expect(result.score).toBe(100);
    });

    it("returns REVIEW at the date-tolerance boundary", () => {
        const result = applyDecisionPolicy({
            ...baseEvidence(),
            reference: {
                rule: "REFERENCE",
                result: "SKIPPED",
            },
            date: {
                rule: "DATE",
                result: "PASS_WITH_TOLERANCE",
                sourceDate: "2026-08-20",
                candidateDate: "2026-08-21",
                differenceInDays: 1,
                toleranceDays: 1,
            },
        });

        expect(result.decision).toBe("REVIEW");
        expect(result.reasonCode).toBe("DATE_WITHIN_TOLERANCE");
        expect(result.score).toBe(75);
    });

    it("returns REVIEW when reference evidence conflicts", () => {
        const result = applyDecisionPolicy({
            ...baseEvidence(),
            reference: {
                rule: "REFERENCE",
                result: "FAIL",
                sourceReference: "REF-001",
                candidateReference: "REF-999",
                normalizedSourceReference: "ref001",
                normalizedCandidateReference: "ref999",
            },
        });

        expect(result.decision).toBe("REVIEW");
        expect(result.reasonCode).toBe("REFERENCE_MISMATCH");
    });
});