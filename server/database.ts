import "dotenv/config";
import { AsyncLocalStorage } from "node:async_hooks";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Pool, type PoolClient } from "pg";

export interface SqliteDatabase {
  all<T>(sql: string, ...parameters: unknown[]): Promise<T[]>;
  get<T>(sql: string, ...parameters: unknown[]): Promise<T | undefined>;
  run(sql: string, ...parameters: unknown[]): Promise<{ changes: number }>;
  transaction<T>(operation: () => Promise<T> | T): Promise<T>;
  close(): Promise<void>;
}

const connectionString = process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/doctor_com";
const pool = new Pool({
  connectionString,
  ...(process.env.POSTGRES_SSL === "true" ? { ssl: { rejectUnauthorized: false } } : {}),
});
const transactionContext = new AsyncLocalStorage<PoolClient | null>();

async function ensureSchema() {
  const client = await pool.connect();
  try {
    const schemaPath = fileURLToPath(new URL("./schema.sql", import.meta.url));
    await client.query(readFileSync(schemaPath, "utf8"));
  } finally {
    client.release();
  }
}

await ensureSchema();

export const database: SqliteDatabase = {
  async all<T>(sql: string, ...parameters: unknown[]) {
    const client = transactionContext.getStore();
    const result = await (client ?? pool).query(sql, parameters);
    return result.rows as T[];
  },
  async get<T>(sql: string, ...parameters: unknown[]) {
    const client = transactionContext.getStore();
    const result = await (client ?? pool).query(sql, parameters);
    return result.rows[0] as T | undefined;
  },
  async run(sql: string, ...parameters: unknown[]) {
    const client = transactionContext.getStore();
    const result = await (client ?? pool).query(sql, parameters);
    return { changes: result.rowCount ?? 0 };
  },
  async transaction<T>(operation: () => Promise<T> | T) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const result = await transactionContext.run(client, operation);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  },
  async close() {
    await pool.end();
  },
};

export async function purgeExpiredDrafts() {
  const configuredDays = Number(process.env.DRAFT_TTL_DAYS ?? 30);
  const days = Number.isFinite(configuredDays) ? Math.min(365, Math.max(1, Math.floor(configuredDays))) : 30;
  await database.run(
    "DELETE FROM questionnaire_submissions WHERE status = 'draft' AND updated_at < NOW() - ($1 * INTERVAL '1 day')",
    days,
  );
}