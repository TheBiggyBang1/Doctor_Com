export type Language = "fr" | "en";

export type Choice = {
  value: string;
  fr: string;
  en: string;
};

export const sectors: Choice[] = [
  { value: "food", fr: "Agroalimentaire", en: "Food & beverage" },
  { value: "real-estate", fr: "Immobilier & promotion immobilière", en: "Real estate & property development" },
  { value: "health", fr: "Santé & bien-être", en: "Healthcare & wellness" },
  { value: "finance", fr: "Finance & assurance", en: "Finance & insurance" },
  { value: "tourism", fr: "Tourisme & hôtellerie", en: "Tourism & hospitality" },
  { value: "retail", fr: "Retail & e-commerce", en: "Retail & e-commerce" },
  { value: "industry", fr: "Industrie & manufacturing", en: "Industry & manufacturing" },
  { value: "b2b-services", fr: "Services B2B / conseil", en: "B2B services / consulting" },
  { value: "education", fr: "Éducation & formation", en: "Education & training" },
  { value: "technology", fr: "Technologie & IT", en: "Technology & IT" },
  { value: "automotive", fr: "Automobile", en: "Automotive" },
  { value: "construction", fr: "BTP & construction", en: "Construction & building" },
  { value: "energy", fr: "Énergie (dont renouvelables)", en: "Energy (including renewables)" },
  { value: "fashion", fr: "Textile & mode", en: "Textiles & fashion" },
  { value: "beauty", fr: "Beauté & cosmétique", en: "Beauty & cosmetics" },
  { value: "restaurants", fr: "Restauration & food service", en: "Restaurants & food service" },
  { value: "home", fr: "Ameublement & décoration", en: "Furniture & home decor" },
  { value: "agriculture", fr: "Agriculture & agro-industrie", en: "Agriculture & agribusiness" },
  { value: "logistics", fr: "Transport & logistique", en: "Transport & logistics" },
  { value: "crafts", fr: "Artisanat", en: "Crafts" },
  { value: "public", fr: "Secteur public / ONG / associatif", en: "Public sector / NGO / nonprofit" },
  { value: "other", fr: "Autre", en: "Other" },
];

export const countries: Choice[] = [
  { value: "tunisia", fr: "Tunisie", en: "Tunisia" },
  { value: "france", fr: "France", en: "France" },
  { value: "canada", fr: "Canada", en: "Canada" },
  { value: "qatar", fr: "Qatar", en: "Qatar" },
  { value: "algeria", fr: "Algérie", en: "Algeria" },
  { value: "gabon", fr: "Gabon", en: "Gabon" },
  { value: "other", fr: "Autre", en: "Other" },
];

export const companySizes: Choice[] = [
  { value: "self-employed", fr: "Auto-entrepreneur", en: "Self-employed" },
  { value: "tpe", fr: "TPE (1-9)", en: "Micro business (1-9)" },
  { value: "sme", fr: "PME (10-249)", en: "SME (10-249)" },
  { value: "enterprise", fr: "Grande entreprise (250+)", en: "Large company (250+)" },
];

export const socialNetworks: Choice[] = [
  { value: "facebook", fr: "Facebook", en: "Facebook" },
  { value: "instagram", fr: "Instagram", en: "Instagram" },
  { value: "linkedin", fr: "LinkedIn", en: "LinkedIn" },
  { value: "tiktok", fr: "TikTok", en: "TikTok" },
  { value: "youtube", fr: "YouTube", en: "YouTube" },
  { value: "none", fr: "Aucun", en: "None" },
];

export const objectives: Choice[] = [
  { value: "awareness", fr: "Notoriété / visibilité de marque", en: "Brand awareness / visibility" },
  { value: "leads", fr: "Génération de leads / prospects qualifiés", en: "Lead generation / qualified prospects" },
  { value: "sales", fr: "Ventes directes / conversion e-commerce", en: "Direct sales / e-commerce conversion" },
  { value: "launch", fr: "Lancement d'un nouveau produit ou service", en: "Launching a product or service" },
  { value: "positioning", fr: "Image de marque / repositionnement", en: "Brand image / repositioning" },
  { value: "loyalty", fr: "Fidélisation clients existants", en: "Customer loyalty" },
  { value: "recruitment", fr: "Recrutement / marque employeur", en: "Recruitment / employer brand" },
  { value: "reputation", fr: "Gestion de crise / réputation", en: "Crisis / reputation management" },
  { value: "international", fr: "Développement à l'international / nouveau marché", en: "International growth / new market" },
  { value: "digital", fr: "Digitalisation de la communication", en: "Digital transformation of communications" },
  { value: "identity", fr: "Création ou refonte d'identité visuelle", en: "Visual identity creation or redesign" },
  { value: "events", fr: "Animation événementielle", en: "Events and activations" },
  { value: "other", fr: "Autre", en: "Other" },
];

