import { z } from "zod";

const razorpayListResponseSchema = <T extends z.ZodTypeAny>(
    itemSchema: T,
) =>
    z.object({
        items: z.array(itemSchema),
    });

export const razorpayOrderSchema = z.object({
    id: z.string().min(1),
    entity: z.literal("order").optional(),
    amount: z.number(),
    currency: z.string().length(3),
    status: z.string().min(1),
    created_at: z.number().optional(),
});

export const razorpayPaymentSchema = z.object({
    id: z.string().min(1),
    entity: z.literal("payment").optional(),
    amount: z.number(),
    currency: z.string().length(3),
    status: z.string().min(1),
    order_id: z.string().optional(),
    created_at: z.number().optional(),
});

export const razorpayRefundSchema = z.object({
    id: z.string().min(1),
    entity: z.literal("refund").optional(),
    amount: z.number(),
    currency: z.string().length(3),
    payment_id: z.string().min(1),
    status: z.string().min(1),
    created_at: z.number().optional(),
});

export const razorpaySettlementSchema = z.object({
    id: z.string().min(1),
    entity: z.literal("settlement").optional(),
    amount: z.number(),
    status: z.string().min(1),
    created_at: z.number().optional(),
});

export const razorpaySettlementReconSchema = z.object({
    id: z.string().min(1),
    entity: z.string().optional(),
    amount: z.number().optional(),
    currency: z.string().length(3).optional(),
});

export const razorpayOrdersResponseSchema =
    razorpayListResponseSchema(razorpayOrderSchema);

export const razorpayPaymentsResponseSchema =
    razorpayListResponseSchema(razorpayPaymentSchema);

export const razorpayRefundsResponseSchema =
    razorpayListResponseSchema(razorpayRefundSchema);

export const razorpaySettlementsResponseSchema =
    razorpayListResponseSchema(razorpaySettlementSchema);

export const razorpaySettlementReconResponseSchema =
    razorpayListResponseSchema(razorpaySettlementReconSchema);

export type RazorpayOrder = z.infer<
    typeof razorpayOrderSchema
>;

export type RazorpayPayment = z.infer<
    typeof razorpayPaymentSchema
>;

export type RazorpayRefund = z.infer<
    typeof razorpayRefundSchema
>;

export type RazorpaySettlement = z.infer<
    typeof razorpaySettlementSchema
>;

export type RazorpaySettlementRecon = z.infer<
    typeof razorpaySettlementReconSchema
>;