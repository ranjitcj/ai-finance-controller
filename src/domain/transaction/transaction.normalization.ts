import {
  normalizedTransactionSchema,
  type RawTransaction,
  type NormalizedTransaction,
} from "./transaction.schema.js";
import { normalizeVendor } from "./vendor.normalization.js";
import { normalizeReference } from "./reference.normalization.js";
import { normalizeAmount } from "../money/money.js";
export function normalizeTransaction(input: RawTransaction): NormalizedTransaction {
  const normalized = {
    externalId: input.externalId.trim(),
    amount: normalizeAmount(input.amount),
    currency: input.currency.trim().toUpperCase(),
    date: input.date.trim(),
    reference: normalizeReference(input.reference),
    vendor: normalizeVendor(input.vendor),
  };

  return normalizedTransactionSchema.parse(normalized);
}
