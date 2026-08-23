import { normalizeTransaction } from "../../domain/transaction/transaction.normalization.js";
import type { NormalizedTransaction } from "../../domain/transaction/transaction.schema.js";
import { parseCsv } from "./csv.parser.js";
import { validateCsvRows, type RowValidationError } from "./csv.validator.js";

export interface IngestedTransaction {
  rowNumber: number;
  transaction: NormalizedTransaction;
}

export interface CsvIngestionResult {
  transactions: IngestedTransaction[];
  errors: RowValidationError[];
}

export function ingestCsv(input: string): CsvIngestionResult {
  const parsed = parseCsv(input);

  const validation = validateCsvRows(parsed.headers, parsed.rows);

  const transactions: IngestedTransaction[] = [];
  const errors = [...validation.errors];

  for (const row of validation.validRows) {
    try {
      transactions.push({
        rowNumber: row.rowNumber,
        transaction: normalizeTransaction(row.transaction),
      });
    } catch (error) {
      errors.push({
        rowNumber: row.rowNumber,
        errors: [error instanceof Error ? error.message : "Transaction normalization failed"],
      });
    }
  }

  return {
    transactions,
    errors,
  };
}
