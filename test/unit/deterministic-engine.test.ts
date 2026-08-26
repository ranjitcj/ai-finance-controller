import { describe, expect, it } from "vitest";

import {
    evaluateDeterministicRules,
    type DeterministicRuleInput,
} from "../../src/reconciliation/rules/deterministic-engine.js";

describe("deterministic engine", () => {
    const baseInput: DeterministicRuleInput = {
        sourceAmount: "100.00",
        candidateAmount: "100.00",

        sourceCurrency: "USD",
        candidateCurrency: "USD",

        sourceReference: "REF-001",
        candidateReference: "REF-001",

        sourceDate: new Date("2026-08-20T00:00:00.000Z"),
        candidateDate: new Date("2026-08-20T00:00:00.000Z"),

        candidateCount: 1,
    };

    it("produces passing evidence when hard boundaries pass", () => {
        const result = evaluateDeterministicRules(baseInput);

        expect(result.amount.result).toBe("PASS");
        expect(result.currency.result).toBe("PASS");
        expect(result.reference.result).toBe("PASS");
        expect(result.date.result).toBe("PASS");
        expect(result.duplicate.result).toBe("PASS");
    });

    it("never matches an amount mismatch", () => {
        const result = evaluateDeterministicRules({
            ...baseInput,
            candidateAmount: "101.00",
        });

        expect(result.amount.result).toBe("FAIL");
        expect(result.currency.result).toBe("PASS");
    });

    it("never matches a currency mismatch", () => {
        const result = evaluateDeterministicRules({
            ...baseInput,
            candidateCurrency: "EUR",
        });

        expect(result.currency.result).toBe("FAIL");
        expect(result.amount.result).toBe("PASS");
    });

    it("preserves duplicate escalation as evidence", () => {
        const result = evaluateDeterministicRules({
            ...baseInput,
            candidateCount: 2,
        });

        expect(result.duplicate.result).toBe("ESCALATE");
        expect(result.duplicate.candidateCount).toBe(2);
    });

    it("preserves date tolerance as evidence", () => {
        const result = evaluateDeterministicRules({
            ...baseInput,
            candidateDate: new Date("2026-08-21T00:00:00.000Z"),
        });

        expect(result.date.result).toBe("PASS_WITH_TOLERANCE");
        expect(result.date.differenceInDays).toBe(1);
        expect(result.date.toleranceDays).toBe(1);
    });

    it("returns only structured evidence and no final decision", () => {
        const result = evaluateDeterministicRules(baseInput);

        expect(result).toEqual({
            amount: expect.objectContaining({
                rule: "AMOUNT",
                result: "PASS",
            }),
            currency: expect.objectContaining({
                rule: "CURRENCY",
                result: "PASS",
            }),
            reference: expect.objectContaining({
                rule: "REFERENCE",
                result: "PASS",
            }),
            date: expect.objectContaining({
                rule: "DATE",
                result: "PASS",
            }),
            duplicate: expect.objectContaining({
                rule: "DUPLICATE",
                result: "PASS",
            }),
        });

        expect("decision" in result).toBe(false);
    });
});