import { evaluateAmountRule } from "./amount.rule.js";
import { evaluateCurrencyRule } from "./currency.rule.js";
import { evaluateReferenceRule } from "./reference.rule.js";
import { evaluateDateRule } from "./date.rule.js";
import { evaluateDuplicateRule } from "./duplicate.rule.js";
import type { DeterministicEvidence } from "./deterministic-evidence.js";

export interface DeterministicRuleInput {
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
    input: DeterministicRuleInput,
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

    const duplicate = evaluateDuplicateRule(
        input.candidateCount,
    );

    return {
        amount,
        currency,
        reference,
        date,
        duplicate,
    };
}