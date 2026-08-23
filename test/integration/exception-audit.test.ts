import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";

import { db } from "../../src/db/client.js";

import {
  createAuditEvent,
  createException,
} from "../../src/db/repositories/reconciliation.repository.js";

import { auditEvents, exceptions } from "../../src/db/schema/reconciliation.schema.js";

import { batches, sourceFiles, transactions } from "../../src/db/schema/transaction.schema.js";

describe("exceptions and audit events", () => {
  it("persists exceptions and audit events", async () => {
    const [batch] = await db
      .insert(batches)
      .values({
        status: "READY",
      })
      .returning();

    const [sourceFile] = await db
      .insert(sourceFiles)
      .values({
        batchId: batch!.id,
        fileName: "exception-test.csv",
        fileHash: "exception-test-hash",
        rowCount: 1,
      })
      .returning();

    const [transaction] = await db
      .insert(transactions)
      .values({
        batchId: batch!.id,
        sourceFileId: sourceFile!.id,
        externalId: "TXN-EXCEPTION-001",
        amount: "100.00",
        currency: "USD",
        transactionDate: "2026-08-23",
        reference: "REF-001",
        vendor: "Acme Corp",
        status: "REVIEW_REQUIRED",
        sourceRowNumber: 2,
      })
      .returning();

    const exception = await createException({
      transactionId: transaction!.id,
      severity: "HIGH",
      code: "AMOUNT_MISMATCH",
      message: "Transaction amount does not match candidate.",
    });

    const auditEvent = await createAuditEvent({
      batchId: batch!.id,
      transactionId: transaction!.id,
      eventType: "EXCEPTION_CREATED",
      message: "High severity amount mismatch created.",
      metadata: JSON.stringify({
        exceptionId: exception.id,
        code: exception.code,
      }),
    });

    expect(exception.code).toBe("AMOUNT_MISMATCH");
    expect(exception.severity).toBe("HIGH");
    expect(exception.status).toBe("OPEN");

    expect(auditEvent.eventType).toBe("EXCEPTION_CREATED");
    expect(auditEvent.transactionId).toBe(transaction!.id);

    await db.delete(auditEvents).where(eq(auditEvents.id, auditEvent.id));

    await db.delete(exceptions).where(eq(exceptions.id, exception.id));

    await db.delete(transactions).where(eq(transactions.id, transaction!.id));

    await db.delete(sourceFiles).where(eq(sourceFiles.id, sourceFile!.id));

    await db.delete(batches).where(eq(batches.id, batch!.id));
  });
});
