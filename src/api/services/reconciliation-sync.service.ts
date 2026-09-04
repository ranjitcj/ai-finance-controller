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

        const ingestion = await ingestRazorpay(
            client,
            {
                pageSize: options.pageSize,
                maxPages: options.maxPages,
                dateRange,
            },
        );

        const sourceFile = await createSourceFile({
            batchId: batch.id,
            fileName: `razorpay-${dateRange.from}-${dateRange.to}`,
            fileHash: [
                dateRange.from,
                dateRange.to,
            ].join(":"),
            rowCount: ingestion.transactions.length,
        });

        await persistRazorpayOrders(
            batch.id,
            sourceFile.id,
            ingestion.rawOrders,
        );

        await persistRazorpayPayments(
            batch.id,
            sourceFile.id,
            ingestion.rawPayments,
        );

        await persistRazorpayRefunds(
            batch.id,
            sourceFile.id,
            ingestion.rawRefunds,
        );

        await persistRazorpaySettlements(
            batch.id,
            sourceFile.id,
            ingestion.rawSettlements,
        );

        await persistRazorpaySettlementRecons(
            batch.id,
            sourceFile.id,
            ingestion.rawSettlementRecon,
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

            await createTransaction({
                batchId: batch.id,
                sourceFileId: sourceFile.id,
                sourceRowNumber: index + 1,
                transaction: normalizedTransaction,
            });
        }

        const completedBatch =
            await updateBatchStatus(
                batch.id,
                "COMPLETED",
            );

        return {
            batch: completedBatch,
            sourceFile,
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