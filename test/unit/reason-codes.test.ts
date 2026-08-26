import { describe, expect, it } from "vitest";

import {
    reconciliationReasonCodes,
    type ReconciliationReasonCode,
} from "../../src/reconciliation/policy/reason-codes.js";

describe("reconciliation reason codes", () => {
    it("contains stable reason codes", () => {
        expect(reconciliationReasonCodes.AMOUNT_MISMATCH).toBe(
            "AMOUNT_MISMATCH",
        );

        expect(reconciliationReasonCodes.CURRENCY_MISMATCH).toBe(
            "CURRENCY_MISMATCH",
        );

        expect(reconciliationReasonCodes.MULTIPLE_CANDIDATES).toBe(
            "MULTIPLE_CANDIDATES",
        );

        expect(reconciliationReasonCodes.EXACT_REFERENCE_MATCH).toBe(
            "EXACT_REFERENCE_MATCH",
        );

        expect(
            reconciliationReasonCodes.EXACT_AMOUNT_CURRENCY_DATE_MATCH,
        ).toBe("EXACT_AMOUNT_CURRENCY_DATE_MATCH");

        expect(reconciliationReasonCodes.DATE_WITHIN_TOLERANCE).toBe(
            "DATE_WITHIN_TOLERANCE",
        );

        expect(reconciliationReasonCodes.REFERENCE_MISMATCH).toBe(
            "REFERENCE_MISMATCH",
        );

        expect(reconciliationReasonCodes.INSUFFICIENT_EVIDENCE).toBe(
            "INSUFFICIENT_EVIDENCE",
        );
    });

    it("exposes reason codes as a stable union", () => {
        const reasonCode: ReconciliationReasonCode =
            reconciliationReasonCodes.AMOUNT_MISMATCH;

        expect(reasonCode).toBe("AMOUNT_MISMATCH");
    });
});