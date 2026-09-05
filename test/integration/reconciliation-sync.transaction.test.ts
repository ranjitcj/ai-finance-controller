import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import crypto from "node:crypto";

import { db } from "../../src/db/client.js";
import {
    batches,
    sourceFiles,
    // transactions,
} from "../../src/db/schema/transaction.schema.js";
// import { batches } from "../../src/db/schema/batch.schema.js";
// import { sourceFiles } from "../../src/db/schema/source-file.schema.js";
import {
    razorpayOrders,
    razorpayPayments,
    razorpayRefunds,
} from "../../src/db/schema/razorpay.schema.js";

import { createBatch } from "../../src/db/repositories/batch.repository.js";
import { createSourceFile } from "../../src/db/repositories/source-file.repository.js";
import {
    persistRazorpayOrders,
    persistRazorpayPayments,
    persistRazorpayRefunds,
} from "../../src/db/repositories/razorpay.repository.js";

describe("reconciliation persistence transaction", () => {
    it("rolls back all persistence when a later operation fails", async () => {
        const suffix = crypto.randomUUID();

        const orderId = `order_${suffix}`;
        const paymentId = `pay_${suffix}`;
        const invalidPaymentId = `pay_missing_${suffix}`;

        const batch = await createBatch();

        try {
            await expect(
                db.transaction(async (tx) => {
                    const sourceFile = await createSourceFile(
                        {
                            batchId: batch.id,
                            fileName: `transaction-test-${suffix}.json`,
                            fileHash: suffix,
                            rowCount: 1,
                        },
                        tx,
                    );

                    await persistRazorpayOrders(
                        batch.id,
                        sourceFile.id,
                        [
                            {
                                id: orderId,
                                amount: 10000,
                                currency: "INR",
                                status: "paid",
                                created_at: 1756684800,
                            },
                        ],
                        tx,
                    );

                    await persistRazorpayPayments(
                        batch.id,
                        sourceFile.id,
                        [
                            {
                                id: paymentId,
                                order_id: orderId,
                                amount: 10000,
                                currency: "INR",
                                status: "captured",
                                created_at: 1756684800,
                            },
                        ],
                        tx,
                    );

                    // This intentionally fails because the payment does not exist.
                    await persistRazorpayRefunds(
                        batch.id,
                        sourceFile.id,
                        [
                            {
                                id: `rfnd_${suffix}`,
                                payment_id: invalidPaymentId,
                                amount: 1000,
                                currency: "INR",
                                status: "processed",
                                created_at: 1756684800,
                            },
                        ],
                        tx,
                    );
                }),
            ).rejects.toThrow();

            const persistedSourceFiles = await db
                .select()
                .from(sourceFiles)
                .where(eq(sourceFiles.batchId, batch.id));

            const persistedOrders = await db
                .select()
                .from(razorpayOrders)
                .where(eq(razorpayOrders.batchId, batch.id));

            const persistedPayments = await db
                .select()
                .from(razorpayPayments)
                .where(eq(razorpayPayments.batchId, batch.id));

            const persistedRefunds = await db
                .select()
                .from(razorpayRefunds)
                .where(eq(razorpayRefunds.batchId, batch.id));

            expect(persistedSourceFiles).toHaveLength(0);
            expect(persistedOrders).toHaveLength(0);
            expect(persistedPayments).toHaveLength(0);
            expect(persistedRefunds).toHaveLength(0);
        } finally {
            // The batch itself is intentionally outside the transaction,
            // so clean it up after the test.
            await db.delete(batches).where(eq(batches.id, batch.id));
        }
    });
});