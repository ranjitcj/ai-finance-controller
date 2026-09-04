import { z } from "zod";

export const dateRangeSchema = z
    .object({
        from: z.iso.date(),
        to: z.iso.date(),
    })
    .refine(
        ({ from, to }) => from <= to,
        {
            message: "`from` must be before or equal to `to`",
            path: ["to"],
        },
    );

export type DateRangeInput = z.infer<typeof dateRangeSchema>;

export const reconciliationStatusParamsSchema = z.object({
    id: z.uuid(),
});

export type ReconciliationStatusParams =
    z.infer<typeof reconciliationStatusParamsSchema>;

export const reconciliationSyncRequestSchema =
    dateRangeSchema;

export type ReconciliationSyncRequest = z.infer<
    typeof reconciliationSyncRequestSchema
>;

export const reconciliationRunRequestSchema =
    dateRangeSchema;

export type ReconciliationRunRequest = z.infer<
    typeof reconciliationRunRequestSchema
>;

export const reconciliationIdParamsSchema =
    z.object({
        id: z.uuid(),
    });

export type ReconciliationIdParams = z.infer<
    typeof reconciliationIdParamsSchema
>;

export const reconciliationRunParamsSchema =
    z.object({
        batchId: z.uuid(),
    });

export type ReconciliationRunParams =
    z.infer<typeof reconciliationRunParamsSchema>;