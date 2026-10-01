import type { QuestionnaireAnswers } from "./validation.js";

export type LeadCategory = "A" | "B" | "C";

export interface LeadScore {
  budgetScore: number;
  urgencyScore: number;
  companyScore: number;
  total: number;
  category: LeadCategory;
}

export function configuredHighValueSectors() {
  return new Set(
    (process.env.HIGH_VALUE_SECTORS ?? "")
      .split(",")
      .map((sector) => sector.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function calculateLeadScore(
  answers: QuestionnaireAnswers,
  highValueSectors: ReadonlySet<string> = configuredHighValueSectors(),
): LeadScore {
  const budgetScore = { low: 10, medium: 22, high: 33 }[answers.budget?.amountBand ?? "low"] ?? 10;
  const urgencyScore = { "not-urgent": 10, "three-months": 22, "one-month": 33 }[answers.budget?.urgency ?? "not-urgent"] ?? 10;
  const size = answers.company?.size;
  const sectorIsHighValue = highValueSectors.has(answers.company?.sector?.toLowerCase() ?? "");
  const companyScore = sectorIsHighValue || size === "enterprise"
    ? 34
    : size === "sme"
      ? 22
      : 10;
  const total = budgetScore + urgencyScore + companyScore;

  return {
    budgetScore,
    urgencyScore,
    companyScore,
    total,
    category: total >= 70 ? "A" : total >= 40 ? "B" : "C",
  };
}