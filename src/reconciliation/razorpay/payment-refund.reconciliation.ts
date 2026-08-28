import type { InferSelectModel } from "drizzle-orm";

import {
    razorpayPayments,
    razorpayRefunds,
} from "../../db/schema/razorpay.schema.js";

type RazorpayPayment = InferSelectModel<typeof razorpayPayments>;
type RazorpayRefund = InferSelectModel<typeof razorpayRefunds>;

export type RazorpayCheckResult = "PASS" | "FAIL";

export type RazorpayPaymentRefundStatus =
    | "MATCHED"
    | "NO_MATCH"
    | "REVIEW_REQUIRED";

export interface RazorpayEvidence {
    field: string;
    result: RazorpayCheckResult;
    sourceValue: string | null;
    candidateValue: string | null;
    explanation: string;
}

export interface PaymentRefundAggregationResult {
    refundTotal: string;
    remainingAmount: string;
    fullyRefunded: boolean;
}

export interface PaymentRefundReconciliationResult {
    status: RazorpayPaymentRefundStatus;
    evidence: RazorpayEvidence[];
    refundTotal: string;
    remainingAmount: string;
    fullyRefunded: boolean;
}

function check(
    field: string,
    sourceValue: string | null,
    candidateValue: string | null,
    matches: boolean,
    explanation: string,
): RazorpayEvidence {
    return {
        field,
        result: matches ? "PASS" : "FAIL",
        sourceValue,
        candidateValue,
        explanation,
    };
}

function toAmount(value: string): number {
    const amount = Number(value);

    if (!Number.isFinite(amount)) {
        throw new Error(`Invalid monetary amount: ${value}`);
    }

    return amount;
}

function formatAmount(value: number): string {
    return value.toFixed(2);
}

function isProcessedRefund(refund: RazorpayRefund): boolean {
    return refund.status === "PROCESSED";
}

/**
 * Aggregate all processed refunds belonging to a payment.
 *
 * Failed refunds are ignored because they do not represent completed
 * financial movement.
 */
export function aggregatePaymentRefunds(
    payment: RazorpayPayment,
    refunds: RazorpayRefund[],
): PaymentRefundAggregationResult {
    const paymentAmount = toAmount(payment.amount);

    const refundTotalNumber = refunds
        .filter(isProcessedRefund)
        .reduce((total, refund) => total + toAmount(refund.amount), 0);

    const refundTotal = formatAmount(refundTotalNumber);

    const remainingAmount = formatAmount(
        Math.max(paymentAmount - refundTotalNumber, 0),
    );

    return {
        refundTotal,
        remainingAmount,
        fullyRefunded: refundTotalNumber === paymentAmount,
    };
}

/**
 * Reconcile one Razorpay payment against one or more refunds.
 *
 * A payment may have multiple partial refunds, so the function accepts
 * either a single refund or an array.
 */
export function reconcilePaymentRefund(
    payment: RazorpayPayment,
    refund: RazorpayRefund | RazorpayRefund[],
): PaymentRefundReconciliationResult {
    const refunds = Array.isArray(refund) ? refund : [refund];

    return reconcilePaymentRefunds(payment, refunds);
}

export function reconcilePaymentRefunds(
    payment: RazorpayPayment,
    refunds: RazorpayRefund[],
): PaymentRefundReconciliationResult {
    /*
     * Keep the empty case explicit so TypeScript knows that refunds[0]
     * exists after this point.
     */
    if (refunds.length === 0) {
        const paymentAmount = toAmount(payment.amount);

        return {
            status: "NO_MATCH",
            evidence: [
                {
                    field: "refund",
                    result: "FAIL",
                    sourceValue: payment.id,
                    candidateValue: null,
                    explanation: "No refund was provided for reconciliation.",
                },
            ],
            refundTotal: "0.00",
            remainingAmount: formatAmount(paymentAmount),
            fullyRefunded: false,
        };
    }

    const refund = refunds[0]!;

    /*
     * Native Payment → Refund relationship.
     */
    const paymentRelationshipMatches =
        refund.paymentId !== null && refund.paymentId === payment.id;

    const evidence: RazorpayEvidence[] = [];

    evidence.push(
        check(
            "payment_id",
            payment.id,
            refund.paymentId,
            paymentRelationshipMatches,
            paymentRelationshipMatches
                ? "Refund is linked to the expected Razorpay payment."
                : "Refund is not linked to the expected Razorpay payment.",
        ),
    );

    /*
     * Individual refund amount must not exceed the payment amount.
     */
    const paymentAmount = toAmount(payment.amount);
    const refundAmount = toAmount(refund.amount);

    const refundAmountMatches = refundAmount <= paymentAmount;

    evidence.push(
        check(
            "amount",
            payment.amount,
            refund.amount,
            refundAmountMatches,
            refundAmountMatches
                ? "Refund amount does not exceed the payment amount."
                : "Refund amount exceeds the payment amount.",
        ),
    );

    /*
     * Currency validation.
     */
    const currencyMatches =
        refund.currency.toUpperCase() === payment.currency.toUpperCase();

    evidence.push(
        check(
            "currency",
            payment.currency,
            refund.currency,
            currencyMatches,
            currencyMatches
                ? "Refund currency matches the payment currency."
                : "Refund currency does not match the payment currency.",
        ),
    );

    /*
     * Aggregate all processed refunds.
     */
    const aggregation = aggregatePaymentRefunds(payment, refunds);

    /*
     * Refund status.
     *
     * PENDING and UNKNOWN are not finalized financial states.
     */
    const processed = refund.status === "PROCESSED";

    evidence.push(
        check(
            "refund_status",
            "PROCESSED",
            refund.status,
            processed,
            processed
                ? "Refund has reached the processed state."
                : refund.status === "PENDING"
                    ? "Refund is still pending and requires review."
                    : "Refund status is not finalized and requires review.",
        ),
    );

    /*
     * Deterministic failures take precedence over review.
     */
    const hasDeterministicFailure =
        !paymentRelationshipMatches ||
        !refundAmountMatches ||
        !currencyMatches;

    let status: RazorpayPaymentRefundStatus;

    if (hasDeterministicFailure) {
        status = "NO_MATCH";
    } else if (!processed) {
        status = "REVIEW_REQUIRED";
    } else {
        status = "MATCHED";
    }

    return {
        status,
        evidence,
        refundTotal: aggregation.refundTotal,
        remainingAmount: aggregation.remainingAmount,
        fullyRefunded: aggregation.fullyRefunded,
    };
}