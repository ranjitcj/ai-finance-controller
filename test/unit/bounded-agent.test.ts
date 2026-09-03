import { describe, expect, it, vi } from "vitest";

import { runBoundedInvestigation } from "../../src/investigation/agent/bounded-agent.js";

describe("Bounded investigation agent", () => {
  it("allows the model to use an approved investigation tool", async () => {
    const model = {
      decide: vi
        .fn()
        .mockResolvedValueOnce({
          type: "TOOL_CALL" as const,
          call: {
            toolName: "investigateRazorpayCandidates",
            input: {
              externalId: "pay_123",
            },
          },
        })
        .mockResolvedValueOnce({
          type: "FINAL" as const,
          output: {
            conclusion: "investigation complete",
          },
        }),
    };

    const result = await runBoundedInvestigation(model, {
      externalId: "pay_123",
    });

    expect(result.status).toBe("COMPLETED");
    expect(result.iterations).toBe(2);
    expect(result.observations).toHaveLength(1);

    expect(model.decide).toHaveBeenCalledTimes(2);
  });

  it("stops after the configured iteration limit", async () => {
    const model = {
      decide: vi.fn().mockResolvedValue({
        type: "TOOL_CALL" as const,
        call: {
          toolName: "investigateRazorpayCandidates",
          input: {
            externalId: "pay_123",
          },
        },
      }),
    };

    const result = await runBoundedInvestigation(
      model,
      {
        externalId: "pay_123",
      },
      {
        maxIterations: 3,
      },
    );

    expect(result.status).toBe("MAX_ITERATIONS");
    expect(result.iterations).toBe(3);
    expect(model.decide).toHaveBeenCalledTimes(3);
  });

  it("blocks the agent from invoking the Decision Policy", async () => {
    const model = {
      decide: vi.fn().mockResolvedValue({
        type: "TOOL_CALL" as const,
        call: {
          toolName: "applyDecisionPolicy",
          input: {},
        },
      }),
    };

    await expect(
      runBoundedInvestigation(model, {}),
    ).rejects.toThrow(
      "Investigation agent cannot invoke financial decision tool: applyDecisionPolicy",
    );
  });

  it("accepts a final model response without calling a tool", async () => {
    const model = {
      decide: vi.fn().mockResolvedValue({
        type: "FINAL" as const,
        output: {
          status: "REVIEW_REQUIRED",
        },
      }),
    };

    const result = await runBoundedInvestigation(model, {});

    expect(result.status).toBe("COMPLETED");
    expect(result.output).toEqual({
      status: "REVIEW_REQUIRED",
    });

    expect(result.observations).toHaveLength(0);
    expect(model.decide).toHaveBeenCalledTimes(1);
  });

  it("rejects an invalid iteration limit", async () => {
    const model = {
      decide: vi.fn(),
    };

    await expect(
      runBoundedInvestigation(
        model,
        {},
        {
          maxIterations: 0,
        },
      ),
    ).rejects.toThrow(
      "maxIterations must be a positive integer.",
    );
  });

  it("rejects an invalid timeout", async () => {
    const model = {
      decide: vi.fn(),
    };

    await expect(
      runBoundedInvestigation(
        model,
        {},
        {
          timeoutMs: 0,
        },
      ),
    ).rejects.toThrow(
      "timeoutMs must be greater than zero.",
    );
  });

  it("rejects a malformed model decision", async () => {
    const model = {
      decide: async () => ({
        invalid: true,
      }),
    };

    await expect(
      runBoundedInvestigation(
        model,
        { paymentId: "pay_123" },
      ),
    ).rejects.toThrow(
      "Investigation model returned malformed output.",
    );
  });

  it("rejects a tool call without a tool name", async () => {
    const model = {
      decide: async () => ({
        type: "TOOL_CALL",
        call: {
          input: {},
        },
      }),
    };

    await expect(
      runBoundedInvestigation(
        model,
        { paymentId: "pay_123" },
      ),
    ).rejects.toThrow(
      "Investigation model returned malformed output.",
    );
  });

  it("rejects a tool call without a call object", async () => {
    const model = {
      decide: async () => ({
        type: "TOOL_CALL",
      }),
    };

    await expect(
      runBoundedInvestigation(
        model,
        { paymentId: "pay_123" },
      ),
    ).rejects.toThrow(
      "Investigation model returned malformed output.",
    );
  });

  it("rejects an unknown decision type", async () => {
    const model = {
      decide: async () => ({
        type: "UNKNOWN",
        output: "something",
      }),
    };

    await expect(
      runBoundedInvestigation(
        model,
        { paymentId: "pay_123" },
      ),
    ).rejects.toThrow(
      "Investigation model returned malformed output.",
    );
  });
});