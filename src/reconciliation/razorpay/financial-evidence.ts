export type FinancialCheckResult = "PASS" | "FAIL";

export interface FinancialEvidence {
    field: string;
    result: FinancialCheckResult;
    sourceValue: string | null;
    candidateValue: string | null;
    explanation: string;
}

export function compareFinancialField(
    field: string,
    sourceValue: string | null,
    candidateValue: string | null,
): FinancialEvidence {
    const matches =
        sourceValue !== null &&
        candidateValue !== null &&
        sourceValue === candidateValue;

    return {
        field,
        result: matches ? "PASS" : "FAIL",
        sourceValue,
        candidateValue,
        explanation: matches
            ? `${field} matches.`
            : `${field} does not match.`,
    };
}

export function validatePresentFinancialField(
    field: string,
    value: string | null,
): FinancialEvidence {
    const present = value !== null && value.trim().length > 0;

    return {
        field,
        result: present ? "PASS" : "FAIL",
        sourceValue: value,
        candidateValue: value,
        explanation: present
            ? `${field} is present.`
            : `${field} is unavailable.`,
    };
}