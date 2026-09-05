import { db } from "./client.js";

export type DbTransaction = Parameters<
    Parameters<typeof db.transaction>[0]
>[0];

export async function withDbTransaction<T>(
    callback: (tx: DbTransaction) => Promise<T>,
): Promise<T> {
    return db.transaction(async (tx) => {
        return callback(tx);
    });
}