import type { FuzzyCandidate } from "./fuzzy-retrieval.js";

export interface RankedCandidate extends FuzzyCandidate {
    rank: number;
}

function normalize(value: string | null | undefined): string {
    return value?.trim().toLowerCase() ?? "";
}

export function rankCandidates(
    candidates: FuzzyCandidate[],
): RankedCandidate[] {
    return [...candidates]
        .sort((a, b) => {
            /*
             * Fuse score:
             * lower = better
             */
            if (a.score !== b.score) {
                return a.score - b.score;
            }

            /*
             * Deterministic tie-breaker:
             * external ID gives us a stable ordering when
             * Fuse produces identical scores.
             */
            const externalIdA = normalize(a.transaction.externalId);
            const externalIdB = normalize(b.transaction.externalId);

            return externalIdA.localeCompare(externalIdB);
        })
        .map((candidate, index) => ({
            ...candidate,
            rank: index + 1,
        }));
}