import OpenAI from "openai";

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
- When enough evidence has been collected, return a concise final finding.
- Do not request tools that are not available.
`;

const FINAL_RESPONSE_SCHEMA = {
    type: "object",
    additionalProperties: false,
    properties: {
        finding: {
            type: "string",
        },
        evidence: {
            type: "array",
            items: {
                type: "string",
            },
        },
        unresolvedQuestions: {
            type: "array",
            items: {
                type: "string",
            },
        },
    },
    required: [
        "finding",
        "evidence",
        "unresolvedQuestions",
    ],
} as const;

const TOOL_DESCRIPTIONS: Record<string, string> = {
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

    comparePaymentRefundFinancialEvidence:
        "Compare persisted payment and refund financial evidence using deterministic financial aggregation.",

    compareSettlementFinancialEvidence:
        "Compare persisted SettlementRecon and Settlement financial evidence using deterministic financial comparison.",
};

type OpenAIFunctionTool = {
    type: "function";
    name: string;
    description: string;
    parameters: Record<string, unknown>;
    strict: true;
};

export interface OpenAIInvestigationModelOptions {
    apiKey?: string;
    model?: string;
    client?: OpenAI;
}

export class OpenAIInvestigationModel
    implements InvestigationModel {
    private readonly client: OpenAI;
    private readonly model: string;

    constructor(
        options: OpenAIInvestigationModelOptions = {},
    ) {
        this.client =
            options.client ??
            new OpenAI({
                apiKey:
                    options.apiKey ??
                    process.env.OPENAI_API_KEY,
            });

        const configuredModel =
            options.model ??
            process.env.OPENAI_MODEL;

        if (!configuredModel) {
            throw new Error(
                "OPENAI_MODEL is required for OpenAIInvestigationModel.",
            );
        }

        this.model = configuredModel;
    }

    async decide(
        context: InvestigationModelContext,
    ): Promise<InvestigationModelDecision> {
        const response =
            await this.client.responses.create({
                model: this.model,

                instructions: SYSTEM_PROMPT,

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

                tools:
                    buildOpenAITools(),

                text: {
                    format: {
                        type: "json_schema",
                        name: "investigation_final_finding",
                        strict: true,
                        schema:
                            FINAL_RESPONSE_SCHEMA,
                    },
                },
            });

        /*
         * The OpenAI provider does NOT execute tools.
         *
         * It converts the model's function call into the existing
         * InvestigationModelDecision format.
         *
         * The bounded agent then:
         *
         *   model
         *      ↓
         *   validates tool call
         *      ↓
         *   policy guard
         *      ↓
         *   existing tool registry
         *      ↓
         *   observation
         */
        const functionCall =
            response.output.find(
                (item) =>
                    item.type ===
                    "function_call",
            );

        if (functionCall) {
            let input: unknown;

            try {
                input = JSON.parse(
                    functionCall.arguments,
                );
            } catch {
                throw new Error(
                    "Investigation model returned malformed tool arguments.",
                );
            }

            return {
                type: "TOOL_CALL",
                call: {
                    toolName: functionCall.name,
                    input,
                },
            };
        }

        /*
         * Final structured finding.
         */
        const text =
            response.output_text.trim();

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

function getOpenAIParameters(
    name: string,
    schema: {
        toJSONSchema?: () => unknown;
    },
): Record<string, unknown> {
    /*
     * Persisted Razorpay records use dynamic database fields.
     *
     * OpenAI strict function schemas cannot safely describe
     * arbitrary object keys. Therefore the OpenAI boundary
     * represents these records as JSON strings.
     *
     * The application's Zod validation remains authoritative
     * when the bounded agent executes the tool.
     */
    if (
        name ===
        "comparePaymentRefundFinancialEvidence"
    ) {
        return {
            type: "object",
            additionalProperties: false,
            properties: {
                payment: {
                    type: "string",
                    description:
                        "JSON-encoded persisted Razorpay payment record.",
                },
                refunds: {
                    type: "array",
                    items: {
                        type: "string",
                        description:
                            "JSON-encoded persisted Razorpay refund record.",
                    },
                },
            },
            required: [
                "payment",
                "refunds",
            ],
        };
    }

    if (
        name ===
        "compareSettlementFinancialEvidence"
    ) {
        return {
            type: "object",
            additionalProperties: false,
            properties: {
                settlementRecon: {
                    type: "string",
                    description:
                        "JSON-encoded persisted Razorpay SettlementRecon record.",
                },
                settlement: {
                    type: "string",
                    description:
                        "JSON-encoded persisted Razorpay settlement record.",
                },
            },
            required: [
                "settlementRecon",
                "settlement",
            ],
        };
    }

    if (
        typeof schema.toJSONSchema !==
        "function"
    ) {
        throw new Error(
            "Zod schema does not support JSON Schema conversion.",
        );
    }

    const jsonSchema =
        schema.toJSONSchema();

    if (
        typeof jsonSchema !== "object" ||
        jsonSchema === null
    ) {
        throw new Error(
            "Investigation tool schema produced invalid JSON Schema.",
        );
    }

    return makeOpenAIStrictSchema(
        jsonSchema as Record<string, unknown>,
    );
}
function buildOpenAITools(): OpenAIFunctionTool[] {
    const modelToolNames = [
        "investigateRazorpayCandidates",
        "investigateRazorpayEntity",
        "investigatePaymentRefund",
        "investigateSettlement",
        "investigateSettlementReconciliation",
    ] as const;

    return modelToolNames.map((name) => {
        const schema = investigationToolInputSchemas[name];

        return {
            type: "function" as const,
            name,
            description:
                TOOL_DESCRIPTIONS[name] ??
                "Read-only financial investigation tool.",
            parameters: getOpenAIParameters(name, schema),
            strict: true as const,
        };
    });
}

/*
 * Normalize Zod JSON Schema into the subset supported by
 * OpenAI strict function calling.
 */
function makeOpenAIStrictSchema(
    schema: Record<string, unknown>,
): Record<string, unknown> {
    const result: Record<string, unknown> = {
        ...schema,
    };

    /*
     * Zod can generate JSON Schema keywords that OpenAI
     * strict function tools do not permit.
     */
    delete result.$schema;
    delete result.propertyNames;
    delete result.patternProperties;

    /*
     * Strict OpenAI object schemas require:
     *
     *   required = every property
     *   additionalProperties = false
     */
    if (
        result.type === "object" &&
        typeof result.properties === "object" &&
        result.properties !== null
    ) {
        const properties =
            result.properties as Record<
                string,
                unknown
            >;

        result.required =
            Object.keys(properties);

        result.additionalProperties = false;

        result.properties =
            Object.fromEntries(
                Object.entries(properties).map(
                    ([key, value]) => [
                        key,
                        makeOpenAIStrictProperty(
                            value,
                        ),
                    ],
                ),
            );
    }

    /*
     * OpenAI strict schemas do not allow an arbitrary
     * additionalProperties schema.
     */
    if (
        typeof result.additionalProperties ===
        "object" &&
        result.additionalProperties !== null
    ) {
        result.additionalProperties = false;
    }

    /*
     * Recursively normalize array item schemas.
     */
    if (Array.isArray(result.items)) {
        result.items = result.items.map(
            (item) =>
                typeof item === "object" &&
                    item !== null
                    ? makeOpenAIStrictSchema(
                        item as Record<
                            string,
                            unknown
                        >,
                    )
                    : item,
        );
    } else if (
        typeof result.items === "object" &&
        result.items !== null
    ) {
        result.items =
            makeOpenAIStrictSchema(
                result.items as Record<
                    string,
                    unknown
                >,
            );
    }

    /*
     * Recursively normalize schemas inside
     * anyOf / oneOf / allOf.
     */
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
                    ? makeOpenAIStrictSchema(
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

function makeOpenAIStrictProperty(
    property: unknown,
): unknown {
    if (
        typeof property !== "object" ||
        property === null
    ) {
        return property;
    }

    return makeOpenAIStrictSchema(
        property as Record<
            string,
            unknown
        >,
    );
}