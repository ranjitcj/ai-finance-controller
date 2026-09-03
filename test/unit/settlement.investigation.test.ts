import { describe, expect, it, vi, beforeEach } from "vitest";

import {
    investigateSettlement,
} from "../../src/investigation/tools/razorpay/settlement.investigation.js";

import { findRazorpayCandidates } from "../../src/reconciliation/retrieval/razorpay-candidate-retrieval.js";

vi.mock(
    "../../src/reconciliation/retrieval/razorpay-candidate-retrieval.js",
    () => ({
        findRazorpayCandidates: vi.fn(),
    }),
);

const mockedFindRazorpayCandidates =
    vi.mocked(findRazorpayCandidates);

const baseSettlement = {
    id: "settlement-db-id",
    externalId: "setl_test_123",
    batchId: "batch-id",
    sourceFileId: "source-file-id",
    amount: "1000.00",
    currency: "INR",
    status: "PROCESSED" as const,
    sourceCreatedAt: new Date("2026-09-01T10:00:00Z"),
    rawPayload: {},
    createdAt: new Date(),
    updatedAt: new Date(),
};

const baseSettlementRecon = {
    id: "settlement-recon-db-id",
    externalId: "settlement_recon_test_123",
    paymentId: "payment-db-id",
    refundId: null,
    settlementId: "settlement-db-id",
    batchId: "batch-id",
    sourceFileId: "source-file-id",
    amount: "1000.00",
    currency: "INR",
    rawPayload: {},
    createdAt: new Date(),
    updatedAt: new Date(),
};

describe("Settlement investigation", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("investigates a settlement using its native external ID", async () => {
        mockedFindRazorpayCandidates
            .mockResolvedValueOnce([
                {
                    entityType: "SETTLEMENT",
                    record: baseSettlement,
                    matchType: "NATIVE_ID",
                    matchField: "external_id",
                },
            ])
            .mockResolvedValueOnce([]);

        const result = await investigateSettlement({
            settlementExternalId: "setl_test_123",
        });

        expect(result.found).toBe(true);
        expect(result.settlement?.id).toBe("settlement-db-id");
        expect(result.settlementRecons).toEqual([]);
        expect(result.reconciliations).toEqual([]);

        expect(
            mockedFindRazorpayCandidates,
        ).toHaveBeenCalledWith({
            settlementId: undefined,
            externalId: "setl_test_123",
        });
    });

    it("retrieves SettlementRecon through the native settlement relationship", async () => {
        mockedFindRazorpayCandidates
            .mockResolvedValueOnce([
                {
                    entityType: "SETTLEMENT",
                    record: baseSettlement,
                    matchType: "NATIVE_ID",
                    matchField: "external_id",
                },
            ])
            .mockResolvedValueOnce([
                {
                    entityType: "SETTLEMENT_RECON",
                    record: baseSettlementRecon,
                    matchType: "NATIVE_RELATIONSHIP",
                    matchField: "settlement_id",
                },
            ]);

        const result = await investigateSettlement({
            settlementExternalId: "setl_test_123",
        });

        expect(result.found).toBe(true);
        expect(result.settlementRecons).toHaveLength(1);
        expect(
            result.settlementRecons[0]?.settlementId,
        ).toBe("settlement-db-id");

        expect(
            mockedFindRazorpayCandidates,
        ).toHaveBeenNthCalledWith(2, {
            settlementId: "settlement-db-id",
        });
    });

    it("deterministically reconciles every native SettlementRecon", async () => {
        const secondSettlementRecon = {
            ...baseSettlementRecon,
            id: "settlement-recon-db-id-2",
            externalId: "settlement_recon_test_456",
        };

        mockedFindRazorpayCandidates
            .mockResolvedValueOnce([
                {
                    entityType: "SETTLEMENT",
                    record: baseSettlement,
                    matchType: "NATIVE_ID",
                    matchField: "external_id",
                },
            ])
            .mockResolvedValueOnce([
                {
                    entityType: "SETTLEMENT_RECON",
                    record: baseSettlementRecon,
                    matchType: "NATIVE_RELATIONSHIP",
                    matchField: "settlement_id",
                },
                {
                    entityType: "SETTLEMENT_RECON",
                    record: secondSettlementRecon,
                    matchType: "NATIVE_RELATIONSHIP",
                    matchField: "settlement_id",
                },
            ]);

        const result = await investigateSettlement({
            settlementExternalId: "setl_test_123",
        });

        expect(result.settlementRecons).toHaveLength(2);
        expect(result.reconciliations).toHaveLength(2);

        expect(
            result.reconciliations.every(
                (reconciliation) =>
                    reconciliation.status === "MATCHED",
            ),
        ).toBe(true);

        expect(
            result.reconciliations.every(
                (reconciliation) =>
                    reconciliation.evidence.length >= 4,
            ),
        ).toBe(true);
    });

    it("does not investigate without a native settlement identifier", async () => {
        const result = await investigateSettlement({});

        expect(result.found).toBe(false);
        expect(result.settlement).toBeNull();
        expect(result.settlementRecons).toEqual([]);
        expect(result.reconciliations).toEqual([]);

        expect(
            mockedFindRazorpayCandidates,
        ).not.toHaveBeenCalled();
    });

    it("returns not found when the settlement does not exist", async () => {
        mockedFindRazorpayCandidates.mockResolvedValueOnce([]);

        const result = await investigateSettlement({
            settlementId: "missing-settlement",
        });

        expect(result.found).toBe(false);
        expect(result.settlement).toBeNull();
        expect(result.settlementRecons).toEqual([]);
        expect(result.reconciliations).toEqual([]);
    });
});