import { createHash, randomBytes } from "node:crypto";
import { isIP } from "node:net";
import express, { type Request, type Response } from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { appendSubmissionToGoogleSheet, hasNormalizedEmailInGoogleSheet } from "./googleSheets.js";
import {
  createEmailCodeProof,
  emailCodeLifetimeMs,
  generateEmailCode,
  isDisposableEmail,
  normalizeEmail,
  type EmailLanguage,
  sendEmailVerificationCode,
  verifyEmailCodeProof,
} from "./emailVerification.js";
import { createReportJobs, type PlanGenerator, type ReportStatus } from "./reportJobs.js";
import { calculateLeadScore, type LeadCategory } from "./scoring.js";
import { sendCategoryALeadAlert } from "./leadAlert.js";
import { draftPayloadSchema, validateSubmission, type QuestionnaireAnswers } from "./validation.js";

const cookieName = "doctor_com_draft";
const emailCodeCookieName = "doctor_com_email_code";
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
  verifiedEmail?: string;
  lastCodeSentAt?: number;
  submitting?: boolean;
}

function readResumeToken(request: Request) {
  return readCookie(request, cookieName);
}

function readCookie(request: Request, name: string) {
  const value = request.headers.cookie?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  return value?.slice(name.length + 1) || null;
}

function getClientIp(request: Request) {
  const cloudflareIp = request.get("CF-Connecting-IP")?.trim();
  if (cloudflareIp && isIP(cloudflareIp)) return cloudflareIp;
  return request.ip ?? "unknown";
}

