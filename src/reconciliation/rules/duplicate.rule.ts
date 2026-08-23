export type DuplicateRuleResult =
    | "NO_MATCH"
    | "PASS"
    | "ESCALATE";

export interface DuplicateRuleEvidence {
    rule: "DUPLICATE";
    result: DuplicateRuleResult;
    candidateCount: number;
}

export function evaluateDuplicateRule(
    candidateCount: number,
): DuplicateRuleEvidence {
    let result: DuplicateRuleResult;

    if (candidateCount === 0) {
        result = "NO_MATCH";
    } else if (candidateCount === 1) {
        result = "PASS";
    } else {
        result = "ESCALATE";
    }

    return {
        rule: "DUPLICATE",
        result,
        candidateCount,
    };
}