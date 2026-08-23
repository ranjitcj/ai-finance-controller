import { describe, expect, it } from "vitest";

import { parseCsv } from "../../src/ingestion/csv/csv.parser.js";

describe("parseCsv", () => {
  it("parses a valid CSV", () => {
    const csv = `externalId,amount,currency,date,reference,vendor
TXN-001,1250.00,USD,2026-08-23,REF-001,Acme Corp
TXN-002,500.00,USD,2026-08-22,REF-002,Globex`;

    const result = parseCsv(csv);

    expect(result.headers).toEqual([
      "externalId",
      "amount",
      "currency",
      "date",
      "reference",
      "vendor",
    ]);

    expect(result.rows).toHaveLength(2);

    expect(result.rows[0]).toEqual({
      externalId: "TXN-001",
      amount: "1250.00",
      currency: "USD",
      date: "2026-08-23",
      reference: "REF-001",
      vendor: "Acme Corp",
    });
  });

  it("rejects empty CSV input", () => {
    expect(() => parseCsv("")).toThrow("CSV input is empty");
  });

  it("rejects CSV with no data rows", () => {
    expect(() => parseCsv("externalId,amount,currency,date,reference,vendor")).toThrow(
      "CSV contains no data rows",
    );
  });
});
