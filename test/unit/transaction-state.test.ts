import { describe, expect, it } from "vitest";

import {
    canTransition,
    transitionTransactionState,
} from "../../src/reconciliation/state/transaction-state.js";

describe("transaction state machine", () => {
    it("allows PENDING → CANDIDATES_FOUND", () => {
        expect(canTransition("PENDING", "CANDIDATES_FOUND")).toBe(true);

        expect(
            transitionTransactionState("PENDING", "CANDIDATES_FOUND"),
        ).toBe("CANDIDATES_FOUND");
    });

    it("allows CANDIDATES_FOUND → MATCHED", () => {
        expect(canTransition("CANDIDATES_FOUND", "MATCHED")).toBe(true);
    });

    it("allows CANDIDATES_FOUND → NO_MATCH", () => {
        expect(canTransition("CANDIDATES_FOUND", "NO_MATCH")).toBe(true);
    });

    it("allows CANDIDATES_FOUND → REVIEW_REQUIRED", () => {
        expect(canTransition("CANDIDATES_FOUND", "REVIEW_REQUIRED")).toBe(true);
    });

    it("rejects MATCHED → PENDING", () => {
        expect(canTransition("MATCHED", "PENDING")).toBe(false);

        expect(() =>
            transitionTransactionState("MATCHED", "PENDING"),
        ).toThrow();
    });

    it("rejects NO_MATCH → MATCHED", () => {
        expect(canTransition("NO_MATCH", "MATCHED")).toBe(false);
    });

    it("rejects REVIEW_REQUIRED → MATCHED", () => {
        expect(canTransition("REVIEW_REQUIRED", "MATCHED")).toBe(false);
    });
});