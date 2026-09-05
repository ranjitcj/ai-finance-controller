import { db } from "./client.js";
import {
  batches,
  sourceFiles,
  transactions,
} from "./schema/transaction.schema.js";
import { auditEvents } from "./schema/reconciliation.schema.js";

import {
  persistRazorpayOrders,
  persistRazorpayPayments,
  persistRazorpayRefunds,
  persistRazorpaySettlements,
  persistRazorpaySettlementRecons,
} from "./repositories/razorpay.repository.js";

import type {
  RazorpayOrder,
  RazorpayPayment,
  RazorpayRefund,
  RazorpaySettlement,
  RazorpaySettlementRecon,
} from "../ingestion/razorpay/razorpay.schemas.js";

const TOTAL_TRANSACTIONS = 300;

function unixTimestamp(date: Date): number {
  return Math.floor(date.getTime() / 1000);
}

function demoDate(index: number): Date {
  const date = new Date("2025-09-01T00:00:00.000Z");

  date.setUTCDate(
    date.getUTCDate() + (index % 30),
  );

  return date;
}

function scenarioFor(index: number) {
  if (index <= 210) {
    return "EXACT_MATCH";
  }

  if (index <= 240) {
    return "AMOUNT_MISMATCH";
  }

  if (index <= 255) {
    return "MISSING_PAYMENT";
  }

  if (index <= 270) {
    return "REFUND";
  }

  if (index <= 285) {
    return "SETTLEMENT_MISMATCH";
  }

  return "DUPLICATE";
}

