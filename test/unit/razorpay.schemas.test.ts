import { describe, expect, it } from "vitest";

import {
    razorpayOrderSchema,
    razorpayPaymentSchema,
    razorpayRefundSchema,
    razorpaySettlementSchema,
    razorpayOrdersResponseSchema,
} from "../../src/ingestion/razorpay/razorpay.schemas.js";

describe("Razorpay response schemas", () => {
    it("accepts a valid order", () => {
        const result = razorpayOrderSchema.safeParse({
            id: "order_123",
            entity: "order",
            amount: 10000,
            currency: "INR",
            status: "paid",
            created_at: 1724500000,
        });

        expect(result.success).toBe(true);
    });

    it("rejects an order with an invalid amount", () => {
        const result = razorpayOrderSchema.safeParse({
            id: "order_123",
            entity: "order",
            amount: "10000",
            currency: "INR",
            status: "paid",
        });

        expect(result.success).toBe(false);
    });

    it("accepts a valid payment", () => {
        const result = razorpayPaymentSchema.safeParse({
            id: "pay_123",
            entity: "payment",
            amount: 10000,
            currency: "INR",
            status: "captured",
            order_id: "order_123",
        });

        expect(result.success).toBe(true);
    });

    it("accepts a valid refund", () => {
        const result = razorpayRefundSchema.safeParse({
            id: "rfnd_123",
            entity: "refund",
            amount: 1000,
            currency: "INR",
            payment_id: "pay_123",
            status: "processed",
        });

        expect(result.success).toBe(true);
    });

    it("accepts a valid settlement", () => {
        const result = razorpaySettlementSchema.safeParse({
            id: "setl_123",
            entity: "settlement",
            amount: 10000,
            status: "processed",
        });

        expect(result.success).toBe(true);
    });

    it("validates list responses", () => {
        const result =
            razorpayOrdersResponseSchema.safeParse({
                items: [
                    {
                        id: "order_123",
                        amount: 10000,
                        currency: "INR",
                        status: "paid",
                    },
                ],
            });

        expect(result.success).toBe(true);
    });

    it("rejects a malformed list response", () => {
        const result =
            razorpayOrdersResponseSchema.safeParse({
                items: [
                    {
                        id: "order_123",
                        amount: "10000",
                        currency: "INR",
                        status: "paid",
                    },
                ],
            });

        expect(result.success).toBe(false);
    });
});