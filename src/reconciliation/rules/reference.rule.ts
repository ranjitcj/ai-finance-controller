import { normalizeReference } from "../../domain/transaction/reference.normalization.js";

export type ReferenceRuleResult = "PASS" | "FAIL" | "SKIPPED";

export interface ReferenceRuleEvidence {
    rule: "REFERENCE";
    result: ReferenceRuleResult;
    sourceReference?: string;
    candidateReference?: string;
    normalizedSourceReference?: string;
    normalizedCandidateReference?: string;
}

export function evaluateReferenceRule(
    sourceReference: string | undefined,
    candidateReference: string | undefined,
): ReferenceRuleEvidence {
    if (!sourceReference || !candidateReference) {
        return {
            rule: "REFERENCE",
            result: "SKIPPED",
            sourceReference,
            candidateReference,
        };
    }

    const normalizedSourceReference = normalizeReference(sourceReference);
    const normalizedCandidateReference = normalizeReference(candidateReference);

    return {
        rule: "REFERENCE",
        result:
            normalizedSourceReference === normalizedCandidateReference
                ? "PASS"
                : "FAIL",
        sourceReference,
        candidateReference,
        normalizedSourceReference,
        normalizedCandidateReference,
    };
}