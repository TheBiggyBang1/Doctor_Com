import assert from "node:assert/strict";
import test from "node:test";
import { createReportJobs } from "./reportJobs.js";
import type { QuestionnaireAnswers } from "./validation.js";

test("report job keeps its status and PDF in memory", async () => {
  const generatePlan = async () => "<h1>Plan</h1><p>Generated strategy.</p>";
  const compilePdf = async () => Buffer.from("%PDF-test");
  const jobs = createReportJobs(generatePlan as never, compilePdf as never);
  const succeeded = await jobs.run(7, {} as QuestionnaireAnswers, "B", "fr");

  assert.equal(succeeded, true);
  assert.deepEqual(jobs.get(7), { status: "ready", pdf: Buffer.from("%PDF-test") });
});

test("report job marks a failed generation without leaking provider details", async () => {
  const errors: string[] = [];
  const jobs = createReportJobs(async () => { throw new Error("provider-secret-detail sk-ant-test-secret"); });
  const originalConsoleError = console.error;
  console.error = (message: string) => errors.push(message);
  let succeeded: boolean;
  try {
    succeeded = await jobs.run(8, {} as QuestionnaireAnswers, "C", "en");
  } finally {
    console.error = originalConsoleError;
  }

  assert.equal(succeeded, false);
  assert.deepEqual(jobs.get(8), { status: "failed" });
  assert.match(errors[0], /provider-secret-detail/);
  assert.ok(!errors[0].includes("sk-ant-test-secret"));
});