export type TransactionDateType = "TRANSACTION" | "POSTING" | "SETTLEMENT";

export interface TransactionDate {
  type: TransactionDateType;
  value: Date;
}
