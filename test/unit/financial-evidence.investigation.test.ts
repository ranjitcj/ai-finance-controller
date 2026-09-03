import { describe, expect, it } from "vitest";

import {
    comparePaymentRefundFinancialEvidence,
    compareSettlementFinancialEvidence,
} from "../../src/investigation/tools/razorpay/financial-evidence.investigation.js";

describe("Razorpay financial evidence investigation", () => {
    describe("Payment → Refund", () => {
        it("exposes refund aggregation", () => {
            const result = comparePaymentRefundFinancialEvidence({
                payment: {
                    id: "payment-1",
                    externalId: "pay_123",
                    orderId: null,
                    batchId: "batch-1",
                    sourceFileId: "file-1",
                    amount: "1000.00",
                    currency: "INR",
                    status: "CAPTURED",
                    sourceCreatedAt: null,
                    rawPayload: {},
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
                refunds: [
                    {
                        id: "refund-1",
                        externalId: "rfnd_123",
                        paymentId: "payment-1",
                        batchId: "batch-1",
                        sourceFileId: "file-1",
                        amount: "300.00",
                        currency: "INR",
                        status: "PROCESSED",
                        sourceCreatedAt: null,
                        rawPayload: {},
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    },
                ],
            });

            const evidence = result.evidence.find(
                (item) => item.field === "refund_total",
            );

            expect(evidence).toEqual(
                expect.objectContaining({
                    field: "refund_total",
                    result: "PASS",
                    candidateValue: "300.00",
                }),
            );
        });

        it("exposes remaining payment amount", () => {
            const result = comparePaymentRefundFinancialEvidence({
                payment: {
                    id: "payment-1",
                    externalId: "pay_123",
                    orderId: null,
                    batchId: "batch-1",
                    sourceFileId: "file-1",
                    amount: "1000.00",
                    currency: "INR",
                    status: "CAPTURED",
                    sourceCreatedAt: null,
                    rawPayload: {},
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
                refunds: [
                    {
                        id: "refund-1",
                        externalId: "rfnd_123",
                        paymentId: "payment-1",
                        batchId: "batch-1",
                        sourceFileId: "file-1",
                        amount: "250.00",
                        currency: "INR",
                        status: "PROCESSED",
                        sourceCreatedAt: null,
                        rawPayload: {},
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    },
                ],
            });

            const evidence = result.evidence.find(
                (item) => item.field === "remaining_amount",
            );

            expect(evidence).toEqual(
                expect.objectContaining({
                    field: "remaining_amount",
                    result: "PASS",
                    candidateValue: "750.00",
                }),
            );
        });

        it("identifies a fully refunded payment", () => {
            const result = comparePaymentRefundFinancialEvidence({
                payment: {
                    id: "payment-1",
                    externalId: "pay_123",
                    orderId: null,
                    batchId: "batch-1",
                    sourceFileId: "file-1",
                    amount: "1000.00",
                    currency: "INR",
                    status: "REFUNDED",
                    sourceCreatedAt: null,
                    rawPayload: {},
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
                refunds: [
                    {
                        id: "refund-1",
                        externalId: "rfnd_123",
                        paymentId: "payment-1",
                        batchId: "batch-1",
                        sourceFileId: "file-1",
                        amount: "1000.00",
                        currency: "INR",
                        status: "PROCESSED",
                        sourceCreatedAt: null,
                        rawPayload: {},
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    },
                ],
            });

            const evidence = result.evidence.find(
                (item) => item.field === "fully_refunded",
            );

            expect(evidence).toEqual(
                expect.objectContaining({
                    field: "fully_refunded",
                    result: "PASS",
                    candidateValue: "true",
                }),
            );
        });

        it("compares payment and refund currency", () => {
            const result = comparePaymentRefundFinancialEvidence({
                payment: {
                    id: "payment-1",
                    externalId: "pay_123",
                    orderId: null,
                    batchId: "batch-1",
                    sourceFileId: "file-1",
                    amount: "1000.00",
                    currency: "INR",
                    status: "CAPTURED",
                    sourceCreatedAt: null,
                    rawPayload: {},
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
                refunds: [
                    {
                        id: "refund-1",
                        externalId: "rfnd_123",
                        paymentId: "payment-1",
                        batchId: "batch-1",
                        sourceFileId: "file-1",
                        amount: "100.00",
                        currency: "inr",
                        status: "PROCESSED",
                        sourceCreatedAt: null,
                        rawPayload: {},
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    },
                ],
            });

            const evidence = result.evidence.find(
                (item) => item.field === "currency",
            );

            expect(evidence).toEqual(
                expect.objectContaining({
                    field: "currency",
                    result: "PASS",
                    sourceValue: "INR",
                    candidateValue: "INR",
                }),
            );
        });

        it("aggregates multiple processed refunds", () => {
            const result = comparePaymentRefundFinancialEvidence({
                payment: {
                    id: "payment-1",
                    externalId: "pay_123",
                    orderId: null,
                    batchId: "batch-1",
                    sourceFileId: "file-1",
                    amount: "1000.00",
                    currency: "INR",
                    status: "CAPTURED",
                    sourceCreatedAt: null,
                    rawPayload: {},
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
                refunds: [
                    {
                        id: "refund-1",
                        externalId: "rfnd_1",
                        paymentId: "payment-1",
                        batchId: "batch-1",
                        sourceFileId: "file-1",
                        amount: "200.00",
                        currency: "INR",
                        status: "PROCESSED",
                        sourceCreatedAt: null,
                        rawPayload: {},
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    },
                    {
                        id: "refund-2",
                        externalId: "rfnd_2",
                        paymentId: "payment-1",
                        batchId: "batch-1",
                        sourceFileId: "file-1",
                        amount: "150.00",
                        currency: "INR",
                        status: "PROCESSED",
                        sourceCreatedAt: null,
                        rawPayload: {},
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    },
                    {
                        id: "refund-3",
                        externalId: "rfnd_3",
                        paymentId: "payment-1",
                        batchId: "batch-1",
                        sourceFileId: "file-1",
                        amount: "100.00",
                        currency: "INR",
                        status: "FAILED",
                        sourceCreatedAt: null,
                        rawPayload: {},
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    },
                ],
            });

            const refundTotal = result.evidence.find(
                (item) => item.field === "refund_total",
            );

            const remainingAmount = result.evidence.find(
                (item) => item.field === "remaining_amount",
            );

            expect(refundTotal?.candidateValue).toBe("350.00");
            expect(remainingAmount?.candidateValue).toBe("650.00");
        });
    });

    describe("SettlementRecon → Settlement", () => {
        it("matches settlement amount", () => {
            const result = compareSettlementFinancialEvidence({
                settlementRecon: {
                    id: "recon-1",
                    externalId: "sr_123",
                    paymentId: null,
                    refundId: null,
                    settlementId: "settlement-1",
                    batchId: "batch-1",
                    sourceFileId: "file-1",
                    amount: "950.00",
                    currency: "INR",
                    rawPayload: {},
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
                settlement: {
                    id: "settlement-1",
                    externalId: "setl_123",
                    batchId: "batch-1",
                    sourceFileId: "file-1",
                    amount: "950.00",
                    currency: "INR",
                    status: "PROCESSED",
                    sourceCreatedAt: null,
                    rawPayload: {},
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            });

            const evidence = result.evidence.find(
                (item) => item.field === "amount",
            );

            expect(evidence).toEqual(
                expect.objectContaining({
                    field: "amount",
                    result: "PASS",
                    sourceValue: "950.00",
                    candidateValue: "950.00",
                }),
            );
        });

        it("matches settlement currency", () => {
            const result = compareSettlementFinancialEvidence({
                settlementRecon: {
                    id: "recon-1",
                    externalId: "sr_123",
                    paymentId: null,
                    refundId: null,
                    settlementId: "settlement-1",
                    batchId: "batch-1",
                    sourceFileId: "file-1",
                    amount: "950.00",
                    currency: "inr",
                    rawPayload: {},
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
                settlement: {
                    id: "settlement-1",
                    externalId: "setl_123",
                    batchId: "batch-1",
                    sourceFileId: "file-1",
                    amount: "950.00",
                    currency: "INR",
                    status: "PROCESSED",
                    sourceCreatedAt: null,
                    rawPayload: {},
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            });

            const evidence = result.evidence.find(
                (item) => item.field === "currency",
            );

            expect(evidence?.result).toBe("PASS");
        });

        it("fails when settlement amount differs", () => {
            const result = compareSettlementFinancialEvidence({
                settlementRecon: {
                    id: "recon-1",
                    externalId: "sr_123",
                    paymentId: null,
                    refundId: null,
                    settlementId: "settlement-1",
                    batchId: "batch-1",
                    sourceFileId: "file-1",
                    amount: "950.00",
                    currency: "INR",
                    rawPayload: {},
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
                settlement: {
                    id: "settlement-1",
                    externalId: "setl_123",
                    batchId: "batch-1",
                    sourceFileId: "file-1",
                    amount: "900.00",
                    currency: "INR",
                    status: "PROCESSED",
                    sourceCreatedAt: null,
                    rawPayload: {},
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            });

            const evidence = result.evidence.find(
                (item) => item.field === "amount",
            );

            expect(evidence?.result).toBe("FAIL");
        });

        it("accepts different currency casing", () => {
            const result = compareSettlementFinancialEvidence({
                settlementRecon: {
                    id: "recon-1",
                    externalId: "sr_123",
                    paymentId: null,
                    refundId: null,
                    settlementId: "settlement-1",
                    batchId: "batch-1",
                    sourceFileId: "file-1",
                    amount: "950.00",
                    currency: "inr",
                    rawPayload: {},
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
                settlement: {
                    id: "settlement-1",
                    externalId: "setl_123",
                    batchId: "batch-1",
                    sourceFileId: "file-1",
                    amount: "950.00",
                    currency: "iNr",
                    status: "PROCESSED",
                    sourceCreatedAt: null,
                    rawPayload: {},
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            });

            const currencyEvidence = result.evidence.find(
                (item) => item.field === "currency",
            );

            expect(currencyEvidence?.result).toBe("PASS");
        });

        it("fails when settlement currency is unavailable", () => {
            const result = compareSettlementFinancialEvidence({
                settlementRecon: {
                    id: "recon-1",
                    externalId: "sr_123",
                    paymentId: null,
                    refundId: null,
                    settlementId: "settlement-1",
                    batchId: "batch-1",
                    sourceFileId: "file-1",
                    amount: "950.00",
                    currency: "INR",
                    rawPayload: {},
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
                settlement: {
                    id: "settlement-1",
                    externalId: "setl_123",
                    batchId: "batch-1",
                    sourceFileId: "file-1",
                    amount: "950.00",
                    currency: null,
                    status: "PROCESSED",
                    sourceCreatedAt: null,
                    rawPayload: {},
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            });

            const currencyEvidence = result.evidence.find(
                (item) => item.field === "currency",
            );

            expect(currencyEvidence?.result).toBe("FAIL");
            expect(currencyEvidence?.candidateValue).toBeNull();
        });
    });
});