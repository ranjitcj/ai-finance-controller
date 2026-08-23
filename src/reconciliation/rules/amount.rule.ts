export type AmountRuleResult = "PASS" | "FAIL";

export interface AmountRuleEvidence {
    rule: "AMOUNT";
    result: AmountRuleResult;
    sourceAmount: string;
    candidateAmount: string;
}

export function evaluateAmountRule(
    sourceAmount: string,
    candidateAmount: string,
): AmountRuleEvidence {
    const result: AmountRuleResult =
        sourceAmount === candidateAmount ? "PASS" : "FAIL";

    return {
        rule: "AMOUNT",
        result,
        sourceAmount,
        candidateAmount,
    };
}