import { describe, expect, it } from "vitest";

import { normalizeAmount } from "../../src/domain/money/money.js";

describe("normalizeAmount", () => {
  it("normalizes whole amounts", () => {
    expect(normalizeAmount("100")).toBe("100.00");
  });

  it("normalizes one decimal place", () => {
    expect(normalizeAmount("100.5")).toBe("100.50");
  });

  it("rejects malformed amounts", () => {
    expect(() => normalizeAmount("100.555")).toThrow();
  });
});