export const horizons: Choice[] = [
  { value: "one-month", fr: "Immédiat / 1 mois", en: "Immediately / within 1 month" },
  { value: "three-months", fr: "3 mois", en: "3 months" },
  { value: "six-months", fr: "6 mois", en: "6 months" },
  { value: "unspecified", fr: "Pas de délai précis", en: "No specific deadline" },
];

export const clientTypes: Choice[] = [
  { value: "b2b", fr: "B2B", en: "B2B" },
  { value: "b2c", fr: "B2C", en: "B2C" },
  { value: "both", fr: "Les deux", en: "Both" },
];

export const targetZones: Choice[] = [
  { value: "local", fr: "Locale / régionale", en: "Local / regional" },
  { value: "national", fr: "Nationale", en: "National" },
  { value: "international", fr: "Internationale", en: "International" },
];

export const marketingChannels: Choice[] = [
  { value: "social", fr: "Réseaux sociaux", en: "Social media" },
  { value: "website", fr: "Site web / SEO", en: "Website / SEO" },
  { value: "paid", fr: "Publicité digitale payante", en: "Paid digital advertising" },
  { value: "email", fr: "Email marketing", en: "Email marketing" },
  { value: "sms", fr: "SMS marketing", en: "SMS marketing" },
  { value: "outdoor", fr: "Affichage extérieur", en: "Outdoor advertising" },
  { value: "press", fr: "Presse écrite", en: "Print press" },
  { value: "radio", fr: "Radio", en: "Radio" },
  { value: "television", fr: "Télévision", en: "Television" },
  { value: "events", fr: "Événementiel / salons professionnels", en: "Events / trade shows" },
  { value: "point-of-sale", fr: "PLV & merchandising", en: "Point-of-sale displays & merchandising" },
  { value: "public-relations", fr: "Relations presse / publiques", en: "Press / public relations" },
  { value: "influencer", fr: "Marketing d'influence", en: "Influencer marketing" },
  { value: "partnerships", fr: "Sponsoring / partenariats", en: "Sponsorship / partnerships" },
  { value: "direct", fr: "Marketing direct", en: "Direct marketing" },
  { value: "none", fr: "Aucun canal actif actuellement", en: "No active channels" },
];

export const yesNo: Choice[] = [
  { value: "yes", fr: "Oui", en: "Yes" },
  { value: "no", fr: "Non", en: "No" },
];

export const budgetFrequencies: Choice[] = [
  { value: "campaign", fr: "Budget ponctuel (campagne)", en: "One-off campaign budget" },
  { value: "monthly", fr: "Budget mensuel récurrent", en: "Recurring monthly budget" },
];

export const urgencies: Choice[] = [
  { value: "one-month", fr: "Sous 1 mois", en: "Within 1 month" },
  { value: "three-months", fr: "Sous 3 mois", en: "Within 3 months" },
  { value: "not-urgent", fr: "Pas pressé", en: "Not in a hurry" },
];

export const currencies: Choice[] = [
  { value: "TND", fr: "Dinar tunisien (TND)", en: "Tunisian dinar (TND)" },
  { value: "EUR", fr: "Euro (EUR)", en: "Euro (EUR)" },
  { value: "USD", fr: "Dollar américain (USD)", en: "US dollar (USD)" },
  { value: "CAD", fr: "Dollar canadien (CAD)", en: "Canadian dollar (CAD)" },
  { value: "QAR", fr: "Riyal qatari (QAR)", en: "Qatari riyal (QAR)" },
  { value: "DZD", fr: "Dinar algérien (DZD)", en: "Algerian dinar (DZD)" },
  { value: "XAF", fr: "Franc CFA (XAF)", en: "CFA franc (XAF)" },
];

export const countryCurrency: Record<string, string> = {
  tunisia: "TND",
  france: "EUR",
  canada: "CAD",
  qatar: "QAR",
  algeria: "DZD",
  gabon: "XAF",
  other: "USD",
};

export const phonePrefixes: Record<string, string> = {
  tunisia: "+216",
  france: "+33",
  canada: "+1",
  qatar: "+974",
  algeria: "+213",
  gabon: "+241",
  other: "+",
};

const budgetThresholds: Record<string, [number, number]> = {
  TND: [1500, 5000],
  EUR: [1000, 5000],
  USD: [500, 2500],
  CAD: [1500, 7500],
  QAR: [5000, 20000],
  DZD: [100000, 500000],
  XAF: [500000, 2500000],
};

export function getBudgetBands(currency: string, language: Language): Choice[] {
  const [lowLimit, highLimit] = budgetThresholds[currency] ?? budgetThresholds.USD;
  const format = (amount: number) =>
    new Intl.NumberFormat(language === "fr" ? "fr-FR" : "en", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);

  return [
    { value: "low", fr: `Moins de ${format(lowLimit)}`, en: `Under ${format(lowLimit)}` },
    { value: "medium", fr: `${format(lowLimit)} à ${format(highLimit)}`, en: `${format(lowLimit)} to ${format(highLimit)}` },
    { value: "high", fr: `Plus de ${format(highLimit)}`, en: `Over ${format(highLimit)}` },
  ];
}