import "dotenv/config";

import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

const { Pool } = pg;

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured");
}

export const pool = new Pool({
    connectionString: databaseUrl,
});

export const db = drizzle(pool);

export type Db = typeof db;