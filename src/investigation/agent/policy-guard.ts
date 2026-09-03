const BLOCKED_INVESTIGATION_TOOLS = new Set([
    "applyDecisionPolicy",
    "decisionPolicy",
    "approveReconciliation",
    "rejectReconciliation",
    "mutateFinancialState",
]);

export function assertInvestigationToolAllowed(
    toolName: string,
): void {
    if (BLOCKED_INVESTIGATION_TOOLS.has(toolName)) {
        throw new Error(
            `Investigation agent cannot invoke financial decision tool: ${toolName}`,
        );
    }
}