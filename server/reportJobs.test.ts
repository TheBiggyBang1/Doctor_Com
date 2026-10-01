import assert from "node:assert/strict";
import test from "node:test";
import type { Pool, ResultSetHeader } from "mysql2/promise";
import { createReportJobs } from "./reportJobs.js";
import type { QuestionnaireAnswers } from "./validation.js";

test("report job claims a pending submission and persists only generated markdown", async () => {
  const statements: string[] = [];
  const database = {
    execute: async (sql: string) => {
      statements.push(sql);
      return [{ affectedRows: 1 } as ResultSetHeader, []];
    },
  } as unknown as Pool;
  const generatePlan = async () => "# Plan\n\nGenerated strategy.";
  const jobs = createReportJobs(database, generatePlan as never);
  const succeeded = await jobs.run(7, {} as QuestionnaireAnswers, "B", "fr");

  assert.equal(succeeded, true);
  assert.match(statements[0], /report_status = 'processing'/);
  assert.match(statements[1], /report_markdown = \?/);
  assert.match(statements[1], /report_status = 'ready'/);
  assert.equal(statements.length, 2);
});

test("report job marks a failed generation without leaking provider details", async () => {
  const statements: string[] = [];
  const database = {
    execute: async (sql: string) => {
      statements.push(sql);
      return [{ affectedRows: 1 } as ResultSetHeader, []];
    },
  } as unknown as Pool;
  const jobs = createReportJobs(database, async () => { throw new Error("provider-secret-detail"); });
  const succeeded = await jobs.run(8, {} as QuestionnaireAnswers, "C", "en");

  assert.equal(succeeded, false);
  assert.match(statements[1], /report_status = 'failed'/);
  assert.ok(!statements.some((statement) => statement.includes("provider-secret-detail")));
});