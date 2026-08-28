import { describe, expect, it } from "vitest";

import { reconcileRazorpay } from "../../src/reconciliation/razorpay/razorpay.reconciliation.js";

const baseOrder = {
    id: "order-db-id",
    externalId: "order_test_123",
    batchId: "batch-id",
    sourceFileId: "source-file-id",
    amount: "1000.00",
    currency: "INR",
    status: "PAID" as const,
    sourceCreatedAt: new Date("2026-08-31T10:00:00Z"),
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
    amount: "1000.00",
    currency: "INR",
    status: "CAPTURED" as const,
    sourceCreatedAt: new Date("2026-08-31T10:01:00Z"),
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
    sourceCreatedAt: new Date("2026-08-31T10:02:00Z"),
    rawPayload: {},
    createdAt: new Date(),
    updatedAt: new Date(),
};

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
    rawPayload: {
        fee: "25.00",
        tax: "4.50",
        utr: "UTR123456789",
    },
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
    rawPayload: {
        fee: "25.00",
        tax: "4.50",
        utr: "UTR123456789",
    },
    createdAt: new Date(),
    updatedAt: new Date(),
};

describe("Razorpay reconciliation orchestrator", () => {
    it("runs Order → Payment reconciliation", () => {
        const result = reconcileRazorpay({
            order: baseOrder,
            payment: basePayment,
        });

        expect(result.orderPayment).toBeDefined();
        expect(result.orderPayment?.status).toBe("MATCHED");
    });

    it("runs Payment → Refund reconciliation", () => {
        const result = reconcileRazorpay({
            payment: basePayment,
            refunds: [baseRefund],
        });

        expect(result.paymentRefund).toBeDefined();
        expect(result.paymentRefund?.status).toBe("MATCHED");
        expect(result.paymentRefund?.refundTotal).toBe("300.00");
        expect(result.paymentRefund?.remainingAmount).toBe("700.00");
    });

    it("runs Payment → SettlementRecon reconciliation", () => {
        const result = reconcileRazorpay({
            payment: basePayment,
            settlementRecon: baseSettlementRecon,
            settlement: baseSettlement,
        });

        expect(result.paymentSettlementRecon).toBeDefined();
        expect(result.paymentSettlementRecon?.status).toBe("MATCHED");
    });

    it("runs SettlementRecon → Settlement reconciliation", () => {
        const result = reconcileRazorpay({
            payment: basePayment,
            settlementRecon: baseSettlementRecon,
            settlement: baseSettlement,
        });

        expect(result.paymentSettlementRecon).toBeDefined();
        expect(result.paymentSettlementRecon?.status).toBe("MATCHED");

        expect(result.settlementReconSettlement).toBeDefined();
        expect(result.settlementReconSettlement?.status).toBe("MATCHED");
    });

    it("supports multiple refunds through the orchestrator", () => {
        const secondRefund = {
            ...baseRefund,
            id: "refund-db-id-2",
            externalId: "rfnd_test_456",
            amount: "700.00",
        };

        const result = reconcileRazorpay({
            payment: basePayment,
            refunds: [baseRefund, secondRefund],
        });

        expect(result.paymentRefund?.refundTotal).toBe("1000.00");
        expect(result.paymentRefund?.remainingAmount).toBe("0.00");
        expect(result.paymentRefund?.fullyRefunded).toBe(true);
    });

    it("does not create reconciliation stages when required entities are missing", () => {
        const result = reconcileRazorpay({});

        expect(result.orderPayment).toBeUndefined();
        expect(result.paymentRefund).toBeUndefined();
        expect(result.paymentSettlementRecon).toBeUndefined();
        expect(result.settlementReconSettlement).toBeUndefined();
    });

    it("can run multiple Razorpay reconciliation stages together", () => {
        const result = reconcileRazorpay({
            order: baseOrder,
            payment: basePayment,
            refunds: [baseRefund],
            settlementRecon: baseSettlementRecon,
            settlement: baseSettlement,
        });

        expect(result.orderPayment?.status).toBe("MATCHED");
        expect(result.paymentRefund?.status).toBe("MATCHED");
        expect(result.paymentSettlementRecon?.status).toBe("MATCHED");
        expect(result.settlementReconSettlement?.status).toBe("MATCHED");
    });
});