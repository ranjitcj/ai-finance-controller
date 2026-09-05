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

function isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        value,
    );
}

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
 * External Razorpay IDs such as:
 *   order_xxx
 *   pay_xxx
 *   rfnd_xxx
 *   setl_xxx
 *
 * are resolved through their external_id fields before
 * querying UUID foreign-key relationships.
 *
 * Internal UUIDs are only used against UUID columns when
 * the supplied value is actually a valid UUID.
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

    if (input.id && isUuid(input.id)) {
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

    if (input.id && isUuid(input.id)) {
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
     *
     * input.orderId may be:
     *
     *   order_xxx
     *      OR
     *   internal UUID
     *
     * Never pass order_xxx directly into payments.orderId,
     * because payments.orderId is a UUID foreign key.
     */
    if (input.orderId) {
        let orders = await db
            .select()
            .from(razorpayOrders)
            .where(
                input.batchId
                    ? and(
                        eq(
                            razorpayOrders.externalId,
                            input.orderId,
                        ),
                        eq(
                            razorpayOrders.batchId,
                            input.batchId,
                        ),
                    )
                    : eq(
                        razorpayOrders.externalId,
                        input.orderId,
                    ),
            );

        /*
         * If the caller supplied an internal order UUID,
         * resolve it through the primary key.
         *
         * IMPORTANT:
         * Only execute this query when the value is actually
         * a UUID. This prevents PostgreSQL 22P02 errors.
         */
        if (
            orders.length === 0 &&
            isUuid(input.orderId)
        ) {
            orders = await db
                .select()
                .from(razorpayOrders)
                .where(
                    eq(
                        razorpayOrders.id,
                        input.orderId,
                    ),
                );
        }

        for (const order of orders) {
            const payments = await db
                .select()
                .from(razorpayPayments)
                .where(
                    eq(
                        razorpayPayments.orderId,
                        order.id,
                    ),
                );

            for (const payment of payments) {
                candidates.push({
                    entityType: "PAYMENT",
                    record: payment,
                    matchType: "NATIVE_RELATIONSHIP",
                    matchField: "order_id",
                });
            }
        }
    }

    /*
     * -------------------------------------------------------------
     * REFUND
     * -------------------------------------------------------------
     */

    if (input.id && isUuid(input.id)) {
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
     * input.paymentId may be:
     *
     *   pay_xxx
     *      OR
     *   internal payment UUID
     *
     * Resolve external ID → internal payment UUID first.
     */
    if (input.paymentId) {
        let payments = await db
            .select()
            .from(razorpayPayments)
            .where(
                input.batchId
                    ? and(
                        eq(
                            razorpayPayments.externalId,
                            input.paymentId,
                        ),
                        eq(
                            razorpayPayments.batchId,
                            input.batchId,
                        ),
                    )
                    : eq(
                        razorpayPayments.externalId,
                        input.paymentId,
                    ),
            );

        if (
            payments.length === 0 &&
            isUuid(input.paymentId)
        ) {
            payments = await db
                .select()
                .from(razorpayPayments)
                .where(
                    eq(
                        razorpayPayments.id,
                        input.paymentId,
                    ),
                );
        }

        for (const payment of payments) {
            const refunds = await db
                .select()
                .from(razorpayRefunds)
                .where(
                    eq(
                        razorpayRefunds.paymentId,
                        payment.id,
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
    }

    /*
     * -------------------------------------------------------------
     * SETTLEMENT RECONCILIATION
     * -------------------------------------------------------------
     */

    if (input.id && isUuid(input.id)) {
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
     *
     * input.paymentId may be either a Razorpay external ID
     * or an internal payment UUID.
     */
    if (input.paymentId) {
        let payments = await db
            .select()
            .from(razorpayPayments)
            .where(
                input.batchId
                    ? and(
                        eq(
                            razorpayPayments.externalId,
                            input.paymentId,
                        ),
                        eq(
                            razorpayPayments.batchId,
                            input.batchId,
                        ),
                    )
                    : eq(
                        razorpayPayments.externalId,
                        input.paymentId,
                    ),
            );

        if (
            payments.length === 0 &&
            isUuid(input.paymentId)
        ) {
            payments = await db
                .select()
                .from(razorpayPayments)
                .where(
                    eq(
                        razorpayPayments.id,
                        input.paymentId,
                    ),
                );
        }

        for (const payment of payments) {
            const settlementRecons = await db
                .select()
                .from(razorpaySettlementRecons)
                .where(
                    eq(
                        razorpaySettlementRecons.paymentId,
                        payment.id,
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
    }

    /*
     * Refund → SettlementRecon.
     *
     * input.refundId may be either a Razorpay external refund ID
     * or an internal refund UUID.
     */
    if (input.refundId) {
        let refunds = await db
            .select()
            .from(razorpayRefunds)
            .where(
                input.batchId
                    ? and(
                        eq(
                            razorpayRefunds.externalId,
                            input.refundId,
                        ),
                        eq(
                            razorpayRefunds.batchId,
                            input.batchId,
                        ),
                    )
                    : eq(
                        razorpayRefunds.externalId,
                        input.refundId,
                    ),
            );

        if (
            refunds.length === 0 &&
            isUuid(input.refundId)
        ) {
            refunds = await db
                .select()
                .from(razorpayRefunds)
                .where(
                    eq(
                        razorpayRefunds.id,
                        input.refundId,
                    ),
                );
        }

        for (const refund of refunds) {
            const settlementRecons = await db
                .select()
                .from(razorpaySettlementRecons)
                .where(
                    eq(
                        razorpaySettlementRecons.refundId,
                        refund.id,
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
    }

    /*
     * -------------------------------------------------------------
     * SETTLEMENT
     * -------------------------------------------------------------
     */

    if (input.id && isUuid(input.id)) {
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
     * SettlementRecon → Settlement relationship.
     *
     * input.settlementId may be either:
     *
     * 1. Razorpay external settlement ID:
     *      setl_xxxxxxxxx
     *
     * 2. Internal database settlement UUID:
     *      550e8400-e29b-41d4-a716-446655440000
     *
     * Resolve the identifier to the internal settlement record
     * before querying settlement-recon relationships.
     */
    if (input.settlementId) {
        let settlements: RazorpaySettlement[] = [];

        /*
         * First try Razorpay external ID.
         *
         * This supports AI/tool input such as:
         *   setl_xxxxxxxxx
         */
        if (!isUuid(input.settlementId)) {
            settlements = await db
                .select()
                .from(razorpaySettlements)
                .where(
                    input.batchId
                        ? and(
                            eq(
                                razorpaySettlements.externalId,
                                input.settlementId,
                            ),
                            eq(
                                razorpaySettlements.batchId,
                                input.batchId,
                            ),
                        )
                        : eq(
                            razorpaySettlements.externalId,
                            input.settlementId,
                        ),
                );
        }

        /*
         * If the caller supplied an internal UUID, query the
         * primary key directly.
         */
        if (
            settlements.length === 0 &&
            isUuid(input.settlementId)
        ) {
            settlements = await db
                .select()
                .from(razorpaySettlements)
                .where(
                    eq(
                        razorpaySettlements.id,
                        input.settlementId,
                    ),
                );
        }

        /*
         * Settlement itself is a candidate reached through
         * the SettlementRecon → Settlement relationship.
         */
        for (const settlement of settlements) {
            candidates.push({
                entityType: "SETTLEMENT",
                record: settlement,
                matchType: "NATIVE_RELATIONSHIP",
                matchField: "settlement_id",
            });
        }

        /*
         * Now use the resolved internal UUID to find the
         * corresponding settlement reconciliation records.
         */
        for (const settlement of settlements) {
            const settlementRecons = await db
                .select()
                .from(razorpaySettlementRecons)
                .where(
                    eq(
                        razorpaySettlementRecons.settlementId,
                        settlement.id,
                    ),
                );

            for (const settlementRecon of settlementRecons) {
                candidates.push({
                    entityType: "SETTLEMENT_RECON",
                    record: settlementRecon,
                    matchType: "NATIVE_RELATIONSHIP",
                    matchField: "settlement_id",
                });
            }
        }
    }

    return candidates;
}