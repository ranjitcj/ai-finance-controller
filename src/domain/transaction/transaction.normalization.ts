import {
  normalizedTransactionSchema,
  type RawTransaction,
  type NormalizedTransaction,
} from "./transaction.schema.js";

export function normalizeTransaction(input: RawTransaction): NormalizedTransaction {
  const normalized = {
    externalId: input.externalId.trim(),
    amount: input.amount.trim(),
    currency: input.currency.trim().toUpperCase(),
    date: input.date.trim(),
    reference: input.reference?.trim() || undefined,
    vendor: input.vendor.trim(),
  };

  return normalizedTransactionSchema.parse(normalized);
}
