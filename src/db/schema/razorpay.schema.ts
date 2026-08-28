import {
    index,
    jsonb,
    numeric,
    pgEnum,
    pgTable,
    text,
    timestamp,
    uniqueIndex,
    uuid,
} from "drizzle-orm/pg-core";

import { batches, sourceFiles } from "./transaction.schema.js";

export const razorpayOrderStatusEnum = pgEnum(
    "razorpay_order_status",
    [
        "CREATED",
        "ATTEMPTED",
        "PAID",
        "UNKNOWN",
    ],
);

export const razorpayPaymentStatusEnum = pgEnum(
    "razorpay_payment_status",
    [
        "CREATED",
        "AUTHORIZED",
        "CAPTURED",
        "REFUNDED",
        "FAILED",
        "UNKNOWN",
    ],
);

export const razorpayRefundStatusEnum = pgEnum(
    "razorpay_refund_status",
    [
        "PENDING",
        "PROCESSED",
        "FAILED",
        "UNKNOWN",
    ],
);

export const razorpaySettlementStatusEnum = pgEnum(
    "razorpay_settlement_status",
    [
        "CREATED",
        "PROCESSED",
        "FAILED",
        "UNKNOWN",
    ],
);

export const razorpayOrders = pgTable(
    "razorpay_orders",
    {
        id: uuid("id").defaultRandom().primaryKey(),

        externalId: text("external_id").notNull(),

        batchId: uuid("batch_id")
            .notNull()
            .references(() => batches.id, {
                onDelete: "cascade",
            }),

        sourceFileId: uuid("source_file_id")
            .notNull()
            .references(() => sourceFiles.id, {
                onDelete: "cascade",
            }),

        amount: numeric("amount", {
            precision: 20,
            scale: 2,
        }).notNull(),

        currency: text("currency").notNull(),

        // status: text("status").notNull(),
        status: razorpayOrderStatusEnum("status").notNull(),

        sourceCreatedAt: timestamp("source_created_at", {
            withTimezone: true,
        }),

        rawPayload: jsonb("raw_payload").notNull(),

        createdAt: timestamp("created_at", {
            withTimezone: true,
        })
            .notNull()
            .defaultNow(),

        updatedAt: timestamp("updated_at", {
            withTimezone: true,
        })
            .notNull()
            .defaultNow(),
    },
    (table) => ({
        externalIdUnique: uniqueIndex(
            "razorpay_orders_external_id_unique",
        ).on(table.externalId),

        batchExternalIdUnique: uniqueIndex(
            "razorpay_orders_batch_external_id_unique",
        ).on(table.batchId, table.externalId),

        batchIndex: index("razorpay_orders_batch_idx").on(
            table.batchId,
        ),
    }),
);

export const razorpayPayments = pgTable(
    "razorpay_payments",
    {
        id: uuid("id").defaultRandom().primaryKey(),

        externalId: text("external_id").notNull(),

        orderId: uuid("order_id").references(
            () => razorpayOrders.id,
            {
                onDelete: "set null",
            },
        ),

        batchId: uuid("batch_id")
            .notNull()
            .references(() => batches.id, {
                onDelete: "cascade",
            }),

        sourceFileId: uuid("source_file_id")
            .notNull()
            .references(() => sourceFiles.id, {
                onDelete: "cascade",
            }),

        amount: numeric("amount", {
            precision: 20,
            scale: 2,
        }).notNull(),

        currency: text("currency").notNull(),

        // status: text("status").notNull(),
        status: razorpayPaymentStatusEnum("status").notNull(),

        sourceCreatedAt: timestamp("source_created_at", {
            withTimezone: true,
        }),

        rawPayload: jsonb("raw_payload").notNull(),

        createdAt: timestamp("created_at", {
            withTimezone: true,
        })
            .notNull()
            .defaultNow(),

        updatedAt: timestamp("updated_at", {
            withTimezone: true,
        })
            .notNull()
            .defaultNow(),
    },
    (table) => ({
        externalIdUnique: uniqueIndex(
            "razorpay_payments_external_id_unique",
        ).on(table.externalId),

        batchExternalIdUnique: uniqueIndex(
            "razorpay_payments_batch_external_id_unique",
        ).on(table.batchId, table.externalId),

        orderIndex: index("razorpay_payments_order_idx").on(
            table.orderId,
        ),
    }),
);

