import { describe, expect, it } from "vitest";

import { calculateRecallAtK } from "../../src/reconciliation/metrics/recall-at-k.js";

describe("Recall@K", () => {
    it("returns recall 1 when expected candidate is inside top K", () => {
        const result = calculateRecallAtK(
            ["candidate-1", "candidate-2", "candidate-3"],
            "candidate-2",
            3,
        );

        expect(result.found).toBe(true);
        expect(result.recall).toBe(1);
    });

    it("returns recall 0 when expected candidate is outside top K", () => {
        const result = calculateRecallAtK(
            ["candidate-1", "candidate-2", "candidate-3"],
            "candidate-4",
            3,
        );

        expect(result.found).toBe(false);
        expect(result.recall).toBe(0);
    });

    it("does not consider candidates outside K", () => {
        const result = calculateRecallAtK(
            ["candidate-1", "candidate-2", "candidate-3"],
            "candidate-3",
            2,
        );

        expect(result.found).toBe(false);
        expect(result.recall).toBe(0);
    });
});