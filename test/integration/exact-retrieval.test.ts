import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "../../src/db/client.js";
import { findExactCandidates } from "../../src/reconciliation/retrieval/exact-retrieval.js";
import crypto from "node:crypto";
import {
    batches,
    sourceFiles,
    transactions,
} from "../../src/db/schema/transaction.schema.js";

describe("exact candidate retrieval", () => {
    it("finds a transaction with the same amount, currency, and date", async () => {
        // insert
        const [batch] = await db
            .insert(batches)
            .values({
                status: "READY",
            })
            .returning();

        const externalId = `RETRIEVAL-${crypto.randomUUID()}`;

        const [sourceFile] = await db
            .insert(sourceFiles)
            .values({
                batchId: batch!.id,
                fileName: "retrieval-test.csv",
                fileHash: `retrieval-${crypto.randomUUID()}`,
                rowCount: 1,
            })
            .returning();

        const amount = "9876.54";
        const currency = "GBP";
        const date = "2026-08-23";

        await db.insert(transactions).values({
            batchId: batch!.id,
            sourceFileId: sourceFile!.id,
            externalId,
            amount,
            currency,
            transactionDate: date,
            reference: "ref001",
            vendor: "acme corp",
            status: "PENDING",
            sourceRowNumber: 2,
        });

        const [differentTransaction] = await db
            .insert(transactions)
            .values({
                batchId: batch!.id,
                sourceFileId: sourceFile!.id,
                externalId: `RETRIEVAL-${crypto.randomUUID()}`,
                amount: "1250.00",
                currency: "USD",
                transactionDate: date,
                reference: "ref001",
                vendor: "acme corp",
                status: "PENDING",
                sourceRowNumber: 2,
            })
            .returning();

        // retrieve
        const results = await findExactCandidates({
            externalId: `TEST-${crypto.randomUUID()}`,
            amount,
            currency,
            date: new Date(`${date}T00:00:00.000Z`),
            reference: "ref001",
            vendor: "acme corp",
        });

        // assert
        expect(results.length).toBeGreaterThanOrEqual(1);

        expect(
            results.some(
                (transaction) => transaction.externalId === externalId,
            ),
        ).toBe(true);

        expect(
            results.some(
                (transaction) =>
                    transaction.amount === amount &&
                    transaction.currency === currency &&
                    transaction.transactionDate === date,
            ),
        ).toBe(true);

        expect(
            results.some(
                (transaction) =>
                    transaction.externalId === differentTransaction!.externalId,
            ),
        ).toBe(false);

        // cleanup
        await db
            .delete(transactions)
            .where(eq(transactions.id, differentTransaction!.id));

        await db
            .delete(transactions)
            .where(eq(transactions.externalId, externalId));

        await db
            .delete(sourceFiles)
            .where(eq(sourceFiles.id, sourceFile!.id));

        await db
            .delete(batches)
            .where(eq(batches.id, batch!.id));
    });

    it("does not retrieve a transaction on a different date", async () => {
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
                fileName: "retrieval-date-test.csv",
                fileHash: `retrieval-${crypto.randomUUID()}`,
                rowCount: 1,
            })
            .returning();

        const externalId = `RETRIEVAL-${crypto.randomUUID()}`;

        await db.insert(transactions).values({
            batchId: batch!.id,
            sourceFileId: sourceFile!.id,
            externalId,
            amount: "9876.54",
            currency: "GBP",
            transactionDate: "2026-08-23",
            reference: "ref001",
            vendor: "acme corp",
            status: "PENDING",
            sourceRowNumber: 2,
        });

        const results = await findExactCandidates({
            externalId: `TEST-${crypto.randomUUID()}`,
            amount: "9876.54",
            currency: "GBP",
            date: new Date("2026-08-24T00:00:00.000Z"),
            reference: "ref001",
            vendor: "acme corp",
        });

        expect(results).toHaveLength(0);

        await db
            .delete(transactions)
            .where(eq(transactions.externalId, externalId));

        await db
            .delete(sourceFiles)
            .where(eq(sourceFiles.id, sourceFile!.id));

        await db
            .delete(batches)
            .where(eq(batches.id, batch!.id));
    });
});