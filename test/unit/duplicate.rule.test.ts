import { describe, expect, it } from "vitest";
import { evaluateDuplicateRule } from "../../src/reconciliation/rules/duplicate.rule.js";

describe("duplicate rule", () => {
    it("returns NO_MATCH when there are no candidates", () => {
        const result = evaluateDuplicateRule(0);

        expect(result).toEqual({
            rule: "DUPLICATE",
            result: "NO_MATCH",
            candidateCount: 0,
        });
    });

    it("passes when there is exactly one candidate", () => {
        const result = evaluateDuplicateRule(1);

        expect(result).toEqual({
            rule: "DUPLICATE",
            result: "PASS",
            candidateCount: 1,
        });
    });

    it("escalates when there are multiple candidates", () => {
        const result = evaluateDuplicateRule(2);

        expect(result).toEqual({
            rule: "DUPLICATE",
            result: "ESCALATE",
            candidateCount: 2,
        });
    });

    it("escalates for any candidate count greater than one", () => {
        const result = evaluateDuplicateRule(5);

        expect(result).toEqual({
            rule: "DUPLICATE",
            result: "ESCALATE",
            candidateCount: 5,
        });
    });
});