import { RazorpayClient } from "./razorpay.client.js";
import { fetchAllPages } from "./razorpay.pagination.js";

import {
    razorpayOrdersResponseSchema,
    razorpayPaymentsResponseSchema,
    razorpayRefundsResponseSchema,
    razorpaySettlementsResponseSchema,
    razorpaySettlementReconResponseSchema,
    type RazorpayOrder,
    type RazorpayPayment,
    type RazorpayRefund,
    type RazorpaySettlement,
    type RazorpaySettlementRecon,
} from "./razorpay.schemas.js";

import {
    mapOrderToTransaction,
    mapPaymentToTransaction,
    mapRefundToTransaction,
    mapSettlementToTransaction,
    mapSettlementReconToTransaction,
} from "./razorpay.mapper.js";

import type { RawTransaction } from "../../domain/transaction/transaction.schema.js";

export interface RazorpayIngestionOptions {
    pageSize?: number;
    maxPages?: number;
}

export interface RazorpayIngestionResult {
    orders: RawTransaction[];
    payments: RawTransaction[];
    refunds: RawTransaction[];
    settlements: RawTransaction[];
    settlementRecon: RawTransaction[];
    transactions: RawTransaction[];
}

export async function ingestRazorpay(
    client: RazorpayClient,
    options: RazorpayIngestionOptions = {},
): Promise<RazorpayIngestionResult> {
    const pageSize = options.pageSize ?? 100;
    const maxPages = options.maxPages;

    const orders = await fetchAllPages<RazorpayOrder>(
        client,
        {
            path: "/orders",
            pageSize,
            maxPages,
            schema: razorpayOrdersResponseSchema,
        },
    );

    const payments = await fetchAllPages<RazorpayPayment>(
        client,
        {
            path: "/payments",
            pageSize,
            maxPages,
            schema: razorpayPaymentsResponseSchema,
        },
    );

    const refunds = await fetchAllPages<RazorpayRefund>(
        client,
        {
            path: "/refunds",
            pageSize,
            maxPages,
            schema: razorpayRefundsResponseSchema,
        },
    );

    const settlements =
        await fetchAllPages<RazorpaySettlement>(
            client,
            {
                path: "/settlements",
                pageSize,
                maxPages,
                schema: razorpaySettlementsResponseSchema,
            },
        );

    const settlementRecon =
        await fetchAllPages<RazorpaySettlementRecon>(
            client,
            {
                path: "/settlement_recon",
                pageSize,
                maxPages,
                schema: razorpaySettlementReconResponseSchema,
            },
        );

    const mappedOrders = orders.map(mapOrderToTransaction);
    const mappedPayments = payments.map(
        mapPaymentToTransaction,
    );
    const mappedRefunds = refunds.map(mapRefundToTransaction);
    const mappedSettlements = settlements.map(
        mapSettlementToTransaction,
    );
    const mappedSettlementRecon = settlementRecon.map(
        mapSettlementReconToTransaction,
    );

    return {
        orders: mappedOrders,
        payments: mappedPayments,
        refunds: mappedRefunds,
        settlements: mappedSettlements,
        settlementRecon: mappedSettlementRecon,
        transactions: [
            ...mappedOrders,
            ...mappedPayments,
            ...mappedRefunds,
            ...mappedSettlements,
            ...mappedSettlementRecon,
        ],
    };
}