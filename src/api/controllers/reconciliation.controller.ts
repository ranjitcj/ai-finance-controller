import type { Request, Response } from "express";
import { parseParams } from "../validation.js";
import {
    reconciliationSyncRequestSchema,
    reconciliationIdParamsSchema,
    reconciliationRunParamsSchema,
} from "../contracts/reconciliation.contract.js";

import {
    runReconciliation,
} from "../services/reconciliation-run.service.js";

import {
    findAuditEventsByBatchId,
    findExceptionsByTransactionId,
    findReconciliationResultsByTransactionIds,
} from "../../db/repositories/reconciliation.repository.js";

import { findTransactionsByBatchId } from "../../db/repositories/transaction.repository.js";

import { syncRazorpay } from "../services/reconciliation-sync.service.js";

import { getBatch } from "../../db/repositories/batch.repository.js";

export async function syncReconciliation(
    request: Request,
    response: Response,
) {
    const input =
        reconciliationSyncRequestSchema.parse(
            request.body,
        );

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
        response.status(500).json({
            error: {
                code: "RAZORPAY_NOT_CONFIGURED",
                message:
                    "Razorpay credentials are not configured",
            },
        });

        return;
    }

    const result = await syncRazorpay(
        input,
        {
            keyId,
            keySecret,
            baseUrl:
                process.env.RAZORPAY_BASE_URL,
        },
    );

    response.status(201).json({
        data: {
            batchId: result.batch.id,
            sourceFileId: result.sourceFile.id,
            status: result.batch.status,
            dateRange: input,
            counts: result.counts,
        },
    });
}

export async function getReconciliationStatus(
    request: Request,
    response: Response,
) {
    const { id } =
        reconciliationIdParamsSchema.parse(
            request.params,
        );

    const batch = await getBatch(id);

    response.json({
        data: {
            batchId: batch.id,
            status: batch.status,
            createdAt: batch.createdAt,
            updatedAt: batch.updatedAt,
        },
    });
}

export async function getReconciliationResults(
    request: Request,
    response: Response,
) {
    const { id: batchId } = parseParams(
        reconciliationIdParamsSchema,
        request,
    );

    const batch = await getBatch(batchId);

    const transactions = await findTransactionsByBatchId(batch.id);

    const reconciliationResults =
        await findReconciliationResultsByTransactionIds(
            transactions.map((transaction) => transaction.id),
        );

    response.json({
        data: {
            batchId: batch.id,
            results: reconciliationResults,
        },
    });
}

export async function getReconciliationExceptions(
    request: Request,
    response: Response,
) {
    const { id: batchId } = parseParams(
        reconciliationIdParamsSchema,
        request,
    );

    const batch = await getBatch(batchId);

    const transactions = await findTransactionsByBatchId(batch.id);

    const exceptions = [];

    for (const transaction of transactions) {
        const transactionExceptions =
            await findExceptionsByTransactionId(transaction.id);

        exceptions.push(...transactionExceptions);
    }

    response.json({
        data: {
            batchId,
            exceptions,
        },
    });
}

export async function getReconciliationAudit(
    request: Request,
    response: Response,
) {
    const { id } =
        reconciliationIdParamsSchema.parse(
            request.params,
        );

    const batch = await getBatch(id);

    const events =
        await findAuditEventsByBatchId(id);

    response.json({
        data: {
            batchId: batch.id,
            events,
        },
    });
}

export async function runReconciliationController(
    request: Request,
    response: Response,
) {
    const { batchId } =
        reconciliationRunParamsSchema.parse(
            request.params,
        );

    const result =
        await runReconciliation(batchId);

    response.status(200).json({
        data: {
            batchId: result.batch.id,
            status: result.batch.status,
            processed: result.processed,
        },
    });
}