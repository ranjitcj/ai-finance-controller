import type { InferSelectModel } from "drizzle-orm";

import {
    razorpayOrders,
    razorpayPayments,
} from "../../db/schema/razorpay.schema.js";

type RazorpayOrder = InferSelectModel<typeof razorpayOrders>;
type RazorpayPayment = InferSelectModel<typeof razorpayPayments>;

export type RazorpayCheckResult = "PASS" | "FAIL";

export type RazorpayOrderPaymentStatus =
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

export interface OrderPaymentReconciliationResult {
    status: RazorpayOrderPaymentStatus;
    evidence: RazorpayEvidence[];
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

export function reconcileOrderPayment(
    order: RazorpayOrder,
    payment: RazorpayPayment,
): OrderPaymentReconciliationResult {
    const evidence: RazorpayEvidence[] = [];

    const orderIdMatches =
        payment.orderId !== null && payment.orderId === order.id;

    evidence.push(
        check(
            "order_id",
            order.id,
            payment.orderId,
            orderIdMatches,
            orderIdMatches
                ? "Payment is linked to the expected Razorpay order."
                : "Payment is not linked to the expected Razorpay order.",
        ),
    );

    const amountMatches = payment.amount === order.amount;

    evidence.push(
        check(
            "amount",
            order.amount,
            payment.amount,
            amountMatches,
            amountMatches
                ? "Payment amount matches the order amount."
                : "Payment amount does not match the order amount.",
        ),
    );

    const currencyMatches =
        payment.currency.toUpperCase() === order.currency.toUpperCase();

    evidence.push(
        check(
            "currency",
            order.currency,
            payment.currency,
            currencyMatches,
            currencyMatches
                ? "Payment currency matches the order currency."
                : "Payment currency does not match the order currency.",
        ),
    );

    const allPassed = evidence.every((item) => item.result === "PASS");

    return {
        status: allPassed ? "MATCHED" : "NO_MATCH",
        evidence,
    };
}