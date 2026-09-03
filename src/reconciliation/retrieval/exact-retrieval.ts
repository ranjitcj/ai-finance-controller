import { and, eq, ne } from "drizzle-orm";

import { db } from "../../db/client.js";
import { transactions } from "../../db/schema/transaction.schema.js";
import type { NormalizedTransaction } from "../../domain/transaction/transaction.schema.js";

export type ExactCandidate =
    typeof transactions.$inferSelect;

/**
 * Find exact transaction candidates within the same batch
 * as the transaction being reconciled.
 *
 * Matching criteria:
 *   - same batch
 *   - same amount
 *   - same currency
 *   - same transaction date
 *
 * The source transaction itself is excluded.
 */
export async function findExactCandidates(
    input: NormalizedTransaction,
    sourceTransactionId?: string,
): Promise<ExactCandidate[]> {
    const transactionDate = input.date
        .toISOString()
        .slice(0, 10);

    /*
     * Resolve the source transaction's batch.
     *
     * The persisted transaction is the source of truth for
     * batch ownership.
     */
    let sourceBatchId: string | undefined;

    if (sourceTransactionId) {
        const [sourceTransaction] = await db
            .select({
                batchId: transactions.batchId,
            })
            .from(transactions)
            .where(
                eq(
                    transactions.id,
                    sourceTransactionId,
                ),
            )
            .limit(1);

        sourceBatchId = sourceTransaction?.batchId;
    }

    const conditions = [
        eq(transactions.amount, input.amount),
        eq(transactions.currency, input.currency),
        eq(
            transactions.transactionDate,
            transactionDate,
        ),
    ];

    /*
     * Scope exact candidates to the same batch.
     *
     * This prevents unrelated integration-test data or
     * another ingestion batch from becoming candidates.
     */
    if (sourceBatchId) {
        conditions.push(
            eq(
                transactions.batchId,
                sourceBatchId,
            ),
        );
    }

    /*
     * Never reconcile a transaction against itself.
     */
    if (sourceTransactionId) {
        conditions.push(
            ne(
                transactions.id,
                sourceTransactionId,
            ),
        );
    }

    return db
        .select()
        .from(transactions)
        .where(and(...conditions));
}