import "dotenv/config";
import Database from "better-sqlite3";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export interface SqliteDatabase {
  all<T>(sql: string, ...parameters: unknown[]): T[];
  get<T>(sql: string, ...parameters: unknown[]): T | undefined;
  run(sql: string, ...parameters: unknown[]): { changes: number };
  transaction<T>(operation: () => T): T;
  close(): void;
}

const databasePath = resolve(process.env.DATABASE_PATH ?? "data/doctor_com.sqlite");
mkdirSync(dirname(databasePath), { recursive: true });

const sqlite = new Database(databasePath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");
sqlite.exec(awaitSchema());

const submissionColumns = sqlite.pragma("table_info(questionnaire_submissions)") as { name: string }[];
if (!submissionColumns.some((column) => column.name === "report_html")) {
  sqlite.exec("ALTER TABLE questionnaire_submissions ADD COLUMN report_html TEXT");
}
if (!submissionColumns.some((column) => column.name === "report_pdf")) {
  sqlite.exec("ALTER TABLE questionnaire_submissions ADD COLUMN report_pdf BLOB");
}

function awaitSchema() {
  const schemaPath = fileURLToPath(new URL("./schema.sql", import.meta.url));
  return readFileSync(schemaPath, "utf8");
}

function bindParameters(parameters: unknown[]) {
  return parameters as (string | number | bigint | Buffer | null)[];
}

export const database: SqliteDatabase = {
  all<T>(sql: string, ...parameters: unknown[]) {
    return sqlite.prepare(sql).all(...bindParameters(parameters)) as T[];
  },
  get<T>(sql: string, ...parameters: unknown[]) {
    return sqlite.prepare(sql).get(...bindParameters(parameters)) as T | undefined;
  },
  run(sql: string, ...parameters: unknown[]) {
    const result = sqlite.prepare(sql).run(...bindParameters(parameters));
    return { changes: result.changes };
  },
  transaction<T>(operation: () => T) {
    return sqlite.transaction(operation)();
  },
  close() {
    sqlite.close();
  },
};

export async function purgeExpiredDrafts() {
  const configuredDays = Number(process.env.DRAFT_TTL_DAYS ?? 30);
  const days = Number.isFinite(configuredDays) ? Math.min(365, Math.max(1, Math.floor(configuredDays))) : 30;
  database.run(
    "DELETE FROM questionnaire_submissions WHERE status = 'draft' AND datetime(updated_at) < datetime('now', ?)",
    `-${days} days`,
  );
}