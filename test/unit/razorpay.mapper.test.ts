import { describe, expect, it } from "vitest";

import {
    mapOrderToTransaction,
    mapPaymentToTransaction,
    mapRefundToTransaction,
    mapSettlementToTransaction,
    mapSettlementReconToTransaction,
} from "../../src/ingestion/razorpay/razorpay.mapper.js";

describe("Razorpay mappers", () => {
    const createdAt = 1755907200;
    const expectedDate = "2025-08-23T00:00:00.000Z";

    it("maps an order to a RawTransaction", () => {
        const result = mapOrderToTransaction({
            id: "order_123",
            entity: "order",
            amount: 125050,
            currency: "INR",
            status: "paid",
            created_at: createdAt,
        });

        expect(result).toEqual({
            externalId: "order_123",
            amount: "1250.50",
            currency: "INR",
            date: expectedDate,
            reference: "order_123",
            vendor: "Razorpay",
        });
    });

    it("maps a payment and uses order_id as reference", () => {
        const result = mapPaymentToTransaction({
            id: "pay_123",
            entity: "payment",
            amount: 99900,
            currency: "gbp",
            status: "captured",
            order_id: "order_123",
            created_at: createdAt,
        });

        expect(result).toEqual({
            externalId: "pay_123",
            amount: "999.00",
            currency: "GBP",
            date: expectedDate,
            reference: "order_123",
            vendor: "Razorpay",
        });
    });

    it("falls back to payment id when order_id is absent", () => {
        const result = mapPaymentToTransaction({
            id: "pay_456",
            entity: "payment",
            amount: 10000,
            currency: "INR",
            status: "captured",
            created_at: createdAt,
        });

        expect(result).toEqual({
            externalId: "pay_456",
            amount: "100.00",
            currency: "INR",
            date: expectedDate,
            reference: "pay_456",
            vendor: "Razorpay",
        });
    });

    it("rejects a payment without created_at", () => {
        expect(() =>
            mapPaymentToTransaction({
                id: "pay_missing_date",
                entity: "payment",
                amount: 10000,
                currency: "INR",
                status: "captured",
            }),
        ).toThrow("Razorpay resource is missing created_at");
    });

    it("maps a refund as a positive transaction amount", () => {
        const result = mapRefundToTransaction({
            id: "rfnd_123",
            entity: "refund",
            amount: 25000,
            currency: "INR",
            payment_id: "pay_123",
            status: "processed",
            created_at: createdAt,
        });

        expect(result).toEqual({
            externalId: "rfnd_123",
            amount: "250.00",
            currency: "INR",
            date: expectedDate,
            reference: "pay_123",
            vendor: "Razorpay",
        });
    });

    it("maps a settlement", () => {
        const result = mapSettlementToTransaction({
            id: "setl_123",
            entity: "settlement",
            amount: 500000,
            status: "processed",
            created_at: createdAt,
        });

        expect(result).toEqual({
            externalId: "setl_123",
            amount: "5000.00",
            currency: "INR",
            date: expectedDate,
            reference: "setl_123",
            vendor: "Razorpay",
        });
    });

    it("maps settlement reconciliation with currency", () => {
        const result = mapSettlementReconToTransaction({
            id: "sr_123",
            entity: "settlement_recon",
            amount: 75000,
            currency: "usd",
        });

        expect(result.externalId).toBe("sr_123");
        expect(result.amount).toBe("750.00");
        expect(result.currency).toBe("USD");
        expect(result.reference).toBe("sr_123");
        expect(result.vendor).toBe("Razorpay");
    });

    it("rejects settlement reconciliation without amount", () => {
        expect(() =>
            mapSettlementReconToTransaction({
                id: "sr_456",
                entity: "settlement_recon",
                currency: "INR",
            }),
        ).toThrow(
            "Razorpay settlement reconciliation resource is missing amount or currency",
        );
    });

    it("rejects settlement reconciliation without currency", () => {
        expect(() =>
            mapSettlementReconToTransaction({
                id: "sr_789",
                entity: "settlement_recon",
                amount: 10000,
            }),
        ).toThrow(
            "Razorpay settlement reconciliation resource is missing amount or currency",
        );
    });

    it("rejects an invalid timestamp", () => {
        expect(() =>
            mapOrderToTransaction({
                id: "order_invalid",
                entity: "order",
                amount: 10000,
                currency: "INR",
                status: "paid",
                created_at: Number.NaN,
            }),
        ).toThrow("Razorpay resource has an invalid created_at");
    });

    it("rejects an order without created_at", () => {
        expect(() =>
            mapOrderToTransaction({
                id: "order_missing_date",
                entity: "order",
                amount: 10000,
                currency: "INR",
                status: "paid",
            }),
        ).toThrow("Razorpay resource is missing created_at");
    });
});