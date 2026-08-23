import { describe, expect, it } from "vitest";
import { evaluateAmountRule } from "../../src/reconciliation/rules/amount.rule.js";

describe("amount rule", () => {
    it("passes when amounts are exactly equal", () => {
        const result = evaluateAmountRule("1250.00", "1250.00");

        expect(result).toEqual({
            rule: "AMOUNT",
            result: "PASS",
            sourceAmount: "1250.00",
            candidateAmount: "1250.00",
        });
    });

    it("fails when amounts are different", () => {
        const result = evaluateAmountRule("1250.00", "1250.01");

        expect(result).toEqual({
            rule: "AMOUNT",
            result: "FAIL",
            sourceAmount: "1250.00",
            candidateAmount: "1250.01",
        });
    });
});