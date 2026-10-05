import { google } from "googleapis";
import type { QuestionnaireAnswers } from "./validation.js";

export type GoogleSubmissionInput = {
  language: "fr" | "en";
  answers: QuestionnaireAnswers;
  score: { total: number; category: "A" | "B" | "C" };
};

function toJsonValue(value: unknown) {
  if (Array.isArray(value)) return JSON.stringify(value);
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return value == null ? "" : String(value);
}

export function buildGoogleSheetRow(input: GoogleSubmissionInput) {
  const company = input.answers.company ?? {};
  const goals = input.answers.goals ?? {};
  const audience = input.answers.audience ?? {};
  const situation = input.answers.situation ?? {};
  const budget = input.answers.budget ?? {};
  const contact = input.answers.contact ?? {};

  const payload = {
    language: input.language,
    company_name: company.name ?? "",
    company_sector: company.sector ?? "",
    company_country: company.country ?? "",
    company_city: company.city ?? "",
    company_size: company.size ?? "",
    company_website: company.website ?? "",
    company_socials: JSON.stringify(company.socials ?? []),
    primary_objective: goals.primary ?? "",
    secondary_objectives: JSON.stringify(goals.secondary ?? []),
    target_horizon: goals.horizon ?? "",
    clientele: audience.clientele ?? "",
    audience_profile: audience.profile ?? "",
    target_zone: audience.zone ?? "",
    current_channels: JSON.stringify(situation.channels ?? []),
    satisfaction: situation.satisfaction ?? "",
    competitors: situation.competitors ?? "",
    marketing_budget_invested: situation.marketingBudgetInvested ?? "",
    budget_band: budget.amountBand ?? "",
    budget_currency: budget.currency ?? "",
    budget_frequency: budget.frequency ?? "",
    urgency: budget.urgency ?? "",
    contact_full_name: contact.fullName ?? "",
    contact_role: contact.role ?? "",
    contact_email: contact.email ?? "",
    contact_phone: contact.phone ?? "",
    consent: contact.consent ? "yes" : "no",
    score_total: input.score.total,
    score_category: input.score.category,
    raw_payload: JSON.stringify(input.answers),
  };

  const row = [
    payload.language,
    payload.company_name,
    payload.company_sector,
    payload.company_country,
    payload.company_city,
    payload.company_size,
    payload.company_website,
    payload.company_socials,
    payload.primary_objective,
    payload.secondary_objectives,
    payload.target_horizon,
    payload.clientele,
    payload.audience_profile,
    payload.target_zone,
    payload.current_channels,
    payload.satisfaction,
    payload.competitors,
    payload.marketing_budget_invested,
    payload.budget_band,
    payload.budget_currency,
    payload.budget_frequency,
    payload.urgency,
    payload.contact_full_name,
    payload.contact_role,
    payload.contact_email,
    payload.contact_phone,
    payload.consent,
    payload.score_total,
    payload.score_category,
    payload.raw_payload,
  ];

  return row.map((value) => (value == null ? "" : String(value)));
}

export async function appendSubmissionToGoogleSheet(input: GoogleSubmissionInput) {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;
  if (!sheetId || !serviceAccountEmail || !privateKey) return false;

  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: serviceAccountEmail,
        private_key: privateKey.replace(/\\n/g, "\n"),
      },
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
    const sheets = google.sheets({ version: "v4", auth });
    const row = buildGoogleSheetRow(input);
    const range = process.env.GOOGLE_SHEET_RANGE ?? "A:AI";
    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range,
      valueInputOption: "RAW",
      requestBody: { values: [row.map(toJsonValue)] },
    });
    return true;
  } catch (error) {
    console.error("Google Sheets export failed", error);
    return false;
  }
}
