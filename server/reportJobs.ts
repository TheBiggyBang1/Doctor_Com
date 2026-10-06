import { renderHtmlReportPdf } from "./htmlPdf.js";
import { generateCommunicationPlan } from "./plan.js";
import type { LeadCategory } from "./scoring.js";
import type { QuestionnaireAnswers } from "./validation.js";

export type ReportStatus = "pending" | "processing" | "ready" | "failed";

interface ReportJob {
  status: ReportStatus;
  pdf?: Buffer;
}

export type PlanGenerator = typeof generateCommunicationPlan;
export type ReportPdfCompiler = typeof renderHtmlReportPdf;

function describeFailure(error: unknown) {
  const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  return message.replace(/\bsk-ant-[A-Za-z0-9_-]+\b/g, "[redacted API key]").slice(0, 500);
}

export function createReportJobs(
  generatePlan: PlanGenerator = generateCommunicationPlan,
  compilePdf: ReportPdfCompiler = renderHtmlReportPdf,
  now: () => number = Date.now,
) {
  const active = new Set<number>();
  const jobs = new Map<number, ReportJob>();
  const configuredDailyCap = Number(process.env.DAILY_REPORT_CAP ?? 100);
  const dailyCap = Number.isFinite(configuredDailyCap) && configuredDailyCap >= 0
    ? Math.floor(configuredDailyCap)
    : 100;
  let usageDay = "";
  let dailyUsage = 0;

  function refreshDailyUsage() {
    const today = new Date(now()).toISOString().slice(0, 10);
    if (today !== usageDay) {
      usageDay = today;
      dailyUsage = 0;
    }
  }

  function reserveDailySlot(): string | null {
    refreshDailyUsage();
    if (dailyUsage >= dailyCap) return null;
    dailyUsage += 1;
    return usageDay;
  }

  function releaseDailySlot(reservedDay: string) {
    refreshDailyUsage();
    if (usageDay !== reservedDay) return;
    dailyUsage = Math.max(0, dailyUsage - 1);
  }

  async function run(
    id: number,
    answers: QuestionnaireAnswers,
    category: LeadCategory,
    language: "fr" | "en",
  ) {
    if (active.has(id)) return false;
    active.add(id);
    jobs.set(id, { status: "processing" });
    try {
      const html = await generatePlan(answers, category, language);
      if (html.length > 200_000) throw new Error("Generated plan exceeded storage limit");
      const pdf = await compilePdf(html, language);
      jobs.set(id, { status: "ready", pdf });
      return true;
    } catch (error) {
      jobs.set(id, { status: "failed" });
      console.error(`Communication plan generation failed for submission ${id}: ${describeFailure(error)}`);
      return false;
    } finally {
      active.delete(id);
    }
  }

  return {
    run,
    reserveDailySlot,
    releaseDailySlot,
    get(id: number) {
      return jobs.get(id);
    },
  };
}