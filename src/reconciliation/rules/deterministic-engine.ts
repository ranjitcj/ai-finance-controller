import { evaluateAmountRule } from "./amount.rule.js";
import { evaluateCurrencyRule } from "./currency.rule.js";
import { evaluateReferenceRule } from "./reference.rule.js";
import { evaluateDateRule } from "./date.rule.js";
import { evaluateDuplicateRule } from "./duplicate.rule.js";

import type { DeterministicEvidence } from "./deterministic-evidence.js";

export interface DeterministicInput {
    sourceAmount: string;
    candidateAmount: string;

    sourceCurrency: string;
    candidateCurrency: string;

    sourceReference?: string;
    candidateReference?: string;

    sourceDate: Date;
    candidateDate: Date;

    candidateCount: number;
}

export function evaluateDeterministicRules(
    input: DeterministicInput,
): DeterministicEvidence {
    const amount = evaluateAmountRule(
        input.sourceAmount,
        input.candidateAmount,
    );

    const currency = evaluateCurrencyRule(
        input.sourceCurrency,
        input.candidateCurrency,
    );

    const reference = evaluateReferenceRule(
        input.sourceReference,
        input.candidateReference,
    );

    const date = evaluateDateRule(
        input.sourceDate,
        input.candidateDate,
    );

    const duplicate = evaluateDuplicateRule(input.candidateCount);

    let decision: DeterministicEvidence["decision"];

    if (duplicate.result === "ESCALATE") {
        decision = "ESCALATE";
    } else if (
        amount.result === "FAIL" ||
        currency.result === "FAIL" ||
        date.result === "FAIL"
    ) {
        decision = "NO_MATCH";
    } else if (
        duplicate.result === "PASS" &&
        amount.result === "PASS" &&
        currency.result === "PASS"
    ) {
        decision = "MATCH";
    } else {
        decision = "NO_MATCH";
    }

    return {
        amount,
        currency,
        reference,
        date,
        duplicate,
        decision,
    };
}