import type { RankedCandidate } from "./candidate-ranking.js";

export function takeTopK(
    candidates: RankedCandidate[],
    k: number,
): RankedCandidate[] {
    if (k <= 0) {
        return [];
    }

    return candidates.slice(0, k);
}