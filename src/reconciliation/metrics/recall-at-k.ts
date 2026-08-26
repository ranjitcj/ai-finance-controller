export interface RecallAtKResult {
    k: number;
    found: boolean;
    recall: number;
}

export function calculateRecallAtK(
    rankedCandidateIds: string[],
    expectedCandidateId: string,
    k: number,
): RecallAtKResult {
    const topK = rankedCandidateIds.slice(0, k);

    const found = topK.includes(expectedCandidateId);

    return {
        k,
        found,
        recall: found ? 1 : 0,
    };
}