import "dotenv/config";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createConnection, type RowDataPacket } from "mysql2/promise";

const connection = await createConnection({
  host: process.env.MYSQL_HOST ?? "127.0.0.1",
  port: Number(process.env.MYSQL_PORT ?? 3306),
  user: process.env.MYSQL_USER ?? "root",
  password: process.env.MYSQL_PASSWORD ?? "",
  multipleStatements: true,
});

try {
  const schema = await readFile(fileURLToPath(new URL("./schema.sql", import.meta.url)), "utf8");
  await connection.query(schema);
  const additions = [
    ["score_total", "ALTER TABLE questionnaire_submissions ADD COLUMN score_total TINYINT UNSIGNED NULL"],
    ["score_budget", "ALTER TABLE questionnaire_submissions ADD COLUMN score_budget TINYINT UNSIGNED NULL"],
    ["score_urgency", "ALTER TABLE questionnaire_submissions ADD COLUMN score_urgency TINYINT UNSIGNED NULL"],
    ["score_company", "ALTER TABLE questionnaire_submissions ADD COLUMN score_company TINYINT UNSIGNED NULL"],
    ["lead_category", "ALTER TABLE questionnaire_submissions ADD COLUMN lead_category ENUM('A', 'B', 'C') NULL"],
    ["scored_at", "ALTER TABLE questionnaire_submissions ADD COLUMN scored_at DATETIME(3) NULL"],
    ["report_status", "ALTER TABLE questionnaire_submissions ADD COLUMN report_status ENUM('not_started', 'pending', 'processing', 'ready', 'failed') NOT NULL DEFAULT 'not_started'"],
    ["report_markdown", "ALTER TABLE questionnaire_submissions ADD COLUMN report_markdown MEDIUMTEXT NULL"],
    ["report_generated_at", "ALTER TABLE questionnaire_submissions ADD COLUMN report_generated_at DATETIME(3) NULL"],
  ] as const;

  for (const [column, statement] of additions) {
    const [existing] = await connection.execute<RowDataPacket[]>(
      "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'questionnaire_submissions' AND COLUMN_NAME = ?",
      [process.env.MYSQL_DATABASE ?? "doctor_com", column],
    );
    if (existing.length === 0) await connection.query(statement);
  }

  const [existingIndex] = await connection.execute<RowDataPacket[]>(
    "SELECT INDEX_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'questionnaire_submissions' AND INDEX_NAME = 'idx_questionnaire_report_status'",
    [process.env.MYSQL_DATABASE ?? "doctor_com"],
  );
  if (existingIndex.length === 0) {
    await connection.query("ALTER TABLE questionnaire_submissions ADD INDEX idx_questionnaire_report_status (report_status, id)");
  }
  console.log("Database doctor_com and questionnaire_submissions are ready.");
} finally {
  await connection.end();
}