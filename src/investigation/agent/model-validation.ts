import { z } from "zod";

import type { InvestigationModelDecision } from "./types.js";

const investigationToolCallSchema = z.object({
    toolName: z.string().trim().min(1),
    input: z.unknown(),
});

const investigationModelDecisionSchema = z.discriminatedUnion(
    "type",
    [
        z.object({
            type: z.literal("TOOL_CALL"),
            call: investigationToolCallSchema,
        }),
        z.object({
            type: z.literal("FINAL"),
            output: z.unknown(),
        }),
    ],
);

export function validateInvestigationModelDecision(
    decision: unknown,
): InvestigationModelDecision {
    const result =
        investigationModelDecisionSchema.safeParse(decision);

    if (!result.success) {
        throw new Error(
            "Investigation model returned malformed output.",
        );
    }

    return result.data;
}