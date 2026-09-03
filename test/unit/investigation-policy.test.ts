import { describe, expect, it } from "vitest";

import {
    applyInvestigationPolicy,
} from "../../src/reconciliation/policy/investigation-policy.js";

describe("investigation policy boundary", () => {
    it("uses the existing Decision Policy after investigation", () => {
        const evidence = {
            amount: {
                sourceAmount: "500.00",
                candidateAmount: "500.00",
                result: "PASS" as const,
            },

            currency: {
                sourceCurrency: "GBP",
                candidateCurrency: "GBP",
                result: "PASS" as const,
            },

            reference: {
                sourceReference: "REF-001",
                candidateReference: "REF-999",
                normalizedSourceReference: "REF-001",
                normalizedCandidateReference: "REF-999",
                result: "FAIL" as const,
            },

            date: {
                sourceDate: new Date(
                    "2026-08-23T00:00:00.000Z",
                ),
                candidateDate: new Date(
                    "2026-08-23T00:00:00.000Z",
                ),
                differenceInDays: 0,
                toleranceDays: 1,
                result: "PASS" as const,
            },

            duplicate: {
                candidateCount: 1,
                result: "PASS" as const,
            },
        };

        const result =
            applyInvestigationPolicy({
                deterministicEvidence: evidence,
                observations: [
                    {
                        toolName:
                            "investigatePaymentRefund",
                        output: {
                            unrelated:
                                "model-provided conclusion",
                        },
                    },
                ],
            });

        expect(result.decision.decision).toBe(
            "REVIEW",
        );

        expect(
            result.decision.reasonCode,
        ).toBe("REFERENCE_MISMATCH");

        expect(result.decision.score).toBe(60);
    });

    it("does not allow arbitrary model output to override evidence", () => {
        const evidence = {
            amount: {
                sourceAmount: "500.00",
                candidateAmount: "500.00",
                result: "PASS" as const,
            },

            currency: {
                sourceCurrency: "GBP",
                candidateCurrency: "GBP",
                result: "PASS" as const,
            },

            reference: {
                sourceReference: "REF-001",
                candidateReference: "REF-999",
                normalizedSourceReference: "REF-001",
                normalizedCandidateReference: "REF-999",
                result: "FAIL" as const,
            },

            date: {
                sourceDate: new Date(
                    "2026-08-23T00:00:00.000Z",
                ),
                candidateDate: new Date(
                    "2026-08-23T00:00:00.000Z",
                ),
                differenceInDays: 0,
                toleranceDays: 1,
                result: "PASS" as const,
            },

            duplicate: {
                candidateCount: 1,
                result: "PASS" as const,
            },
        };

        const result =
            applyInvestigationPolicy({
                deterministicEvidence: evidence,
                observations: [
                    {
                        toolName: "fake-ai-tool",
                        output: {
                            decision: "MATCH",
                            confidence: 100,
                        },
                    },
                ],
            });

        expect(result.decision.decision).toBe(
            "REVIEW",
        );
    });
});