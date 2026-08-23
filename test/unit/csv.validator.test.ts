import { describe, expect, it } from "vitest";

import { validateCsvRows } from "../../src/ingestion/csv/csv.validator.js";

const validHeaders = ["externalId", "amount", "currency", "date", "reference", "vendor"];

describe("validateCsvRows", () => {
  it("accepts a valid row", () => {
    const result = validateCsvRows(validHeaders, [
      {
        externalId: "TXN-001",
        amount: "1250.00",
        currency: "USD",
        date: "2026-08-23",
        reference: "REF-001",
        vendor: "Acme Corp",
      },
    ]);

    expect(result.validRows).toHaveLength(1);
    expect(result.errors).toHaveLength(0);
  });

  it("reports missing required columns", () => {
    const headers = ["externalId", "amount", "currency", "date", "vendor"];

    const result = validateCsvRows(headers, []);

    expect(result.validRows).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.errors[0]).toContain("reference");
  });

  it("reports malformed amount", () => {
    const result = validateCsvRows(validHeaders, [
      {
        externalId: "TXN-001",
        amount: "abc",
        currency: "USD",
        date: "2026-08-23",
        reference: "REF-001",
        vendor: "Acme Corp",
      },
    ]);

    expect(result.validRows).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.rowNumber).toBe(2);
  });

  it("reports invalid currency", () => {
    const result = validateCsvRows(validHeaders, [
      {
        externalId: "TXN-001",
        amount: "100.00",
        currency: "US",
        date: "2026-08-23",
        reference: "REF-001",
        vendor: "Acme Corp",
      },
    ]);

    expect(result.validRows).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
  });

  it("reports malformed date", () => {
    const result = validateCsvRows(validHeaders, [
      {
        externalId: "TXN-001",
        amount: "100.00",
        currency: "USD",
        date: "not-a-date",
        reference: "REF-001",
        vendor: "Acme Corp",
      },
    ]);

    expect(result.validRows).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
  });

  it("keeps valid rows when another row is invalid", () => {
    const result = validateCsvRows(validHeaders, [
      {
        externalId: "TXN-001",
        amount: "100.00",
        currency: "USD",
        date: "2026-08-23",
        reference: "REF-001",
        vendor: "Acme Corp",
      },
      {
        externalId: "TXN-002",
        amount: "abc",
        currency: "USD",
        date: "2026-08-23",
        reference: "REF-002",
        vendor: "Globex",
      },
    ]);

    expect(result.validRows).toHaveLength(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.rowNumber).toBe(3);
  });
  it("reports duplicate external IDs", () => {
    const rows = [
      {
        externalId: "TXN-001",
        amount: "100.00",
        currency: "USD",
        date: "2026-08-23",
        reference: "REF-001",
        vendor: "Acme Corp",
      },
      {
        externalId: "TXN-001",
        amount: "100.00",
        currency: "USD",
        date: "2026-08-23",
        reference: "REF-002",
        vendor: "Acme Corp",
      },
    ];

    const result = validateCsvRows(validHeaders, rows);

    expect(result.validRows).toHaveLength(0);
    expect(result.errors).toHaveLength(2);
    expect(result.errors[0]?.errors[0]).toContain("Duplicate externalId");
  });
});
