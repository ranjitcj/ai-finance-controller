import { and, eq, gte, lte } from "drizzle-orm";
import Fuse from "fuse.js";

import { db } from "../../db/client.js";
import { transactions } from "../../db/schema/transaction.schema.js";
import type { NormalizedTransaction } from "../../domain/transaction/transaction.schema.js";

export interface FuzzyCandidate {
    transaction: typeof transactions.$inferSelect;
    score: number;
}

const FUZZY_THRESHOLD = 0.45;
const DEFAULT_TOP_K = 10;
const DATE_WINDOW_DAYS = 3;

function addDays(date: Date, days: number): string {
    const result = new Date(date);
    result.setUTCDate(result.getUTCDate() + days);

    return result.toISOString().slice(0, 10);
}

export async function findFuzzyCandidates(
    input: NormalizedTransaction,
    topK = DEFAULT_TOP_K,
): Promise<FuzzyCandidate[]> {
    if (topK <= 0) {
        return [];
    }

    const minimumDate = addDays(input.date, -DATE_WINDOW_DAYS);
    const maximumDate = addDays(input.date, DATE_WINDOW_DAYS);

    const rows = await db
        .select()
        .from(transactions)
        .where(
            and(
                eq(transactions.currency, input.currency),
                gte(transactions.transactionDate, minimumDate),
                lte(transactions.transactionDate, maximumDate),
            ),
        );

    if (rows.length === 0) {
        return [];
    }

    const fuse = new Fuse(rows, {
        includeScore: true,
        threshold: FUZZY_THRESHOLD,
        ignoreLocation: true,
        keys: [
            {
                name: "vendor",
                weight: 0.5,
            },
            {
                name: "reference",
                weight: 0.3,
            },
            {
                name: "externalId",
                weight: 0.2,
            },
        ],
    });

    const query = {
        vendor: input.vendor,
        reference: input.reference ?? "",
        externalId: input.externalId,
    };

    return fuse
        .search(query)
        .filter((result) => result.score !== undefined)
        .slice(0, topK)
        .map((result) => ({
            transaction: result.item,
            score: result.score ?? 1,
        }));
}