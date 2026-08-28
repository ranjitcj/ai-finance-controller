import { describe, expect, it } from "vitest";

import {
    reconcilePaymentSettlementRecon,
} from "../../src/reconciliation/razorpay/payment-settlement-recon.reconciliation.js";

const basePayment = {
    id: "payment-db-id",
    externalId: "pay_test_123",
    orderId: "order-db-id",
    batchId: "batch-id",
    sourceFileId: "source-file-id",
    amount: "1250.50",
    currency: "INR",
    status: "CAPTURED" as const,
    sourceCreatedAt: new Date("2026-08-28T10:01:00Z"),
    rawPayload: {},
    createdAt: new Date(),
    updatedAt: new Date(),
};

const baseSettlementRecon = {
    id: "settlement-recon-db-id",
    externalId: "sr_test_123",
    paymentId: "payment-db-id",
    refundId: null,
    settlementId: "settlement-db-id",
    batchId: "batch-id",
    sourceFileId: "source-file-id",
    amount: "1250.50",
    currency: "INR",
    rawPayload: {},
    createdAt: new Date(),
    updatedAt: new Date(),
};

describe("Razorpay Payment → SettlementRecon reconciliation", () => {
    it("matches when native payment relationship, amount and currency agree", () => {
        const result = reconcilePaymentSettlementRecon(
            basePayment,
            baseSettlementRecon,
        );

        expect(result.status).toBe("MATCHED");
        expect(result.evidence).toHaveLength(3);

        expect(
            result.evidence.every((item) => item.result === "PASS"),
        ).toBe(true);
    });

    it("rejects a settlement recon linked to a different payment", () => {
        const result = reconcilePaymentSettlementRecon(basePayment, {
            ...baseSettlementRecon,
            paymentId: "different-payment-id",
        });

        expect(result.status).toBe("NO_MATCH");

        expect(
            result.evidence.find((item) => item.field === "payment_id")?.result,
        ).toBe("FAIL");
    });

    it("does not accept a missing native payment relationship", () => {
        const result = reconcilePaymentSettlementRecon(basePayment, {
            ...baseSettlementRecon,
            paymentId: null,
        });

        expect(result.status).toBe("NO_MATCH");

        expect(
            result.evidence.find((item) => item.field === "payment_id")?.result,
        ).toBe("FAIL");
    });

    it("rejects an amount mismatch", () => {
        const result = reconcilePaymentSettlementRecon(basePayment, {
            ...baseSettlementRecon,
            amount: "1000.00",
        });

        expect(result.status).toBe("NO_MATCH");

        expect(
            result.evidence.find((item) => item.field === "amount")?.result,
        ).toBe("FAIL");
    });

    it("rejects a currency mismatch", () => {
        const result = reconcilePaymentSettlementRecon(basePayment, {
            ...baseSettlementRecon,
            currency: "USD",
        });

        expect(result.status).toBe("NO_MATCH");

        expect(
            result.evidence.find((item) => item.field === "currency")?.result,
        ).toBe("FAIL");
    });

    it("accepts currency values with different casing", () => {
        const result = reconcilePaymentSettlementRecon(basePayment, {
            ...baseSettlementRecon,
            currency: "inr",
        });

        expect(result.status).toBe("MATCHED");

        expect(
            result.evidence.find((item) => item.field === "currency")?.result,
        ).toBe("PASS");
    });

    it("produces explainable evidence", () => {
        const result = reconcilePaymentSettlementRecon(basePayment, {
            ...baseSettlementRecon,
            amount: "1000.00",
        });

        const amountEvidence = result.evidence.find(
            (item) => item.field === "amount",
        );

        expect(amountEvidence).toMatchObject({
            field: "amount",
            result: "FAIL",
            sourceValue: "1250.50",
            candidateValue: "1000.00",
        });

        expect(amountEvidence?.explanation).toContain("does not match");
    });

    it("keeps settlement identity available for the next reconciliation stage", () => {
        const result = reconcilePaymentSettlementRecon(
            basePayment,
            baseSettlementRecon,
        );

        expect(result.status).toBe("MATCHED");

        // Settlement ID is not compared here because the Payment model
        // does not contain a settlement ID. It will be validated in the
        // SettlementRecon → Settlement reconciliation stage.
        expect(baseSettlementRecon.settlementId).toBe("settlement-db-id");
    });
});