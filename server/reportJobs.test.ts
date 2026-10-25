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

test("report job alerts the team instead of delivering a report when the AI key is missing", async () => {
  const previousKey = process.env.ANTHROPIC_API_KEY;
  const originalError = console.error;
  const alerts: Array<{ submissionId: number; category: string; reason: string }> = [];
  delete process.env.ANTHROPIC_API_KEY;
  console.error = () => undefined;
  try {
    const jobs = createReportJobs(undefined, undefined, undefined, async (input) => { alerts.push(input); });
    const succeeded = await jobs.run(9, {} as QuestionnaireAnswers, "C", "en");

    assert.equal(succeeded, false);
    assert.deepEqual(jobs.get(9), { status: "failed" });
    assert.equal(alerts.length, 1);
    assert.equal(alerts[0].submissionId, 9);
    assert.equal(alerts[0].category, "C");
    assert.match(alerts[0].reason, /not configured/);
  } finally {
    console.error = originalError;
    if (previousKey === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = previousKey;
  }
});

test("daily report reservations release failed writes and reset at UTC midnight", () => {
  const previousCap = process.env.DAILY_REPORT_CAP;
  process.env.DAILY_REPORT_CAP = "1";
  let now = Date.UTC(2026, 0, 1, 23, 59, 59);
  try {
    const jobs = createReportJobs(undefined, undefined, () => now);
    const firstDay = new Date(now).toISOString().slice(0, 10);
    assert.equal(jobs.reserveDailySlot(), firstDay);
    assert.equal(jobs.reserveDailySlot(), null);
    jobs.releaseDailySlot(firstDay);
    assert.equal(jobs.reserveDailySlot(), firstDay);
    now += 1000;
    assert.equal(jobs.reserveDailySlot(), "2026-01-02");
  } finally {
    if (previousCap === undefined) delete process.env.DAILY_REPORT_CAP;
    else process.env.DAILY_REPORT_CAP = previousCap;
  }
});

test("report job marks a failed generation without leaking provider details", async () => {
  const errors: string[] = [];
  const jobs = createReportJobs(
    async () => { throw new Error("provider-secret-detail sk-ant-test-secret"); },
    undefined,
    undefined,
    async () => undefined,
  );
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