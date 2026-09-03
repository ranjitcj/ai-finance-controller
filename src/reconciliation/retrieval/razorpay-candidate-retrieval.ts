import type { InferSelectModel } from "drizzle-orm";
import { and, eq } from "drizzle-orm";

import { db } from "../../db/client.js";
import {
    razorpayOrders,
    razorpayPayments,
    razorpayRefunds,
    razorpaySettlementRecons,
    razorpaySettlements,
} from "../../db/schema/razorpay.schema.js";

type RazorpayOrder = InferSelectModel<typeof razorpayOrders>;
type RazorpayPayment = InferSelectModel<typeof razorpayPayments>;
type RazorpayRefund = InferSelectModel<typeof razorpayRefunds>;
type RazorpaySettlementRecon = InferSelectModel<
    typeof razorpaySettlementRecons
>;
type RazorpaySettlement = InferSelectModel<
    typeof razorpaySettlements
>;

export type RazorpayCandidateEntity =
    | "ORDER"
    | "PAYMENT"
    | "REFUND"
    | "SETTLEMENT_RECON"
    | "SETTLEMENT";

export type RazorpayCandidate =
    | RazorpayOrderCandidate
    | RazorpayPaymentCandidate
    | RazorpayRefundCandidate
    | RazorpaySettlementReconCandidate
    | RazorpaySettlementCandidate;

export interface RazorpayOrderCandidate {
    entityType: "ORDER";
    record: RazorpayOrder;
    matchType: "NATIVE_ID";
    matchField: "id" | "external_id";
}

export interface RazorpayPaymentCandidate {
    entityType: "PAYMENT";
    record: RazorpayPayment;
    matchType: "NATIVE_ID" | "NATIVE_RELATIONSHIP";
    matchField: "id" | "external_id" | "order_id";
}

export interface RazorpayRefundCandidate {
    entityType: "REFUND";
    record: RazorpayRefund;
    matchType: "NATIVE_ID" | "NATIVE_RELATIONSHIP";
    matchField: "id" | "external_id" | "payment_id";
}

export interface RazorpaySettlementReconCandidate {
    entityType: "SETTLEMENT_RECON";
    record: RazorpaySettlementRecon;
    matchType: "NATIVE_ID" | "NATIVE_RELATIONSHIP";
    matchField:
        | "id"
        | "external_id"
        | "payment_id"
        | "refund_id"
        | "settlement_id";
}

export interface RazorpaySettlementCandidate {
    entityType: "SETTLEMENT";
    record: RazorpaySettlement;
    matchType: "NATIVE_ID" | "NATIVE_RELATIONSHIP";
    matchField: "id" | "external_id" | "settlement_id";
}

export interface RazorpayCandidateSearchInput {
    id?: string;
    externalId?: string;
    orderId?: string;
    paymentId?: string;
    refundId?: string;
    settlementId?: string;
    batchId?: string;
}

/**
 * Find Razorpay-native candidates.
 *
 * Native IDs and persisted Razorpay relationships always take
 * priority over generic amount/date/reference matching.
 *
 * This layer only retrieves candidates.
 *
 * It does NOT:
 * - perform fuzzy matching,
 * - calculate a reconciliation decision,
 * - invoke the AI model,
 * - override Decision Policy.
 */
