import { describe, expect, it } from "vitest";

import {
    rankCandidates,
    type RankedCandidate,
} from "../../src/reconciliation/retrieval/candidate-ranking.js";

import type { FuzzyCandidate } from "../../src/reconciliation/retrieval/fuzzy-retrieval.js";

import { takeTopK } from "../../src/reconciliation/retrieval/top-k.js";

function createCandidate(
    externalId: string,
    score: number,
): FuzzyCandidate {
    return {
        transaction: {
            id: `transaction-${externalId}`,
            externalId,
            amount: "100.00",
            currency: "USD",
            transactionDate: "2026-08-25",
            reference: "REF-001",
            vendor: "Acme Corp",
            status: "PENDING",
            batchId: "batch-001",
            sourceFileId: "source-file-001",
            sourceRowNumber: 2,
            createdAt: new Date(),
            updatedAt: new Date(),
        },
        score,
    };
}

describe("candidate ranking", () => {
    it("ranks lower Fuse scores first", () => {
        const candidates: FuzzyCandidate[] = [
            createCandidate("TXN-B", 0.4),
            createCandidate("TXN-A", 0.1),
        ];

        const ranked = rankCandidates(candidates);

        expect(
            ranked.map((candidate) => candidate.transaction.externalId),
        ).toEqual(["TXN-A", "TXN-B"]);
    });

    it("uses externalId as a deterministic tie breaker", () => {
        const candidates: FuzzyCandidate[] = [
            createCandidate("TXN-B", 0.2),
            createCandidate("TXN-A", 0.2),
        ];

        const ranked = rankCandidates(candidates);

        expect(
            ranked.map((candidate) => candidate.transaction.externalId),
        ).toEqual(["TXN-A", "TXN-B"]);
    });

    it("assigns deterministic ranks", () => {
        const candidates: FuzzyCandidate[] = [
            createCandidate("TXN-C", 0.3),
            createCandidate("TXN-A", 0.1),
            createCandidate("TXN-B", 0.2),
        ];

        const ranked = rankCandidates(candidates);

        expect(
            ranked.map((candidate) => ({
                externalId: candidate.transaction.externalId,
                rank: candidate.rank,
            })),
        ).toEqual([
            {
                externalId: "TXN-A",
                rank: 1,
            },
            {
                externalId: "TXN-B",
                rank: 2,
            },
            {
                externalId: "TXN-C",
                rank: 3,
            },
        ]);
    });

    it("limits candidates to top K", () => {
        const candidates: FuzzyCandidate[] = [
            createCandidate("TXN-A", 0.1),
            createCandidate("TXN-B", 0.2),
            createCandidate("TXN-C", 0.3),
        ];

        const ranked = rankCandidates(candidates);
        const topCandidates = takeTopK(ranked, 2);

        expect(topCandidates).toHaveLength(2);

        expect(
            topCandidates.map(
                (candidate) => candidate.transaction.externalId,
            ),
        ).toEqual(["TXN-A", "TXN-B"]);
    });

    it("returns an empty result when K is zero", () => {
        const candidates: FuzzyCandidate[] = [
            createCandidate("TXN-A", 0.1),
        ];

        const ranked: RankedCandidate[] = rankCandidates(candidates);

        expect(takeTopK(ranked, 0)).toEqual([]);
    });
});