import type { DeterministicEvidence } from "../rules/deterministic-evidence.js";

export interface InvestigationEvidenceInput {
    deterministicEvidence: DeterministicEvidence;
    observations: unknown[];
}

/**
 * Converts trusted investigation observations into the
 * deterministic evidence shape consumed by Decision Policy.
 *
 * The investigator itself never produces a financial decision.
 */
export function applyInvestigationEvidence(
    input: InvestigationEvidenceInput,
): DeterministicEvidence {
    /*
     * IMPORTANT:
     *
     * For the first implementation, preserve the existing
     * deterministic evidence unless a trusted investigation
     * adapter explicitly understands an observation.
     *
     * Unknown AI/model output is ignored.
     */
    return input.deterministicEvidence;
}