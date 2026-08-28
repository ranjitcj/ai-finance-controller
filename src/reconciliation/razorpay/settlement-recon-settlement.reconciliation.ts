import type { InferSelectModel } from "drizzle-orm";

import {
    razorpaySettlementRecons,
    razorpaySettlements,
} from "../../db/schema/razorpay.schema.js";

type RazorpaySettlementRecon = InferSelectModel<
    typeof razorpaySettlementRecons
>;

type RazorpaySettlement = InferSelectModel<typeof razorpaySettlements>;

export type SettlementReconSettlementStatus =
    | "MATCHED"
    | "NO_MATCH"
    | "REVIEW_REQUIRED";

export type SettlementReconCheckResult = "PASS" | "FAIL";

export interface SettlementReconSettlementEvidence {
    field: string;
    result: SettlementReconCheckResult;
    sourceValue: string | null;
    candidateValue: string | null;
    explanation: string;
}

export interface SettlementReconSettlementResult {
    status: SettlementReconSettlementStatus;
    evidence: SettlementReconSettlementEvidence[];
}

function check(
    field: string,
    sourceValue: string | null,
    candidateValue: string | null,
    matches: boolean,
    explanation: string,
): SettlementReconSettlementEvidence {
    return {
        field,
        result: matches ? "PASS" : "FAIL",
        sourceValue,
        candidateValue,
        explanation,
    };
}

function normalize(value: string | null): string | null {
    return value?.trim().toUpperCase() ?? null;
}

function amountsMatch(
    sourceAmount: string,
    candidateAmount: string,
): boolean {
    return Number(sourceAmount) === Number(candidateAmount);
}

function extractUtr(rawPayload: unknown): string | null {
    if (
        typeof rawPayload !== "object" ||
        rawPayload === null ||
        Array.isArray(rawPayload)
    ) {
        return null;
    }

    const payload = rawPayload as Record<string, unknown>;

    const possibleUtr =
        payload.utr ??
        payload.UTR ??
        payload.utr_number ??
        payload.utrNumber;

    return typeof possibleUtr === "string"
        ? possibleUtr
        : null;
}

export function reconcileSettlementReconSettlement(
    settlementRecon: RazorpaySettlementRecon,
    settlement: RazorpaySettlement,
): SettlementReconSettlementResult {
    const evidence: SettlementReconSettlementEvidence[] = [];

    /*
     * 1. Native settlement relationship.
     */
    const settlementIdMatches =
        settlementRecon.settlementId !== null &&
        settlementRecon.settlementId === settlement.id;

    evidence.push(
        check(
            "settlement_id",
            settlement.id,
            settlementRecon.settlementId,
            settlementIdMatches,
            settlementIdMatches
                ? "Settlement reconciliation record is linked to the expected Razorpay settlement."
                : "Settlement reconciliation record is not linked to the expected Razorpay settlement.",
        ),
    );

    /*
     * 2. Amount validation.
     */
    const settlementAmountMatches = amountsMatch(
        settlementRecon.amount,
        settlement.amount,
    );

    evidence.push(
        check(
            "amount",
            settlement.amount,
            settlementRecon.amount,
            settlementAmountMatches,
            settlementAmountMatches
                ? "Settlement amount matches the settlement reconciliation amount."
                : "Settlement amount does not match the settlement reconciliation amount.",
        ),
    );

    /*
     * 3. Currency validation.
     *
     * Settlement currency is nullable.
     */
    const settlementCurrencyMatches =
        settlement.currency !== null &&
        normalize(settlement.currency) ===
        normalize(settlementRecon.currency);

    evidence.push(
        check(
            "currency",
            settlement.currency,
            settlementRecon.currency,
            settlementCurrencyMatches,
            settlementCurrencyMatches
                ? "Settlement currency matches the settlement reconciliation currency."
                : settlement.currency === null
                    ? "Settlement currency is missing and requires review."
                    : "Settlement currency does not match the settlement reconciliation currency.",
        ),
    );

    /*
     * 4. Optional UTR validation.
     *
     * UTR is not a required column and may not exist in either
     * raw payload. Therefore:
     *
     * - both present  -> compare them
     * - only one present -> fail
     * - neither present -> do not create evidence
     *
     * Importantly, absence of UTR does NOT make the entire
     * settlement relationship reconciliation fail.
     */
    const settlementUtr = extractUtr(
        settlement.rawPayload,
    );

    const settlementReconUtr = extractUtr(
        settlementRecon.rawPayload,
    );

    if (
        settlementUtr !== null ||
        settlementReconUtr !== null
    ) {
        const utrMatches =
            settlementUtr !== null &&
            settlementReconUtr !== null &&
            normalize(settlementUtr) ===
            normalize(settlementReconUtr);

        evidence.push(
            check(
                "utr",
                settlementUtr,
                settlementReconUtr,
                utrMatches,
                utrMatches
                    ? "Settlement UTR matches the settlement reconciliation UTR."
                    : "Settlement UTR does not match the settlement reconciliation UTR.",
            ),
        );
    }

    /*
     * 5. Settlement status.
     */
    const finalized =
        settlement.status === "PROCESSED";

    evidence.push(
        check(
            "settlement_status",
            "PROCESSED",
            settlement.status,
            finalized,
            finalized
                ? "Settlement is in the finalized processed state."
                : "Settlement is not finalized and requires review.",
        ),
    );

    /*
     * Deterministic relationship / financial failures.
     *
     * Missing optional UTR is intentionally NOT a failure.
     */
    const hasDeterministicFailure =
        !settlementIdMatches ||
        !settlementAmountMatches ||
        !settlementCurrencyMatches ||
        evidence.some(
            (item) =>
                item.field === "utr" &&
                item.result === "FAIL",
        );

    let status: SettlementReconSettlementStatus;

    if (hasDeterministicFailure) {
        status = "NO_MATCH";
    } else if (!finalized) {
        status = "REVIEW_REQUIRED";
    } else {
        status = "MATCHED";
    }

    return {
        status,
        evidence,
    };
}