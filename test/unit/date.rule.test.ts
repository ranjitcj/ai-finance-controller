import { describe, expect, it } from "vitest";
import { evaluateDateRule } from "../../src/reconciliation/rules/date.rule.js";

describe("date rule", () => {
    it("passes when dates are exactly equal", () => {
        const result = evaluateDateRule(
            new Date("2026-08-23T00:00:00.000Z"),
            new Date("2026-08-23T00:00:00.000Z"),
        );

        expect(result).toEqual({
            rule: "DATE",
            result: "PASS",
            sourceDate: "2026-08-23",
            candidateDate: "2026-08-23",
            differenceInDays: 0,
            toleranceDays: 1,
        });
    });

    it("allows a one-day difference", () => {
        const result = evaluateDateRule(
            new Date("2026-08-23T00:00:00.000Z"),
            new Date("2026-08-24T00:00:00.000Z"),
        );

        expect(result).toEqual({
            rule: "DATE",
            result: "PASS_WITH_TOLERANCE",
            sourceDate: "2026-08-23",
            candidateDate: "2026-08-24",
            differenceInDays: 1,
            toleranceDays: 1,
        });
    });

    it("allows a one-day difference in the other direction", () => {
        const result = evaluateDateRule(
            new Date("2026-08-23T00:00:00.000Z"),
            new Date("2026-08-22T00:00:00.000Z"),
        );

        expect(result.result).toBe("PASS_WITH_TOLERANCE");
        expect(result.differenceInDays).toBe(1);
    });

    it("fails when the difference exceeds the tolerance", () => {
        const result = evaluateDateRule(
            new Date("2026-08-23T00:00:00.000Z"),
            new Date("2026-08-25T00:00:00.000Z"),
        );

        expect(result).toEqual({
            rule: "DATE",
            result: "FAIL",
            sourceDate: "2026-08-23",
            candidateDate: "2026-08-25",
            differenceInDays: 2,
            toleranceDays: 1,
        });
    });
});