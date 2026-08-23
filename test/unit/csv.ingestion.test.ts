import { describe, expect, it } from "vitest";

import { ingestCsv } from "../../src/ingestion/csv/csv.ingestion.js";

describe("ingestCsv", () => {
  it("parses, validates, and normalizes a valid CSV", () => {
    const csv = `externalId,amount,currency,date,reference,vendor
 TXN-001 , 1250.00 , usd ,2026-08-23, REF-001 , Acme Corp
TXN-002,500.00,USD,2026-08-22,REF-002,Globex`;

    const result = ingestCsv(csv);

    expect(result.errors).toHaveLength(0);
    expect(result.transactions).toHaveLength(2);

    expect(result.transactions[0]).toEqual({
      rowNumber: 2,
      transaction: {
        externalId: "TXN-001",
        amount: "1250.00",
        currency: "USD",
        date: new Date("2026-08-23"),
        reference: "REF-001",
        vendor: "Acme Corp",
      },
    });
  });

  it("returns valid transactions and errors for mixed rows", () => {
    const csv = `externalId,amount,currency,date,reference,vendor
TXN-001,100.00,USD,2026-08-23,REF-001,Acme Corp
TXN-002,not-an-amount,USD,2026-08-23,REF-002,Globex`;

    const result = ingestCsv(csv);

    expect(result.transactions).toHaveLength(1);
    expect(result.transactions[0]?.rowNumber).toBe(2);
    expect(result.transactions[0]?.transaction.externalId).toBe("TXN-001");

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.rowNumber).toBe(3);
  });

  it("rejects an empty CSV", () => {
    expect(() => ingestCsv("")).toThrow("CSV input is empty");
  });
});
