import { beforeEach, describe, expect, it, vi } from "vitest";

import { investigateRazorpayCandidates } from "../../src/investigation/tools/razorpay/razorpay-investigation.tools.js";

import { findRazorpayCandidates } from "../../src/reconciliation/retrieval/razorpay-candidate-retrieval.js";

vi.mock("../../src/reconciliation/retrieval/razorpay-candidate-retrieval.js", () => ({
  findRazorpayCandidates: vi.fn(),
}));

const mockedFindRazorpayCandidates = vi.mocked(findRazorpayCandidates);

describe("Razorpay investigation tools", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns native candidates from the Razorpay retrieval layer", async () => {
    mockedFindRazorpayCandidates.mockResolvedValue([
      {
        entityType: "PAYMENT",
        record: {
          id: "payment-db-id",
          externalId: "pay_test_123",
        },
        matchType: "NATIVE_ID",
        matchField: "external_id",
      },
    ]);

    const result = await investigateRazorpayCandidates({
      externalId: "pay_test_123",
    });

    expect(result.count).toBe(1);
    expect(result.nativeMatchFound).toBe(true);
    expect(result.candidates).toHaveLength(1);

    expect(result.candidates[0]).toMatchObject({
      entityType: "PAYMENT",
      matchType: "NATIVE_ID",
      matchField: "external_id",
    });

    expect(mockedFindRazorpayCandidates).toHaveBeenCalledWith({
      externalId: "pay_test_123",
    });
  });

  it("supports relationship-based investigation", async () => {
    mockedFindRazorpayCandidates.mockResolvedValue([
      {
        entityType: "REFUND",
        record: {
          id: "refund-db-id",
          paymentId: "payment-db-id",
        },
        matchType: "NATIVE_RELATIONSHIP",
        matchField: "payment_id",
      },
      {
        entityType: "SETTLEMENT_RECON",
        record: {
          id: "recon-db-id",
          paymentId: "payment-db-id",
        },
        matchType: "NATIVE_RELATIONSHIP",
        matchField: "payment_id",
      },
    ]);

    const result = await investigateRazorpayCandidates({
      paymentId: "payment-db-id",
    });

    expect(result.count).toBe(2);
    expect(result.nativeMatchFound).toBe(true);

    expect(
      result.candidates.some(
        (candidate) => candidate.entityType === "REFUND" && candidate.matchField === "payment_id",
      ),
    ).toBe(true);

    expect(
      result.candidates.some(
        (candidate) =>
          candidate.entityType === "SETTLEMENT_RECON" && candidate.matchField === "payment_id",
      ),
    ).toBe(true);
  });

  it("returns an empty investigation when no native candidates exist", async () => {
    mockedFindRazorpayCandidates.mockResolvedValue([]);

    const result = await investigateRazorpayCandidates({
      externalId: "unknown_id",
    });

    expect(result).toEqual({
      candidates: [],
      count: 0,
      nativeMatchFound: false,
    });
  });

  it("does not perform fuzzy matching itself", async () => {
    mockedFindRazorpayCandidates.mockResolvedValue([]);

    await investigateRazorpayCandidates({
      externalId: "pay_test_123",
      paymentId: "payment-db-id",
    });

    expect(mockedFindRazorpayCandidates).toHaveBeenCalledTimes(1);
  });
});
