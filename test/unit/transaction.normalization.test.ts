import { describe, expect, it } from "vitest";

import { normalizeTransaction } from "../../src/domain/transaction/transaction.normalization.js";

describe("normalizeTransaction", () => {
  it("normalizes basic transaction fields", () => {
    const result = normalizeTransaction({
      externalId: " TXN-001 ",
      amount: " 1250.00 ",
      currency: " usd ",
      date: "2026-08-23",
      reference: " REF-001 ",
      vendor: " Acme Corp ",
    });

    expect(result.externalId).toBe("TXN-001");
    expect(result.amount).toBe("1250.00");
    expect(result.currency).toBe("USD");
    expect(result.reference).toBe("ref001");
    expect(result.vendor).toBe("acme corp");
  });
  it("rejects an invalid currency", () => {
    expect(() =>
      normalizeTransaction({
        externalId: "TXN-002",
        amount: "100.00",
        currency: "US",
        date: "2026-08-23",
        reference: "REF-002",
        vendor: "Acme Corp",
      }),
    ).toThrow();
  });
  it("rejects a malformed amount", () => {
    expect(() =>
      normalizeTransaction({
        externalId: "TXN-003",
        amount: "not-an-amount",
        currency: "USD",
        date: "2026-08-23",
        reference: "REF-003",
        vendor: "Acme Corp",
      }),
    ).toThrow();
  });
});