async function seed() {
  console.log("");
  console.log("======================================");
  console.log(" Razorpay AI Finance Controller Demo");
  console.log("======================================");
  console.log("");
  console.log(
    `Generating ${TOTAL_TRANSACTIONS} demo transactions...`,
  );

  const [batch] = await db
    .insert(batches)
    .values({
      status: "READY",
    })
    .returning();

  if (!batch) {
    throw new Error("Failed to create demo batch");
  }

  const [sourceFile] = await db
    .insert(sourceFiles)
    .values({
      batchId: batch.id,
      fileName: "razorpay-demo-300.json",
      fileHash: `razorpay-demo-${batch.id}`,
      rowCount: TOTAL_TRANSACTIONS,
    })
    .returning();

  if (!sourceFile) {
    throw new Error("Failed to create demo source file");
  }

  const orders: RazorpayOrder[] = [];
  const payments: RazorpayPayment[] = [];
  const refunds: RazorpayRefund[] = [];
  const settlements: RazorpaySettlement[] = [];
  const settlementRecons: RazorpaySettlementRecon[] = [];
  const demoTransactions: Array<{
    batchId: string;
    sourceFileId: string;
    externalId: string;
    amount: string;
    currency: string;
    transactionDate: string;
    reference: string;
    vendor: string;
    status: "PENDING";
    sourceRowNumber: number;
  }> = [];

  for (
    let index = 1;
    index <= TOTAL_TRANSACTIONS;
    index++
  ) {
    const scenario = scenarioFor(index);

    const suffix = String(index).padStart(3, "0");

    const orderId = `order_demo_${suffix}`;
    const paymentId = `pay_demo_${suffix}`;
    const settlementId = `setl_demo_${suffix}`;
    const settlementReconId = `sr_demo_${suffix}`;

    const date = demoDate(index);
    const timestamp = unixTimestamp(date);

    const baseAmount =
      500 + ((index * 137) % 4500);

    const transactionAmount = baseAmount;
    let paymentAmount = baseAmount;

    if (scenario === "AMOUNT_MISMATCH") {
      paymentAmount = baseAmount - 100;
    }

    if (scenario === "SETTLEMENT_MISMATCH") {
      paymentAmount = baseAmount;
    }

    if (scenario === "REFUND") {
      paymentAmount = baseAmount;
    }

    /*
     * Every transaction gets an order.
     */
    orders.push({
      id: orderId,
      amount: baseAmount * 100,
      currency: "INR",
      status: "paid",
      created_at: timestamp,
    });

    /*
     * Missing-payment scenarios intentionally
     * have no Razorpay payment.
     */
    if (scenario !== "MISSING_PAYMENT") {
      payments.push({
        id: paymentId,
        amount: paymentAmount * 100,
        currency: "INR",
        status: "captured",
        order_id: orderId,
        created_at: timestamp,
      });
    }

    /*
     * Refund scenarios get a partial refund.
     */
    if (scenario === "REFUND") {
      refunds.push({
        id: `rfnd_demo_${suffix}`,
        amount: Math.floor(baseAmount * 0.25) * 100,
        currency: "INR",
        payment_id: paymentId,
        status: "processed",
        created_at: timestamp + 3600,
      });
    }

    /*
     * Settlement data is intentionally created for
     * settlement scenarios and a subset of normal
     * payments.
     */
    if (
      scenario === "SETTLEMENT_MISMATCH" ||
      scenario === "EXACT_MATCH"
    ) {
      const settlementAmount =
        scenario === "SETTLEMENT_MISMATCH"
          ? Math.max(baseAmount - 150, 1)
          : baseAmount;

      settlements.push({
        id: settlementId,
        amount: settlementAmount * 100,
        status: "processed",
        created_at: timestamp + 7200,
      });

      settlementRecons.push({
        id: settlementReconId,
        amount: settlementAmount * 100,
        currency: "INR",
        payment_id: paymentId,
        settlement_id: settlementId,
      });
    }

    /*
     * The duplicate scenario creates another payment
     * with the same business amount/reference pattern.
     *
     * This gives candidate retrieval something
     * deterministic to flag as ambiguous.
     */
    if (scenario === "DUPLICATE") {
      payments.push({
        id: `pay_demo_duplicate_${suffix}`,
        amount: baseAmount * 100,
        currency: "INR",
        status: "captured",
        order_id: orderId,
        created_at: timestamp + 60,
      });
    }

    demoTransactions.push({
      batchId: batch.id,
      sourceFileId: sourceFile.id,
      externalId: `DEMO-TXN-${suffix}`,
      amount: transactionAmount.toFixed(2),
      currency: "INR",
      transactionDate: date.toISOString().slice(0, 10),
      reference: orderId,
      vendor: `Demo Merchant ${((index - 1) % 10) + 1}`,
      status: "PENDING" as const,
      sourceRowNumber: index + 1,
    });
  }

  await db.transaction(async (tx) => {
    console.log(
      `Creating ${orders.length} Razorpay orders...`,
    );

    await persistRazorpayOrders(
      batch.id,
      sourceFile.id,
      orders,
      tx,
    );

    console.log(
      `Creating ${payments.length} Razorpay payments...`,
    );

    await persistRazorpayPayments(
      batch.id,
      sourceFile.id,
      payments,
      tx,
    );

    console.log(
      `Creating ${refunds.length} Razorpay refunds...`,
    );

    await persistRazorpayRefunds(
      batch.id,
      sourceFile.id,
      refunds,
      tx,
    );

    console.log(
      `Creating ${settlements.length} Razorpay settlements...`,
    );

    await persistRazorpaySettlements(
      batch.id,
      sourceFile.id,
      settlements,
      tx,
    );

    console.log(
      `Creating ${settlementRecons.length} settlement reconciliations...`,
    );

    await persistRazorpaySettlementRecons(
      batch.id,
      sourceFile.id,
      settlementRecons,
      tx,
    );

    console.log(
      `Creating ${demoTransactions.length} transactions...`,
    );

    const createdTransactions = await tx
      .insert(transactions)
      .values(demoTransactions)
      .returning();

    if (
      createdTransactions.length !==
      TOTAL_TRANSACTIONS
    ) {
      throw new Error(
        `Expected ${TOTAL_TRANSACTIONS} transactions but created ${createdTransactions.length}`,
      );
    }
  });

  await db.insert(auditEvents).values({
    batchId: batch.id,
    eventType: "BATCH_CREATED",
    message:
      "300-record Razorpay reconciliation demo batch created.",
    metadata: JSON.stringify({
      totalTransactions: TOTAL_TRANSACTIONS,
      scenarios: {
        exactMatches: 210,
        amountMismatch: 30,
        missingPayment: 15,
        refunds: 15,
        settlementMismatch: 15,
        duplicates: 15,
      },
    }),
  });

  console.log("");
  console.log("======================================");
  console.log(" Demo seed complete");
  console.log("======================================");
  console.log("");
  console.log(`Batch ID:        ${batch.id}`);
  console.log(`Source File ID:  ${sourceFile.id}`);
  console.log("");
  console.log("Dataset:");
  console.log("  Exact matches:       210");
  console.log("  Amount mismatches:    30");
  console.log("  Missing payments:     15");
  console.log("  Refund cases:         15");
  console.log("  Settlement issues:    15");
  console.log("  Duplicate cases:      15");
  console.log("");
  console.log(
    `Total transactions:   ${TOTAL_TRANSACTIONS}`,
  );
  console.log("");
  console.log(
    "Next: run reconciliation against this batch.",
  );
}

seed()
  .catch((error) => {
    console.error("");
    console.error("Demo seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$client.end();
  });