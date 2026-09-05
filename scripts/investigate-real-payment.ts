import "dotenv/config";

import { investigatePaymentRefund } from "../src/investigation/tools/razorpay/payment-refund.investigation.js";

const paymentExternalId = "pay_TYEdsK0qKJIZvG";

const result = await investigatePaymentRefund({
    paymentExternalId,
});

console.log(
    JSON.stringify(
        {
            found: result.found,
            payment: result.payment
                ? {
                    id: result.payment.id,
                    amount: result.payment.amount,
                    currency: result.payment.currency,
                    status: result.payment.status,
                    orderId: result.payment.orderId,
                }
                : null,
            refunds: result.refunds.map((refund) => ({
                id: refund.id,
                paymentId: refund.paymentId,
                amount: refund.amount,
                currency: refund.currency,
                status: refund.status,
            })),
            reconciliation: result.reconciliation,
        },
        null,
        2,
    ),
);