import { createBatch, updateBatchStatus } from "../../db/repositories/batch.repository.js";
import { createSourceFile } from "../../db/repositories/source-file.repository.js";
import { createTransaction } from "../../db/repositories/transaction.repository.js";

import {
    persistRazorpayOrders,
    persistRazorpayPayments,
    persistRazorpayRefunds,
    persistRazorpaySettlements,
    persistRazorpaySettlementRecons,
} from "../../db/repositories/razorpay.repository.js";

import {
    RazorpayClient,
} from "../../ingestion/razorpay/razorpay.client.js";

import {
    ingestRazorpay,
} from "../../ingestion/razorpay/razorpay.ingestion.js";

import type {
    DateRangeInput,
} from "../contracts/reconciliation.contract.js";

import { db } from "../../db/client.js";

export interface ReconciliationSyncServiceOptions {
    keyId: string;
    keySecret: string;
    baseUrl?: string;
    pageSize?: number;
    maxPages?: number;
}

export async function syncRazorpay(
    dateRange: DateRangeInput,
    options: ReconciliationSyncServiceOptions,
) {
    const batch = await createBatch();

    try {
        await updateBatchStatus(
            batch.id,
            "RUNNING",
        );

        const client = new RazorpayClient({
            keyId: options.keyId,
            keySecret: options.keySecret,
            baseUrl: options.baseUrl,
        });

        // Keep external API calls outside the database transaction.
        const ingestion = await ingestRazorpay(
            client,
            {
                pageSize: options.pageSize,
                maxPages: options.maxPages,
                dateRange,
            },
        );

        const persistenceResult = await db.transaction(
            async (tx) => {
                const sourceFile = await createSourceFile(
                    {
                        batchId: batch.id,
                        fileName: `razorpay-${dateRange.from}-${dateRange.to}`,
                        fileHash: [
                            dateRange.from,
                            dateRange.to,
                        ].join(":"),
                        rowCount:
                            ingestion.transactions.length,
                    },
                    tx,
                );

                await persistRazorpayOrders(
                    batch.id,
                    sourceFile.id,
                    ingestion.rawOrders,
                    tx,
                );

                await persistRazorpayPayments(
                    batch.id,
                    sourceFile.id,
                    ingestion.rawPayments,
                    tx,
                );

                await persistRazorpayRefunds(
                    batch.id,
                    sourceFile.id,
                    ingestion.rawRefunds,
                    tx,
                );

                await persistRazorpaySettlements(
                    batch.id,
                    sourceFile.id,
                    ingestion.rawSettlements,
                    tx,
                );

                await persistRazorpaySettlementRecons(
                    batch.id,
                    sourceFile.id,
                    ingestion.rawSettlementRecon,
                    tx,
                );

                for (
                    let index = 0;
                    index < ingestion.transactions.length;
                    index += 1
                ) {
                    const rawTransaction =
                        ingestion.transactions[index];

                    if (!rawTransaction) {
                        continue;
                    }

                    const normalizedTransaction = {
                        ...rawTransaction,
                        currency:
                            rawTransaction.currency.toUpperCase(),
                        date: new Date(rawTransaction.date),
                    };

                    await createTransaction(
                        {
                            batchId: batch.id,
                            sourceFileId: sourceFile.id,
                            sourceRowNumber: index + 1,
                            transaction:
                                normalizedTransaction,
                        },
                        tx,
                    );
                }

                return sourceFile;
            },
        );

        const completedBatch =
            await updateBatchStatus(
                batch.id,
                "COMPLETED",
            );

        return {
            batch: completedBatch,
            sourceFile: persistenceResult,
            counts: {
                orders: ingestion.rawOrders.length,
                payments: ingestion.rawPayments.length,
                refunds: ingestion.rawRefunds.length,
                settlements:
                    ingestion.rawSettlements.length,
                settlementRecon:
                    ingestion.rawSettlementRecon.length,
                transactions:
                    ingestion.transactions.length,
            },
        };
    } catch (error) {
        await updateBatchStatus(
            batch.id,
            "FAILED",
        );

        throw error;
    }
}