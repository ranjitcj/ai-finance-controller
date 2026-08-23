export type CurrencyRuleResult = "PASS" | "FAIL";

export interface CurrencyRuleEvidence {
    rule: "CURRENCY";
    result: CurrencyRuleResult;
    sourceCurrency: string;
    candidateCurrency: string;
}

export function evaluateCurrencyRule(
    sourceCurrency: string,
    candidateCurrency: string,
): CurrencyRuleEvidence {
    const result: CurrencyRuleResult =
        sourceCurrency === candidateCurrency ? "PASS" : "FAIL";

    return {
        rule: "CURRENCY",
        result,
        sourceCurrency,
        candidateCurrency,
    };
}