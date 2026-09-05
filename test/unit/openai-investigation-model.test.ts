import { describe, expect, it, vi } from "vitest";
import OpenAI from "openai";

import { OpenAIInvestigationModel } from "../../src/investigation/providers/openai/openai-investigation-model.js";

function createMockClient(response: unknown): OpenAI {
    return {
        responses: {
            create: vi.fn().mockResolvedValue(response),
        },
    } as unknown as OpenAI;
}

const context = {
    originalInput: {
        paymentId: "pay_test_001",
    },
    observations: [],
    iteration: 0,
};

describe("OpenAIInvestigationModel", () => {
    it("converts an OpenAI function call into a TOOL_CALL", async () => {
        const client = createMockClient({
            output: [
                {
                    type: "function_call",
                    name: "investigateRazorpayEntity",
                    arguments: JSON.stringify({
                        entityType: "PAYMENT",
                        externalId: "pay_test_001",
                    }),
                },
            ],
            output_text: "",
        });

        const model = new OpenAIInvestigationModel({
            client,
            model: "gpt-5.6-luna",
        });

        const result = await model.decide(context);

        expect(result).toEqual({
            type: "TOOL_CALL",
            call: {
                toolName: "investigateRazorpayEntity",
                input: {
                    entityType: "PAYMENT",
                    externalId: "pay_test_001",
                },
            },
        });
    });

    it("converts structured final output into a FINAL decision", async () => {
        const output = {
            finding: "Payment has a matching Razorpay order.",
            evidence: ["payment pay_test_001", "order order_test_001"],
            unresolvedQuestions: [],
        };

        const client = createMockClient({
            output: [
                {
                    type: "message",
                    content: [],
                },
            ],
            output_text: JSON.stringify(output),
        });

        const model = new OpenAIInvestigationModel({
            client,
            model: "gpt-5.6-luna",
        });

        const result = await model.decide(context);

        expect(result).toEqual({
            type: "FINAL",
            output,
        });
    });

    it("rejects malformed tool arguments", async () => {
        const client = createMockClient({
            output: [
                {
                    type: "function_call",
                    name: "investigateRazorpayEntity",
                    arguments: "{invalid-json",
                },
            ],
            output_text: "",
        });

        const model = new OpenAIInvestigationModel({
            client,
            model: "gpt-5.6-luna",
        });

        await expect(model.decide(context)).rejects.toThrow(
            "Investigation model returned malformed tool arguments.",
        );
    });

    it("rejects malformed final output", async () => {
        const client = createMockClient({
            output: [
                {
                    type: "message",
                    content: [],
                },
            ],
            output_text: "not-json",
        });

        const model = new OpenAIInvestigationModel({
            client,
            model: "gpt-5.6-luna",
        });

        await expect(model.decide(context)).rejects.toThrow(
            "Investigation model returned malformed output.",
        );
    });
});