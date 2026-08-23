import { describe, expect, it } from "vitest";

import { normalizeVendor } from "../../src/domain/transaction/vendor.normalization.js";

describe("normalizeVendor", () => {
  it("normalizes whitespace and case", () => {
    expect(normalizeVendor("  ACME   CORP  ")).toBe("acme corp");
  });

  it("normalizes punctuation", () => {
    expect(normalizeVendor("Acme-Corp.")).toBe("acme corp");
  });
});
