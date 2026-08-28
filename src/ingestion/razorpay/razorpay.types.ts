import type {
    RazorpayOrder,
    RazorpayPayment,
    RazorpayRefund,
    RazorpaySettlement,
    RazorpaySettlementRecon,
} from "./razorpay.schemas.js";

export type {
    RazorpayOrder,
    RazorpayPayment,
    RazorpayRefund,
    RazorpaySettlement,
    RazorpaySettlementRecon,
};

export type RazorpayResource =
    | RazorpayOrder
    | RazorpayPayment
    | RazorpayRefund
    | RazorpaySettlement
    | RazorpaySettlementRecon;

export type RazorpayResourceName =
    | "orders"
    | "payments"
    | "refunds"
    | "settlements"
    | "settlement_recon";

export interface RazorpayListResult<T> {
    items: T[];
}

export interface RazorpayPaginationOptions {
    pageSize?: number;
    maxPages?: number;
}

export interface RazorpayIngestionOptions
    extends RazorpayPaginationOptions {
    resources?: RazorpayResourceName[];
}

export interface RazorpayMappedTransaction {
    externalId: string;
    amount: string;
    currency: string;
    date: Date;
    reference?: string;
    vendor: string;
}