export const razorpayRefunds = pgTable(
    "razorpay_refunds",
    {
        id: uuid("id").defaultRandom().primaryKey(),

        externalId: text("external_id").notNull(),

        paymentId: uuid("payment_id")
            .notNull()
            .references(() => razorpayPayments.id, {
                onDelete: "cascade",
            }),

        batchId: uuid("batch_id")
            .notNull()
            .references(() => batches.id, {
                onDelete: "cascade",
            }),

        sourceFileId: uuid("source_file_id")
            .notNull()
            .references(() => sourceFiles.id, {
                onDelete: "cascade",
            }),

        amount: numeric("amount", {
            precision: 20,
            scale: 2,
        }).notNull(),

        currency: text("currency").notNull(),

        // status: text("status").notNull(),
        status: razorpayRefundStatusEnum("status").notNull(),

        sourceCreatedAt: timestamp("source_created_at", {
            withTimezone: true,
        }),

        rawPayload: jsonb("raw_payload").notNull(),

        createdAt: timestamp("created_at", {
            withTimezone: true,
        })
            .notNull()
            .defaultNow(),

        updatedAt: timestamp("updated_at", {
            withTimezone: true,
        })
            .notNull()
            .defaultNow(),
    },
    (table) => ({
        externalIdUnique: uniqueIndex(
            "razorpay_refunds_external_id_unique",
        ).on(table.externalId),

        batchExternalIdUnique: uniqueIndex(
            "razorpay_refunds_batch_external_id_unique",
        ).on(table.batchId, table.externalId),

        paymentIndex: index("razorpay_refunds_payment_idx").on(
            table.paymentId,
        ),
    }),
);

export const razorpaySettlements = pgTable(
    "razorpay_settlements",
    {
        id: uuid("id").defaultRandom().primaryKey(),

        externalId: text("external_id").notNull(),

        batchId: uuid("batch_id")
            .notNull()
            .references(() => batches.id, {
                onDelete: "cascade",
            }),

        sourceFileId: uuid("source_file_id")
            .notNull()
            .references(() => sourceFiles.id, {
                onDelete: "cascade",
            }),

        amount: numeric("amount", {
            precision: 20,
            scale: 2,
        }).notNull(),

        currency: text("currency"),

        // status: text("status").notNull(),
        status: razorpaySettlementStatusEnum("status").notNull(),

        sourceCreatedAt: timestamp("source_created_at", {
            withTimezone: true,
        }),

        rawPayload: jsonb("raw_payload").notNull(),

        createdAt: timestamp("created_at", {
            withTimezone: true,
        })
            .notNull()
            .defaultNow(),

        updatedAt: timestamp("updated_at", {
            withTimezone: true,
        })
            .notNull()
            .defaultNow(),
    },
    (table) => ({
        externalIdUnique: uniqueIndex(
            "razorpay_settlements_external_id_unique",
        ).on(table.externalId),

        batchExternalIdUnique: uniqueIndex(
            "razorpay_settlements_batch_external_id_unique",
        ).on(table.batchId, table.externalId),
    }),
);

export const razorpaySettlementRecons = pgTable(
    "razorpay_settlement_recons",
    {
        id: uuid("id").defaultRandom().primaryKey(),

        externalId: text("external_id").notNull(),

        paymentId: uuid("payment_id").references(
            () => razorpayPayments.id,
            {
                onDelete: "set null",
            },
        ),

        refundId: uuid("refund_id").references(
            () => razorpayRefunds.id,
            {
                onDelete: "set null",
            },
        ),

        settlementId: uuid("settlement_id").references(
            () => razorpaySettlements.id,
            {
                onDelete: "set null",
            },
        ),

        batchId: uuid("batch_id")
            .notNull()
            .references(() => batches.id, {
                onDelete: "cascade",
            }),

        sourceFileId: uuid("source_file_id")
            .notNull()
            .references(() => sourceFiles.id, {
                onDelete: "cascade",
            }),

        amount: numeric("amount", {
            precision: 20,
            scale: 2,
        }).notNull(),

        currency: text("currency").notNull(),

        rawPayload: jsonb("raw_payload").notNull(),

        createdAt: timestamp("created_at", {
            withTimezone: true,
        })
            .notNull()
            .defaultNow(),

        updatedAt: timestamp("updated_at", {
            withTimezone: true,
        })
            .notNull()
            .defaultNow(),
    },
    (table) => ({
        externalIdUnique: uniqueIndex(
            "razorpay_settlement_recons_external_id_unique",
        ).on(table.externalId),

        batchExternalIdUnique: uniqueIndex(
            "razorpay_settlement_recons_batch_external_id_unique",
        ).on(table.batchId, table.externalId),

        paymentIndex: index(
            "razorpay_settlement_recons_payment_idx",
        ).on(table.paymentId),

        refundIndex: index(
            "razorpay_settlement_recons_refund_idx",
        ).on(table.refundId),

        settlementIndex: index(
            "razorpay_settlement_recons_settlement_idx",
        ).on(table.settlementId),
    }),
);