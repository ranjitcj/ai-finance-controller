CREATE TYPE "public"."razorpay_order_status" AS ENUM('CREATED', 'ATTEMPTED', 'PAID', 'UNKNOWN');--> statement-breakpoint
CREATE TYPE "public"."razorpay_payment_status" AS ENUM('CREATED', 'AUTHORIZED', 'CAPTURED', 'REFUNDED', 'FAILED', 'UNKNOWN');--> statement-breakpoint
CREATE TYPE "public"."razorpay_refund_status" AS ENUM('PENDING', 'PROCESSED', 'FAILED', 'UNKNOWN');--> statement-breakpoint
CREATE TYPE "public"."razorpay_settlement_status" AS ENUM('CREATED', 'PROCESSED', 'FAILED', 'UNKNOWN');--> statement-breakpoint
CREATE TABLE "razorpay_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"external_id" text NOT NULL,
	"batch_id" uuid NOT NULL,
	"source_file_id" uuid NOT NULL,
	"amount" numeric(20, 2) NOT NULL,
	"currency" text NOT NULL,
	"status" text NOT NULL,
	"source_created_at" timestamp with time zone,
	"raw_payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "razorpay_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"external_id" text NOT NULL,
	"order_id" uuid,
	"batch_id" uuid NOT NULL,
	"source_file_id" uuid NOT NULL,
	"amount" numeric(20, 2) NOT NULL,
	"currency" text NOT NULL,
	"status" text NOT NULL,
	"source_created_at" timestamp with time zone,
	"raw_payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "razorpay_refunds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"external_id" text NOT NULL,
	"payment_id" uuid NOT NULL,
	"batch_id" uuid NOT NULL,
	"source_file_id" uuid NOT NULL,
	"amount" numeric(20, 2) NOT NULL,
	"currency" text NOT NULL,
	"status" text NOT NULL,
	"source_created_at" timestamp with time zone,
	"raw_payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "razorpay_settlement_recons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"external_id" text NOT NULL,
	"payment_id" uuid,
	"refund_id" uuid,
	"settlement_id" uuid,
	"batch_id" uuid NOT NULL,
	"source_file_id" uuid NOT NULL,
	"amount" numeric(20, 2) NOT NULL,
	"currency" text NOT NULL,
	"raw_payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "razorpay_settlements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"external_id" text NOT NULL,
	"batch_id" uuid NOT NULL,
	"source_file_id" uuid NOT NULL,
	"amount" numeric(20, 2) NOT NULL,
	"currency" text,
	"status" text NOT NULL,
	"source_created_at" timestamp with time zone,
	"raw_payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "razorpay_orders" ADD CONSTRAINT "razorpay_orders_batch_id_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."batches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "razorpay_orders" ADD CONSTRAINT "razorpay_orders_source_file_id_source_files_id_fk" FOREIGN KEY ("source_file_id") REFERENCES "public"."source_files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "razorpay_payments" ADD CONSTRAINT "razorpay_payments_order_id_razorpay_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."razorpay_orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "razorpay_payments" ADD CONSTRAINT "razorpay_payments_batch_id_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."batches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "razorpay_payments" ADD CONSTRAINT "razorpay_payments_source_file_id_source_files_id_fk" FOREIGN KEY ("source_file_id") REFERENCES "public"."source_files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "razorpay_refunds" ADD CONSTRAINT "razorpay_refunds_payment_id_razorpay_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."razorpay_payments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "razorpay_refunds" ADD CONSTRAINT "razorpay_refunds_batch_id_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."batches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "razorpay_refunds" ADD CONSTRAINT "razorpay_refunds_source_file_id_source_files_id_fk" FOREIGN KEY ("source_file_id") REFERENCES "public"."source_files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "razorpay_settlement_recons" ADD CONSTRAINT "razorpay_settlement_recons_payment_id_razorpay_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."razorpay_payments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "razorpay_settlement_recons" ADD CONSTRAINT "razorpay_settlement_recons_refund_id_razorpay_refunds_id_fk" FOREIGN KEY ("refund_id") REFERENCES "public"."razorpay_refunds"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "razorpay_settlement_recons" ADD CONSTRAINT "razorpay_settlement_recons_settlement_id_razorpay_settlements_id_fk" FOREIGN KEY ("settlement_id") REFERENCES "public"."razorpay_settlements"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "razorpay_settlement_recons" ADD CONSTRAINT "razorpay_settlement_recons_batch_id_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."batches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "razorpay_settlement_recons" ADD CONSTRAINT "razorpay_settlement_recons_source_file_id_source_files_id_fk" FOREIGN KEY ("source_file_id") REFERENCES "public"."source_files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "razorpay_settlements" ADD CONSTRAINT "razorpay_settlements_batch_id_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."batches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "razorpay_settlements" ADD CONSTRAINT "razorpay_settlements_source_file_id_source_files_id_fk" FOREIGN KEY ("source_file_id") REFERENCES "public"."source_files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "razorpay_orders_external_id_unique" ON "razorpay_orders" USING btree ("external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "razorpay_orders_batch_external_id_unique" ON "razorpay_orders" USING btree ("batch_id","external_id");--> statement-breakpoint
CREATE INDEX "razorpay_orders_batch_idx" ON "razorpay_orders" USING btree ("batch_id");--> statement-breakpoint
CREATE UNIQUE INDEX "razorpay_payments_external_id_unique" ON "razorpay_payments" USING btree ("external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "razorpay_payments_batch_external_id_unique" ON "razorpay_payments" USING btree ("batch_id","external_id");--> statement-breakpoint
CREATE INDEX "razorpay_payments_order_idx" ON "razorpay_payments" USING btree ("order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "razorpay_refunds_external_id_unique" ON "razorpay_refunds" USING btree ("external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "razorpay_refunds_batch_external_id_unique" ON "razorpay_refunds" USING btree ("batch_id","external_id");--> statement-breakpoint
CREATE INDEX "razorpay_refunds_payment_idx" ON "razorpay_refunds" USING btree ("payment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "razorpay_settlement_recons_external_id_unique" ON "razorpay_settlement_recons" USING btree ("external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "razorpay_settlement_recons_batch_external_id_unique" ON "razorpay_settlement_recons" USING btree ("batch_id","external_id");--> statement-breakpoint
CREATE INDEX "razorpay_settlement_recons_payment_idx" ON "razorpay_settlement_recons" USING btree ("payment_id");--> statement-breakpoint
CREATE INDEX "razorpay_settlement_recons_refund_idx" ON "razorpay_settlement_recons" USING btree ("refund_id");--> statement-breakpoint
CREATE INDEX "razorpay_settlement_recons_settlement_idx" ON "razorpay_settlement_recons" USING btree ("settlement_id");--> statement-breakpoint
CREATE UNIQUE INDEX "razorpay_settlements_external_id_unique" ON "razorpay_settlements" USING btree ("external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "razorpay_settlements_batch_external_id_unique" ON "razorpay_settlements" USING btree ("batch_id","external_id");