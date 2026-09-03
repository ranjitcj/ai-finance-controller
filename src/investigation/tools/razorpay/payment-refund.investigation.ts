import type { InferSelectModel } from "drizzle-orm";

import { razorpayPayments, razorpayRefunds } from "../../../db/schema/razorpay.schema.js";

import {
  aggregatePaymentRefunds,
  reconcilePaymentRefunds,
  type PaymentRefundReconciliationResult,
} from "../../../reconciliation/razorpay/payment-refund.reconciliation.js";

import {
  findRazorpayCandidates,
  type RazorpayRefundCandidate,
  type RazorpayPaymentCandidate,
} from "../../../reconciliation/retrieval/razorpay-candidate-retrieval.js";

type RazorpayPayment = InferSelectModel<typeof razorpayPayments>;
type RazorpayRefund = InferSelectModel<typeof razorpayRefunds>;

// export interface PaymentRefundInvestigationInput {
//   paymentId?: string;
//   paymentExternalId?: string;
// }

export interface PaymentRefundInvestigationResult {
  found: boolean;
  payment: RazorpayPayment | null;
  refunds: RazorpayRefund[];
  reconciliation: PaymentRefundReconciliationResult | null;
}

import { z } from "zod";

export const paymentRefundInvestigationInputSchema = z
  .object({
    paymentId: z.string().min(1).optional(),
    paymentExternalId: z.string().min(1).optional(),
  })
  .refine((input) => Boolean(input.paymentId || input.paymentExternalId), {
    message: "Either paymentId or paymentExternalId is required.",
  });

export type PaymentRefundInvestigationInput = z.infer<typeof paymentRefundInvestigationInputSchema>;

/**
 * Investigate a Razorpay payment and its refund graph.
 *
 * This tool is observational only.
 *
 * It does not:
 * - make a business decision,
 * - override Decision Policy,
 * - perform fuzzy matching,
 * - mutate financial state.
 *
 * It retrieves native Razorpay entities and delegates
 * financial reconciliation to the deterministic reconciliation layer.
 */
export async function investigatePaymentRefund(
  input: PaymentRefundInvestigationInput,
): Promise<PaymentRefundInvestigationResult> {
  /*
   * -------------------------------------------------------------
   * 1. Validate investigation input
   * -------------------------------------------------------------
   */

  if (!input.paymentId && !input.paymentExternalId) {
    return {
      found: false,
      payment: null,
      refunds: [],
      reconciliation: null,
    };
  }

  /*
   * -------------------------------------------------------------
   * 2. Find the payment using a native identifier
   * -------------------------------------------------------------
   */

  const candidates = await findRazorpayCandidates({
    id: input.paymentId,
    externalId: input.paymentExternalId,
  });

  const paymentCandidate = candidates.find(
    (candidate): candidate is RazorpayPaymentCandidate => candidate.entityType === "PAYMENT",
  );

  const payment = paymentCandidate?.record ?? null;

  if (!payment) {
    return {
      found: false,
      payment: null,
      refunds: [],
      reconciliation: null,
    };
  }

  /*
   * -------------------------------------------------------------
   * 3. Retrieve every native refund relationship
   * -------------------------------------------------------------
   *
   * Payment
   *   ├── Refund A
   *   ├── Refund B
   *   └── Refund C
   *
   * We retrieve these relationships directly from the
   * Razorpay persistence layer.
   */

  const refundCandidates = await findRazorpayCandidates({
    paymentId: payment.id,
  });

  const refunds = refundCandidates
    .filter(
      (candidate): candidate is RazorpayRefundCandidate =>
        candidate.entityType === "REFUND" && candidate.matchField === "payment_id",
    )
    .map((candidate) => candidate.record);

  /*
   * -------------------------------------------------------------
   * 4. Run deterministic payment/refund reconciliation
   * -------------------------------------------------------------
   */

  const reconciliation = reconcilePaymentRefunds(payment, refunds);

  /*
   * -------------------------------------------------------------
   * 5. Verify financial aggregation consistency
   * -------------------------------------------------------------
   *
   * The investigation layer does not calculate its own financial
   * decision. It only verifies that the deterministic aggregation
   * agrees with the reconciliation result.
   */

  const aggregation = aggregatePaymentRefunds(payment, refunds);

  if (
    aggregation.refundTotal !== reconciliation.refundTotal ||
    aggregation.remainingAmount !== reconciliation.remainingAmount ||
    aggregation.fullyRefunded !== reconciliation.fullyRefunded
  ) {
    throw new Error("Payment/refund aggregation is inconsistent with reconciliation result.");
  }

  /*
   * -------------------------------------------------------------
   * 6. Return investigation result
   * -------------------------------------------------------------
   */

  return {
    found: true,
    payment,
    refunds,
    reconciliation,
  };
}
