import {
    applyDecisionPolicy,
    type DecisionPolicyResult,
} from "./decision-policy.js";

import {
    applyInvestigationEvidence,
} from "./investigation-evidence.js";

import type {
    DeterministicEvidence,
} from "../rules/deterministic-evidence.js";

export interface InvestigationPolicyInput {
    deterministicEvidence: DeterministicEvidence;
    observations: unknown[];
}

export interface InvestigationPolicyResult {
    evidence: DeterministicEvidence;
    decision: DecisionPolicyResult;
}

export function applyInvestigationPolicy(
    input: InvestigationPolicyInput,
): InvestigationPolicyResult {
    const evidence =
        applyInvestigationEvidence({
            deterministicEvidence:
                input.deterministicEvidence,
            observations:
                input.observations,
        });

    const decision =
        applyDecisionPolicy(evidence);

    return {
        evidence,
        decision,
    };
}