function clientIpRateLimitKey(request: Request) {
  return ipKeyGenerator(getClientIp(request));
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
    emailVerified: Boolean(row.verifiedEmail),
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
    emailExists?: typeof hasNormalizedEmailInGoogleSheet;
    sendVerificationEmail?: typeof sendEmailVerificationCode;
    sendLeadAlert?: typeof sendCategoryALeadAlert;
    emailCodeSecret?: string;
    now?: () => number;
  } = {},
) {
  const app = express();
  const reportJobs = options.reportJobs ?? createReportJobs(options.generatePlan);
  const appendSubmission = options.appendSubmission ?? appendSubmissionToGoogleSheet;
  const emailExists = options.emailExists ?? hasNormalizedEmailInGoogleSheet;
  const sendVerificationEmail = options.sendVerificationEmail ?? sendEmailVerificationCode;
  const sendLeadAlert = options.sendLeadAlert ?? sendCategoryALeadAlert;
  const emailCodeSecret = options.emailCodeSecret ?? process.env.EMAIL_CODE_SECRET;
  const now = options.now ?? Date.now;
  const drafts = new Map<string, DraftRecord>();
  const activeEmailSubmissions = new Set<string>();
  let nextSubmissionId = 1;
  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(express.json({ limit: "64kb" }));

  const sendCodeIpLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 3,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: clientIpRateLimitKey,
    message: { error: "rate_limited" },
  });
  const sendCodeEmailLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 3,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (request) => normalizeEmail(request.body?.email) ?? `invalid:${clientIpRateLimitKey(request)}`,
    message: { error: "rate_limited" },
  });
  const verifyCodeLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: clientIpRateLimitKey,
    message: { error: "too_many_attempts" },
  });

  app.get("/api/health", (_request, response) => {
    response.json({ status: "ok" });
  });

  app.post("/api/email/send-code", sendCodeIpLimiter, sendCodeEmailLimiter, async (request, response) => {
    const email = normalizeEmail(request.body?.email);
    if (!email) {
      response.status(400).json({ error: "invalid_email" });
      return;
    }
    const language = request.body?.language;
    if (language !== "fr" && language !== "en") {
      response.status(400).json({ error: "invalid_language" });
      return;
    }
    if (isDisposableEmail(email)) {
      response.status(400).json({ error: "disposable_email" });
      return;
    }
    const token = readResumeToken(request);
    const draft = token ? drafts.get(tokenHash(token)) : undefined;
    if (!draft || draft.status !== "draft") {
      response.status(401).json({ error: "draft_not_found" });
      return;
    }
    if (draft.lastCodeSentAt !== undefined && now() - draft.lastCodeSentAt < 60_000) {
      response.status(429).json({
        error: "resend_wait",
        retryAfterSeconds: Math.ceil((60_000 - (now() - draft.lastCodeSentAt)) / 1000),
      });
      return;
    }
    const secret = emailCodeSecret;
    if (!secret || Buffer.byteLength(secret) < 32) {
      response.status(503).json({ error: "verification_unavailable" });
      return;
    }

    try {
      if (await emailExists(email)) {
        response.status(409).json({ error: "email_already_used" });
        return;
      }
    } catch {
      response.status(503).json({ error: "spreadsheet_unavailable" });
      return;
    }

    const code = generateEmailCode();
    const expiresAt = now() + emailCodeLifetimeMs;
    try {
      await sendVerificationEmail(email, code, language as EmailLanguage);
    } catch (error) {
      console.error("Verification email could not be sent", error);
      response.status(503).json({ error: "email_send_failed" });
      return;
    }

    draft.verifiedEmail = undefined;
    draft.lastCodeSentAt = now();
    response.cookie(emailCodeCookieName, createEmailCodeProof(secret, email, code, expiresAt), {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: emailCodeLifetimeMs,
      path: "/api/email",
    });
    response.json({ sent: true, expiresInSeconds: emailCodeLifetimeMs / 1000 });
  });

  app.post("/api/email/verify", verifyCodeLimiter, (request, response) => {
    const token = readResumeToken(request);
    const draft = token ? drafts.get(tokenHash(token)) : undefined;
    if (!draft || draft.status !== "draft") {
      response.status(401).json({ error: "draft_not_found" });
      return;
    }
    const proof = readCookie(request, emailCodeCookieName);
    if (!proof) {
      response.status(410).json({ error: "expired_code" });
      return;
    }
    if (typeof request.body?.code !== "string" || !/^\d{6}$/.test(request.body.code)) {
      response.status(400).json({ error: "invalid_code" });
      return;
    }
    const secret = emailCodeSecret;
    if (!secret || Buffer.byteLength(secret) < 32) {
      response.status(503).json({ error: "verification_unavailable" });
      return;
    }
    const result = verifyEmailCodeProof(proof, request.body.code, secret, now());
    if ("error" in result) {
      if (result.error === "expired_code") {
        response.clearCookie(emailCodeCookieName, { httpOnly: true, secure: true, sameSite: "lax", path: "/api/email" });
        response.status(410).json(result);
      } else {
        response.status(400).json(result);
      }
      return;
    }

    draft.verifiedEmail = result.email;
    response.clearCookie(emailCodeCookieName, { httpOnly: true, secure: true, sameSite: "lax", path: "/api/email" });
    response.json({ verified: true });
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
    if (normalizeEmail(parsed.data.answers.contact?.email) !== draft.verifiedEmail) draft.verifiedEmail = undefined;
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
      if (normalizeEmail(validation.data.contact?.email) !== draft.verifiedEmail) {
        response.status(403).json({ error: "email_verification_required" });
        return;
      }
      if (draft.submitting) {
        response.status(409).json({ error: "submission_in_progress" });
        return;
      }
      const verifiedEmail = draft.verifiedEmail;
      if (activeEmailSubmissions.has(verifiedEmail)) {
        response.status(409).json({ error: "email_submission_in_progress" });
        return;
      }

      draft.submitting = true;
      activeEmailSubmissions.add(verifiedEmail);
      const score = calculateLeadScore(validation.data);
      let reservedReportDay: string | null = null;
      try {
        if (await emailExists(draft.verifiedEmail)) {
          response.status(409).json({ error: "email_already_used" });
          return;
        }
        reservedReportDay = reportJobs.reserveDailySlot();
        if (!reservedReportDay) {
          response.status(429).json({ error: "daily_report_cap" });
          return;
        }
        const submittedAt = now();
        const appended = await appendSubmission({
          language: payload.data.language,
          answers: validation.data,
          score: { total: score.total, category: score.category },
          submittedAt: new Date(submittedAt).toISOString(),
        });
        if (!appended) {
          reportJobs.releaseDailySlot(reservedReportDay);
          reservedReportDay = null;
          response.status(503).json({ error: "spreadsheet_unavailable" });
          return;
        }

        draft.language = payload.data.language;
        draft.current_step = payload.data.currentStep;
        draft.answers = validation.data;
        draft.status = "submitted";
        draft.lead_category = score.category;
        draft.report_status = "pending";
        draft.updated_at = submittedAt;
        response.status(202).json({ status: "submitted", reportStatus: "pending" });
        if (score.category === "A") {
          void sendLeadAlert({
            answers: validation.data,
            score: { total: score.total, category: score.category },
            submittedAt: new Date(submittedAt).toISOString(),
          }).catch((error: unknown) => {
            console.error("Category A lead alert could not be sent", error);
          });
        }
        void reportJobs.run(draft.id, validation.data, score.category, payload.data.language);
      } catch {
        if (reservedReportDay) reportJobs.releaseDailySlot(reservedReportDay);
        response.status(503).json({ error: "spreadsheet_unavailable" });
      } finally {
        draft.submitting = false;
        activeEmailSubmissions.delete(verifiedEmail);
      }
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
    if (!reportJobs.reserveDailySlot()) {
      response.status(429).json({ error: "daily_report_cap" });
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