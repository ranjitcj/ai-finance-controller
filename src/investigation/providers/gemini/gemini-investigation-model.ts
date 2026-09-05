import { GoogleGenAI } from "@google/genai";

import type {
    InvestigationModel,
    InvestigationModelContext,
    InvestigationModelDecision,
} from "../../agent/types.js";

import {
    listInvestigationTools,
} from "../../agent/tool-registry.js";

import {
    investigationToolInputSchemas,
} from "../../agent/tool-validation.js";

const SYSTEM_PROMPT = `
You are a financial reconciliation investigator.

Your job is to investigate ambiguous reconciliation cases using ONLY the
available investigation tools.

You are NOT the financial decision maker.

Rules:
- Never invent financial facts.
- Never modify financial data.
- Never make MATCHED, NO_MATCH, or REVIEW_REQUIRED decisions.
- Never perform fuzzy matching.
- Never bypass deterministic reconciliation.
- Use investigation tools when additional evidence is required.
- Prefer native Razorpay identifiers and relationships.
- Base findings only on the original reconciliation context and observed
  tool results.
- Do not request tools that are not available.
- When enough evidence has been collected, return a concise final finding.

Final findings MUST be valid JSON.
Return exactly one JSON object with this shape:
{
  "summary": "concise investigation finding",
  "evidence": ["fact 1", "fact 2"],
  "financialStatus": "SUPPORTED" | "INCONCLUSIVE"
}

Do not use Markdown.
Do not wrap the JSON in code fences.
Do not return any text outside the JSON object.

"financialStatus" describes the evidence quality only.
It must NOT be a reconciliation decision such as MATCHED,
NO_MATCH, or REVIEW_REQUIRED.
`;

type GeminiFunctionDeclaration = {
    type: "function";
    name: string;
    description: string;
    parameters: Record<string, unknown>;
};

export interface GeminiInvestigationModelOptions {
    apiKey?: string;
    model?: string;
    client?: GoogleGenAI;
}

export class GeminiInvestigationModel
    implements InvestigationModel {
    private readonly client: GoogleGenAI;
    private readonly model: string;

    constructor(
        options: GeminiInvestigationModelOptions = {},
    ) {
        const apiKey =
            options.apiKey ??
            process.env.GEMINI_API_KEY;

        if (!apiKey && !options.client) {
            throw new Error(
                "GEMINI_API_KEY is required for GeminiInvestigationModel.",
            );
        }

        this.client =
            options.client ??
            new GoogleGenAI({
                apiKey,
            });

        const configuredModel =
            options.model ??
            process.env.GEMINI_MODEL;

        if (!configuredModel) {
            throw new Error(
                "GEMINI_MODEL is required for GeminiInvestigationModel.",
            );
        }

        this.model = configuredModel;
    }

    async decide(
        context: InvestigationModelContext,
    ): Promise<InvestigationModelDecision> {
        const response =
            await this.client.interactions.create({
                model: this.model,

                input: JSON.stringify({
                    originalInput:
                        context.originalInput,

                    observations:
                        context.observations,

                    iteration:
                        context.iteration,

                    availableTools:
                        listInvestigationTools(),
                }),

                system_instruction:
                    SYSTEM_PROMPT,

                tools: buildGeminiTools(),
            });

        const functionCall =
            response.steps?.find(
                (step) =>
                    step.type ===
                    "function_call",
            );

        if (
            functionCall &&
            functionCall.type ===
            "function_call"
        ) {
            if (!functionCall.name) {
                throw new Error(
                    "Investigation model returned a tool call without a tool name.",
                );
            }

            return {
                type: "TOOL_CALL",
                call: {
                    toolName:
                        functionCall.name,
                    input:
                        functionCall.arguments ??
                        {},
                },
            };
        }

        const text =
            response.output_text?.trim();

        if (!text) {
            throw new Error(
                "Investigation model returned malformed output.",
            );
        }

        let output: unknown;

        try {
            output = JSON.parse(text);
        } catch {
            throw new Error(
                "Investigation model returned malformed output.",
            );
        }

        return {
            type: "FINAL",
            output,
        };
    }
}

function buildGeminiTools():
    GeminiFunctionDeclaration[] {
    const modelToolNames = [
        "investigateRazorpayCandidates",
        "investigateRazorpayEntity",
        "investigatePaymentRefund",
        "investigateSettlement",
        "investigateSettlementReconciliation",
    ] as const;

    return modelToolNames.map((name) => {
        const schema =
            investigationToolInputSchemas[name];

        if (
            typeof schema.toJSONSchema !==
            "function"
        ) {
            throw new Error(
                `Investigation tool schema for ${name} does not support JSON Schema conversion.`,
            );
        }

        const jsonSchema =
            schema.toJSONSchema();

        if (
            typeof jsonSchema !== "object" ||
            jsonSchema === null
        ) {
            throw new Error(
                `Investigation tool schema for ${name} produced invalid JSON Schema.`,
            );
        }

        return {
            type: "function" as const,
            name,
            description:
                TOOL_DESCRIPTIONS[name] ??
                "Read-only financial investigation tool.",
            parameters:
                normalizeGeminiSchema(
                    jsonSchema as Record<
                        string,
                        unknown
                    >,
                ),
        };
    });
}

const TOOL_DESCRIPTIONS: Record<
    string,
    string
> = {
    investigateRazorpayCandidates:
        "Retrieve Razorpay-native candidate records using native identifiers or native relationships. Read-only.",

    investigateRazorpayEntity:
        "Retrieve one persisted Razorpay-native entity by entity type and external ID. Read-only.",

    investigatePaymentRefund:
        "Investigate a Razorpay payment and all natively related refunds, including deterministic refund reconciliation.",

    investigateSettlement:
        "Investigate a Razorpay settlement and its natively related SettlementRecon records, including deterministic reconciliation.",

    investigateSettlementReconciliation:
        "Investigate one Razorpay SettlementRecon and its native Settlement relationship, including deterministic reconciliation.",
};

function normalizeGeminiSchema(
    schema: Record<string, unknown>,
): Record<string, unknown> {
    const result: Record<string, unknown> = {
        ...schema,
    };

    delete result.$schema;
    delete result.propertyNames;
    delete result.patternProperties;

    if (
        typeof result.properties === "object" &&
        result.properties !== null
    ) {
        const properties =
            result.properties as Record<
                string,
                unknown
            >;

        result.properties =
            Object.fromEntries(
                Object.entries(properties).map(
                    ([key, value]) => [
                        key,
                        typeof value ===
                            "object" &&
                            value !== null
                            ? normalizeGeminiSchema(
                                value as Record<
                                    string,
                                    unknown
                                >,
                            )
                            : value,
                    ],
                ),
            );
    }

    if (
        typeof result.items === "object" &&
        result.items !== null
    ) {
        result.items =
            normalizeGeminiSchema(
                result.items as Record<
                    string,
                    unknown
                >,
            );
    }

    for (const keyword of [
        "anyOf",
        "oneOf",
        "allOf",
    ]) {
        const value = result[keyword];

        if (!Array.isArray(value)) {
            continue;
        }

        result[keyword] = value.map(
            (item) =>
                typeof item === "object" &&
                    item !== null
                    ? normalizeGeminiSchema(
                        item as Record<
                            string,
                            unknown
                        >,
                    )
                    : item,
        );
    }

    return result;
}