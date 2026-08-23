import { z } from "zod";

const amountSchema = z
  .string()
  .trim()
  .regex(/^-?\d+(\.\d{1,2})?$/, "Amount must be a valid decimal amount");

const rawCurrencySchema = z
  .string()
  .trim()
  .length(3, "Currency must be a 3-letter code")
  .regex(/^[A-Za-z]{3}$/, "Currency must contain only letters");

const normalizedCurrencySchema = z
  .string()
  .length(3, "Currency must be a 3-letter code")
  .regex(/^[A-Z]{3}$/, "Currency must be a 3-letter uppercase code");

const dateSchema = z
  .string()
  .trim()
  .refine((value) => !Number.isNaN(Date.parse(value)), "Date must be a valid date");

export const rawTransactionSchema = z.object({
  externalId: z.string().trim().min(1),
  amount: amountSchema,
  currency: rawCurrencySchema,
  date: dateSchema,
  reference: z.string().trim().optional(),
  vendor: z.string().trim().min(1),
});

export const normalizedTransactionSchema = z.object({
  externalId: z.string().min(1),
  amount: amountSchema,
  currency: normalizedCurrencySchema,
  date: z.coerce.date(),
  reference: z.string().min(1).optional(),
  vendor: z.string().min(1),
});

export type RawTransaction = z.infer<typeof rawTransactionSchema>;

export type NormalizedTransaction = z.infer<typeof normalizedTransactionSchema>;
