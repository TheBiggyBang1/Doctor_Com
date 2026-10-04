import type { SqliteDatabase } from "./database.js";
import { renderHtmlReportPdf } from "./htmlPdf.js";
import { generateCommunicationPlan } from "./plan.js";
import type { LeadCategory } from "./scoring.js";
import type { QuestionnaireAnswers } from "./validation.js";

interface PendingReportRow {
  id: number;
  language: "fr" | "en";
  lead_category: LeadCategory;
  answers: QuestionnaireAnswers | string;
}

export type PlanGenerator = typeof generateCommunicationPlan;
export type ReportPdfCompiler = typeof renderHtmlReportPdf;

function parseAnswers(value: QuestionnaireAnswers | string) {
  return typeof value === "string" ? JSON.parse(value) as QuestionnaireAnswers : value;
}

function describeFailure(error: unknown) {
  const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  return message.replace(/\bsk-ant-[A-Za-z0-9_-]+\b/g, "[redacted API key]").slice(0, 500);
}

export function createReportJobs(
  database: SqliteDatabase,
  generatePlan: PlanGenerator = generateCommunicationPlan,
  compilePdf: ReportPdfCompiler = renderHtmlReportPdf,
) {
  const active = new Set<number>();

  async function run(
    id: number,
    answers: QuestionnaireAnswers,
    category: LeadCategory,
    language: "fr" | "en",
  ) {
    if (active.has(id)) return false;
    active.add(id);
    try {
      const claim = await database.run(
        "UPDATE questionnaire_submissions SET report_status = 'processing' WHERE id = $1 AND status = 'submitted' AND report_status = 'pending'",
        id,
      );
      if (claim.changes === 0) return false;

      const html = await generatePlan(answers, category, language);
      if (html.length > 200_000) throw new Error("Generated plan exceeded storage limit");
      const pdf = await compilePdf(html, language);
      await database.run(
        "UPDATE questionnaire_submissions SET report_status = 'ready', report_markdown = NULL, report_html = $1, report_pdf = $2, report_generated_at = CURRENT_TIMESTAMP WHERE id = $3 AND report_status = 'processing'",
        html, pdf, id,
      );
      return true;
    } catch (error) {
      try {
        await database.run(
          "UPDATE questionnaire_submissions SET report_status = 'failed', report_markdown = NULL, report_html = NULL, report_pdf = NULL WHERE id = $1 AND report_status = 'processing'",
          id,
        );
      } catch {
        // Keep the provider failure isolated from the request path.
      }
      console.error(`Communication plan generation failed for submission ${id}: ${describeFailure(error)}`);
      return false;
    } finally {
      active.delete(id);
    }
  }

  async function resumePending() {
    await database.run(
      "UPDATE questionnaire_submissions SET report_status = 'pending' WHERE status = 'submitted' AND report_status = 'processing'",
    );
    const rows = await database.all<PendingReportRow>(
      "SELECT id, language, lead_category, answers FROM questionnaire_submissions WHERE status = 'submitted' AND report_status = 'pending' AND lead_category IS NOT NULL ORDER BY id ASC",
    );
    for (const row of rows) {
      void run(row.id, parseAnswers(row.answers), row.lead_category, row.language);
    }
  }

  return { run, resumePending };
}