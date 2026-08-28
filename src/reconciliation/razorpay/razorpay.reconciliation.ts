import type { InferSelectModel } from "drizzle-orm";

import {
    razorpayOrders,
    razorpayPayments,
    razorpayRefunds,
    razorpaySettlementRecons,
    razorpaySettlements,
} from "../../db/schema/razorpay.schema.js";

import {
    reconcileOrderPayment,
    type OrderPaymentReconciliationResult,
} from "./order-payment.reconciliation.js";

import {
    reconcilePaymentRefund,
    type PaymentRefundReconciliationResult,
} from "./payment-refund.reconciliation.js";

import {
    reconcilePaymentSettlementRecon,
    type PaymentSettlementReconResult,
} from "./payment-settlement-recon.reconciliation.js";

import {
    reconcileSettlementReconSettlement,
    type SettlementReconSettlementResult,
} from "./settlement-recon-settlement.reconciliation.js";

type RazorpayOrder = InferSelectModel<typeof razorpayOrders>;
type RazorpayPayment = InferSelectModel<typeof razorpayPayments>;
type RazorpayRefund = InferSelectModel<typeof razorpayRefunds>;
type RazorpaySettlementRecon = InferSelectModel<
    typeof razorpaySettlementRecons
>;
type RazorpaySettlement = InferSelectModel<typeof razorpaySettlements>;

export interface RazorpayReconciliationInput {
    order?: RazorpayOrder;
    payment?: RazorpayPayment;
    refunds?: RazorpayRefund[];
    settlementRecon?: RazorpaySettlementRecon;
    settlement?: RazorpaySettlement;
}

export interface RazorpayReconciliationResult {
    orderPayment?: OrderPaymentReconciliationResult;
    paymentRefund?: PaymentRefundReconciliationResult;
    paymentSettlementRecon?: PaymentSettlementReconResult;
    settlementReconSettlement?: SettlementReconSettlementResult;
}

/**
 * Razorpay-native reconciliation orchestrator.
 *
 * Relationship graph:
 *
 * Order
 *   ↓
 * Payment
 *   ├──→ Refund(s)
 *   └──→ SettlementRecon
 *              ↓
 *          Settlement
 *
 * The orchestrator only coordinates deterministic domain
 * reconciliation stages. Each stage owns its own validation
 * and explainable evidence.
 */
export function reconcileRazorpay(
    input: RazorpayReconciliationInput,
): RazorpayReconciliationResult {
    const result: RazorpayReconciliationResult = {};

    /*
     * Stage 1:
     * Order → Payment
     */
    if (input.order && input.payment) {
        result.orderPayment = reconcileOrderPayment(
            input.order,
            input.payment,
        );
    }

    /*
     * Stage 2:
     * Payment → Refund(s)
     */
    if (input.payment && input.refunds) {
        result.paymentRefund = reconcilePaymentRefund(
            input.payment,
            input.refunds,
        );
    }

    /*
     * Stage 3:
     * Payment → SettlementRecon
     */
    if (input.payment && input.settlementRecon) {
        result.paymentSettlementRecon =
            reconcilePaymentSettlementRecon(
                input.payment,
                input.settlementRecon,
            );
    }

    /*
     * Stage 4:
     * SettlementRecon → Settlement
     */
    if (input.settlementRecon && input.settlement) {
        result.settlementReconSettlement =
            reconcileSettlementReconSettlement(
                input.settlementRecon,
                input.settlement,
            );
    }

    return result;
}