import { createHash, randomBytes } from "node:crypto";
import express, { type Request, type Response } from "express";
import { appendSubmissionToGoogleSheet } from "./googleSheets.js";
import { createReportJobs, type PlanGenerator, type ReportStatus } from "./reportJobs.js";
import { calculateLeadScore, type LeadCategory } from "./scoring.js";
import { draftPayloadSchema, validateSubmission, type QuestionnaireAnswers } from "./validation.js";

const cookieName = "doctor_com_draft";
const configuredDays = Number(process.env.DRAFT_TTL_DAYS ?? 30);
const cookieAge = (Number.isFinite(configuredDays) ? Math.min(365, Math.max(1, configuredDays)) : 30) * 24 * 60 * 60 * 1000;

interface DraftRecord {
  id: number;
  language: "fr" | "en";
  current_step: number;
  answers: QuestionnaireAnswers | string;
  status: "draft" | "submitted";
  report_status: ReportStatus | "not_started";
  lead_category: LeadCategory | null;
  updated_at: number;
  submissionPromise?: Promise<boolean>;
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

function draftResponse(row: DraftRecord) {
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
  options: {
    reportJobs?: ReturnType<typeof createReportJobs>;
    generatePlan?: PlanGenerator;
    appendSubmission?: typeof appendSubmissionToGoogleSheet;
  } = {},
) {
  const app = express();
  const reportJobs = options.reportJobs ?? createReportJobs(options.generatePlan);
  const appendSubmission = options.appendSubmission ?? appendSubmissionToGoogleSheet;
  const drafts = new Map<string, DraftRecord>();
  let nextSubmissionId = 1;
  app.disable("x-powered-by");
  app.use(express.json({ limit: "64kb" }));

  app.get("/api/health", (_request, response) => {
    response.json({ status: "ok" });
  });

  app.get("/api/questionnaire/draft", async (request, response) => {
    const token = readResumeToken(request);
    if (!token) {
      response.json({ draft: null });
      return;
    }
    const row = drafts.get(tokenHash(token));
    if (!row) {
      response.clearCookie(cookieName, { httpOnly: true, sameSite: "lax", path: "/api" });
      response.json({ draft: null });
      return;
    }
    response.json({ draft: draftResponse(row) });
  });

  app.post("/api/questionnaire/draft", async (request, response) => {
    const parsed = draftPayloadSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ error: "invalid_draft", invalidFields: parsed.error.issues.map((issue) => issue.path.join(".")) });
      return;
    }
    const currentToken = readResumeToken(request);
    if (currentToken) {
      const row = drafts.get(tokenHash(currentToken));
      if (row?.status === "draft") {
        setResumeCookie(response, currentToken);
        response.json({ draft: draftResponse(row) });
        return;
      }
    }

    const token = randomBytes(32).toString("base64url");
    const row: DraftRecord = {
      id: nextSubmissionId++,
      language: parsed.data.language,
      current_step: parsed.data.currentStep,
      answers: parsed.data.answers,
      status: "draft",
      report_status: "not_started",
      lead_category: null,
      updated_at: Date.now(),
    };
    drafts.set(tokenHash(token), row);
    setResumeCookie(response, token);
    response.status(201).json({ draft: draftResponse(row) });
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
    const draft = drafts.get(tokenHash(token));
    if (!draft || draft.status !== "draft") {
      response.status(404).json({ error: "draft_not_found" });
      return;
    }
    draft.language = parsed.data.language;
    draft.current_step = parsed.data.currentStep;
    draft.answers = parsed.data.answers;
    draft.updated_at = Date.now();
    response.json({ saved: true });
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
      const draft = drafts.get(tokenHash(token));
      if (!draft) {
        response.status(404).json({ error: "draft_not_found" });
        return;
      }
      if (draft.status === "submitted") {
        response.json({ status: "submitted", reportStatus: draft.report_status });
        return;
      }

      const score = calculateLeadScore(validation.data);
      if (!draft.submissionPromise) {
        draft.submissionPromise = appendSubmission({
          language: payload.data.language,
          answers: validation.data,
          score: { total: score.total, category: score.category },
        });
      }
      const appended = await draft.submissionPromise;
      draft.submissionPromise = undefined;
      if (!appended) {
        response.status(503).json({ error: "spreadsheet_unavailable" });
        return;
      }

      draft.language = payload.data.language;
      draft.current_step = payload.data.currentStep;
      draft.answers = validation.data;
      draft.status = "submitted";
      draft.lead_category = score.category;
      draft.report_status = "pending";
      draft.updated_at = Date.now();
      response.status(202).json({ status: "submitted", reportStatus: "pending" });
      void reportJobs.run(draft.id, validation.data, score.category, payload.data.language);
    } catch {
      response.status(503).json({ error: "spreadsheet_unavailable" });
    }
  });

  app.get("/api/questionnaire/report", async (request, response) => {
    const token = readResumeToken(request);
    if (!token) {
      response.status(401).json({ error: "report_not_found" });
      return;
    }
    const row = drafts.get(tokenHash(token));
    if (!row || row.status !== "submitted") {
      response.status(404).json({ error: "report_not_found" });
      return;
    }
    response.setHeader("Cache-Control", "private, no-store");
    response.json({ reportStatus: reportJobs.get(row.id)?.status ?? row.report_status });
  });

  app.get("/api/questionnaire/report.pdf", async (request, response) => {
    const token = readResumeToken(request);
    if (!token) {
      response.status(401).json({ error: "report_not_found" });
      return;
    }
    const record = drafts.get(tokenHash(token));
    const report = record ? reportJobs.get(record.id) : undefined;
    if (!record || record.status !== "submitted" || report?.status !== "ready" || !report.pdf) {
      response.status(record ? 409 : 404).json({ error: record ? "report_not_ready" : "report_not_found" });
      return;
    }
    response.setHeader("Cache-Control", "private, no-store");
    response.setHeader("Content-Disposition", "inline; filename=plan-de-communication.pdf");
    response.type("application/pdf").send(report.pdf);
  });

  app.post("/api/questionnaire/report/retry", async (request, response) => {
    const token = readResumeToken(request);
    if (!token) {
      response.status(401).json({ error: "report_not_found" });
      return;
    }
    const submission = drafts.get(tokenHash(token));
    if (!submission || submission.status !== "submitted") {
      response.status(404).json({ error: "report_not_found" });
      return;
    }
    const report = reportJobs.get(submission.id);
    if (report?.status === "ready" || report?.status === "pending" || report?.status === "processing") {
      response.status(202).json({ reportStatus: report.status });
      return;
    }
    if (!submission.lead_category || report?.status !== "failed") {
      response.status(409).json({ error: "report_not_retryable" });
      return;
    }
    submission.report_status = "pending";
    response.status(202).json({ reportStatus: "pending" });
    void reportJobs.run(submission.id, parseAnswers(submission.answers), submission.lead_category, submission.language);
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