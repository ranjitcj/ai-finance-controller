import { db } from "../client.js";
import type { DbTransaction } from "../transaction.js";
import {
    razorpayOrders,
    razorpayPayments,
    razorpayRefunds,
    razorpaySettlements,
    razorpaySettlementRecons,
} from "../schema/razorpay.schema.js";

import type {
    RazorpayOrder,
    RazorpayPayment,
    RazorpayRefund,
    RazorpaySettlement,
    RazorpaySettlementRecon,
} from "../../ingestion/razorpay/razorpay.schemas.js";

type DbExecutor = typeof db | DbTransaction;

function mapOrderStatus(
    status: string,
): "CREATED" | "ATTEMPTED" | "PAID" | "UNKNOWN" {
    switch (status.toUpperCase()) {
        case "CREATED":
            return "CREATED";
        case "ATTEMPTED":
            return "ATTEMPTED";
        case "PAID":
            return "PAID";
        default:
            return "UNKNOWN";
    }
}

function mapPaymentStatus(
    status: string,
):
    | "CREATED"
    | "AUTHORIZED"
    | "CAPTURED"
    | "REFUNDED"
    | "FAILED"
    | "UNKNOWN" {
    switch (status.toUpperCase()) {
        case "CREATED":
            return "CREATED";
        case "AUTHORIZED":
            return "AUTHORIZED";
        case "CAPTURED":
            return "CAPTURED";
        case "REFUNDED":
            return "REFUNDED";
        case "FAILED":
            return "FAILED";
        default:
            return "UNKNOWN";
    }
}

function mapRefundStatus(
    status: string,
): "PENDING" | "PROCESSED" | "FAILED" | "UNKNOWN" {
    switch (status.toUpperCase()) {
        case "PENDING":
            return "PENDING";
        case "PROCESSED":
            return "PROCESSED";
        case "FAILED":
            return "FAILED";
        default:
            return "UNKNOWN";
    }
}

function mapSettlementStatus(
    status: string,
): "CREATED" | "PROCESSED" | "FAILED" | "UNKNOWN" {
    switch (status.toUpperCase()) {
        case "CREATED":
            return "CREATED";
        case "PROCESSED":
            return "PROCESSED";
        case "FAILED":
            return "FAILED";
        default:
            return "UNKNOWN";
    }
}

function timestampToDate(
    timestamp?: number,
): Date | undefined {
    if (timestamp === undefined) {
        return undefined;
    }

    const date = new Date(timestamp * 1000);

    if (Number.isNaN(date.getTime())) {
        throw new Error(
            "Razorpay resource contains an invalid created_at",
        );
    }

    return date;
}

export async function persistRazorpayOrders(
    batchId: string,
    sourceFileId: string,
    orders: RazorpayOrder[],
    executor: DbExecutor = db,
) {
    if (orders.length === 0) {
        return [];
    }

    return executor
        .insert(razorpayOrders)
        .values(
            orders.map((order) => ({
                externalId: order.id,
                batchId,
                sourceFileId,
                amount: (order.amount / 100).toFixed(2),
                currency: order.currency.toUpperCase(),
                status: mapOrderStatus(order.status),
                sourceCreatedAt: timestampToDate(
                    order.created_at,
                ),
                rawPayload: order,
            })),
        )
        .onConflictDoNothing({
            target: razorpayOrders.externalId,
        })
        .returning();
}

export async function persistRazorpayPayments(
    batchId: string,
    sourceFileId: string,
    payments: RazorpayPayment[],
    executor: DbExecutor = db,
) {
    if (payments.length === 0) {
        return [];
    }

    const existingOrders = await executor
        .select({
            id: razorpayOrders.id,
            externalId: razorpayOrders.externalId,
        })
        .from(razorpayOrders);

    const orderIdByExternalId = new Map(
        existingOrders.map((order) => [
            order.externalId,
            order.id,
        ]),
    );

    return executor
        .insert(razorpayPayments)
        .values(
            payments.map((payment) => ({
                externalId: payment.id,
                orderId: payment.order_id
                    ? orderIdByExternalId.get(
                        payment.order_id,
                    ) ?? null
                    : null,
                batchId,
                sourceFileId,
                amount: (payment.amount / 100).toFixed(2),
                currency: payment.currency.toUpperCase(),
                status: mapPaymentStatus(payment.status),
                sourceCreatedAt: timestampToDate(
                    payment.created_at,
                ),
                rawPayload: payment,
            })),
        )
        .onConflictDoNothing({
            target: razorpayPayments.externalId,
        })
        .returning();
}

