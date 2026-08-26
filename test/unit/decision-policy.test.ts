import { describe, expect, it } from "vitest";

import { applyDecisionPolicy } from "../../src/reconciliation/policy/decision-policy.js";

import type { DeterministicEvidence } from "../../src/reconciliation/rules/deterministic-evidence.js";

function buildEvidence(
    overrides: Partial<DeterministicEvidence> = {},
): DeterministicEvidence {
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

        ...overrides,
    };
}

describe("decision policy", () => {
    it("returns MATCH for strong deterministic evidence", () => {
        const result = applyDecisionPolicy(buildEvidence());

        expect(result).toEqual({
            decision: "MATCH",
            reasonCode: "EXACT_REFERENCE_MATCH",
            score: 100,
        });
    });

    it("returns NO_MATCH when amount fails", () => {
        const result = applyDecisionPolicy(
            buildEvidence({
                amount: {
                    rule: "AMOUNT",
                    result: "FAIL",
                    sourceAmount: "100.00",
                    candidateAmount: "101.00",
                },
            }),
        );

        expect(result.decision).toBe("NO_MATCH");
        expect(result.reasonCode).toBe("AMOUNT_MISMATCH");
        expect(result.score).toBe(0);
    });

    it("returns NO_MATCH when currency fails", () => {
        const result = applyDecisionPolicy(
            buildEvidence({
                currency: {
                    rule: "CURRENCY",
                    result: "FAIL",
                    sourceCurrency: "USD",
                    candidateCurrency: "EUR",
                },
            }),
        );

        expect(result.decision).toBe("NO_MATCH");
        expect(result.reasonCode).toBe("CURRENCY_MISMATCH");
        expect(result.score).toBe(0);
    });

    it("returns REVIEW when multiple candidates exist", () => {
        const result = applyDecisionPolicy(
            buildEvidence({
                duplicate: {
                    rule: "DUPLICATE",
                    result: "ESCALATE",
                    candidateCount: 2,
                },
            }),
        );

        expect(result.decision).toBe("REVIEW");
        expect(result.reasonCode).toBe("MULTIPLE_CANDIDATES");
    });

    it("returns MATCH when reference is skipped but exact date passes", () => {
        const result = applyDecisionPolicy(
            buildEvidence({
                reference: {
                    rule: "REFERENCE",
                    result: "SKIPPED",
                },
            }),
        );

        expect(result.decision).toBe("MATCH");
        expect(result.reasonCode).toBe(
            "EXACT_AMOUNT_CURRENCY_DATE_MATCH",
        );
        expect(result.score).toBe(90);
    });

    it("returns REVIEW when date only passes with tolerance", () => {
        const result = applyDecisionPolicy(
            buildEvidence({
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
            }),
        );

        expect(result.decision).toBe("REVIEW");
        expect(result.reasonCode).toBe("DATE_WITHIN_TOLERANCE");
        expect(result.score).toBe(75);
    });

    it("returns REVIEW for a reference mismatch", () => {
        const result = applyDecisionPolicy(
            buildEvidence({
                reference: {
                    rule: "REFERENCE",
                    result: "FAIL",
                    sourceReference: "REF-001",
                    candidateReference: "REF-999",
                    normalizedSourceReference: "ref001",
                    normalizedCandidateReference: "ref999",
                },
            }),
        );

        expect(result.decision).toBe("REVIEW");
        expect(result.reasonCode).toBe("REFERENCE_MISMATCH");
        expect(result.score).toBe(60);
    });
});