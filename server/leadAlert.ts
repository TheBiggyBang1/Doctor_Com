import { Resend } from "resend";
import type { LeadCategory } from "./scoring.js";
import type { QuestionnaireAnswers } from "./validation.js";

type LeadAlertInput = {
  answers: QuestionnaireAnswers;
  score: { total: number; category: LeadCategory };
  submittedAt: string;
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  })[character] ?? character);
}

export function buildLeadAlertEmail(input: LeadAlertInput) {
  const company = input.answers.company ?? {};
  const contact = input.answers.contact ?? {};
  const fields = [
    ["Name", contact.fullName],
    ["Role", contact.role],
    ["Email", contact.email],
    ["Phone", contact.phone],
    ["Company", company.name],
    ["Sector", company.sector === "other" ? company.sectorOther : company.sector],
    ["Location", [company.city, company.country].filter(Boolean).join(", ")],
    ["Website", company.website],
    ["Lead score", `${input.score.total} (Category ${input.score.category})`],
    ["Submitted at", input.submittedAt],
  ] as const;
  const rows = fields
    .filter(([, value]) => Boolean(value))
    .map(([label, value]) => `${label}: ${value}`)
    .join("\n");
  const htmlRows = fields
    .filter(([, value]) => Boolean(value))
    .map(([label, value]) => `<tr><th style="padding:8px 12px;text-align:left;color:#4f2c88;font-weight:600;border-bottom:1px solid #e6dff0">${escapeHtml(label)}</th><td style="padding:8px 12px;color:#4f2c88;border-bottom:1px solid #e6dff0">${escapeHtml(String(value))}</td></tr>`)
    .join("");

  return {
    subject: `New category A lead: ${contact.fullName || company.name || "New lead"}`,
    text: `A new category A lead has been submitted.\n\n${rows}`,
    html: `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:24px;background:#f7f5fb;font-family:Arial,Helvetica,sans-serif;color:#4f2c88">
    <main style="max-width:600px;margin:0 auto;padding:24px;background:#fff;border:1px solid #e6dff0;border-top:5px solid #00b5cd">
      <p style="margin:0 0 8px;color:#4f2c88;font-size:11px;font-weight:bold;letter-spacing:1.5px">5 SENS ADVERTISING</p>
      <h1 style="margin:0 0 20px;font-size:22px;font-weight:600">New high-priority lead</h1>
      <table style="width:100%;border-collapse:collapse;font-size:14px">${htmlRows}</table>
    </main>
  </body>
</html>`,
  };
}

export async function sendCategoryALeadAlert(input: LeadAlertInput) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  const to = process.env.LEAD_ALERT_EMAIL;
  if (!apiKey || !from || !to) throw new Error("Lead alert email is not configured");

  const content = buildLeadAlertEmail(input);
  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from,
    to,
    subject: content.subject,
    text: content.text,
    html: content.html,
  });
  if (error) throw new Error(`Resend rejected the lead alert: ${error.message}`);
}
