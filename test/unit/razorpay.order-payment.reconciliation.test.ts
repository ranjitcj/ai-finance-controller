import { describe, expect, it } from "vitest";

import {
    reconcileOrderPayment,
} from "../../src/reconciliation/razorpay/order-payment.reconciliation.js";

const baseOrder = {
    id: "order-db-id",
    externalId: "order_test_123",
    batchId: "batch-id",
    sourceFileId: "source-file-id",
    amount: "1250.50",
    currency: "INR",
    status: "PAID" as const,
    sourceCreatedAt: new Date("2026-08-28T10:00:00Z"),
    rawPayload: {},
    createdAt: new Date(),
    updatedAt: new Date(),
};

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

describe("Razorpay Order → Payment reconciliation", () => {
    it("matches when native relationship, amount and currency agree", () => {
        const result = reconcileOrderPayment(baseOrder, basePayment);

        expect(result.status).toBe("MATCHED");
        expect(result.evidence).toHaveLength(3);

        expect(result.evidence.every((item) => item.result === "PASS")).toBe(
            true,
        );
    });

    it("rejects a payment linked to a different order", () => {
        const result = reconcileOrderPayment(baseOrder, {
            ...basePayment,
            orderId: "different-order-id",
        });

        expect(result.status).toBe("NO_MATCH");

        expect(
            result.evidence.find((item) => item.field === "order_id")?.result,
        ).toBe("FAIL");
    });

    it("rejects an amount mismatch", () => {
        const result = reconcileOrderPayment(baseOrder, {
            ...basePayment,
            amount: "1250.00",
        });

        expect(result.status).toBe("NO_MATCH");

        expect(
            result.evidence.find((item) => item.field === "amount")?.result,
        ).toBe("FAIL");
    });

    it("rejects a currency mismatch", () => {
        const result = reconcileOrderPayment(baseOrder, {
            ...basePayment,
            currency: "USD",
        });

        expect(result.status).toBe("NO_MATCH");

        expect(
            result.evidence.find((item) => item.field === "currency")?.result,
        ).toBe("FAIL");
    });

    it("does not accept a missing native order relationship", () => {
        const result = reconcileOrderPayment(baseOrder, {
            ...basePayment,
            orderId: null,
        });

        expect(result.status).toBe("NO_MATCH");

        expect(
            result.evidence.find((item) => item.field === "order_id")?.result,
        ).toBe("FAIL");
    });

    it("produces explainable evidence", () => {
        const result = reconcileOrderPayment(baseOrder, {
            ...basePayment,
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
});