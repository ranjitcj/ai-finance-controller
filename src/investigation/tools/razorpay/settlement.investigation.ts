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

type RazorpaySettlement = InferSelectModel<
    typeof razorpaySettlements
>;

type RazorpaySettlementRecon = InferSelectModel<
    typeof razorpaySettlementRecons
>;

export interface SettlementInvestigationInput {
    settlementId?: string;
    settlementExternalId?: string;
}

export interface SettlementInvestigationResult {
    found: boolean;
    settlement: RazorpaySettlement | null;
    settlementRecons: RazorpaySettlementRecon[];
    reconciliations: SettlementReconSettlementResult[];
}

/**
 * Investigate a Razorpay settlement and its native
 * SettlementRecon relationships.
 *
 * Observational only.
 *
 * This tool does not:
 * - make business decisions
 * - invoke Decision Policy
 * - perform fuzzy matching
 * - mutate financial state
 * - calculate independent financial results
 *
 * Native relationships are retrieved by the Razorpay
 * candidate retrieval layer.
 *
 * Deterministic reconciliation remains authoritative.
 */
export async function investigateSettlement(
    input: SettlementInvestigationInput,
): Promise<SettlementInvestigationResult> {
    /*
     * -------------------------------------------------------------
     * 1. Require a native settlement identifier.
     * -------------------------------------------------------------
     */
    if (
        !input.settlementId &&
        !input.settlementExternalId
    ) {
        return {
            found: false,
            settlement: null,
            settlementRecons: [],
            reconciliations: [],
        };
    }

    /*
     * -------------------------------------------------------------
     * 2. Retrieve the settlement using a native identifier.
     * -------------------------------------------------------------
     */
    const candidates = await findRazorpayCandidates({
        settlementId: input.settlementId,
        externalId: input.settlementExternalId,
    });

    const settlementCandidate = candidates.find(
        (candidate) =>
            candidate.entityType === "SETTLEMENT",
    );

    if (!settlementCandidate) {
        return {
            found: false,
            settlement: null,
            settlementRecons: [],
            reconciliations: [],
        };
    }

    /*
     * candidate.record is intentionally generic at the retrieval
     * boundary. Entity type has narrowed the semantic type, so
     * convert it to the persisted Settlement model here.
     */
    const settlement =
        settlementCandidate.record as RazorpaySettlement;

    /*
     * -------------------------------------------------------------
     * 3. Retrieve SettlementRecon records through the native
     *    SettlementRecon → Settlement relationship.
     * -------------------------------------------------------------
     */
    const reconCandidates =
        await findRazorpayCandidates({
            settlementId: settlement.id,
        });

    const settlementRecons = reconCandidates
        .filter(
            (candidate) =>
                candidate.entityType ===
                    "SETTLEMENT_RECON" &&
                candidate.matchField ===
                    "settlement_id",
        )
        .map(
            (candidate) =>
                candidate.record as RazorpaySettlementRecon,
        );

    /*
     * -------------------------------------------------------------
     * 4. Deterministically reconcile every SettlementRecon.
     * -------------------------------------------------------------
     */
    const reconciliations =
        settlementRecons.map(
            (settlementRecon) =>
                reconcileSettlementReconSettlement(
                    settlementRecon,
                    settlement,
                ),
        );

    return {
        found: true,
        settlement,
        settlementRecons,
        reconciliations,
    };
}