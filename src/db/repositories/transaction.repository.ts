import { db } from "../client.js";
import { transactions } from "../schema/transaction.schema.js";
import { eq } from "drizzle-orm";
import type { NormalizedTransaction } from "../../domain/transaction/transaction.schema.js";
import {
  transitionTransactionState,
  type TransactionState,
} from "../../reconciliation/state/transaction-state.js";
export interface CreateTransactionInput {
  batchId: string;
  sourceFileId: string;
  sourceRowNumber: number;
  transaction: NormalizedTransaction;
}

export async function transitionTransaction(
  transactionId: string,
  to: TransactionState,
) {
  const [transaction] = await db
    .select()
    .from(transactions)
    .where(eq(transactions.id, transactionId))
    .limit(1);

  if (!transaction) {
    throw new Error(`Transaction not found: ${transactionId}`);
  }

  if (
    transaction.status === "INVESTIGATING" ||
    transaction.status === "FAILED"
  ) {
    throw new Error(
      `State ${transaction.status} is not supported by the deterministic state machine`,
    );
  }

  const nextState = transitionTransactionState(
    transaction.status,
    to,
  );

  const [updated] = await db
    .update(transactions)
    .set({
      status: nextState,
      updatedAt: new Date(),
    })
    .where(eq(transactions.id, transactionId))
    .returning();

  if (!updated) {
    throw new Error(`Failed to update transaction: ${transactionId}`);
  }

  return updated;
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

export type TransactionStatus =
  | "PENDING"
  | "CANDIDATES_FOUND"
  | "MATCHED"
  | "NO_MATCH"
  | "REVIEW_REQUIRED"
  | "FAILED";

export async function updateTransactionStatus(
  transactionId: string,
  status: TransactionStatus,
) {
  const [updated] = await db
    .update(transactions)
    .set({
      status,
      updatedAt: new Date(),
    })
    .where(eq(transactions.id, transactionId))
    .returning();

  if (!updated) {
    throw new Error(
      `Transaction not found: ${transactionId}`,
    );
  }

  return updated;
}