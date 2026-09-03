import type { InferSelectModel } from "drizzle-orm";

import {
  razorpayPayments,
  razorpayRefunds,
  razorpaySettlementRecons,
  razorpaySettlements,
} from "../../../db/schema/razorpay.schema.js";

import { aggregatePaymentRefunds } from "../../../reconciliation/razorpay/payment-refund.reconciliation.js";

import {
  compareFinancialField,
  createFinancialEvidence,
  type FinancialEvidence,
} from "../../../reconciliation/razorpay/financial-evidence.js";

type RazorpayPayment = InferSelectModel<typeof razorpayPayments>;
type RazorpayRefund = InferSelectModel<typeof razorpayRefunds>;
type RazorpaySettlementRecon = InferSelectModel<typeof razorpaySettlementRecons>;
type RazorpaySettlement = InferSelectModel<typeof razorpaySettlements>;

export interface ComparePaymentRefundFinancialEvidenceInput {
  payment: RazorpayPayment;
  refunds: RazorpayRefund[];
}

export interface CompareSettlementFinancialEvidenceInput {
  settlementRecon: RazorpaySettlementRecon;
  settlement: RazorpaySettlement;
}

export interface FinancialEvidenceInvestigationResult {
  evidence: FinancialEvidence[];
  allMatched: boolean;
}

/**
 * Compare financial evidence for a Razorpay payment
 * against its native refund graph.
 *
 * This is observational only.
 *
 * It does not:
 * - make a reconciliation decision,
 * - invoke Decision Policy,
 * - mutate financial state,
 * - perform fuzzy matching.
 */
export function comparePaymentRefundFinancialEvidence(
  input: ComparePaymentRefundFinancialEvidenceInput,
): FinancialEvidenceInvestigationResult {
  const { payment, refunds } = input;

  const aggregation = aggregatePaymentRefunds(payment, refunds);

  const evidence: FinancialEvidence[] = [
    compareFinancialField(
      "currency",
      payment.currency.toUpperCase(),
      refunds.length > 0 ? refunds[0]!.currency.toUpperCase() : null,
    ),

    createFinancialEvidence(
      "refund_total",
      payment.amount,
      aggregation.refundTotal,
      `Processed refund total is ${aggregation.refundTotal}.`,
    ),

    createFinancialEvidence(
      "remaining_amount",
      payment.amount,
      aggregation.remainingAmount,
      `Remaining payment amount after processed refunds is ${aggregation.remainingAmount}.`,
    ),

    createFinancialEvidence(
      "fully_refunded",
      payment.amount,
      aggregation.fullyRefunded ? "true" : "false",
      aggregation.fullyRefunded
        ? "Payment has been fully refunded."
        : "Payment has not been fully refunded.",
    ),
  ];

  return {
    evidence,
    allMatched: evidence.every((item) => item.result === "PASS"),
  };
}

/**
 * Compare financial evidence between a Razorpay
 * SettlementRecon and its native Settlement.
 *
 * Only fields actually represented by the persisted
 * Razorpay domain are compared here.
 */
export function compareSettlementFinancialEvidence(
  input: CompareSettlementFinancialEvidenceInput,
): FinancialEvidenceInvestigationResult {
  const { settlementRecon, settlement } = input;

  const settlementCurrency =
    settlement.currency === null ? null : settlement.currency.toUpperCase();

  const evidence: FinancialEvidence[] = [
    compareFinancialField("amount", settlementRecon.amount, settlement.amount),
    compareFinancialField("currency", settlementRecon.currency.toUpperCase(), settlementCurrency),
  ];

  return {
    evidence,
    allMatched: evidence.every((item) => item.result === "PASS"),
  };
}
