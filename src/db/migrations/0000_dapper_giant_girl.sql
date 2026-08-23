CREATE TYPE "public"."batch_status" AS ENUM('UPLOADED', 'VALIDATING', 'READY', 'RUNNING', 'COMPLETED', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."transaction_status" AS ENUM('PENDING', 'CANDIDATES_FOUND', 'INVESTIGATING', 'MATCHED', 'NO_MATCH', 'REVIEW_REQUIRED', 'FAILED');--> statement-breakpoint
CREATE TABLE "batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" "batch_status" DEFAULT 'UPLOADED' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "source_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"batch_id" uuid NOT NULL,
	"file_name" text NOT NULL,
	"file_hash" text NOT NULL,
	"row_count" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"batch_id" uuid NOT NULL,
	"source_file_id" uuid NOT NULL,
	"external_id" text NOT NULL,
	"amount" numeric(20, 2) NOT NULL,
	"currency" text NOT NULL,
	"transaction_date" date NOT NULL,
	"reference" text,
	"vendor" text NOT NULL,
	"status" "transaction_status" DEFAULT 'PENDING' NOT NULL,
	"source_row_number" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "source_files" ADD CONSTRAINT "source_files_batch_id_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."batches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_batch_id_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."batches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_source_file_id_source_files_id_fk" FOREIGN KEY ("source_file_id") REFERENCES "public"."source_files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "source_files_batch_hash_unique" ON "source_files" USING btree ("batch_id","file_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "transactions_batch_external_id_unique" ON "transactions" USING btree ("batch_id","external_id");