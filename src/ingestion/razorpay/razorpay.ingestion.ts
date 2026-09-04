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

export interface RazorpayDateRange {
    from: string;
    to: string;
}

export interface RazorpayIngestionOptions {
    pageSize?: number;
    maxPages?: number;
    dateRange?: RazorpayDateRange;
}

export interface RazorpayIngestionResult {
    rawOrders: RazorpayOrder[];
    rawPayments: RazorpayPayment[];
    rawRefunds: RazorpayRefund[];
    rawSettlements: RazorpaySettlement[];
    rawSettlementRecon: RazorpaySettlementRecon[];

    orders: RawTransaction[];
    payments: RawTransaction[];
    refunds: RawTransaction[];
    settlements: RawTransaction[];
    settlementRecon: RawTransaction[];

    transactions: RawTransaction[];
}

function dateRangeToQuery(
    dateRange?: RazorpayDateRange,
): Record<string, number | undefined> {
    if (!dateRange) {
        return {};
    }

    const from = new Date(`${dateRange.from}T00:00:00.000Z`);
    const to = new Date(`${dateRange.to}T23:59:59.999Z`);

    if (
        Number.isNaN(from.getTime()) ||
        Number.isNaN(to.getTime())
    ) {
        throw new Error(
            "Razorpay ingestion date range contains an invalid date",
        );
    }

    if (from > to) {
        throw new Error(
            "Razorpay ingestion date range must have from <= to",
        );
    }

    return {
        from: Math.floor(from.getTime() / 1000),
        to: Math.floor(to.getTime() / 1000),
    };
}

export async function ingestRazorpay(
    client: RazorpayClient,
    options: RazorpayIngestionOptions = {},
): Promise<RazorpayIngestionResult> {
    const pageSize = options.pageSize ?? 100;
    const maxPages = options.maxPages;
    const dateQuery = dateRangeToQuery(
        options.dateRange,
    );

    const orders = await fetchAllPages<RazorpayOrder>(
        client,
        {
            path: "/orders",
            pageSize,
            maxPages,
            query: dateQuery,
            schema: razorpayOrdersResponseSchema,
        },
    );

    const payments = await fetchAllPages<RazorpayPayment>(
        client,
        {
            path: "/payments",
            pageSize,
            maxPages,
            query: dateQuery,
            schema: razorpayPaymentsResponseSchema,
        },
    );

    const refunds = await fetchAllPages<RazorpayRefund>(
        client,
        {
            path: "/refunds",
            pageSize,
            maxPages,
            query: dateQuery,
            schema: razorpayRefundsResponseSchema,
        },
    );

    const settlements = await fetchAllPages<RazorpaySettlement>(
        client,
        {
            path: "/settlements",
            pageSize,
            maxPages,
            query: dateQuery,
            schema: razorpaySettlementsResponseSchema,
        },
    );

    const settlementRecon = await fetchAllPages<RazorpaySettlementRecon>(
        client,
        {
            path: "/settlement_recon",
            pageSize,
            maxPages,
            query: dateQuery,
            schema: razorpaySettlementReconResponseSchema,
        },
    );

    const mappedOrders = orders.map(mapOrderToTransaction);

    const mappedPayments = payments.map(
        mapPaymentToTransaction,
    );

    const mappedRefunds = refunds.map(
        mapRefundToTransaction,
    );

    const mappedSettlements = settlements.map(
        mapSettlementToTransaction,
    );

    const mappedSettlementRecon =
        settlementRecon.map(
            mapSettlementReconToTransaction,
        );

    return {
        rawOrders: orders,
        rawPayments: payments,
        rawRefunds: refunds,
        rawSettlements: settlements,
        rawSettlementRecon: settlementRecon,

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