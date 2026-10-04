import assert from "node:assert/strict";
import test from "node:test";
import type { SqliteDatabase } from "./database.js";
import { createReportJobs } from "./reportJobs.js";
import type { QuestionnaireAnswers } from "./validation.js";

test("report job claims a pending submission and persists only generated markdown", async () => {
  const statements: string[] = [];
  const database = {
    run: (sql: string) => {
      statements.push(sql);
      return { changes: 1 };
    },
  } as unknown as SqliteDatabase;
  const generatePlan = async () => "<h1>Plan</h1><p>Generated strategy.</p>";
  const compilePdf = async () => Buffer.from("%PDF-test");
  const jobs = createReportJobs(database, generatePlan as never, compilePdf as never);
  const succeeded = await jobs.run(7, {} as QuestionnaireAnswers, "B", "fr");

  assert.equal(succeeded, true);
  assert.match(statements[0], /report_status = 'processing'/);
  assert.match(statements[1], /report_html = \?/);
  assert.match(statements[1], /report_pdf = \?/);
  assert.match(statements[1], /report_status = 'ready'/);
  assert.equal(statements.length, 2);
});

test("report job marks a failed generation without leaking provider details", async () => {
  const statements: string[] = [];
  const errors: string[] = [];
  const database = {
    run: (sql: string) => {
      statements.push(sql);
      return { changes: 1 };
    },
  } as unknown as SqliteDatabase;
  const jobs = createReportJobs(database, async () => { throw new Error("provider-secret-detail sk-ant-test-secret"); });
  const originalConsoleError = console.error;
  console.error = (message: string) => errors.push(message);
  let succeeded: boolean;
  try {
    succeeded = await jobs.run(8, {} as QuestionnaireAnswers, "C", "en");
  } finally {
    console.error = originalConsoleError;
  }

  assert.equal(succeeded, false);
  assert.match(statements[1], /report_status = 'failed'/);
  assert.ok(!statements.some((statement) => statement.includes("provider-secret-detail")));
  assert.match(errors[0], /provider-secret-detail/);
  assert.ok(!errors[0].includes("sk-ant-test-secret"));
});