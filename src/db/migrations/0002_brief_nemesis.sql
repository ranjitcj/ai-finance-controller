CREATE TYPE "public"."candidate_decision" AS ENUM('MATCH', 'REJECT', 'REVIEW');--> statement-breakpoint
CREATE TABLE "candidates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reconciliation_result_id" uuid NOT NULL,
	"transaction_id" uuid NOT NULL,
	"score" integer NOT NULL,
	"decision" "candidate_decision" NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "evidence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reconciliation_result_id" uuid NOT NULL,
	"candidate_id" uuid,
	"field" text NOT NULL,
	"source_value" text,
	"candidate_value" text,
	"explanation" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_reconciliation_result_id_reconciliation_results_id_fk" FOREIGN KEY ("reconciliation_result_id") REFERENCES "public"."reconciliation_results"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_reconciliation_result_id_reconciliation_results_id_fk" FOREIGN KEY ("reconciliation_result_id") REFERENCES "public"."reconciliation_results"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "candidates_result_transaction_unique" ON "candidates" USING btree ("reconciliation_result_id","transaction_id");