import { z } from "zod";

export const apiErrorSchema = z.object({
    error: z.object({
        code: z.string(),
        message: z.string(),
    }),
});

export type ApiError = z.infer<typeof apiErrorSchema>;

export const reconciliationJobStatusSchema = z.enum([
    "PENDING",
    "SYNCING",
    "RECONCILING",
    "COMPLETED",
    "FAILED",
]);

export type ReconciliationJobStatus = z.infer<
    typeof reconciliationJobStatusSchema
>;

export const reconciliationBatchStatusSchema = z.enum([
    "UPLOADED",
    "VALIDATING",
    "READY",
    "RUNNING",
    "COMPLETED",
    "FAILED",
]);

export type ReconciliationBatchStatus = z.infer<
    typeof reconciliationBatchStatusSchema
>;

const uuidSchema = z.uuid();

const dateSchema = z.string().date();

const timestampSchema = z.coerce.date();

export const reconciliationSyncResponseSchema = z.object({
    data: z.object({
        batchId: uuidSchema,
        sourceFileId: uuidSchema,
        status: reconciliationBatchStatusSchema,
        dateRange: z.object({
            from: dateSchema,
            to: dateSchema,
        }),
        counts: z.object({
            orders: z.number().int().nonnegative(),
            payments: z.number().int().nonnegative(),
            refunds: z.number().int().nonnegative(),
            settlements: z.number().int().nonnegative(),
            settlementRecon: z.number().int().nonnegative(),
            transactions: z.number().int().nonnegative(),
        }),
    }),
});

export type ReconciliationSyncResponse = z.infer<
    typeof reconciliationSyncResponseSchema
>;

export const reconciliationRunResponseSchema = z.object({
    data: z.object({
        batchId: uuidSchema,
        status: reconciliationBatchStatusSchema,
        processed: z.number().int().nonnegative(),
    }),
});

export type ReconciliationRunResponse = z.infer<
    typeof reconciliationRunResponseSchema
>;

export const reconciliationStatusResponseSchema = z.object({
    data: z.object({
        batchId: uuidSchema,
        status: reconciliationBatchStatusSchema,
        createdAt: timestampSchema,
        updatedAt: timestampSchema,
    }),
});

export type ReconciliationStatusResponse = z.infer<
    typeof reconciliationStatusResponseSchema
>;

// export const reconciliationResultsResponseSchema = z.object({
//     data: z.object({
//         batchId: uuidSchema,
//         results: z.array(z.record(z.string(), z.unknown())),
//     }),
// });

// export type ReconciliationResultsResponse = z.infer<
//     typeof reconciliationResultsResponseSchema
// >;

const reconciliationResultResponseSchema = z.object({
    id: z.uuid(),
    transactionId: z.uuid(),
    amount: z.number(),
    currency: z.string(),
    status: z.enum([
        "MATCHED",
        "NO_MATCH",
        "REVIEW_REQUIRED",
        "FAILED",
    ]),
    confidence: z.number().nullable(),
    reason: z.string().nullable(),
    createdAt: z.coerce.date(),
    updatedAt: z.coerce.date(),
});

export const reconciliationResultsResponseSchema =
    z.object({
        data: z.object({
            batchId: z.uuid(),
            results: z.array(
                reconciliationResultResponseSchema,
            ),
        }),
    });

export const reconciliationExceptionsResponseSchema = z.object({
    data: z.object({
        batchId: uuidSchema,
        exceptions: z.array(z.record(z.string(), z.unknown())),
    }),
});

export type ReconciliationExceptionsResponse = z.infer<
    typeof reconciliationExceptionsResponseSchema
>;

export const reconciliationAuditResponseSchema = z.object({
    data: z.object({
        batchId: uuidSchema,
        events: z.array(z.record(z.string(), z.unknown())),
    }),
});

export type ReconciliationAuditResponse = z.infer<
    typeof reconciliationAuditResponseSchema
>;