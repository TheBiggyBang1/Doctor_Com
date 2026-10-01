import "dotenv/config";
import { createPool } from "mysql2/promise";

export const pool = createPool({
  host: process.env.MYSQL_HOST ?? "127.0.0.1",
  port: Number(process.env.MYSQL_PORT ?? 3306),
  user: process.env.MYSQL_USER ?? "root",
  password: process.env.MYSQL_PASSWORD ?? "",
  database: process.env.MYSQL_DATABASE ?? "doctor_com",
  connectionLimit: Number(process.env.MYSQL_CONNECTION_LIMIT ?? 10),
  waitForConnections: true,
  queueLimit: 0,
  timezone: "Z",
});

export async function purgeExpiredDrafts() {
  const configuredDays = Number(process.env.DRAFT_TTL_DAYS ?? 30);
  const days = Number.isFinite(configuredDays) ? Math.min(365, Math.max(1, Math.floor(configuredDays))) : 30;
  await pool.execute(
    `DELETE FROM questionnaire_submissions WHERE status = 'draft' AND updated_at < DATE_SUB(UTC_TIMESTAMP(3), INTERVAL ${days} DAY)`,
  );
}