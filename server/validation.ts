import { z } from "zod";

const sectorValues = [
  "food", "real-estate", "health", "finance", "tourism", "retail", "industry", "b2b-services",
  "education", "technology", "automotive", "construction", "energy", "fashion", "beauty",
  "restaurants", "home", "agriculture", "logistics", "crafts", "public", "other",
] as const;
const objectiveValues = [
  "awareness", "leads", "sales", "launch", "positioning", "loyalty", "recruitment", "reputation",
  "international", "digital", "identity", "events", "other",
] as const;
const channelValues = [
  "social", "website", "paid", "email", "sms", "outdoor", "press", "radio", "television",
  "events", "point-of-sale", "public-relations", "influencer", "partnerships", "direct", "none",
] as const;
const countryValues = ["tunisia", "france", "canada", "qatar", "algeria", "gabon", "other"] as const;
const currencyValues = ["TND", "EUR", "USD", "CAD", "QAR", "DZD", "XAF"] as const;

const optionalText = (maximum: number) => z.string().max(maximum).optional();
const optionalChoice = (values: readonly [string, ...string[]]) => z.union([z.enum(values), z.literal("")]).optional();

export const answersSchema = z.object({
  company: z.object({
    name: optionalText(180),
    sector: optionalChoice(sectorValues),
    sectorOther: optionalText(100),
    country: z.enum(countryValues).optional(),
    city: optionalText(100),
    size: optionalChoice(["self-employed", "tpe", "sme", "enterprise"]),
    website: optionalText(240),
    socials: z.array(z.enum(["facebook", "instagram", "linkedin", "tiktok", "youtube", "none"])).max(6).optional(),
  }).strict().optional(),
  goals: z.object({
    primary: optionalChoice(objectiveValues),
    primaryOther: optionalText(160),
    secondary: z.array(z.enum(objectiveValues)).max(2).optional(),
    secondaryOther: optionalText(160),
    horizon: optionalChoice(["one-month", "three-months", "six-months", "unspecified"]),
  }).strict().optional(),
  audience: z.object({
    clientele: optionalChoice(["b2b", "b2c", "both"]),
    profile: optionalText(500),
    zone: optionalChoice(["local", "national", "international"]),
  }).strict().optional(),
  situation: z.object({
    channels: z.array(z.enum(channelValues)).max(16).optional(),
    satisfaction: z.number().int().min(0).max(5).optional(),
    competitors: optionalText(500),
    marketingBudgetInvested: optionalChoice(["yes", "no"]),
  }).strict().optional(),
  budget: z.object({
    amountBand: optionalChoice(["low", "medium", "high"]),
    currency: z.enum(currencyValues).optional(),
    frequency: optionalChoice(["campaign", "monthly"]),
    urgency: optionalChoice(["one-month", "three-months", "not-urgent"]),
  }).strict().optional(),
  contact: z.object({
    fullName: optionalText(160),
    role: optionalText(120),
    email: z.string().max(254).optional(),
    phone: optionalText(32),
    consent: z.boolean().optional(),
  }).strict().optional(),
}).strict();

export type QuestionnaireAnswers = z.infer<typeof answersSchema>;

export const draftPayloadSchema = z.object({
  language: z.enum(["fr", "en"]),
  currentStep: z.number().int().min(1).max(6),
  answers: answersSchema,
}).strict();

const countryCurrency: Record<string, string> = {
  tunisia: "TND",
  france: "EUR",
  canada: "CAD",
  qatar: "QAR",
  algeria: "DZD",
  gabon: "XAF",
};

export function validateSubmission(input: unknown):
  | { success: true; data: QuestionnaireAnswers }
  | { success: false; invalidFields: string[] } {
  const parsed = answersSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      invalidFields: [...new Set(parsed.error.issues.map((issue) => issue.path.join(".")))],
    };
  }

  const answers = parsed.data;
  const invalid = new Set<string>();
  const company = answers.company ?? {};
  const goals = answers.goals ?? {};
  const audience = answers.audience ?? {};
  const situation = answers.situation ?? {};
  const budget = answers.budget ?? {};
  const contact = answers.contact ?? {};
  const requireText = (key: string, value?: string) => {
    if (!value?.trim()) invalid.add(key);
  };

  requireText("company.name", company.name);
  requireText("company.sector", company.sector);
  requireText("company.country", company.country);
  requireText("company.city", company.city);
  requireText("company.size", company.size);
  if (company.sector === "other") requireText("company.sectorOther", company.sectorOther);
  if (!company.socials?.length || (company.socials.includes("none") && company.socials.length !== 1)) invalid.add("company.socials");
  if (company.website) {
    try {
      new URL(/^https?:\/\//i.test(company.website) ? company.website : `https://${company.website}`);
    } catch {
      invalid.add("company.website");
    }
  }

  requireText("goals.primary", goals.primary);
  if (goals.primary === "other") requireText("goals.primaryOther", goals.primaryOther);
  requireText("goals.horizon", goals.horizon);
  if (goals.primary && goals.secondary?.some((objective) => objective === goals.primary)) invalid.add("goals.secondary");
  if (goals.secondary?.includes("other")) requireText("goals.secondaryOther", goals.secondaryOther);

  requireText("audience.clientele", audience.clientele);
  requireText("audience.profile", audience.profile);
  requireText("audience.zone", audience.zone);

  if (!situation.channels?.length || (situation.channels.includes("none") && situation.channels.length !== 1)) invalid.add("situation.channels");
  if (!situation.satisfaction || situation.satisfaction < 1) invalid.add("situation.satisfaction");
  requireText("situation.marketingBudgetInvested", situation.marketingBudgetInvested);

  requireText("budget.amountBand", budget.amountBand);
  requireText("budget.currency", budget.currency);
  requireText("budget.frequency", budget.frequency);
  requireText("budget.urgency", budget.urgency);
  const expectedCurrency = company.country ? countryCurrency[company.country] : undefined;
  if (expectedCurrency && budget.currency !== expectedCurrency) invalid.add("budget.currency");

  requireText("contact.fullName", contact.fullName);
  requireText("contact.role", contact.role);
  if (!contact.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email.trim())) invalid.add("contact.email");
  if (!contact.phone || contact.phone.replace(/\D/g, "").length < 7) invalid.add("contact.phone");
  if (contact.consent !== true) invalid.add("contact.consent");

  return invalid.size
    ? { success: false, invalidFields: [...invalid] }
    : { success: true, data: answers };
}