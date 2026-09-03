import {
  executeInvestigationTool,
  hasInvestigationTool,
} from "./tool-registry.js";

import {
  InvestigationTimeoutError,
  withTimeout,
} from "./timeout.js";

import {
  assertInvestigationToolAllowed,
} from "./policy-guard.js";

import {
  validateInvestigationModelDecision,
} from "./model-validation.js";

import type {
  BoundedAgentOptions,
  BoundedAgentResult,
  InvestigationModel,
  InvestigationToolResult,
} from "./types.js";

const DEFAULT_MAX_ITERATIONS = 5;
const DEFAULT_TIMEOUT_MS = 10_000;

export async function runBoundedInvestigation(
  model: InvestigationModel,
  originalInput: unknown,
  options: Partial<BoundedAgentOptions> = {},
): Promise<BoundedAgentResult> {
  const maxIterations =
    options.maxIterations ?? DEFAULT_MAX_ITERATIONS;

  const timeoutMs =
    options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  if (
    !Number.isInteger(maxIterations) ||
    maxIterations <= 0
  ) {
    throw new Error(
      "maxIterations must be a positive integer.",
    );
  }

  if (
    !Number.isFinite(timeoutMs) ||
    timeoutMs <= 0
  ) {
    throw new Error(
      "timeoutMs must be greater than zero.",
    );
  }

  const observations: InvestigationToolResult[] = [];

  try {
    return await withTimeout(
      runInvestigationLoop(
        model,
        originalInput,
        maxIterations,
        observations,
      ),
      timeoutMs,
    );
  } catch (error) {
    if (error instanceof InvestigationTimeoutError) {
      return {
        status: "TIMEOUT",
        output: null,
        observations,
        iterations: observations.length,
      };
    }

    throw error;
  }
}

async function runInvestigationLoop(
  model: InvestigationModel,
  originalInput: unknown,
  maxIterations: number,
  observations: InvestigationToolResult[],
): Promise<BoundedAgentResult> {
  for (
    let iteration = 1;
    iteration <= maxIterations;
    iteration += 1
  ) {
    const rawDecision = await model.decide({
      originalInput,
      observations,
      iteration,
    });

    const decision =
      validateInvestigationModelDecision(rawDecision);

    if (decision.type === "FINAL") {
      return {
        status: "COMPLETED",
        output: decision.output,
        observations,
        iterations: iteration,
      };
    }

    assertInvestigationToolAllowed(
      decision.call.toolName,
    );

    if (!hasInvestigationTool(decision.call.toolName)) {
      throw new Error(
        `Investigation model requested an unavailable tool: ${decision.call.toolName}`,
      );
    }

    const result = await executeInvestigationTool(
      decision.call,
    );

    observations.push(result);
  }

  return {
    status: "MAX_ITERATIONS",
    output: null,
    observations,
    iterations: maxIterations,
  };
}