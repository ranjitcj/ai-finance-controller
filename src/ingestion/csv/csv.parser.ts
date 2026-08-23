import { parse } from "csv-parse/sync";

import type { CsvParseResult } from "./csv.types.js";

export function parseCsv(input: string): CsvParseResult {
  if (!input.trim()) {
    throw new Error("CSV input is empty");
  }

  const rows = parse(input, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
  }) as Record<string, string>[];

  if (rows.length === 0) {
    throw new Error("CSV contains no data rows");
  }

  const headers = Object.keys(rows[0] ?? {});

  if (headers.length === 0) {
    throw new Error("CSV contains no headers");
  }

  return {
    rows,
    headers,
  };
}
