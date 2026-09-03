import { z } from "zod";

// import type {
//     RazorpayCandidateSearchInput,
// } from "../../reconciliation/retrieval/razorpay-candidate-retrieval.js";

// import type {
//     RazorpayEntityLookupInput,
//     RazorpayInvestigationToolInput,
// } from "../tools/razorpay/razorpay-investigation.tools.js";

// import type {
//     PaymentRefundInvestigationInput,
// } from "../tools/razorpay/payment-refund.investigation.js";

// import type {
//     SettlementInvestigationInput,
// } from "../tools/razorpay/settlement.investigation.js";

// import type {
//     SettlementReconciliationInvestigationInput,
// } from "../tools/razorpay/settlement-reconciliation.investigation.js";

// import type {
//     ComparePaymentRefundFinancialEvidenceInput,
//     CompareSettlementFinancialEvidenceInput,
// } from "../tools/razorpay/financial-evidence.investigation.js";

/*
 * -------------------------------------------------------------
 * Common native identifier
 * -------------------------------------------------------------
 */

const nativeIdentifier = z
    .string()
    .trim()
    .min(1);

/*
 * -------------------------------------------------------------
 * Candidate investigation
 * -------------------------------------------------------------
 */

export const razorpayCandidateSearchInputSchema =
    z.object({
        externalId: nativeIdentifier.optional(),
        orderId: nativeIdentifier.optional(),
        paymentId: nativeIdentifier.optional(),
        refundId: nativeIdentifier.optional(),
        settlementId: nativeIdentifier.optional(),
        batchId: nativeIdentifier.optional(),
    });

/*
 * -------------------------------------------------------------
 * Entity investigation
 * -------------------------------------------------------------
 */

export const razorpayEntityLookupInputSchema =
    z.object({
        entityType: z.enum([
            "ORDER",
            "PAYMENT",
            "REFUND",
            "SETTLEMENT_RECON",
            "SETTLEMENT",
        ]),
        externalId: nativeIdentifier,
        batchId: nativeIdentifier.optional(),
    });

/*
 * -------------------------------------------------------------
 * Payment → Refund investigation
 * -------------------------------------------------------------
 */

export const paymentRefundInvestigationInputSchema =
    z
        .object({
            paymentId: nativeIdentifier.optional(),
            paymentExternalId:
                nativeIdentifier.optional(),
        })
        .refine(
            (input) =>
                Boolean(
                    input.paymentId ||
                    input.paymentExternalId,
                ),
            {
                message:
                    "Either paymentId or paymentExternalId is required.",
            },
        );

/*
 * -------------------------------------------------------------
 * Settlement investigation
 * -------------------------------------------------------------
 */

export const settlementInvestigationInputSchema =
    z
        .object({
            settlementId: nativeIdentifier.optional(),
            settlementExternalId:
                nativeIdentifier.optional(),
        })
        .refine(
            (input) =>
                Boolean(
                    input.settlementId ||
                    input.settlementExternalId,
                ),
            {
                message:
                    "Either settlementId or settlementExternalId is required.",
            },
        );

/*
 * -------------------------------------------------------------
 * SettlementRecon investigation
 * -------------------------------------------------------------
 */

export const settlementReconciliationInvestigationInputSchema =
    z
        .object({
            settlementReconId:
                nativeIdentifier.optional(),

            settlementReconExternalId:
                nativeIdentifier.optional(),
        })
        .refine(
            (input) =>
                Boolean(
                    input.settlementReconId ||
                    input.settlementReconExternalId,
                ),
            {
                message:
                    "Either settlementReconId or settlementReconExternalId is required.",
            },
        );

/*
 * -------------------------------------------------------------
 * Financial evidence
 * -------------------------------------------------------------
 *
 * These tools receive persisted Razorpay records.
 *
 * We deliberately validate that the values are objects here.
 * Their internal financial fields are already strongly typed by
 * the deterministic investigation functions.
 */

const persistedRazorpayRecord =
    z.record(z.string(), z.unknown());

const persistedRazorpayRecordArray =
    z.array(persistedRazorpayRecord);

/*
 * Payment → Refund financial evidence
 */

export const comparePaymentRefundFinancialEvidenceInputSchema =
    z.object({
        payment: persistedRazorpayRecord,

        refunds: persistedRazorpayRecordArray,
    });

/*
 * SettlementRecon → Settlement financial evidence
 */

export const compareSettlementFinancialEvidenceInputSchema =
    z.object({
        settlementRecon:
            persistedRazorpayRecord,

        settlement:
            persistedRazorpayRecord,
    });

/*
 * -------------------------------------------------------------
 * Tool registry
 * -------------------------------------------------------------
 */

export const investigationToolInputSchemas = {
    investigateRazorpayCandidates:
        razorpayCandidateSearchInputSchema,

    investigateRazorpayEntity:
        razorpayEntityLookupInputSchema,

    investigatePaymentRefund:
        paymentRefundInvestigationInputSchema,

    investigateSettlement:
        settlementInvestigationInputSchema,

    investigateSettlementReconciliation:
        settlementReconciliationInvestigationInputSchema,

    comparePaymentRefundFinancialEvidence:
        comparePaymentRefundFinancialEvidenceInputSchema,

    compareSettlementFinancialEvidence:
        compareSettlementFinancialEvidenceInputSchema,
} as const;

export type InvestigationToolName =
    keyof typeof investigationToolInputSchemas;

export function isInvestigationToolName(
    value: string,
): value is InvestigationToolName {
    return Object.prototype.hasOwnProperty.call(
        investigationToolInputSchemas,
        value,
    );
}

export function validateInvestigationToolInput(
    toolName: string,
    input: unknown,
): unknown {
    if (!isInvestigationToolName(toolName)) {
        throw new Error(
            `Unknown investigation tool: ${toolName}`,
        );
    }

    const schema =
        investigationToolInputSchemas[toolName];

    const result = schema.safeParse(input);

    if (!result.success) {
        throw new Error(
            `Invalid input for investigation tool "${toolName}".`,
        );
    }

    return result.data;
}