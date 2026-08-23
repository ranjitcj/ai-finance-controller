import { describe, expect, it } from "vitest";

import { db } from "../../src/db/client.js";

describe("database connection", () => {
  it("connects to PostgreSQL", async () => {
    const result = await db.execute("select 1 as result");

    expect(result.rows[0]?.result).toBe(1);
  });
});
