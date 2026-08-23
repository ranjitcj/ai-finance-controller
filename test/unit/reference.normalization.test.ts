import { describe, expect, it } from "vitest";

import { normalizeReference } from "../../src/domain/transaction/reference.normalization.js";

describe("normalizeReference", () => {
  it("normalizes reference formatting", () => {
    expect(normalizeReference(" INV-001 / A ")).toBe("inv001a");
  });

  it("returns undefined for an empty reference", () => {
    expect(normalizeReference("   ")).toBeUndefined();
  });
});
