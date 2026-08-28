import { describe, expect, it } from "vitest";

import {
    reconcileSettlementReconSettlement,
} from "../../src/reconciliation/razorpay/settlement-recon-settlement.reconciliation.js";

const baseSettlementRecon = {
    id: "settlement-recon-db-id",
    externalId: "settlement_recon_test_123",
    paymentId: "payment-db-id",
    refundId: null,
    settlementId: "settlement-db-id",
    batchId: "batch-id",
    sourceFileId: "source-file-id",
    amount: "1000.00",
    currency: "INR",
    rawPayload: {},
    createdAt: new Date(),
    updatedAt: new Date(),
};

const baseSettlement = {
    id: "settlement-db-id",
    externalId: "setl_test_123",
    batchId: "batch-id",
    sourceFileId: "source-file-id",
    amount: "1000.00",
    currency: "INR",
    status: "PROCESSED" as const,
    sourceCreatedAt: new Date("2026-08-31T10:03:00Z"),
    rawPayload: {},
    createdAt: new Date(),
    updatedAt: new Date(),
};

describe("Razorpay SettlementRecon → Settlement reconciliation", () => {
    it("matches when native relationship, amount and currency agree", () => {
        const result = reconcileSettlementReconSettlement(
            baseSettlementRecon,
            baseSettlement,
        );

        expect(result.status).toBe("MATCHED");
        expect(result.evidence).toHaveLength(4);
        expect(result.evidence.every((item) => item.result === "PASS")).toBe(
            true,
        );
    });

    it("rejects a settlement reconciliation linked to a different settlement", () => {
        const result = reconcileSettlementReconSettlement(
            {
                ...baseSettlementRecon,
                settlementId: "different-settlement-id",
            },
            baseSettlement,
        );

        expect(result.status).toBe("NO_MATCH");

        expect(
            result.evidence.find((item) => item.field === "settlement_id")
                ?.result,
        ).toBe("FAIL");
    });

    it("rejects an amount mismatch", () => {
        const result = reconcileSettlementReconSettlement(
            baseSettlementRecon,
            {
                ...baseSettlement,
                amount: "900.00",
            },
        );

        expect(result.status).toBe("NO_MATCH");

        expect(
            result.evidence.find((item) => item.field === "amount")?.result,
        ).toBe("FAIL");
    });

    it("rejects a currency mismatch", () => {
        const result = reconcileSettlementReconSettlement(
            baseSettlementRecon,
            {
                ...baseSettlement,
                currency: "USD",
            },
        );

        expect(result.status).toBe("NO_MATCH");

        expect(
            result.evidence.find((item) => item.field === "currency")?.result,
        ).toBe("FAIL");
    });

    it("accepts currency values with different casing", () => {
        const result = reconcileSettlementReconSettlement(
            {
                ...baseSettlementRecon,
                currency: "inr",
            },
            baseSettlement,
        );

        expect(result.status).toBe("MATCHED");
    });

    it("matches when UTR values agree", () => {
        const result = reconcileSettlementReconSettlement(
            {
                ...baseSettlementRecon,
                rawPayload: {
                    utr: "UTR123456789",
                },
            },
            {
                ...baseSettlement,
                rawPayload: {
                    utr: "UTR123456789",
                },
            },
        );

        expect(result.status).toBe("MATCHED");

        expect(
            result.evidence.find((item) => item.field === "utr")?.result,
        ).toBe("PASS");
    });

    it("rejects conflicting UTR values", () => {
        const result = reconcileSettlementReconSettlement(
            {
                ...baseSettlementRecon,
                rawPayload: {
                    utr: "UTR111",
                },
            },
            {
                ...baseSettlement,
                rawPayload: {
                    utr: "UTR222",
                },
            },
        );

        expect(result.status).toBe("NO_MATCH");

        expect(
            result.evidence.find((item) => item.field === "utr")?.result,
        ).toBe("FAIL");
    });

    it("does not invent a UTR match when UTR is unavailable", () => {
        const result = reconcileSettlementReconSettlement(
            baseSettlementRecon,
            baseSettlement,
        );

        expect(
            result.evidence.find((item) => item.field === "utr"),
        ).toBeUndefined();

        expect(result.status).toBe("MATCHED");
    });

    it("requires review for a non-processed settlement", () => {
        const result = reconcileSettlementReconSettlement(
            baseSettlementRecon,
            {
                ...baseSettlement,
                status: "PENDING" as typeof baseSettlement.status,
            },
        );

        expect(result.status).toBe("REVIEW_REQUIRED");

        expect(
            result.evidence.find(
                (item) => item.field === "settlement_status",
            )?.result,
        ).toBe("FAIL");
    });

    it("produces explainable evidence", () => {
        const result = reconcileSettlementReconSettlement(
            baseSettlementRecon,
            {
                ...baseSettlement,
                amount: "900.00",
            },
        );

        const amountEvidence = result.evidence.find(
            (item) => item.field === "amount",
        );

        expect(amountEvidence).toMatchObject({
            field: "amount",
            result: "FAIL",
            sourceValue: "900.00",
            candidateValue: "1000.00",
        });

        expect(amountEvidence?.explanation).toContain("does not match");
    });
});