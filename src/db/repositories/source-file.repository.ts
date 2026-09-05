import { db } from "../client.js";
import type { DbTransaction } from "../transaction.js";
import { sourceFiles } from "../schema/transaction.schema.js";

export interface CreateSourceFileInput {
  batchId: string;
  fileName: string;
  fileHash: string;
  rowCount: number;
}

type DbExecutor = typeof db | DbTransaction;

export async function createSourceFile(
  input: CreateSourceFileInput,
  executor: DbExecutor = db,
) {
  const [sourceFile] = await executor
    .insert(sourceFiles)
    .values({
      batchId: input.batchId,
      fileName: input.fileName,
      fileHash: input.fileHash,
      rowCount: input.rowCount,
    })
    .returning();

  if (!sourceFile) {
    throw new Error("Failed to create source file");
  }

  return sourceFile;
}