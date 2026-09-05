import { describe, expect, it } from "vitest";

import { GeminiInvestigationModel } from "../../src/investigation/providers/gemini/gemini-investigation-model.js";

describe("GeminiInvestigationModel", () => {
    it(
        "can produce an investigation decision",
        async () => {
            const model =
                new GeminiInvestigationModel();

            const decision =
                await model.decide({
                    originalInput: {
                        transactionId:
                            "txn_test_001",
                        reconciliation: {
                            state:
                                "REVIEW_REQUIRED",
                        },
                    },
                    observations: [],
                    iteration: 0,
                });

            expect([
                "TOOL_CALL",
                "FINAL",
            ]).toContain(decision.type);
        },
        30000,
    );
});