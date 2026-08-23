import { describe, expect, it } from "vitest";
import { evaluateCurrencyRule } from "../../src/reconciliation/rules/currency.rule.js";

describe("currency rule", () => {
    it("passes when currencies are equal", () => {
        const result = evaluateCurrencyRule("USD", "USD");

        expect(result).toEqual({
            rule: "CURRENCY",
            result: "PASS",
            sourceCurrency: "USD",
            candidateCurrency: "USD",
        });
    });

    it("fails when currencies are different", () => {
        const result = evaluateCurrencyRule("USD", "INR");

        expect(result).toEqual({
            rule: "CURRENCY",
            result: "FAIL",
            sourceCurrency: "USD",
            candidateCurrency: "INR",
        });
    });
});