export async function persistRazorpayRefunds(
    batchId: string,
    sourceFileId: string,
    refunds: RazorpayRefund[],
    executor: DbExecutor = db,
) {
    if (refunds.length === 0) {
        return [];
    }

    const existingPayments = await executor
        .select({
            id: razorpayPayments.id,
            externalId: razorpayPayments.externalId,
        })
        .from(razorpayPayments);

    const paymentIdByExternalId = new Map(
        existingPayments.map((payment) => [
            payment.externalId,
            payment.id,
        ]),
    );

    const values = refunds.map((refund) => {
        const paymentId =
            paymentIdByExternalId.get(
                refund.payment_id,
            );

        if (!paymentId) {
            throw new Error(
                `Cannot persist refund ${refund.id}: payment ${refund.payment_id} was not found`,
            );
        }

        return {
            externalId: refund.id,
            paymentId,
            batchId,
            sourceFileId,
            amount: (refund.amount / 100).toFixed(2),
            currency: refund.currency.toUpperCase(),
            status: mapRefundStatus(refund.status),
            sourceCreatedAt: timestampToDate(
                refund.created_at,
            ),
            rawPayload: refund,
        };
    });

    return executor
        .insert(razorpayRefunds)
        .values(values)
        .onConflictDoNothing({
            target: razorpayRefunds.externalId,
        })
        .returning();
}

export async function persistRazorpaySettlements(
    batchId: string,
    sourceFileId: string,
    settlements: RazorpaySettlement[],
    executor: DbExecutor = db,
) {
    if (settlements.length === 0) {
        return [];
    }

    return executor
        .insert(razorpaySettlements)
        .values(
            settlements.map((settlement) => ({
                externalId: settlement.id,
                batchId,
                sourceFileId,
                amount: (
                    settlement.amount / 100
                ).toFixed(2),
                currency: "INR",
                status: mapSettlementStatus(
                    settlement.status,
                ),
                sourceCreatedAt: timestampToDate(
                    settlement.created_at,
                ),
                rawPayload: settlement,
            })),
        )
        .onConflictDoNothing({
            target: razorpaySettlements.externalId,
        })
        .returning();
}

export async function persistRazorpaySettlementRecons(
    batchId: string,
    sourceFileId: string,
    settlementRecons: RazorpaySettlementRecon[],
    executor: DbExecutor = db,
) {
    if (settlementRecons.length === 0) {
        return [];
    }

    const [existingPayments, existingRefunds, existingSettlements] =
        await Promise.all([
            executor
                .select({
                    id: razorpayPayments.id,
                    externalId: razorpayPayments.externalId,
                })
                .from(razorpayPayments),

            executor
                .select({
                    id: razorpayRefunds.id,
                    externalId: razorpayRefunds.externalId,
                })
                .from(razorpayRefunds),

            executor
                .select({
                    id: razorpaySettlements.id,
                    externalId: razorpaySettlements.externalId,
                })
                .from(razorpaySettlements),
        ]);

    const paymentIdByExternalId = new Map(
        existingPayments.map((payment) => [
            payment.externalId,
            payment.id,
        ]),
    );

    const refundIdByExternalId = new Map(
        existingRefunds.map((refund) => [
            refund.externalId,
            refund.id,
        ]),
    );

    const settlementIdByExternalId = new Map(
        existingSettlements.map((settlement) => [
            settlement.externalId,
            settlement.id,
        ]),
    );

    const values = settlementRecons.map((recon) => {
        if (
            recon.amount === undefined ||
            recon.currency === undefined
        ) {
            throw new Error(
                `Settlement reconciliation ${recon.id} is missing amount or currency`,
            );
        }

        const raw = recon as RazorpaySettlementRecon & {
            payment_id?: string;
            refund_id?: string;
            settlement_id?: string;
        };

        return {
            externalId: recon.id,
            paymentId: raw.payment_id
                ? paymentIdByExternalId.get(raw.payment_id) ?? null
                : null,
            refundId: raw.refund_id
                ? refundIdByExternalId.get(raw.refund_id) ?? null
                : null,
            settlementId: raw.settlement_id
                ? settlementIdByExternalId.get(raw.settlement_id) ?? null
                : null,
            batchId,
            sourceFileId,
            amount: (recon.amount / 100).toFixed(2),
            currency: recon.currency.toUpperCase(),
            rawPayload: recon,
        };
    });

    return executor
        .insert(razorpaySettlementRecons)
        .values(values)
        .onConflictDoNothing({
            target: razorpaySettlementRecons.externalId,
        })
        .returning();
}