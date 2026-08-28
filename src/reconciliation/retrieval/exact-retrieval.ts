import { and, eq, ne } from "drizzle-orm";

import { db } from "../../db/client.js";
import { transactions } from "../../db/schema/transaction.schema.js";
import type { NormalizedTransaction } from "../../domain/transaction/transaction.schema.js";

export async function findExactCandidates(
  input: NormalizedTransaction,
  sourceTransactionId?: string,
) {
  const transactionDate = input.date
    .toISOString()
    .slice(0, 10);

  const conditions = [
    eq(transactions.amount, input.amount),
    eq(transactions.currency, input.currency),
    eq(transactions.transactionDate, transactionDate),
  ];

  /*
   * The transaction being reconciled must not become
   * its own reconciliation candidate.
   */
  if (sourceTransactionId) {
    conditions.push(
      ne(transactions.id, sourceTransactionId),
    );
  }

  return db
    .select()
    .from(transactions)
    .where(and(...conditions));
}