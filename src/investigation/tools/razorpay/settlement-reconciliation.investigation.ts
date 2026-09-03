import type { InferSelectModel } from "drizzle-orm";

import {
    razorpaySettlementRecons,
    razorpaySettlements,
} from "../../../db/schema/razorpay.schema.js";

import {
    reconcileSettlementReconSettlement,
    type SettlementReconSettlementResult,
} from "../../../reconciliation/razorpay/settlement-recon-settlement.reconciliation.js";

import { findRazorpayCandidates } from "../../../reconciliation/retrieval/razorpay-candidate-retrieval.js";

type RazorpaySettlementRecon = InferSelectModel<
    typeof razorpaySettlementRecons
>;

type RazorpaySettlement = InferSelectModel<
    typeof razorpaySettlements
>;

export interface SettlementReconciliationInvestigationInput {
    settlementReconId?: string;
    settlementReconExternalId?: string;
}

export interface SettlementReconciliationInvestigationResult {
    found: boolean;
    settlementRecon: RazorpaySettlementRecon | null;
    settlement: RazorpaySettlement | null;
    reconciliation: SettlementReconSettlementResult | null;
}

/**
 * Investigate one Razorpay SettlementRecon and its native
 * Settlement relationship.
 *
 * This tool is observational only.
 *
 * It does not:
 * - make a business decision
 * - invoke Decision Policy
 * - perform fuzzy matching
 * - mutate financial state
 * - replace deterministic reconciliation
 */
export async function investigateSettlementReconciliation(
    input: SettlementReconciliationInvestigationInput,
): Promise<SettlementReconciliationInvestigationResult> {
    /*
     * -------------------------------------------------------------
     * 1. Require a native SettlementRecon identifier.
     * -------------------------------------------------------------
     */
    if (
        !input.settlementReconId &&
        !input.settlementReconExternalId
    ) {
        return {
            found: false,
            settlementRecon: null,
            settlement: null,
            reconciliation: null,
        };
    }

    /*
     * -------------------------------------------------------------
     * 2. Retrieve the SettlementRecon by native external ID.
     *
     * settlementReconId is handled separately below because the
     * retrieval layer's settlementId means Settlement.id.
     * -------------------------------------------------------------
     */
    const candidates = await findRazorpayCandidates({
        externalId: input.settlementReconExternalId,
    });

    const settlementRecon =
        candidates.find(
            (candidate) =>
                candidate.entityType ===
                    "SETTLEMENT_RECON" &&
                candidate.matchField ===
                    "external_id",
        )?.record as RazorpaySettlementRecon | undefined;

    /*
     * If the caller supplied the persisted DB ID, the current
     * generic candidate retrieval layer does not expose a direct
     * SettlementRecon primary-key lookup.
     *
     * Do not invent a fuzzy fallback.
     */
    if (
        !settlementRecon &&
        input.settlementReconId
    ) {
        return {
            found: false,
            settlementRecon: null,
            settlement: null,
            reconciliation: null,
        };
    }

    if (!settlementRecon) {
        return {
            found: false,
            settlementRecon: null,
            settlement: null,
            reconciliation: null,
        };
    }

    /*
     * -------------------------------------------------------------
     * 3. SettlementRecon → Settlement native relationship.
     * -------------------------------------------------------------
     */
    if (!settlementRecon.settlementId) {
        return {
            found: true,
            settlementRecon,
            settlement: null,
            reconciliation: null,
        };
    }

    const settlementCandidates =
        await findRazorpayCandidates({
            settlementId:
                settlementRecon.settlementId,
        });

    const settlement =
        settlementCandidates.find(
            (candidate) =>
                candidate.entityType ===
                    "SETTLEMENT" &&
                candidate.matchField ===
                    "settlement_id",
        )?.record as RazorpaySettlement | undefined;

    if (!settlement) {
        return {
            found: true,
            settlementRecon,
            settlement: null,
            reconciliation: null,
        };
    }

    /*
     * -------------------------------------------------------------
     * 4. Deterministic reconciliation.
     * -------------------------------------------------------------
     */
    const reconciliation =
        reconcileSettlementReconSettlement(
            settlementRecon,
            settlement,
        );

    return {
        found: true,
        settlementRecon,
        settlement,
        reconciliation,
    };
}