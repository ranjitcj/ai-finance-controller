import { createBatch } from "../../db/repositories/batch.repository.js";
import { createSourceFile } from "../../db/repositories/source-file.repository.js";
import { createTransaction } from "../../db/repositories/transaction.repository.js";

import { ingestCsv } from "./csv.ingestion.js";

export interface PersistCsvInput {
  fileName: string;
  fileHash: string;
  content: string;
}

export async function persistCsv(input: PersistCsvInput) {
  const ingestion = ingestCsv(input.content);

  const batch = await createBatch();

  const sourceFile = await createSourceFile({
    batchId: batch.id,
    fileName: input.fileName,
    fileHash: input.fileHash,
    rowCount: ingestion.transactions.length,
  });

  const persistedTransactions = [];

  for (const item of ingestion.transactions) {
    const persisted = await createTransaction({
      batchId: batch.id,
      sourceFileId: sourceFile.id,
      sourceRowNumber: item.rowNumber,
      transaction: item.transaction,
    });

    persistedTransactions.push(persisted);
  }

  return {
    batch,
    sourceFile,
    transactions: persistedTransactions,
    errors: ingestion.errors,
  };
}
