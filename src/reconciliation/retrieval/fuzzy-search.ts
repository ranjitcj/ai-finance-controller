import Fuse from "fuse.js";

export interface FuzzySearchItem {
    id: string;
    vendor: string;
    reference?: string;
}

export interface FuzzySearchResult {
    id: string;
    score: number;
    matchedFields: string[];
}

export function searchFuzzyCandidates(
    input: {
        vendor: string;
        reference?: string;
    },
    items: FuzzySearchItem[],
): FuzzySearchResult[] {
    const fuse = new Fuse(items, {
        includeScore: true,
        includeMatches: true,
        threshold: 0.4,
        ignoreLocation: true,
        keys: [
            {
                name: "vendor",
                weight: 0.7,
            },
            {
                name: "reference",
                weight: 0.3,
            },
        ],
    });

    const searchTerms = [
        input.vendor,
        input.reference,
    ].filter(
        (value): value is string => Boolean(value),
    );

    const resultMap = new Map<string, FuzzySearchResult>();

    for (const term of searchTerms) {
        for (const result of fuse.search(term)) {
            const score = result.score ?? 1;

            const matchedFields =
                result.matches?.map((match) => match.key ?? "") ?? [];

            const existing = resultMap.get(result.item.id);

            if (!existing || score < existing.score) {
                resultMap.set(result.item.id, {
                    id: result.item.id,
                    score,
                    matchedFields,
                });
            }
        }
    }

    return Array.from(resultMap.values()).sort(
        (a, b) => a.score - b.score,
    );
}