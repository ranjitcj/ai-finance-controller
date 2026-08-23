import { describe, expect, it } from "vitest";
import { evaluateDeterministicRules } from "../../src/reconciliation/rules/deterministic-engine.js";

const baseInput = {
    sourceAmount: "1250.00",
    candidateAmount: "1250.00",

    sourceCurrency: "USD",
    candidateCurrency: "USD",

    sourceReference: "REF-001",
    candidateReference: "REF001",

    sourceDate: new Date("2026-08-23T00:00:00.000Z"),
    candidateDate: new Date("2026-08-23T00:00:00.000Z"),

    candidateCount: 1,
};

describe("deterministic engine", () => {
    it("matches when hard boundaries pass", () => {
        const result = evaluateDeterministicRules(baseInput);

        expect(result.decision).toBe("MATCH");

        expect(result.amount.result).toBe("PASS");
        expect(result.currency.result).toBe("PASS");
        expect(result.duplicate.result).toBe("PASS");
    });

    it("never matches an amount mismatch", () => {
        const result = evaluateDeterministicRules({
            ...baseInput,
            candidateAmount: "1250.01",
        });

        expect(result.amount.result).toBe("FAIL");
        expect(result.decision).toBe("NO_MATCH");
    });

    it("never matches a currency mismatch", () => {
        const result = evaluateDeterministicRules({
            ...baseInput,
            candidateCurrency: "GBP",
        });

        expect(result.currency.result).toBe("FAIL");
        expect(result.decision).toBe("NO_MATCH");
    });

    it("escalates when multiple candidates exist", () => {
        const result = evaluateDeterministicRules({
            ...baseInput,
            candidateCount: 2,
        });

        expect(result.duplicate.result).toBe("ESCALATE");
        expect(result.decision).toBe("ESCALATE");
    });

    it("preserves date tolerance as evidence", () => {
        const result = evaluateDeterministicRules({
            ...baseInput,
            candidateDate: new Date("2026-08-24T00:00:00.000Z"),
        });

        expect(result.date.result).toBe("PASS_WITH_TOLERANCE");
        expect(result.decision).toBe("MATCH");
    });
});