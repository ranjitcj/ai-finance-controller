export type SettlementFinancialCheckResult = "PASS" | "FAIL";

export interface SettlementFinancialEvidence {
    field: "fee" | "tax" | "utr";
    result: SettlementFinancialCheckResult;
    sourceValue: string | null;
    candidateValue: string | null;
    explanation: string;
}

export interface SettlementFinancialValidationResult {
    valid: boolean;
    evidence: SettlementFinancialEvidence[];
}

interface SettlementPayload {
    fee?: number | string | null;
    tax?: number | string | null;
    utr?: string | null;
    [key: string]: unknown;
}

interface SettlementReconPayload {
    fee?: number | string | null;
    tax?: number | string | null;
    utr?: string | null;
    [key: string]: unknown;
}

function normalizeAmount(
    value: number | string | null | undefined,
): string | null {
    if (value === null || value === undefined) {
        return null;
    }

    const numericValue =
        typeof value === "number"
            ? value
            : Number(value);

    if (!Number.isFinite(numericValue)) {
        return null;
    }

    return numericValue.toFixed(2);
}

function checkAmount(
    field: "fee" | "tax",
    sourceValue: number | string | null | undefined,
    candidateValue: number | string | null | undefined,
): SettlementFinancialEvidence {
    const normalizedSource = normalizeAmount(sourceValue);
    const normalizedCandidate = normalizeAmount(candidateValue);

    const matches =
        normalizedSource !== null &&
        normalizedCandidate !== null &&
        normalizedSource === normalizedCandidate;

    return {
        field,
        result: matches ? "PASS" : "FAIL",
        sourceValue: normalizedSource,
        candidateValue: normalizedCandidate,
        explanation: matches
            ? `${field} matches between settlement and settlement reconciliation.`
            : `${field} does not match between settlement and settlement reconciliation.`,
    };
}

function checkUtr(
    sourceValue: string | null | undefined,
    candidateValue: string | null | undefined,
): SettlementFinancialEvidence {
    const normalizedSource =
        sourceValue?.trim() || null;

    const normalizedCandidate =
        candidateValue?.trim() || null;

    const matches =
        normalizedSource !== null &&
        normalizedCandidate !== null &&
        normalizedSource === normalizedCandidate;

    return {
        field: "utr",
        result: matches ? "PASS" : "FAIL",
        sourceValue: normalizedSource,
        candidateValue: normalizedCandidate,
        explanation: matches
            ? "UTR matches between settlement and settlement reconciliation."
            : "UTR does not match between settlement and settlement reconciliation.",
    };
}

export function validateSettlementFinancials(
    settlement: SettlementPayload,
    settlementRecon: SettlementReconPayload,
): SettlementFinancialValidationResult {
    const evidence: SettlementFinancialEvidence[] = [
        checkAmount(
            "fee",
            settlement.fee,
            settlementRecon.fee,
        ),
        checkAmount(
            "tax",
            settlement.tax,
            settlementRecon.tax,
        ),
        checkUtr(
            settlement.utr,
            settlementRecon.utr,
        ),
    ];

    return {
        valid: evidence.every(
            (item) => item.result === "PASS",
        ),
        evidence,
    };
}