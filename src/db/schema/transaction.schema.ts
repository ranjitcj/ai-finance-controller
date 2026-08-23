import {
  date,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const batchStatusEnum = pgEnum("batch_status", [
  "UPLOADED",
  "VALIDATING",
  "READY",
  "RUNNING",
  "COMPLETED",
  "FAILED",
]);

export const transactionStatusEnum = pgEnum("transaction_status", [
  "PENDING",
  "CANDIDATES_FOUND",
  "INVESTIGATING",
  "MATCHED",
  "NO_MATCH",
  "REVIEW_REQUIRED",
  "FAILED",
]);

export const batches = pgTable("batches", {
  id: uuid("id").defaultRandom().primaryKey(),

  status: batchStatusEnum("status").notNull().default("UPLOADED"),

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
});

export const sourceFiles = pgTable(
  "source_files",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    batchId: uuid("batch_id")
      .notNull()
      .references(() => batches.id, {
        onDelete: "cascade",
      }),

    fileName: text("file_name").notNull(),

    fileHash: text("file_hash").notNull(),

    rowCount: integer("row_count"),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    batchFileHashUnique: uniqueIndex("source_files_batch_hash_unique").on(
      table.batchId,
      table.fileHash,
    ),
  }),
);

export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").defaultRandom().primaryKey(),

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

    externalId: text("external_id").notNull(),

    amount: numeric("amount", {
      precision: 20,
      scale: 2,
    }).notNull(),

    currency: text("currency").notNull(),

    transactionDate: date("transaction_date").notNull(),

    reference: text("reference"),

    vendor: text("vendor").notNull(),

    status: transactionStatusEnum("status").notNull().default("PENDING"),

    sourceRowNumber: integer("source_row_number"),

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
    batchExternalIdUnique: uniqueIndex("transactions_batch_external_id_unique").on(
      table.batchId,
      table.externalId,
    ),
    exactRetrievalIndex: index("transactions_exact_retrieval_idx").on(
      table.amount,
      table.currency,
      table.transactionDate,
    ),
  }),
);
