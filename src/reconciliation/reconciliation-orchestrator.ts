import type {
    ReconciliationServiceInput,
} from "./reconciliation.service.js";

import {
    reconciliationService,
} from "./reconciliation.service.js";

import type {
    InvestigationModel,
    BoundedAgentResult,
} from "../investigation/agent/types.js";

import {
    runBoundedInvestigation,
} from "../investigation/agent/bounded-agent.js";

import {
    applyInvestigationPolicy,
    type InvestigationPolicyResult,
} from "./policy/investigation-policy.js";

export interface ReconciliationOrchestratorOptions {
    investigationModel?: InvestigationModel;
    investigationMaxIterations?: number;
    investigationTimeoutMs?: number;
}

export interface ReconciliationOrchestratorResult {
    reconciliation: Awaited<
        ReturnType<typeof reconciliationService>
    >;
    investigation: BoundedAgentResult | null;
    policyReevaluation: InvestigationPolicyResult | null;
}

export async function reconciliationOrchestrator(
    input: ReconciliationServiceInput,
    options: ReconciliationOrchestratorOptions = {},
): Promise<ReconciliationOrchestratorResult> {
    const reconciliation =
        await reconciliationService(input);

    if (!shouldInvestigate(reconciliation)) {
        return {
            reconciliation,
            investigation: null,
            policyReevaluation: null,
        };
    }

    if (!options.investigationModel) {
        return {
            reconciliation,
            investigation: null,
            policyReevaluation: null,
        };
    }

    const investigation =
        await runBoundedInvestigation(
            options.investigationModel,
            {
                transactionId: input.transactionId,
                transaction: input.transaction,
                reconciliation,
            },
            {
                maxIterations:
                    options.investigationMaxIterations,
                timeoutMs:
                    options.investigationTimeoutMs,
            },
        );

    /*
     * Only deterministic evidence is allowed to reach
     * the financial Decision Policy.
     *
     * The model's FINAL output is NOT treated as a decision.
     */
    const policyReevaluation =
        createPolicyReevaluation(
            reconciliation,
            investigation,
        );

    return {
        reconciliation,
        investigation,
        policyReevaluation,
    };
}

function shouldInvestigate(
    reconciliation: Awaited<
        ReturnType<typeof reconciliationService>
    >,
): boolean {
    return (
        reconciliation.state === "REVIEW_REQUIRED"
    );
}

function createPolicyReevaluation(
    reconciliation: Awaited<
        ReturnType<typeof reconciliationService>
    >,
    investigation: BoundedAgentResult,
): InvestigationPolicyResult | null {
    const evidence =
        reconciliation.evaluations[0]?.evidence;

    if (!evidence) {
        return null;
    }

    return applyInvestigationPolicy({
        deterministicEvidence: evidence,
        observations: investigation.observations,
    });
}