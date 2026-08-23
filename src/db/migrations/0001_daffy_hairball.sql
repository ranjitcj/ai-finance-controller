CREATE TYPE "public"."reconciliation_status" AS ENUM('MATCHED', 'NO_MATCH', 'REVIEW_REQUIRED', 'FAILED');--> statement-breakpoint
CREATE TABLE "reconciliation_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"transaction_id" uuid NOT NULL,
	"status" "reconciliation_status" NOT NULL,
	"confidence" integer,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "reconciliation_results" ADD CONSTRAINT "reconciliation_results_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "reconciliation_results_transaction_unique" ON "reconciliation_results" USING btree ("transaction_id");