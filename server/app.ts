import { createHash, randomBytes } from "node:crypto";
import express, { type Request, type Response } from "express";
import type { SqliteDatabase } from "./database.js";
import { appendSubmissionToGoogleSheet } from "./googleSheets.js";
import { renderHtmlReportPdf } from "./htmlPdf.js";
import { renderPlanPdf } from "./pdf.js";
import { createReportJobs, type PlanGenerator } from "./reportJobs.js";
import { calculateLeadScore, type LeadCategory } from "./scoring.js";
import { draftPayloadSchema, validateSubmission, type QuestionnaireAnswers } from "./validation.js";

const cookieName = "doctor_com_draft";
const configuredDays = Number(process.env.DRAFT_TTL_DAYS ?? 30);
const cookieAge = (Number.isFinite(configuredDays) ? Math.min(365, Math.max(1, configuredDays)) : 30) * 24 * 60 * 60 * 1000;

interface DraftRow {
  id: number;
  language: "fr" | "en";
  current_step: number;
  answers: QuestionnaireAnswers | string;
  status: "draft" | "submitted";
  report_status: "not_started" | "pending" | "processing" | "ready" | "failed";
  report_markdown: string | null;
  report_html?: string | null;
  report_pdf?: Buffer | null;
  lead_category: LeadCategory | null;
}

