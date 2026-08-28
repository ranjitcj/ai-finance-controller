import { describe, expect, it } from "vitest";

import {
    validateSettlementFinancials,
} from "../../src/reconciliation/razorpay/settlement-financial.validation.js";

const settlement = {
    fee: "25.00",
    tax: "4.50",
    utr: "UTR123456789",
};

const settlementRecon = {
    fee: "25.00",
    tax: "4.50",
    utr: "UTR123456789",
};

describe("Razorpay settlement financial validation", () => {
    it("passes when fee, tax and UTR match", () => {
        const result = validateSettlementFinancials(
            settlement,
            settlementRecon,
        );

        expect(result.valid).toBe(true);
        expect(result.evidence).toHaveLength(3);

        expect(
            result.evidence.every(
                (item) => item.result === "PASS",
            ),
        ).toBe(true);
    });

    it("rejects a fee mismatch", () => {
        const result = validateSettlementFinancials(
            settlement,
            {
                ...settlementRecon,
                fee: "30.00",
            },
        );

        expect(result.valid).toBe(false);

        expect(
            result.evidence.find(
                (item) => item.field === "fee",
            )?.result,
        ).toBe("FAIL");
    });

    it("rejects a tax mismatch", () => {
        const result = validateSettlementFinancials(
            settlement,
            {
                ...settlementRecon,
                tax: "5.00",
            },
        );

        expect(result.valid).toBe(false);

        expect(
            result.evidence.find(
                (item) => item.field === "tax",
            )?.result,
        ).toBe("FAIL");
    });

    it("rejects a UTR mismatch", () => {
        const result = validateSettlementFinancials(
            settlement,
            {
                ...settlementRecon,
                utr: "DIFFERENT_UTR",
            },
        );

        expect(result.valid).toBe(false);

        expect(
            result.evidence.find(
                (item) => item.field === "utr",
            )?.result,
        ).toBe("FAIL");
    });

    it("rejects a missing fee", () => {
        const result = validateSettlementFinancials(
            settlement,
            {
                ...settlementRecon,
                fee: null,
            },
        );

        expect(result.valid).toBe(false);
    });

    it("rejects a missing tax", () => {
        const result = validateSettlementFinancials(
            settlement,
            {
                ...settlementRecon,
                tax: null,
            },
        );

        expect(result.valid).toBe(false);
    });

    it("rejects a missing UTR", () => {
        const result = validateSettlementFinancials(
            settlement,
            {
                ...settlementRecon,
                utr: null,
            },
        );

        expect(result.valid).toBe(false);
    });

    it("normalizes numeric fee and tax representations", () => {
        const result = validateSettlementFinancials(
            {
                fee: 25,
                tax: 4.5,
                utr: "UTR123456789",
            },
            settlementRecon,
        );

        expect(result.valid).toBe(true);
    });

    it("produces explainable evidence", () => {
        const result = validateSettlementFinancials(
            settlement,
            {
                ...settlementRecon,
                fee: "30.00",
            },
        );

        const feeEvidence = result.evidence.find(
            (item) => item.field === "fee",
        );

        expect(feeEvidence).toMatchObject({
            field: "fee",
            result: "FAIL",
            sourceValue: "25.00",
            candidateValue: "30.00",
        });

        expect(
            feeEvidence?.explanation,
        ).toContain("does not match");
    });
});