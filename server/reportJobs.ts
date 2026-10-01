import type { Pool, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { generateCommunicationPlan } from "./plan.js";
import type { LeadCategory } from "./scoring.js";
import type { QuestionnaireAnswers } from "./validation.js";

interface PendingReportRow extends RowDataPacket {
  id: number;
  language: "fr" | "en";
  lead_category: LeadCategory;
  answers: QuestionnaireAnswers | string;
}

export type PlanGenerator = typeof generateCommunicationPlan;

function parseAnswers(value: QuestionnaireAnswers | string) {
  return typeof value === "string" ? JSON.parse(value) as QuestionnaireAnswers : value;
}

export function createReportJobs(database: Pool, generatePlan: PlanGenerator = generateCommunicationPlan) {
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
      const [claim] = await database.execute<ResultSetHeader>(
        "UPDATE questionnaire_submissions SET report_status = 'processing' WHERE id = ? AND status = 'submitted' AND report_status = 'pending'",
        [id],
      );
      if (claim.affectedRows === 0) return false;

      const markdown = await generatePlan(answers, category, language);
      if (markdown.length > 200_000) throw new Error("Generated plan exceeded storage limit");
      await database.execute(
        "UPDATE questionnaire_submissions SET report_status = 'ready', report_markdown = ?, report_generated_at = CURRENT_TIMESTAMP(3) WHERE id = ? AND report_status = 'processing'",
        [markdown, id],
      );
      return true;
    } catch {
      await database.execute(
        "UPDATE questionnaire_submissions SET report_status = 'failed', report_markdown = NULL WHERE id = ? AND report_status = 'processing'",
        [id],
      ).catch(() => undefined);
      console.error(`Communication plan generation failed for submission ${id}.`);
      return false;
    } finally {
      active.delete(id);
    }
  }

  async function resumePending() {
    await database.execute(
      "UPDATE questionnaire_submissions SET report_status = 'pending' WHERE status = 'submitted' AND report_status = 'processing'",
    );
    const [rows] = await database.execute<PendingReportRow[]>(
      "SELECT id, language, lead_category, answers FROM questionnaire_submissions WHERE status = 'submitted' AND report_status = 'pending' AND lead_category IS NOT NULL ORDER BY id ASC",
    );
    for (const row of rows) {
      void run(row.id, parseAnswers(row.answers), row.lead_category, row.language);
    }
  }

  return { run, resumePending };
}