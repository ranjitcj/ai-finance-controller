import { describe, expect, it } from "vitest";

import {
    isInvestigationToolName,
    validateInvestigationToolInput,
} from "../../src/investigation/agent/tool-validation.js";

describe("Investigation tool validation", () => {
    it("accepts a valid candidate investigation", () => {
        const result =
            validateInvestigationToolInput(
                "investigateRazorpayCandidates",
                {
                    externalId: "pay_123",
                },
            );

        expect(result).toEqual({
            externalId: "pay_123",
        });
    });

    it("accepts a valid payment/refund investigation", () => {
        const result =
            validateInvestigationToolInput(
                "investigatePaymentRefund",
                {
                    paymentId: "payment-db-id",
                },
            );

        expect(result).toEqual({
            paymentId: "payment-db-id",
        });
    });

    it("rejects payment/refund investigation without an identifier", () => {
        expect(() =>
            validateInvestigationToolInput(
                "investigatePaymentRefund",
                {},
            ),
        ).toThrow();
    });

    it("accepts a valid settlement investigation", () => {
        const result =
            validateInvestigationToolInput(
                "investigateSettlement",
                {
                    settlementExternalId:
                        "setl_123",
                },
            );

        expect(result).toEqual({
            settlementExternalId: "setl_123",
        });
    });

    it("rejects settlement investigation without an identifier", () => {
        expect(() =>
            validateInvestigationToolInput(
                "investigateSettlement",
                {},
            ),
        ).toThrow();
    });

    it("accepts a valid SettlementRecon investigation", () => {
        const result =
            validateInvestigationToolInput(
                "investigateSettlementReconciliation",
                {
                    settlementReconExternalId:
                        "sr_123",
                },
            );

        expect(result).toEqual({
            settlementReconExternalId: "sr_123",
        });
    });

    it("rejects malformed entity lookup input", () => {
        expect(() =>
            validateInvestigationToolInput(
                "investigateRazorpayEntity",
                {
                    entityType: "INVALID",
                    externalId: "abc",
                },
            ),
        ).toThrow();
    });

    it("rejects malformed candidate input", () => {
        expect(() =>
            validateInvestigationToolInput(
                "investigateRazorpayCandidates",
                {
                    paymentId: 123,
                },
            ),
        ).toThrow();
    });

    it("rejects unknown tools", () => {
        expect(
            isInvestigationToolName(
                "decisionPolicy",
            ),
        ).toBe(false);

        expect(() =>
            validateInvestigationToolInput(
                "decisionPolicy",
                {},
            ),
        ).toThrow(
            "Unknown investigation tool: decisionPolicy",
        );
    });

    it("does not allow empty native identifiers", () => {
        expect(() =>
            validateInvestigationToolInput(
                "investigatePaymentRefund",
                {
                    paymentId: "   ",
                },
            ),
        ).toThrow();
    });
});