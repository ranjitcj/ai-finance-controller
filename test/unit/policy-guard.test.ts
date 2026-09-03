import { describe, expect, it } from "vitest";

import {
    assertInvestigationToolAllowed,
} from "../../src/investigation/agent/policy-guard.js";

describe("Investigation policy guard", () => {
    it("allows investigation tools", () => {
        expect(() =>
            assertInvestigationToolAllowed(
                "investigateRazorpayCandidates",
            ),
        ).not.toThrow();
    });

    it("blocks applyDecisionPolicy", () => {
        expect(() =>
            assertInvestigationToolAllowed(
                "applyDecisionPolicy",
            ),
        ).toThrow(
            "Investigation agent cannot invoke financial decision tool: applyDecisionPolicy",
        );
    });

    it("blocks decisionPolicy", () => {
        expect(() =>
            assertInvestigationToolAllowed(
                "decisionPolicy",
            ),
        ).toThrow(
            "Investigation agent cannot invoke financial decision tool: decisionPolicy",
        );
    });

    it("blocks reconciliation mutation tools", () => {
        expect(() =>
            assertInvestigationToolAllowed(
                "mutateFinancialState",
            ),
        ).toThrow(
            "Investigation agent cannot invoke financial decision tool: mutateFinancialState",
        );
    });
});