export type CsvRow = Record<string, string>;

export interface CsvParseResult {
  rows: CsvRow[];
  headers: string[];
}
