import {
    investigateRazorpayCandidates,
    investigateRazorpayEntity,
} from "../tools/razorpay/razorpay-investigation.tools.js";

import {
    investigatePaymentRefund,
} from "../tools/razorpay/payment-refund.investigation.js";

import {
    investigateSettlement,
} from "../tools/razorpay/settlement.investigation.js";

import {
    investigateSettlementReconciliation,
} from "../tools/razorpay/settlement-reconciliation.investigation.js";

import {
    comparePaymentRefundFinancialEvidence,
    compareSettlementFinancialEvidence,
} from "../tools/razorpay/financial-evidence.investigation.js";

import type {
    InvestigationToolCall,
    InvestigationToolResult,
} from "./types.js";

import {
    validateInvestigationToolInput,
} from "./tool-validation.js";

type InvestigationTool = (
    input: unknown,
) => Promise<unknown> | unknown;

const investigationTools: Record<
    string,
    InvestigationTool
> = {
    investigateRazorpayCandidates: (input) =>
        investigateRazorpayCandidates(
            input as Parameters<
                typeof investigateRazorpayCandidates
            >[0],
        ),

    investigateRazorpayEntity: (input) =>
        investigateRazorpayEntity(
            input as Parameters<
                typeof investigateRazorpayEntity
            >[0],
        ),

    investigatePaymentRefund: (input) =>
        investigatePaymentRefund(
            input as Parameters<
                typeof investigatePaymentRefund
            >[0],
        ),

    investigateSettlement: (input) =>
        investigateSettlement(
            input as Parameters<
                typeof investigateSettlement
            >[0],
        ),

    investigateSettlementReconciliation: (input) =>
        investigateSettlementReconciliation(
            input as Parameters<
                typeof investigateSettlementReconciliation
            >[0],
        ),

    comparePaymentRefundFinancialEvidence: (input) =>
        comparePaymentRefundFinancialEvidence(
            input as Parameters<
                typeof comparePaymentRefundFinancialEvidence
            >[0],
        ),

    compareSettlementFinancialEvidence: (input) =>
        compareSettlementFinancialEvidence(
            input as Parameters<
                typeof compareSettlementFinancialEvidence
            >[0],
        ),
};

export function hasInvestigationTool(
    toolName: string,
): boolean {
    return Object.prototype.hasOwnProperty.call(
        investigationTools,
        toolName,
    );
}

export async function executeInvestigationTool(
    call: InvestigationToolCall,
): Promise<InvestigationToolResult> {
    const tool = investigationTools[call.toolName];

    if (!tool) {
        throw new Error(
            `Unknown investigation tool: ${call.toolName}`,
        );
    }

    const validatedInput =
        validateInvestigationToolInput(
            call.toolName,
            call.input,
        );

    const output = await tool(validatedInput);

    return {
        toolName: call.toolName,
        output,
    };
}

export function listInvestigationTools(): string[] {
    return Object.keys(investigationTools);
}