function readResumeToken(request: Request) {
  const value = request.headers.cookie?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${cookieName}=`));
  return value?.slice(cookieName.length + 1) || null;
}

function setResumeCookie(response: Response, token: string) {
  response.cookie(cookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: cookieAge,
    path: "/api",
  });
}

function parseAnswers(value: QuestionnaireAnswers | string): QuestionnaireAnswers {
  return typeof value === "string" ? JSON.parse(value) as QuestionnaireAnswers : value;
}

function draftResponse(row: DraftRow) {
  return {
    language: row.language,
    currentStep: row.current_step,
    answers: parseAnswers(row.answers),
    status: row.status,
    reportStatus: row.report_status,
  };
}

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createApp(
  database: SqliteDatabase,
  options: { reportJobs?: ReturnType<typeof createReportJobs>; generatePlan?: PlanGenerator } = {},
) {
  const app = express();
  const reportJobs = options.reportJobs ?? createReportJobs(database, options.generatePlan);
  app.disable("x-powered-by");
  app.use(express.json({ limit: "64kb" }));

  app.get("/api/health", async (_request, response) => {
    try {
      await database.get("SELECT 1");
      response.json({ status: "ok" });
    } catch {
      response.status(503).json({ status: "unavailable" });
    }
  });

  app.get("/api/questionnaire/draft", async (request, response) => {
    const token = readResumeToken(request);
    if (!token) {
      response.json({ draft: null });
      return;
    }
    try {
      const row = await database.get<DraftRow>(
        "SELECT id, language, current_step, answers, status, report_status, report_markdown, lead_category FROM questionnaire_submissions WHERE resume_token_hash = $1 LIMIT 1",
        tokenHash(token),
      );
      if (!row) {
        response.clearCookie(cookieName, { httpOnly: true, sameSite: "lax", path: "/api" });
        response.json({ draft: null });
        return;
      }
      response.json({ draft: draftResponse(row) });
    } catch {
      response.status(503).json({ error: "storage_unavailable" });
    }
  });

  app.post("/api/questionnaire/draft", async (request, response) => {
    const parsed = draftPayloadSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ error: "invalid_draft", invalidFields: parsed.error.issues.map((issue) => issue.path.join(".")) });
      return;
    }
    try {
      const currentToken = readResumeToken(request);
      if (currentToken) {
        const row = await database.get<DraftRow>(
          "SELECT id, language, current_step, answers, status, report_status, report_markdown, lead_category FROM questionnaire_submissions WHERE resume_token_hash = $1 LIMIT 1",
          tokenHash(currentToken),
        );
        if (row?.status === "draft") {
          setResumeCookie(response, currentToken);
          response.json({ draft: draftResponse(row) });
          return;
        }
      }

      const token = randomBytes(32).toString("base64url");
      await database.run(
        "INSERT INTO questionnaire_submissions (resume_token_hash, language, current_step, answers, status) VALUES ($1, $2, $3, $4, 'draft')",
        tokenHash(token), parsed.data.language, parsed.data.currentStep, JSON.stringify(parsed.data.answers),
      );
      setResumeCookie(response, token);
      response.status(201).json({ draft: { ...parsed.data, status: "draft", reportStatus: "not_started" } });
    } catch {
      response.status(503).json({ error: "storage_unavailable" });
    }
  });

  app.put("/api/questionnaire/draft", async (request, response) => {
    const token = readResumeToken(request);
    if (!token) {
      response.status(401).json({ error: "draft_not_found" });
      return;
    }
    const parsed = draftPayloadSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ error: "invalid_draft", invalidFields: parsed.error.issues.map((issue) => issue.path.join(".")) });
      return;
    }
    try {
      const result = await database.run(
        "UPDATE questionnaire_submissions SET language = $1, current_step = $2, answers = $3 WHERE resume_token_hash = $4 AND status = 'draft'",
        parsed.data.language, parsed.data.currentStep, JSON.stringify(parsed.data.answers), tokenHash(token),
      );
      if (result.changes === 0) {
        response.status(404).json({ error: "draft_not_found" });
        return;
      }
      response.json({ saved: true });
    } catch {
      response.status(503).json({ error: "storage_unavailable" });
    }
  });

  app.post("/api/questionnaire/draft/submit", async (request, response) => {
    const token = readResumeToken(request);
    if (!token) {
      response.status(401).json({ error: "draft_not_found" });
      return;
    }
    const payload = draftPayloadSchema.safeParse(request.body);
    if (!payload.success) {
      response.status(400).json({ error: "invalid_submission", invalidFields: payload.error.issues.map((issue) => issue.path.join(".")) });
      return;
    }
    const validation = validateSubmission(payload.data.answers);
    if (!validation.success) {
      response.status(400).json({ error: "incomplete_submission", invalidFields: validation.invalidFields });
      return;
    }

    try {
      const score = calculateLeadScore(validation.data);
      const outcome = await database.transaction(async () => {
        const draft = await database.get<DraftRow>(
          "SELECT id, language, current_step, answers, status, report_status, report_markdown, lead_category FROM questionnaire_submissions WHERE resume_token_hash = $1",
          tokenHash(token),
        );
        if (!draft) return { status: "missing" as const };
        if (draft.status === "submitted") return { status: "already_submitted" as const, reportStatus: draft.report_status };
        await database.run(
          "UPDATE questionnaire_submissions SET language = $1, current_step = $2, answers = $3, status = 'submitted', score_total = $4, score_budget = $5, score_urgency = $6, score_company = $7, lead_category = $8, scored_at = CURRENT_TIMESTAMP, report_status = 'pending', report_markdown = NULL, report_generated_at = NULL, consent_at = CURRENT_TIMESTAMP, submitted_at = CURRENT_TIMESTAMP WHERE resume_token_hash = $9 AND status = 'draft'",
          payload.data.language, payload.data.currentStep, JSON.stringify(validation.data), score.total, score.budgetScore, score.urgencyScore, score.companyScore, score.category, tokenHash(token),
        );
        return { status: "submitted" as const, id: draft.id };
      });
      if (outcome.status === "missing") {
        response.status(404).json({ error: "draft_not_found" });
        return;
      }
      if (outcome.status === "already_submitted") {
        response.json({ status: "submitted", reportStatus: outcome.reportStatus });
        return;
      }
      response.status(202).json({ status: "submitted", reportStatus: "pending" });
      void appendSubmissionToGoogleSheet({
        language: payload.data.language,
        answers: validation.data,
        coordinates: payload.data.coordinates ?? null,
        score: { total: score.total, category: score.category },
      }).catch(() => undefined);
      void reportJobs.run(outcome.id, validation.data, score.category, payload.data.language);
    } catch {
      response.status(503).json({ error: "storage_unavailable" });
    }
  });

  app.get("/api/questionnaire/report", async (request, response) => {
    const token = readResumeToken(request);
    if (!token) {
      response.status(401).json({ error: "report_not_found" });
      return;
    }
    try {
      const row = await database.get<DraftRow>(
        "SELECT id, language, current_step, answers, status, report_status, report_markdown, lead_category FROM questionnaire_submissions WHERE resume_token_hash = $1 AND status = 'submitted' LIMIT 1",
        tokenHash(token),
      );
      if (!row) {
        response.status(404).json({ error: "report_not_found" });
        return;
      }
      response.setHeader("Cache-Control", "private, no-store");
      response.json({ reportStatus: row.report_status });
    } catch {
      response.status(503).json({ error: "storage_unavailable" });
    }
  });

  app.get("/api/questionnaire/report.pdf", async (request, response) => {
    const token = readResumeToken(request);
    if (!token) {
      response.status(401).json({ error: "report_not_found" });
      return;
    }
    try {
      const report = await database.get<DraftRow>(
        "SELECT id, language, current_step, answers, status, report_status, report_markdown, report_html, report_pdf, lead_category FROM questionnaire_submissions WHERE resume_token_hash = $1 AND status = 'submitted' LIMIT 1",
        tokenHash(token),
      );
      if (!report || report.report_status !== "ready" || (!report.report_pdf && !report.report_html && !report.report_markdown)) {
        response.status(report ? 409 : 404).json({ error: report ? "report_not_ready" : "report_not_found" });
        return;
      }
      const pdf = report.report_pdf ?? (report.report_html
        ? await renderHtmlReportPdf(report.report_html, report.language)
        : await renderPlanPdf(report.report_markdown ?? ""));
      response.setHeader("Cache-Control", "private, no-store");
      response.setHeader("Content-Disposition", "inline; filename=plan-de-communication.pdf");
      response.type("application/pdf").send(pdf);
    } catch {
      response.status(503).json({ error: "report_unavailable" });
    }
  });

  app.post("/api/questionnaire/report/retry", async (request, response) => {
    const token = readResumeToken(request);
    if (!token) {
      response.status(401).json({ error: "report_not_found" });
      return;
    }
    try {
      const submission = await database.get<DraftRow>(
        "SELECT id, language, current_step, answers, status, report_status, report_markdown, lead_category FROM questionnaire_submissions WHERE resume_token_hash = $1 AND status = 'submitted' LIMIT 1",
        tokenHash(token),
      );
      if (!submission) {
        response.status(404).json({ error: "report_not_found" });
        return;
      }
      if (submission.report_status === "ready" || submission.report_status === "pending" || submission.report_status === "processing") {
        response.status(202).json({ reportStatus: submission.report_status });
        return;
      }
      if (!submission.lead_category) {
        response.status(409).json({ error: "score_missing" });
        return;
      }
      const updated = await database.run(
        "UPDATE questionnaire_submissions SET report_status = 'pending' WHERE id = $1 AND report_status = 'failed'",
        submission.id,
      );
      if (updated.changes === 0) {
        response.status(409).json({ error: "report_not_retryable" });
        return;
      }
      response.status(202).json({ reportStatus: "pending" });
      void reportJobs.run(submission.id, parseAnswers(submission.answers), submission.lead_category, submission.language);
    } catch {
      response.status(503).json({ error: "storage_unavailable" });
    }
  });

  app.use((error: unknown, _request: Request, response: Response, _next: (error?: unknown) => void) => {
    if (error instanceof SyntaxError) {
      response.status(400).json({ error: "invalid_json" });
      return;
    }
    response.status(500).json({ error: "internal_error" });
  });

  return app;
}