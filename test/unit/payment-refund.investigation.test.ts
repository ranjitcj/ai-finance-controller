import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";

import {
    investigatePaymentRefund,
} from "../../src/investigation/tools/razorpay/payment-refund.investigation.js";

import {
    findRazorpayCandidates,
} from "../../src/reconciliation/retrieval/razorpay-candidate-retrieval.js";

vi.mock(
    "../../src/reconciliation/retrieval/razorpay-candidate-retrieval.js",
);

const mockedFindRazorpayCandidates =
    vi.mocked(findRazorpayCandidates);

const payment = {
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

const refund = {
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

describe("Payment/refund investigation", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("investigates a payment and its native refunds", async () => {
        mockedFindRazorpayCandidates
            .mockResolvedValueOnce([
                {
                    entityType: "PAYMENT",
                    record: payment,
                    matchType: "NATIVE_ID",
                    matchField: "id",
                },
            ])
            .mockResolvedValueOnce([
                {
                    entityType: "REFUND",
                    record: refund,
                    matchType: "NATIVE_RELATIONSHIP",
                    matchField: "payment_id",
                },
            ]);

        const result = await investigatePaymentRefund({
            paymentId: payment.id,
        });

        expect(result.found).toBe(true);
        expect(result.payment?.id).toBe(payment.id);
        expect(result.refunds).toHaveLength(1);

        expect(
            result.reconciliation?.refundTotal,
        ).toBe("300.00");

        expect(
            result.reconciliation?.remainingAmount,
        ).toBe("700.00");

        expect(
            result.reconciliation?.fullyRefunded,
        ).toBe(false);
    });

    it("supports multiple refunds", async () => {
        mockedFindRazorpayCandidates
            .mockResolvedValueOnce([
                {
                    entityType: "PAYMENT",
                    record: payment,
                    matchType: "NATIVE_ID",
                    matchField: "id",
                },
            ])
            .mockResolvedValueOnce([
                {
                    entityType: "REFUND",
                    record: {
                        ...refund,
                        id: "refund-1",
                        amount: "600.00",
                    },
                    matchType: "NATIVE_RELATIONSHIP",
                    matchField: "payment_id",
                },
                {
                    entityType: "REFUND",
                    record: {
                        ...refund,
                        id: "refund-2",
                        amount: "400.00",
                    },
                    matchType: "NATIVE_RELATIONSHIP",
                    matchField: "payment_id",
                },
            ]);

        const result = await investigatePaymentRefund({
            paymentId: payment.id,
        });

        expect(result.refunds).toHaveLength(2);
        expect(
            result.reconciliation?.refundTotal,
        ).toBe("1000.00");

        expect(
            result.reconciliation?.remainingAmount,
        ).toBe("0.00");

        expect(
            result.reconciliation?.fullyRefunded,
        ).toBe(true);
    });

    it("returns not found when no payment exists", async () => {
        mockedFindRazorpayCandidates.mockResolvedValueOnce([]);

        const result = await investigatePaymentRefund({
            paymentId: "missing-payment",
        });

        expect(result.found).toBe(false);
        expect(result.payment).toBeNull();
        expect(result.refunds).toEqual([]);
        expect(result.reconciliation).toBeNull();
    });

    it("does not investigate without a native payment identifier", async () => {
        const result = await investigatePaymentRefund({});

        expect(result.found).toBe(false);
        expect(
            mockedFindRazorpayCandidates,
        ).not.toHaveBeenCalled();
    });
});