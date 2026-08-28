import type { RawTransaction } from "../../domain/transaction/transaction.schema.js";

import type {
    RazorpayOrder,
    RazorpayPayment,
    RazorpayRefund,
    RazorpaySettlement,
    RazorpaySettlementRecon,
} from "./razorpay.schemas.js";

function razorpayDate(timestamp?: number): string {
    if (timestamp === undefined) {
        throw new Error("Razorpay resource is missing created_at");
    }

    const date = new Date(timestamp * 1000);

    if (Number.isNaN(date.getTime())) {
        throw new Error("Razorpay resource has an invalid created_at");
    }

    return date.toISOString();
}

function amountToDecimal(amount: number): string {
    if (!Number.isSafeInteger(amount)) {
        throw new Error(
            "Razorpay amount must be a safe integer in paise",
        );
    }

    return (amount / 100).toFixed(2);
}

export function mapOrderToTransaction(
    order: RazorpayOrder,
): RawTransaction {
    return {
        externalId: order.id,
        amount: amountToDecimal(order.amount),
        currency: order.currency.toUpperCase(),
        date: razorpayDate(order.created_at),
        reference: order.id,
        vendor: "Razorpay",
    };
}

export function mapPaymentToTransaction(
    payment: RazorpayPayment,
): RawTransaction {
    return {
        externalId: payment.id,
        amount: amountToDecimal(payment.amount),
        currency: payment.currency.toUpperCase(),
        date: razorpayDate(payment.created_at),
        reference: payment.order_id ?? payment.id,
        vendor: "Razorpay",
    };
}

export function mapRefundToTransaction(
    refund: RazorpayRefund,
): RawTransaction {
    return {
        externalId: refund.id,
        amount: amountToDecimal(refund.amount),
        currency: refund.currency.toUpperCase(),
        date: razorpayDate(refund.created_at),
        reference: refund.payment_id,
        vendor: "Razorpay",
    };
}

export function mapSettlementToTransaction(
    settlement: RazorpaySettlement,
): RawTransaction {
    return {
        externalId: settlement.id,
        amount: amountToDecimal(settlement.amount),
        currency: "INR",
        date: razorpayDate(settlement.created_at),
        reference: settlement.id,
        vendor: "Razorpay",
    };
}

export function mapSettlementReconToTransaction(
    reconciliation: RazorpaySettlementRecon,
): RawTransaction {
    if (
        reconciliation.amount === undefined ||
        reconciliation.currency === undefined
    ) {
        throw new Error(
            "Razorpay settlement reconciliation resource is missing amount or currency",
        );
    }

    return {
        externalId: reconciliation.id,
        amount: amountToDecimal(reconciliation.amount),
        currency: reconciliation.currency.toUpperCase(),
        date: new Date().toISOString(),
        reference: reconciliation.id,
        vendor: "Razorpay",
    };
}