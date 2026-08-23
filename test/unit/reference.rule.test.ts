import { describe, expect, it } from "vitest";
import { evaluateReferenceRule } from "../../src/reconciliation/rules/reference.rule.js";

describe("reference rule", () => {
    it("passes when references are equal after normalization", () => {
        const result = evaluateReferenceRule("REF-001", "ref001");

        expect(result).toEqual({
            rule: "REFERENCE",
            result: "PASS",
            sourceReference: "REF-001",
            candidateReference: "ref001",
            normalizedSourceReference: "ref001",
            normalizedCandidateReference: "ref001",
        });
    });

    it("fails when normalized references are different", () => {
        const result = evaluateReferenceRule("REF-001", "REF-002");

        expect(result).toEqual({
            rule: "REFERENCE",
            result: "FAIL",
            sourceReference: "REF-001",
            candidateReference: "REF-002",
            normalizedSourceReference: "ref001",
            normalizedCandidateReference: "ref002",
        });
    });

    it("skips the rule when the source reference is missing", () => {
        const result = evaluateReferenceRule(undefined, "REF-001");

        expect(result).toEqual({
            rule: "REFERENCE",
            result: "SKIPPED",
            sourceReference: undefined,
            candidateReference: "REF-001",
        });
    });

    it("skips the rule when the candidate reference is missing", () => {
        const result = evaluateReferenceRule("REF-001", undefined);

        expect(result).toEqual({
            rule: "REFERENCE",
            result: "SKIPPED",
            sourceReference: "REF-001",
            candidateReference: undefined,
        });
    });
});