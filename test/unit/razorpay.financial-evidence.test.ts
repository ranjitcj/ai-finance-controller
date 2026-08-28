import { describe, expect, it } from "vitest";

import {
    compareFinancialField,
    validatePresentFinancialField,
} from "../../src/reconciliation/razorpay/financial-evidence.js";

describe("Razorpay financial evidence", () => {
    it("passes when financial values match", () => {
        const result = compareFinancialField(
            "fee",
            "25.00",
            "25.00",
        );

        expect(result).toEqual({
            field: "fee",
            result: "PASS",
            sourceValue: "25.00",
            candidateValue: "25.00",
            explanation: "fee matches.",
        });
    });

    it("fails when financial values differ", () => {
        const result = compareFinancialField(
            "tax",
            "4.50",
            "5.00",
        );

        expect(result.result).toBe("FAIL");
        expect(result.sourceValue).toBe("4.50");
        expect(result.candidateValue).toBe("5.00");
    });

    it("fails when the source value is unavailable", () => {
        const result = compareFinancialField(
            "fee",
            null,
            "25.00",
        );

        expect(result.result).toBe("FAIL");
    });

    it("fails when the candidate value is unavailable", () => {
        const result = compareFinancialField(
            "tax",
            "4.50",
            null,
        );

        expect(result.result).toBe("FAIL");
    });

    it("validates a present UTR", () => {
        const result = validatePresentFinancialField(
            "utr",
            "UTR123456",
        );

        expect(result.result).toBe("PASS");
        expect(result.sourceValue).toBe("UTR123456");
    });

    it("rejects an unavailable UTR", () => {
        const result = validatePresentFinancialField(
            "utr",
            null,
        );

        expect(result.result).toBe("FAIL");
    });

    it("rejects an empty UTR", () => {
        const result = validatePresentFinancialField(
            "utr",
            "   ",
        );

        expect(result.result).toBe("FAIL");
    });
});