import type { InferSelectModel } from "drizzle-orm";

import {
    razorpayPayments,
    razorpaySettlementRecons,
} from "../../db/schema/razorpay.schema.js";

type RazorpayPayment = InferSelectModel<typeof razorpayPayments>;
type RazorpaySettlementRecon = InferSelectModel<
    typeof razorpaySettlementRecons
>;

export type PaymentSettlementReconStatus =
    | "MATCHED"
    | "NO_MATCH"
    | "REVIEW_REQUIRED";

export type PaymentSettlementReconCheckResult = "PASS" | "FAIL";

export interface PaymentSettlementReconEvidence {
    field: string;
    result: PaymentSettlementReconCheckResult;
    sourceValue: string | null;
    candidateValue: string | null;
    explanation: string;
}

export interface PaymentSettlementReconResult {
    status: PaymentSettlementReconStatus;
    evidence: PaymentSettlementReconEvidence[];
}

function check(
    field: string,
    sourceValue: string | null,
    candidateValue: string | null,
    matches: boolean,
    explanation: string,
): PaymentSettlementReconEvidence {
    return {
        field,
        result: matches ? "PASS" : "FAIL",
        sourceValue,
        candidateValue,
        explanation,
    };
}

export function reconcilePaymentSettlementRecon(
    payment: RazorpayPayment,
    settlementRecon: RazorpaySettlementRecon,
): PaymentSettlementReconResult {
    const evidence: PaymentSettlementReconEvidence[] = [];

    // Native Razorpay relationship:
    // SettlementRecon.payment_id must point to the expected payment.
    const paymentIdMatches =
        settlementRecon.paymentId !== null &&
        settlementRecon.paymentId === payment.id;

    evidence.push(
        check(
            "payment_id",
            payment.id,
            settlementRecon.paymentId,
            paymentIdMatches,
            paymentIdMatches
                ? "Settlement reconciliation is linked to the expected Razorpay payment."
                : "Settlement reconciliation is not linked to the expected Razorpay payment.",
        ),
    );

    // Settlement reconciliation amount must agree with the payment amount
    // for this core relationship check.
    const amountMatches = settlementRecon.amount === payment.amount;

    evidence.push(
        check(
            "amount",
            payment.amount,
            settlementRecon.amount,
            amountMatches,
            amountMatches
                ? "Settlement reconciliation amount matches the payment amount."
                : "Settlement reconciliation amount does not match the payment amount.",
        ),
    );

    // Currency must agree.
    const currencyMatches =
        settlementRecon.currency.toUpperCase() === payment.currency.toUpperCase();

    evidence.push(
        check(
            "currency",
            payment.currency,
            settlementRecon.currency,
            currencyMatches,
            currencyMatches
                ? "Settlement reconciliation currency matches the payment currency."
                : "Settlement reconciliation currency does not match the payment currency.",
        ),
    );

    const nativeRelationshipPassed = paymentIdMatches;
    const financialFieldsPassed = amountMatches && currencyMatches;

    if (!nativeRelationshipPassed) {
        return {
            status: "NO_MATCH",
            evidence,
        };
    }

    if (!financialFieldsPassed) {
        return {
            status: "NO_MATCH",
            evidence,
        };
    }

    return {
        status: "MATCHED",
        evidence,
    };
}