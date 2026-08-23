import { and, eq } from "drizzle-orm";

import { db } from "../../db/client.js";
import { transactions } from "../../db/schema/transaction.schema.js";
import type { NormalizedTransaction } from "../../domain/transaction/transaction.schema.js";

export async function findExactCandidates(
  input: NormalizedTransaction,
) {
  const transactionDate = input.date.toISOString().slice(0, 10);

  return db
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.amount, input.amount),
        eq(transactions.currency, input.currency),
        eq(transactions.transactionDate, transactionDate),
      ),
    );
}