import { db } from "../client.js";
import { transactions } from "../schema/transaction.schema.js";

import type { NormalizedTransaction } from "../../domain/transaction/transaction.schema.js";

export interface CreateTransactionInput {
  batchId: string;
  sourceFileId: string;
  sourceRowNumber: number;
  transaction: NormalizedTransaction;
}

export async function createTransaction(input: CreateTransactionInput) {
  const [created] = await db
    .insert(transactions)
    .values({
      batchId: input.batchId,
      sourceFileId: input.sourceFileId,
      sourceRowNumber: input.sourceRowNumber,

      externalId: input.transaction.externalId,
      amount: input.transaction.amount,
      currency: input.transaction.currency,
      transactionDate: input.transaction.date.toISOString().slice(0, 10),
      reference: input.transaction.reference,
      vendor: input.transaction.vendor,
    })
    .returning();

  return created;
}
