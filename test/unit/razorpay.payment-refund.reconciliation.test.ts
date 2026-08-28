import { describe, expect, it } from "vitest";

import {
    aggregatePaymentRefunds,
    reconcilePaymentRefund,
} from "../../src/reconciliation/razorpay/payment-refund.reconciliation.js";

const basePayment = {
    id: "payment-db-id",
    externalId: "pay_test_123",
    orderId: "order-db-id",
    batchId: "batch-id",
    sourceFileId: "source-file-id",
    amount: "1000.00",
    currency: "INR",
    status: "CAPTURED" as const,
    sourceCreatedAt: new Date("2026-08-28T10:01:00Z"),
    rawPayload: {},
    createdAt: new Date(),
    updatedAt: new Date(),
};

const baseRefund = {
    id: "refund-db-id",
    externalId: "rfnd_test_123",
    paymentId: "payment-db-id",
    batchId: "batch-id",
    sourceFileId: "source-file-id",
    amount: "300.00",
    currency: "INR",
    status: "PROCESSED" as const,
    sourceCreatedAt: new Date("2026-08-28T10:02:00Z"),
    rawPayload: {},
    createdAt: new Date(),
    updatedAt: new Date(),
};

describe("Razorpay Payment → Refund reconciliation", () => {
    it("matches a processed refund with matching payment_id", () => {
        const result = reconcilePaymentRefund(basePayment, baseRefund);

        expect(result.status).toBe("MATCHED");
        expect(result.evidence).toHaveLength(4);
        expect(result.evidence.every((item) => item.result === "PASS")).toBe(true);
    });

    it("rejects a refund linked to a different payment", () => {
        const result = reconcilePaymentRefund(basePayment, {
            ...baseRefund,
            paymentId: "different-payment-id",
        });

        expect(result.status).toBe("NO_MATCH");

        expect(
            result.evidence.find((item) => item.field === "payment_id")?.result,
        ).toBe("FAIL");
    });

    it("rejects a refund amount greater than the payment amount", () => {
        const result = reconcilePaymentRefund(basePayment, {
            ...baseRefund,
            amount: "1000.01",
        });

        expect(result.status).toBe("NO_MATCH");

        expect(
            result.evidence.find((item) => item.field === "amount")?.result,
        ).toBe("FAIL");
    });

    it("accepts a partial refund", () => {
        const result = reconcilePaymentRefund(basePayment, {
            ...baseRefund,
            amount: "300.00",
        });

        expect(result.status).toBe("MATCHED");
    });

    it("rejects a currency mismatch", () => {
        const result = reconcilePaymentRefund(basePayment, {
            ...baseRefund,
            currency: "USD",
        });

        expect(result.status).toBe("NO_MATCH");

        expect(
            result.evidence.find((item) => item.field === "currency")?.result,
        ).toBe("FAIL");
    });

    it("requires review for a pending refund", () => {
        const result = reconcilePaymentRefund(basePayment, {
            ...baseRefund,
            status: "PENDING",
        });

        expect(result.status).toBe("REVIEW_REQUIRED");
    });

    it("requires review for an unknown refund status", () => {
        const result = reconcilePaymentRefund(basePayment, {
            ...baseRefund,
            status: "UNKNOWN",
        });

        expect(result.status).toBe("REVIEW_REQUIRED");
    });

    it("aggregates multiple processed refunds", () => {
        const result = aggregatePaymentRefunds(basePayment, [
            { ...baseRefund, id: "refund-1", amount: "250.00" },
            { ...baseRefund, id: "refund-2", amount: "150.00" },
            { ...baseRefund, id: "refund-3", amount: "100.00" },
        ]);

        expect(result.refundTotal).toBe("500.00");
        expect(result.remainingAmount).toBe("500.00");
        expect(result.fullyRefunded).toBe(false);
    });

    it("identifies a fully refunded payment", () => {
        const result = aggregatePaymentRefunds(basePayment, [
            { ...baseRefund, id: "refund-1", amount: "600.00" },
            { ...baseRefund, id: "refund-2", amount: "400.00" },
        ]);

        expect(result.refundTotal).toBe("1000.00");
        expect(result.remainingAmount).toBe("0.00");
        expect(result.fullyRefunded).toBe(true);
    });

    it("ignores failed refunds during aggregation", () => {
        const result = aggregatePaymentRefunds(basePayment, [
            { ...baseRefund, id: "refund-1", amount: "300.00" },
            {
                ...baseRefund,
                id: "refund-2",
                amount: "200.00",
                status: "FAILED",
            },
        ]);

        expect(result.refundTotal).toBe("300.00");
        expect(result.remainingAmount).toBe("700.00");
    });

    it("produces explainable evidence", () => {
        const result = reconcilePaymentRefund(basePayment, {
            ...baseRefund,
            amount: "1200.00",
        });

        const amountEvidence = result.evidence.find(
            (item) => item.field === "amount",
        );

        expect(amountEvidence).toMatchObject({
            field: "amount",
            result: "FAIL",
            sourceValue: "1000.00",
            candidateValue: "1200.00",
        });

        expect(amountEvidence?.explanation).toContain("exceeds");
    });
});