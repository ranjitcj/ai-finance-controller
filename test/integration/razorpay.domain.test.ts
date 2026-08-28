import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import crypto from "node:crypto";

import { db } from "../../src/db/client.js";
import {
    batches,
    sourceFiles,
} from "../../src/db/schema/transaction.schema.js";
import {
    razorpayOrders,
    razorpayPayments,
    razorpayRefunds,
    razorpaySettlementRecons,
    razorpaySettlements,
} from "../../src/db/schema/razorpay.schema.js";

describe("Razorpay domain persistence", () => {
    it("persists the Razorpay relationship graph and raw source data", async () => {
        const suffix = crypto.randomUUID();

        const [batch] = await db
            .insert(batches)
            .values({
                status: "READY",
            })
            .returning();

        const [sourceFile] = await db
            .insert(sourceFiles)
            .values({
                batchId: batch!.id,
                fileName: "razorpay-domain-test.json",
                fileHash: `razorpay-domain-${suffix}`,
                rowCount: 1,
            })
            .returning();

        const orderPayload = {
            id: `order_${suffix}`,
            amount: 125050,
            currency: "INR",
            status: "paid",
        };

        const paymentPayload = {
            id: `pay_${suffix}`,
            amount: 125050,
            currency: "INR",
            status: "captured",
            order_id: orderPayload.id,
        };

        const refundPayload = {
            id: `rfnd_${suffix}`,
            amount: 25000,
            currency: "INR",
            status: "processed",
            payment_id: paymentPayload.id,
        };

        const settlementPayload = {
            id: `setl_${suffix}`,
            amount: 100050,
            status: "processed",
        };

        const [order] = await db
            .insert(razorpayOrders)
            .values({
                externalId: orderPayload.id,
                batchId: batch!.id,
                sourceFileId: sourceFile!.id,
                amount: "1250.50",
                currency: "INR",
                status: "PAID",
                sourceCreatedAt: new Date(),
                rawPayload: orderPayload,
            })
            .returning();

        const [payment] = await db
            .insert(razorpayPayments)
            .values({
                externalId: paymentPayload.id,
                orderId: order!.id,
                batchId: batch!.id,
                sourceFileId: sourceFile!.id,
                amount: "1250.50",
                currency: "INR",
                status: "CAPTURED",
                sourceCreatedAt: new Date(),
                rawPayload: paymentPayload,
            })
            .returning();

        const [refund] = await db
            .insert(razorpayRefunds)
            .values({
                externalId: refundPayload.id,
                paymentId: payment!.id,
                batchId: batch!.id,
                sourceFileId: sourceFile!.id,
                amount: "250.00",
                currency: "INR",
                status: "PROCESSED",
                sourceCreatedAt: new Date(),
                rawPayload: refundPayload,
            })
            .returning();

        const [settlement] = await db
            .insert(razorpaySettlements)
            .values({
                externalId: settlementPayload.id,
                batchId: batch!.id,
                sourceFileId: sourceFile!.id,
                amount: "1000.50",
                currency: "INR",
                status: "PROCESSED",
                sourceCreatedAt: new Date(),
                rawPayload: settlementPayload,
            })
            .returning();

        const [recon] = await db
            .insert(razorpaySettlementRecons)
            .values({
                externalId: `sr_${suffix}`,
                paymentId: payment!.id,
                refundId: refund!.id,
                settlementId: settlement!.id,
                batchId: batch!.id,
                sourceFileId: sourceFile!.id,
                amount: "1000.50",
                currency: "INR",
                rawPayload: {
                    payment_id: paymentPayload.id,
                    refund_id: refundPayload.id,
                    settlement_id: settlementPayload.id,
                },
            })
            .returning();

        expect(order).toBeDefined();
        expect(payment!.orderId).toBe(order!.id);
        expect(refund!.paymentId).toBe(payment!.id);
        expect(recon!.paymentId).toBe(payment!.id);
        expect(recon!.refundId).toBe(refund!.id);
        expect(recon!.settlementId).toBe(settlement!.id);

        expect(order!.rawPayload).toEqual(orderPayload);
        expect(payment!.rawPayload).toEqual(paymentPayload);
        expect(refund!.rawPayload).toEqual(refundPayload);
        expect(settlement!.rawPayload).toEqual(settlementPayload);

        await db
            .delete(razorpaySettlementRecons)
            .where(eq(razorpaySettlementRecons.id, recon!.id));

        await db
            .delete(razorpaySettlements)
            .where(eq(razorpaySettlements.id, settlement!.id));

        await db
            .delete(razorpayRefunds)
            .where(eq(razorpayRefunds.id, refund!.id));

        await db
            .delete(razorpayPayments)
            .where(eq(razorpayPayments.id, payment!.id));

        await db
            .delete(razorpayOrders)
            .where(eq(razorpayOrders.id, order!.id));

        await db
            .delete(sourceFiles)
            .where(eq(sourceFiles.id, sourceFile!.id));

        await db
            .delete(batches)
            .where(eq(batches.id, batch!.id));
    });
});