export async function findRazorpayCandidates(
    input: RazorpayCandidateSearchInput,
): Promise<RazorpayCandidate[]> {
    const candidates: RazorpayCandidate[] = [];

    /*
     * -------------------------------------------------------------
     * ORDER
     * -------------------------------------------------------------
     */

    if (input.id) {
        const orders = await db
            .select()
            .from(razorpayOrders)
            .where(eq(razorpayOrders.id, input.id));

        for (const order of orders) {
            candidates.push({
                entityType: "ORDER",
                record: order,
                matchType: "NATIVE_ID",
                matchField: "id",
            });
        }
    }

    if (input.externalId) {
        const orders = await db
            .select()
            .from(razorpayOrders)
            .where(
                input.batchId
                    ? and(
                          eq(
                              razorpayOrders.externalId,
                              input.externalId,
                          ),
                          eq(
                              razorpayOrders.batchId,
                              input.batchId,
                          ),
                      )
                    : eq(
                          razorpayOrders.externalId,
                          input.externalId,
                      ),
            );

        for (const order of orders) {
            candidates.push({
                entityType: "ORDER",
                record: order,
                matchType: "NATIVE_ID",
                matchField: "external_id",
            });
        }
    }

    /*
     * -------------------------------------------------------------
     * PAYMENT
     * -------------------------------------------------------------
     */

    if (input.id) {
        const payments = await db
            .select()
            .from(razorpayPayments)
            .where(eq(razorpayPayments.id, input.id));

        for (const payment of payments) {
            candidates.push({
                entityType: "PAYMENT",
                record: payment,
                matchType: "NATIVE_ID",
                matchField: "id",
            });
        }
    }

    if (input.externalId) {
        const payments = await db
            .select()
            .from(razorpayPayments)
            .where(
                input.batchId
                    ? and(
                          eq(
                              razorpayPayments.externalId,
                              input.externalId,
                          ),
                          eq(
                              razorpayPayments.batchId,
                              input.batchId,
                          ),
                      )
                    : eq(
                          razorpayPayments.externalId,
                          input.externalId,
                      ),
            );

        for (const payment of payments) {
            candidates.push({
                entityType: "PAYMENT",
                record: payment,
                matchType: "NATIVE_ID",
                matchField: "external_id",
            });
        }
    }

    /*
     * Payment → Order relationship.
     */
    if (input.orderId) {
        const payments = await db
            .select()
            .from(razorpayPayments)
            .where(eq(razorpayPayments.orderId, input.orderId));

        for (const payment of payments) {
            candidates.push({
                entityType: "PAYMENT",
                record: payment,
                matchType: "NATIVE_RELATIONSHIP",
                matchField: "order_id",
            });
        }
    }

    /*
     * -------------------------------------------------------------
     * REFUND
     * -------------------------------------------------------------
     */

    if (input.id) {
        const refunds = await db
            .select()
            .from(razorpayRefunds)
            .where(eq(razorpayRefunds.id, input.id));

        for (const refund of refunds) {
            candidates.push({
                entityType: "REFUND",
                record: refund,
                matchType: "NATIVE_ID",
                matchField: "id",
            });
        }
    }

    if (input.externalId) {
        const refunds = await db
            .select()
            .from(razorpayRefunds)
            .where(
                input.batchId
                    ? and(
                          eq(
                              razorpayRefunds.externalId,
                              input.externalId,
                          ),
                          eq(
                              razorpayRefunds.batchId,
                              input.batchId,
                          ),
                      )
                    : eq(
                          razorpayRefunds.externalId,
                          input.externalId,
                      ),
            );

        for (const refund of refunds) {
            candidates.push({
                entityType: "REFUND",
                record: refund,
                matchType: "NATIVE_ID",
                matchField: "external_id",
            });
        }
    }

    /*
     * Payment → Refund relationship.
     *
     * One payment may have multiple refunds.
     */
    if (input.paymentId) {
        const refunds = await db
            .select()
            .from(razorpayRefunds)
            .where(
                eq(
                    razorpayRefunds.paymentId,
                    input.paymentId,
                ),
            );

        for (const refund of refunds) {
            candidates.push({
                entityType: "REFUND",
                record: refund,
                matchType: "NATIVE_RELATIONSHIP",
                matchField: "payment_id",
            });
        }
    }

    /*
     * -------------------------------------------------------------
     * SETTLEMENT RECONCILIATION
     * -------------------------------------------------------------
     */

    if (input.id) {
        const settlementRecons = await db
            .select()
            .from(razorpaySettlementRecons)
            .where(
                eq(
                    razorpaySettlementRecons.id,
                    input.id,
                ),
            );

        for (const settlementRecon of settlementRecons) {
            candidates.push({
                entityType: "SETTLEMENT_RECON",
                record: settlementRecon,
                matchType: "NATIVE_ID",
                matchField: "id",
            });
        }
    }

    if (input.externalId) {
        const settlementRecons = await db
            .select()
            .from(razorpaySettlementRecons)
            .where(
                input.batchId
                    ? and(
                          eq(
                              razorpaySettlementRecons.externalId,
                              input.externalId,
                          ),
                          eq(
                              razorpaySettlementRecons.batchId,
                              input.batchId,
                          ),
                      )
                    : eq(
                          razorpaySettlementRecons.externalId,
                          input.externalId,
                      ),
            );

        for (const settlementRecon of settlementRecons) {
            candidates.push({
                entityType: "SETTLEMENT_RECON",
                record: settlementRecon,
                matchType: "NATIVE_ID",
                matchField: "external_id",
            });
        }
    }

    /*
     * Payment → SettlementRecon.
     */
    if (input.paymentId) {
        const settlementRecons = await db
            .select()
            .from(razorpaySettlementRecons)
            .where(
                eq(
                    razorpaySettlementRecons.paymentId,
                    input.paymentId,
                ),
            );

        for (const settlementRecon of settlementRecons) {
            candidates.push({
                entityType: "SETTLEMENT_RECON",
                record: settlementRecon,
                matchType: "NATIVE_RELATIONSHIP",
                matchField: "payment_id",
            });
        }
    }

    /*
     * Refund → SettlementRecon.
     */
    if (input.refundId) {
        const settlementRecons = await db
            .select()
            .from(razorpaySettlementRecons)
            .where(
                eq(
                    razorpaySettlementRecons.refundId,
                    input.refundId,
                ),
            );

        for (const settlementRecon of settlementRecons) {
            candidates.push({
                entityType: "SETTLEMENT_RECON",
                record: settlementRecon,
                matchType: "NATIVE_RELATIONSHIP",
                matchField: "refund_id",
            });
        }
    }

    /*
     * -------------------------------------------------------------
     * SETTLEMENT
     * -------------------------------------------------------------
     */

    if (input.id) {
        const settlements = await db
            .select()
            .from(razorpaySettlements)
            .where(eq(razorpaySettlements.id, input.id));

        for (const settlement of settlements) {
            candidates.push({
                entityType: "SETTLEMENT",
                record: settlement,
                matchType: "NATIVE_ID",
                matchField: "id",
            });
        }
    }

    if (input.externalId) {
        const settlements = await db
            .select()
            .from(razorpaySettlements)
            .where(
                input.batchId
                    ? and(
                          eq(
                              razorpaySettlements.externalId,
                              input.externalId,
                          ),
                          eq(
                              razorpaySettlements.batchId,
                              input.batchId,
                          ),
                      )
                    : eq(
                          razorpaySettlements.externalId,
                          input.externalId,
                      ),
            );

        for (const settlement of settlements) {
            candidates.push({
                entityType: "SETTLEMENT",
                record: settlement,
                matchType: "NATIVE_ID",
                matchField: "external_id",
            });
        }
    }

    /*
     * SettlementRecon → Settlement.
     */
    if (input.settlementId) {
        const settlements = await db
            .select()
            .from(razorpaySettlements)
            .where(
                eq(
                    razorpaySettlements.id,
                    input.settlementId,
                ),
            );

        for (const settlement of settlements) {
            candidates.push({
                entityType: "SETTLEMENT",
                record: settlement,
                matchType: "NATIVE_RELATIONSHIP",
                matchField: "settlement_id",
            });
        }
    }

    return candidates;
}