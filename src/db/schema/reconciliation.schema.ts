import { integer, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { batches, transactions } from "./transaction.schema.js";

export const candidateDecisionEnum = pgEnum("candidate_decision", ["MATCH", "REJECT", "REVIEW"]);

export const candidates = pgTable(
  "candidates",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    reconciliationResultId: uuid("reconciliation_result_id")
      .notNull()
      .references(() => reconciliationResults.id, {
        onDelete: "cascade",
      }),

    transactionId: uuid("transaction_id")
      .notNull()
      .references(() => transactions.id, {
        onDelete: "cascade",
      }),

    score: integer("score").notNull(),

    decision: candidateDecisionEnum("decision").notNull(),

    reason: text("reason"),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    resultTransactionUnique: uniqueIndex("candidates_result_transaction_unique").on(
      table.reconciliationResultId,
      table.transactionId,
    ),
  }),
);

export const evidence = pgTable("evidence", {
  id: uuid("id").defaultRandom().primaryKey(),

  reconciliationResultId: uuid("reconciliation_result_id")
    .notNull()
    .references(() => reconciliationResults.id, {
      onDelete: "cascade",
    }),

  candidateId: uuid("candidate_id").references(() => candidates.id, {
    onDelete: "cascade",
  }),

  field: text("field").notNull(),

  sourceValue: text("source_value"),

  candidateValue: text("candidate_value"),

  explanation: text("explanation").notNull(),

  createdAt: timestamp("created_at", {
    withTimezone: true,
  })
    .notNull()
    .defaultNow(),
});

export const reconciliationStatusEnum = pgEnum("reconciliation_status", [
  "MATCHED",
  "NO_MATCH",
  "REVIEW_REQUIRED",
  "FAILED",
]);

export const reconciliationResults = pgTable(
  "reconciliation_results",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    transactionId: uuid("transaction_id")
      .notNull()
      .references(() => transactions.id, {
        onDelete: "cascade",
      }),

    idempotencyKey: text("idempotency_key").notNull(),

    status: reconciliationStatusEnum("status").notNull(),

    confidence: integer("confidence"),

    reason: text("reason"),

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
    transactionUnique: uniqueIndex("reconciliation_results_transaction_unique").on(
      table.transactionId,
    ),
    idempotencyKeyUnique: uniqueIndex(
      "reconciliation_results_idempotency_key_unique",
    ).on(table.idempotencyKey),
  }),
);

export const exceptionSeverityEnum = pgEnum("exception_severity", [
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL",
]);

export const exceptionStatusEnum = pgEnum("exception_status", ["OPEN", "RESOLVED", "IGNORED"]);

export const exceptions = pgTable("exceptions", {
  id: uuid("id").defaultRandom().primaryKey(),

  transactionId: uuid("transaction_id")
    .notNull()
    .references(() => transactions.id, {
      onDelete: "cascade",
    }),

  reconciliationResultId: uuid("reconciliation_result_id").references(
    () => reconciliationResults.id,
    {
      onDelete: "cascade",
    },
  ),

  severity: exceptionSeverityEnum("severity").notNull(),

  status: exceptionStatusEnum("status").notNull().default("OPEN"),

  code: text("code").notNull(),

  message: text("message").notNull(),

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

export const auditEventTypeEnum = pgEnum("audit_event_type", [
  "BATCH_CREATED",
  "FILE_INGESTED",
  "TRANSACTION_CREATED",
  "RECONCILIATION_CREATED",
  "EXCEPTION_CREATED",
  "EXCEPTION_RESOLVED",
]);

export const auditEvents = pgTable("audit_events", {
  id: uuid("id").defaultRandom().primaryKey(),

  batchId: uuid("batch_id").references(() => batches.id, {
    onDelete: "cascade",
  }),

  transactionId: uuid("transaction_id").references(() => transactions.id, {
    onDelete: "cascade",
  }),

  eventType: auditEventTypeEnum("event_type").notNull(),

  message: text("message").notNull(),

  metadata: text("metadata"),

  createdAt: timestamp("created_at", {
    withTimezone: true,
  })
    .notNull()
    .defaultNow(),
});
