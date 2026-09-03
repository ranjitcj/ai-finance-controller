import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import crypto from "node:crypto";

import { db } from "../../src/db/client.js";

import { batches, sourceFiles } from "../../src/db/schema/transaction.schema.js";

import {
  razorpayOrders,
  razorpayPayments,
  razorpayRefunds,
  razorpaySettlementRecons,
  razorpaySettlements,
} from "../../src/db/schema/razorpay.schema.js";

import { findRazorpayCandidates } from "../../src/reconciliation/retrieval/razorpay-candidate-retrieval.js";

describe("Razorpay candidate retrieval", () => {
  it("retrieves the native Razorpay relationship graph", async () => {
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
        fileName: "razorpay-candidate-test.json",
        fileHash: `razorpay-candidate-${suffix}`,
        rowCount: 1,
      })
      .returning();

    const [order] = await db
      .insert(razorpayOrders)
      .values({
        externalId: `order_${suffix}`,
        batchId: batch!.id,
        sourceFileId: sourceFile!.id,
        amount: "1000.00",
        currency: "INR",
        status: "PAID",
        sourceCreatedAt: new Date(),
        rawPayload: {},
      })
      .returning();

    const [payment] = await db
      .insert(razorpayPayments)
      .values({
        externalId: `pay_${suffix}`,
        orderId: order!.id,
        batchId: batch!.id,
        sourceFileId: sourceFile!.id,
        amount: "1000.00",
        currency: "INR",
        status: "CAPTURED",
        sourceCreatedAt: new Date(),
        rawPayload: {},
      })
      .returning();

    const [refund] = await db
      .insert(razorpayRefunds)
      .values({
        externalId: `rfnd_${suffix}`,
        paymentId: payment!.id,
        batchId: batch!.id,
        sourceFileId: sourceFile!.id,
        amount: "250.00",
        currency: "INR",
        status: "PROCESSED",
        sourceCreatedAt: new Date(),
        rawPayload: {},
      })
      .returning();

    const [settlement] = await db
      .insert(razorpaySettlements)
      .values({
        externalId: `setl_${suffix}`,
        batchId: batch!.id,
        sourceFileId: sourceFile!.id,
        amount: "750.00",
        currency: "INR",
        status: "PROCESSED",
        sourceCreatedAt: new Date(),
        rawPayload: {},
      })
      .returning();

    const [settlementRecon] = await db
      .insert(razorpaySettlementRecons)
      .values({
        externalId: `sr_${suffix}`,
        paymentId: payment!.id,
        refundId: refund!.id,
        settlementId: settlement!.id,
        batchId: batch!.id,
        sourceFileId: sourceFile!.id,
        amount: "750.00",
        currency: "INR",
        rawPayload: {},
      })
      .returning();

    /*
     * Order native ID.
     */
    const orderCandidates = await findRazorpayCandidates({
      externalId: order!.externalId,
    });

    expect(
      orderCandidates.some(
        (candidate) =>
          candidate.entityType === "ORDER" &&
          candidate.matchType === "NATIVE_ID" &&
          (candidate.record as typeof order).id === order!.id,
      ),
    ).toBe(true);

    /*
     * Payment → Refund relationship.
     */
    const refundCandidates = await findRazorpayCandidates({
      paymentId: payment!.id,
    });

    expect(
      refundCandidates.some(
        (candidate) =>
          candidate.entityType === "REFUND" &&
          candidate.matchType === "NATIVE_RELATIONSHIP" &&
          candidate.matchField === "payment_id" &&
          (candidate.record as typeof refund).id === refund!.id,
      ),
    ).toBe(true);

    /*
     * Payment → SettlementRecon relationship.
     */
    const reconCandidates = await findRazorpayCandidates({
      paymentId: payment!.id,
    });

    expect(
      reconCandidates.some(
        (candidate) =>
          candidate.entityType === "SETTLEMENT_RECON" &&
          candidate.matchType === "NATIVE_RELATIONSHIP" &&
          candidate.matchField === "payment_id" &&
          (candidate.record as typeof settlementRecon).id === settlementRecon!.id,
      ),
    ).toBe(true);

    /*
     * SettlementRecon → Settlement relationship.
     */
    const settlementCandidates = await findRazorpayCandidates({
      settlementId: settlement!.id,
    });

    expect(
      settlementCandidates.some(
        (candidate) =>
          candidate.entityType === "SETTLEMENT" &&
          candidate.matchType === "NATIVE_RELATIONSHIP" &&
          candidate.matchField === "settlement_id" &&
          (candidate.record as typeof settlement).id === settlement!.id,
      ),
    ).toBe(true);

    /*
     * Native external ID lookup.
     */
    const paymentCandidates = await findRazorpayCandidates({
      externalId: payment!.externalId,
    });

    expect(
      paymentCandidates.some(
        (candidate) =>
          candidate.entityType === "PAYMENT" &&
          candidate.matchType === "NATIVE_ID" &&
          (candidate.record as typeof payment).id === payment!.id,
      ),
    ).toBe(true);

    /*
     * Cleanup in reverse dependency order.
     */
    await db
      .delete(razorpaySettlementRecons)
      .where(eq(razorpaySettlementRecons.id, settlementRecon!.id));

    await db.delete(razorpaySettlements).where(eq(razorpaySettlements.id, settlement!.id));

    await db.delete(razorpayRefunds).where(eq(razorpayRefunds.id, refund!.id));

    await db.delete(razorpayPayments).where(eq(razorpayPayments.id, payment!.id));

    await db.delete(razorpayOrders).where(eq(razorpayOrders.id, order!.id));

    await db.delete(sourceFiles).where(eq(sourceFiles.id, sourceFile!.id));

    await db.delete(batches).where(eq(batches.id, batch!.id));
  });

  it("does not return candidates for unknown native IDs", async () => {
    const result = await findRazorpayCandidates({
      externalId: `does_not_exist_${crypto.randomUUID()}`,
      orderId: crypto.randomUUID(),
      paymentId: crypto.randomUUID(),
      refundId: crypto.randomUUID(),
      settlementId: crypto.randomUUID(),
    });

    expect(result).toHaveLength(0);
  });
});
