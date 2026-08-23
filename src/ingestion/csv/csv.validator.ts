import {
  rawTransactionSchema,
  type RawTransaction,
} from "../../domain/transaction/transaction.schema.js";

import type { CsvRow } from "./csv.types.js";

const REQUIRED_COLUMNS = [
  "externalId",
  "amount",
  "currency",
  "date",
  "reference",
  "vendor",
] as const;

export interface RowValidationError {
  rowNumber: number;
  errors: string[];
}

export interface ValidatedRow {
  rowNumber: number;
  transaction: RawTransaction;
}

export interface CsvValidationResult {
  validRows: ValidatedRow[];
  errors: RowValidationError[];
}

function findDuplicateExternalIds(rows: ValidatedRow[]): Set<string> {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const row of rows) {
    const externalId = row.transaction.externalId;

    if (seen.has(externalId)) {
      duplicates.add(externalId);
    }

    seen.add(externalId);
  }

  return duplicates;
}

export function validateCsvRows(headers: string[], rows: CsvRow[]): CsvValidationResult {
  const errors: RowValidationError[] = [];

  const missingColumns = REQUIRED_COLUMNS.filter((column) => !headers.includes(column));

  if (missingColumns.length > 0) {
    return {
      validRows: [],
      errors: [
        {
          rowNumber: 1,
          errors: [`Missing required columns: ${missingColumns.join(", ")}`],
        },
      ],
    };
  }

  const validRows: ValidatedRow[] = [];

  rows.forEach((row, index) => {
    const rowNumber = index + 2;

    const result = rawTransactionSchema.safeParse(row);

    if (!result.success) {
      errors.push({
        rowNumber,
        errors: result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`),
      });

      return;
    }

    validRows.push({
      rowNumber,
      transaction: result.data,
    });
  });

  const duplicateIds = findDuplicateExternalIds(validRows);

  if (duplicateIds.size > 0) {
    const duplicateRows = validRows.filter((row) => duplicateIds.has(row.transaction.externalId));

    for (const row of duplicateRows) {
      errors.push({
        rowNumber: row.rowNumber,
        errors: [`Duplicate externalId: ${row.transaction.externalId}`],
      });
    }
  }

  return {
    validRows: validRows.filter((row) => !duplicateIds.has(row.transaction.externalId)),
    errors,
  };
}
