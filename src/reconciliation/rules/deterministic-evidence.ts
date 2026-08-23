import type { AmountRuleEvidence } from "./amount.rule.js";
import type { CurrencyRuleEvidence } from "./currency.rule.js";
import type { ReferenceRuleEvidence } from "./reference.rule.js";
import type { DateRuleEvidence } from "./date.rule.js";
import type { DuplicateRuleEvidence } from "./duplicate.rule.js";

export type DeterministicDecision =
    | "MATCH"
    | "NO_MATCH"
    | "ESCALATE";

export interface DeterministicEvidence {
    amount: AmountRuleEvidence;
    currency: CurrencyRuleEvidence;
    reference: ReferenceRuleEvidence;
    date: DateRuleEvidence;
    duplicate: DuplicateRuleEvidence;
    decision: DeterministicDecision;
}