import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import {
  budgetFrequencies,
  clientTypes,
  companySizes,
  countries,
  countryCurrency,
  currencies,
  getBudgetBands,
  horizons,
  marketingChannels,
  objectives,
  phonePrefixes,
  sectors,
  socialNetworks,
  targetZones,
  urgencies,
  yesNo,
  type Choice,
  type Language,
} from "./content";

type QuestionnaireAnswers = {
  company: {
    name: string;
    sector: string;
    sectorOther: string;
    country: string;
    city: string;
    size: string;
    website: string;
    socials: string[];
  };
  goals: {
    primary: string;
    primaryOther: string;
    secondary: string[];
    secondaryOther: string;
    horizon: string;
  };
  audience: {
    clientele: string;
    profile: string;
    zone: string;
  };
  situation: {
    channels: string[];
    satisfaction: number;
    competitors: string;
    marketingBudgetInvested: string;
  };
  budget: {
    amountBand: string;
    currency: string;
    frequency: string;
    urgency: string;
  };
  contact: {
    fullName: string;
    role: string;
    email: string;
    phone: string;
    consent: boolean;
  };
};

type Screen = "landing" | "questionnaire" | "report";
type ReportStatus = "not_started" | "pending" | "processing" | "ready" | "failed";

const messages = {
  fr: {
    eyebrow: "DIAGNOSTIC GRATUIT · 5 MINUTES",
    title: "Obtenez votre plan de communication personnalisé",
    body: "Répondez à quelques questions sur votre entreprise et vos objectifs. Notre équipe stratégique vous prépare une première feuille de route, adaptée à votre secteur et votre budget.",
    action: "Commencer le diagnostic",
    note: "Aucune carte bancaire requise · 6 étapes · ~5 minutes",
    company: "Entreprise",
    goals: "Objectifs",
    audience: "Cibles",
    situation: "Situation actuelle",
    budget: "Budget et délais",
    contact: "Coordonnées",
    step: "Étape",
    of: "sur",
    minutes: "5 min",
    saving: "Enregistrement…",
    saved: "Brouillon enregistré",
    saveFailed: "Sauvegarde indisponible. Vérifiez votre connexion avant de continuer.",
    startFailed: "Le questionnaire n'a pas pu démarrer. Réessayez dans un instant.",
    back: "Retour",
    next: "Continuer",
    submit: "Enregistrer ma demande",
    startTitle: "Un premier aperçu de vos enjeux.",
    startBody: "Pour adapter le diagnostic à votre entreprise et à vos ambitions.",
    goalsTitle: "Quels sont vos objectifs ?",
    goalsBody: "Choisissez une priorité, puis jusqu'à deux objectifs secondaires.",
    audienceTitle: "Qui voulez-vous atteindre ?",
    audienceBody: "Décrivez les personnes que votre communication doit toucher.",
    situationTitle: "Votre situation actuelle",
    situationBody: "Ce qui fonctionne déjà et ce que vous souhaitez faire évoluer.",
    budgetTitle: "Votre budget et vos délais",
    budgetBody: "Ces éléments sont confidentiels et servent à adapter le diagnostic.",
    contactTitle: "Dernière étape",
    contactBody: "Vos coordonnées permettront à notre équipe de donner suite à votre demande.",
    name: "Nom de l'entreprise",
    sector: "Secteur d'activité",
    otherSector: "Précisez votre secteur",
    country: "Pays",
    city: "Ville",
    companySize: "Taille de l'entreprise",
    website: "Site web",
    websiteHint: "Facultatif",
    socials: "Réseaux sociaux actifs",
    primaryObjective: "Objectif principal",
    otherObjective: "Précisez votre objectif",
    secondaryObjectives: "Objectifs secondaires",
    secondaryHint: "Jusqu'à 2 choix",
    horizon: "Horizon souhaité",
    clientele: "Type de clientèle",
    profile: "Profil type du client",
    profileHint: "Âge, catégorie socio-professionnelle, comportement d'achat…",
    zone: "Zone géographique visée",
    channels: "Canaux déjà utilisés",
    satisfaction: "Satisfaction des résultats actuels",
    competitors: "Principaux concurrents",
    optional: "Facultatif",
    invested: "Avez-vous déjà investi en marketing ?",
    budgetAmount: "Fourchette budgétaire",
    currency: "Devise du budget",
    frequency: "Fréquence souhaitée",
    urgency: "Urgence de démarrage",
    budgetPrivacy: "Votre budget reste confidentiel.",
    fullName: "Nom et prénom",
    role: "Fonction dans l'entreprise",
    email: "Email",
    phone: "Téléphone",
    consent: "J'accepte l'utilisation de mes données pour le traitement de ma demande, conformément à la politique de confidentialité.",
    privacyLink: "Consulter la notice de confidentialité",
    privacyTitle: "Notice de confidentialité",
    privacyBody: "Les informations saisies sont enregistrées par 5 Sens Advertising pour traiter votre demande. La politique complète et la durée de conservation doivent être précisées par l'agence avant la mise en production.",
    close: "Fermer",
    required: "Ce champ est obligatoire.",
    emailInvalid: "Saisissez une adresse email valide.",
    phoneInvalid: "Saisissez un numéro de téléphone valide.",
    websiteInvalid: "Saisissez une adresse web valide.",
    choose: "Sélectionnez une réponse.",
    otherRequired: "Veuillez préciser votre choix.",
    maxTwo: "Choisissez deux objectifs secondaires au maximum.",
    chooseChannel: "Choisissez au moins un canal.",
    rate: "Notez vos résultats de 1 à 5.",
    complete: "Votre demande est enregistrée",
    completeBody: "Merci. Vos réponses ont été transmises à 5 Sens Advertising.",
    reportTitle: "Votre plan de communication personnalisé",
    reportPending: "Votre diagnostic stratégique est en cours de préparation.",
    reportFailure: "Le plan n'a pas pu être généré pour le moment. Vous pouvez relancer sa préparation.",
    reportRetry: "Réessayer la génération",
    reportReady: "Votre plan personnalisé est prêt.",
    reportOpen: "Ouvrir le PDF",
    reportLoading: "Génération de votre plan…",
    startAgain: "Commencer un nouveau diagnostic",
    previous: "Précédent",
    select: "Sélectionner…",
    none: "Aucune réponse",
    letterCount: "caractères",
  },
  en: {
    eyebrow: "COMPLIMENTARY DIAGNOSTIC · 5 MINUTES",
    title: "Your next idea deserves the right audience.",
    body: "A few questions to understand your business and shape an initial direction for your communications.",
    action: "Start your diagnostic",
    note: "No commitment · 6 steps",
    company: "Company",
    goals: "Objectives",
    audience: "Audience",
    situation: "Current situation",
    budget: "Budget & timing",
    contact: "Contact details",
    step: "Step",
    of: "of",
    minutes: "5 min",
    saving: "Saving…",
    saved: "Draft saved",
    saveFailed: "Unable to save. Check your connection before continuing.",
    startFailed: "The questionnaire could not start. Please try again.",
    back: "Back",
    next: "Continue",
    submit: "Save my request",
    startTitle: "A first look at your priorities.",
    startBody: "Help us tailor the diagnostic to your business and ambitions.",
    goalsTitle: "What are your objectives?",
    goalsBody: "Choose one priority, then up to two secondary objectives.",
    audienceTitle: "Who do you want to reach?",
    audienceBody: "Describe the people your communications should reach.",
    situationTitle: "Your current situation",
    situationBody: "What is already working and what you would like to change.",
    budgetTitle: "Your budget and timing",
    budgetBody: "This information is confidential and helps us tailor the diagnostic.",
    contactTitle: "One last step",
    contactBody: "Your contact details let our team follow up on your request.",
    name: "Company name",
    sector: "Industry",
    otherSector: "Please specify your industry",
    country: "Country",
    city: "City",
    companySize: "Company size",
    website: "Website",
    websiteHint: "Optional",
    socials: "Active social networks",
    primaryObjective: "Main objective",
    otherObjective: "Please specify your objective",
    secondaryObjectives: "Secondary objectives",
    secondaryHint: "Choose up to 2",
    horizon: "Desired timeframe",
    clientele: "Customer type",
    profile: "Typical customer profile",
    profileHint: "Age, profession, purchasing behavior…",
    zone: "Target geography",
    channels: "Channels already in use",
    satisfaction: "How satisfied are you with current results?",
    competitors: "Main competitors",
    optional: "Optional",
    invested: "Have you invested in marketing before?",
    budgetAmount: "Budget range",
    currency: "Budget currency",
    frequency: "Preferred frequency",
    urgency: "When would you like to start?",
    budgetPrivacy: "Your budget remains confidential.",
    fullName: "Full name",
    role: "Your role in the company",
    email: "Email address",
    phone: "Phone number",
    consent: "I agree to the use of my data to process my request, in accordance with the privacy notice.",
    privacyLink: "Read the privacy notice",
    privacyTitle: "Privacy notice",
    privacyBody: "The information you provide is recorded by 5 Sens Advertising to process your request. The full policy and retention period must be confirmed by the agency before production launch.",
    close: "Close",
    required: "This field is required.",
    emailInvalid: "Enter a valid email address.",
    phoneInvalid: "Enter a valid phone number.",
    websiteInvalid: "Enter a valid website address.",
    choose: "Please select an option.",
    otherRequired: "Please specify your choice.",
    maxTwo: "Choose no more than two secondary objectives.",
    chooseChannel: "Choose at least one channel.",
    rate: "Rate your results from 1 to 5.",
    complete: "Your request is recorded",
    completeBody: "Thank you. Your answers have been sent to 5 Sens Advertising.",
    reportTitle: "Your personalized communications plan",
    reportPending: "Your strategic plan is being prepared.",
    reportFailure: "Your plan could not be generated right now. You can retry its preparation.",
    reportRetry: "Retry plan generation",
    reportReady: "Your personalized plan is ready.",
    reportOpen: "Open the PDF",
    reportLoading: "Generating your plan…",
    startAgain: "Start a new diagnostic",
    previous: "Previous",
    select: "Select…",
    none: "No answer",
    letterCount: "characters",
  },
} as const;

type MessageKey = keyof typeof messages.fr;

const stepLabels: MessageKey[] = ["company", "goals", "audience", "situation", "budget", "contact"];
const stepHeadings: MessageKey[] = ["startTitle", "goalsTitle", "audienceTitle", "situationTitle", "budgetTitle", "contactTitle"];
const stepDescriptions: MessageKey[] = ["startBody", "goalsBody", "audienceBody", "situationBody", "budgetBody", "contactBody"];

function emptyAnswers(): QuestionnaireAnswers {
  return {
    company: { name: "", sector: "", sectorOther: "", country: "tunisia", city: "", size: "", website: "", socials: [] },
    goals: { primary: "", primaryOther: "", secondary: [], secondaryOther: "", horizon: "" },
    audience: { clientele: "", profile: "", zone: "" },
    situation: { channels: [], satisfaction: 0, competitors: "", marketingBudgetInvested: "" },
    budget: { amountBand: "", currency: "TND", frequency: "", urgency: "" },
    contact: { fullName: "", role: "", email: "", phone: "+216", consent: false },
  };
}

function restoreAnswers(saved: Partial<{ [K in keyof QuestionnaireAnswers]: Partial<QuestionnaireAnswers[K]> }> | undefined): QuestionnaireAnswers {
  const defaults = emptyAnswers();
  return {
    company: { ...defaults.company, ...saved?.company },
    goals: { ...defaults.goals, ...saved?.goals },
    audience: { ...defaults.audience, ...saved?.audience },
    situation: { ...defaults.situation, ...saved?.situation },
    budget: { ...defaults.budget, ...saved?.budget },
    contact: { ...defaults.contact, ...saved?.contact },
  };
}

function translated(choice: Choice, language: Language) {
  return choice[language];
}

function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className={`field${error ? " field--error" : ""}`}>
      <label className="field__label" htmlFor={htmlFor}>{label}</label>
      {hint && <span className="field__hint">{hint}</span>}
      {children}
      {error && <span className="field__error" role="alert">{error}</span>}
    </div>
  );
}

function ChoiceGrid({
  choices,
  language,
  value,
  onChange,
  error,
  columns = 2,
  disabledValues = [],
}: {
  choices: Choice[];
  language: Language;
  value: string | string[];
  onChange: (choice: string) => void;
  error?: string;
  columns?: 2 | 3 | 4;
  disabledValues?: string[];
}) {
  const selected = Array.isArray(value) ? value : [value];
  const multiple = Array.isArray(value);
  return (
    <div className={`choice-grid choice-grid--${columns}${error ? " choice-grid--error" : ""}`}>
      {choices.map((choice) => {
        const active = selected.includes(choice.value);
        const disabled = disabledValues.includes(choice.value);
        return (
          <button
            aria-checked={active}
            aria-disabled={disabled}
            className={`choice-chip${active ? " choice-chip--selected" : ""}${disabled ? " choice-chip--disabled" : ""}`}
            disabled={disabled}
            key={choice.value}
            onClick={() => onChange(choice.value)}
            role={multiple ? "checkbox" : "radio"}
            type="button"
          >
            <span className="choice-chip__mark" aria-hidden="true">{active ? "✓" : ""}</span>
            <span>{translated(choice, language)}</span>
          </button>
        );
      })}
      {error && <span className="field__error" role="alert">{error}</span>}
    </div>
  );
}

export default function App() {
  const [language, setLanguage] = useState<Language>("fr");
  const [screen, setScreen] = useState<Screen>("landing");
  const [reportStatus, setReportStatus] = useState<ReportStatus>("not_started");
  const [answers, setAnswers] = useState<QuestionnaireAnswers>(emptyAnswers);
  const [step, setStep] = useState(1);
  const [hasDraft, setHasDraft] = useState(false);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [saveError, setSaveError] = useState("");
  const [pageError, setPageError] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const saveQueue = useRef<Promise<void>>(Promise.resolve());
  const saveRevision = useRef(0);
  const t = messages[language];

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/questionnaire/draft", { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) throw new Error("draft-load");
        return response.json();
      })
      .then((result: { draft: null | { answers: Partial<{ [K in keyof QuestionnaireAnswers]: Partial<QuestionnaireAnswers[K]> }>; language: Language; currentStep: number; status: string; reportStatus?: ReportStatus } }) => {
        if (cancelled || !result.draft) return;
        setAnswers(restoreAnswers(result.draft.answers));
        setLanguage(result.draft.language === "en" ? "en" : "fr");
        setStep(Math.min(6, Math.max(1, result.draft.currentStep)));
        setHasDraft(result.draft.status === "draft");
        setReportStatus(result.draft.reportStatus ?? "pending");
        setScreen(result.draft.status === "submitted" ? "report" : "questionnaire");
      })
      .catch(() => {
        if (!cancelled) setSaveError(messages.fr.saveFailed);
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready || !hasDraft || screen !== "questionnaire") return;
    const revision = ++saveRevision.current;
    const snapshot = { answers, language, currentStep: step };
    const timer = window.setTimeout(() => {
      setSaving(true);
      saveQueue.current = saveQueue.current
        .catch(() => undefined)
        .then(async () => {
          const response = await fetch("/api/questionnaire/draft", {
            method: "PUT",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(snapshot),
          });
          if (!response.ok) throw new Error("draft-save");
          if (revision === saveRevision.current) {
            setSavedAt(new Date());
            setSaveError("");
            setSaving(false);
          }
        })
        .catch(() => {
          if (revision === saveRevision.current) {
            setSaveError(messages[language].saveFailed);
            setSaving(false);
          }
        });
    }, 650);
    return () => window.clearTimeout(timer);
  }, [answers, hasDraft, language, ready, screen, step]);

  useEffect(() => {
    if (screen !== "report") return;
    let stopped = false;
    let timer: number | undefined;

    async function pollReport() {
      try {
        const response = await fetch("/api/questionnaire/report", { credentials: "include" });
        if (!response.ok) throw new Error("report-status");
        const result = await response.json() as { reportStatus: ReportStatus };
        if (stopped) return;
        setReportStatus(result.reportStatus);
        if (result.reportStatus === "pending" || result.reportStatus === "processing") {
          timer = window.setTimeout(pollReport, 1800);
        }
      } catch {
        if (!stopped) setReportStatus("failed");
      }
    }

    void pollReport();
    return () => {
      stopped = true;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [screen]);

  function updateSection<K extends keyof QuestionnaireAnswers>(section: K, patch: Partial<QuestionnaireAnswers[K]>) {
    setAnswers((previous) => ({
      ...previous,
      [section]: { ...previous[section], ...patch },
    } as QuestionnaireAnswers));
    setErrors({});
    setPageError("");
  }

  function changeCountry(country: string) {
    const previousPrefix = phonePrefixes[answers.company.country] ?? "+";
    const nextPrefix = phonePrefixes[country] ?? "+";
    const phone = answers.contact.phone;
    const nextPhone = !phone || phone === previousPrefix ? nextPrefix : phone;
    updateSection("company", { country });
    updateSection("budget", { currency: countryCurrency[country] ?? "USD", amountBand: "" });
    updateSection("contact", { phone: nextPhone });
  }

  function toggleList(key: "socials" | "secondary" | "channels", value: string, max = 99) {
    const current = key === "socials"
      ? answers.company.socials
      : key === "secondary"
        ? answers.goals.secondary
        : answers.situation.channels;
    if (current.includes(value)) {
      const next = current.filter((item) => item !== value);
      if (key === "socials") updateSection("company", { socials: next });
      if (key === "secondary") updateSection("goals", { secondary: next });
      if (key === "channels") updateSection("situation", { channels: next });
      return;
    }
    if (current.length >= max) return;
    let next = [...current, value];
    if ((key === "socials" || key === "channels") && value === "none") next = ["none"];
    else if ((key === "socials" || key === "channels") && next.includes("none")) next = next.filter((item) => item !== "none");
    if (key === "socials") updateSection("company", { socials: next });
    if (key === "secondary") updateSection("goals", { secondary: next });
    if (key === "channels") updateSection("situation", { channels: next });
  }

  async function beginQuestionnaire() {
    setPageError("");
    setSaveError("");
    if (hasDraft) {
      setScreen("questionnaire");
      return;
    }
    const initialAnswers = emptyAnswers();
    initialAnswers.budget.currency = countryCurrency[initialAnswers.company.country];
    try {
      const response = await fetch("/api/questionnaire/draft", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language, answers: initialAnswers, currentStep: 1 }),
      });
      if (!response.ok) throw new Error("draft-create");
      const result = await response.json() as { draft: { answers: Partial<{ [K in keyof QuestionnaireAnswers]: Partial<QuestionnaireAnswers[K]> }>; currentStep: number; language: Language } };
      setAnswers(restoreAnswers(result.draft.answers));
      setLanguage(result.draft.language);
      setStep(Math.min(6, Math.max(1, result.draft.currentStep)));
      setHasDraft(true);
      setScreen("questionnaire");
    } catch {
      setPageError(messages[language].startFailed);
    }
  }

  function validateCurrentStep() {
    const nextErrors: Record<string, string> = {};
    const required = (key: string, value: string, message: string = t.required) => {
      if (!value.trim()) nextErrors[key] = message;
    };

    if (step === 1) {
      required("company.name", answers.company.name);
      required("company.sector", answers.company.sector, t.choose);
      if (answers.company.sector === "other") required("company.sectorOther", answers.company.sectorOther, t.otherRequired);
      required("company.country", answers.company.country, t.choose);
      required("company.city", answers.company.city);
      required("company.size", answers.company.size, t.choose);
      if (!answers.company.socials.length) nextErrors["company.socials"] = t.choose;
      if (answers.company.website && !/^(https?:\/\/)?[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(answers.company.website.trim())) {
        nextErrors["company.website"] = t.websiteInvalid;
      }
    }
    if (step === 2) {
      required("goals.primary", answers.goals.primary, t.choose);
      if (answers.goals.primary === "other") required("goals.primaryOther", answers.goals.primaryOther, t.otherRequired);
      if (answers.goals.secondary.length > 2) nextErrors["goals.secondary"] = t.maxTwo;
      if (answers.goals.secondary.includes("other")) required("goals.secondaryOther", answers.goals.secondaryOther, t.otherRequired);
      required("goals.horizon", answers.goals.horizon, t.choose);
    }
    if (step === 3) {
      required("audience.clientele", answers.audience.clientele, t.choose);
      required("audience.profile", answers.audience.profile);
      required("audience.zone", answers.audience.zone, t.choose);
    }
    if (step === 4) {
      if (!answers.situation.channels.length) nextErrors["situation.channels"] = t.chooseChannel;
      if (!answers.situation.satisfaction) nextErrors["situation.satisfaction"] = t.rate;
      required("situation.marketingBudgetInvested", answers.situation.marketingBudgetInvested, t.choose);
    }
    if (step === 5) {
      required("budget.amountBand", answers.budget.amountBand, t.choose);
      required("budget.frequency", answers.budget.frequency, t.choose);
      required("budget.urgency", answers.budget.urgency, t.choose);
    }
    if (step === 6) {
      required("contact.fullName", answers.contact.fullName);
      required("contact.role", answers.contact.role);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(answers.contact.email.trim())) nextErrors["contact.email"] = t.emailInvalid;
      if (answers.contact.phone.replace(/\D/g, "").length < 7) nextErrors["contact.phone"] = t.phoneInvalid;
      if (!answers.contact.consent) nextErrors["contact.consent"] = t.required;
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function moveNext(event: FormEvent) {
    event.preventDefault();
    if (!validateCurrentStep()) return;
    setPageError("");
    if (step < 6) {
      setStep((current) => current + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    try {
      const response = await fetch("/api/questionnaire/draft/submit", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers, language, currentStep: step }),
      });
      if (!response.ok) {
        const result = await response.json().catch(() => null);
        if (Array.isArray(result?.invalidFields)) {
          setErrors(Object.fromEntries(result.invalidFields.map((field: string) => [field, t.required])));
        }
        throw new Error("submit");
      }
      const result = await response.json() as { reportStatus: ReportStatus };
      setReportStatus(result.reportStatus ?? "pending");
      setScreen("report");
      setHasDraft(false);
      setSaveError("");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setPageError(language === "fr" ? "La demande n'a pas pu être enregistrée. Réessayez." : "Your request could not be saved. Please try again.");
    }
  }

  async function retryReport() {
    setReportStatus("pending");
    try {
      const response = await fetch("/api/questionnaire/report/retry", {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) throw new Error("report-retry");
      const result = await response.json() as { reportStatus: ReportStatus };
      setReportStatus(result.reportStatus);
    } catch {
      setReportStatus("failed");
    }
  }

  function moveBack() {
    if (step > 1) {
      setStep((current) => current - 1);
      setErrors({});
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      setScreen("landing");
    }
  }

  function choosePrimary(value: string) {
    const secondary = answers.goals.secondary.filter((item) => item !== value);
    updateSection("goals", { primary: value, secondary });
  }

  function selectLanguage(value: Language) {
    setLanguage(value);
    setPageError("");
  }

  const budgetChoices = getBudgetBands(answers.budget.currency, language);
  const headings = stepHeadings.map((key) => t[key]);
  const descriptions = stepDescriptions.map((key) => t[key]);

  function renderStep() {
    if (step === 1) {
      return (
        <div className="form-grid">
          <Field error={errors["company.name"]} htmlFor="company-name" label={t.name}>
            <input autoComplete="organization" id="company-name" maxLength={180} onChange={(event) => updateSection("company", { name: event.target.value })} value={answers.company.name} />
          </Field>
          <Field error={errors["company.sector"]} htmlFor="sector" label={t.sector}>
            <select id="sector" onChange={(event) => updateSection("company", { sector: event.target.value, sectorOther: "" })} value={answers.company.sector}>
              <option value="">{t.select}</option>
              {sectors.map((choice) => <option key={choice.value} value={choice.value}>{translated(choice, language)}</option>)}
            </select>
          </Field>
          {answers.company.sector === "other" && (
            <Field error={errors["company.sectorOther"]} htmlFor="sector-other" label={t.otherSector}>
              <input id="sector-other" maxLength={100} onChange={(event) => updateSection("company", { sectorOther: event.target.value })} value={answers.company.sectorOther} />
            </Field>
          )}
          <Field error={errors["company.country"]} htmlFor="country" label={t.country}>
            <select id="country" onChange={(event) => changeCountry(event.target.value)} value={answers.company.country}>
              {countries.map((choice) => <option key={choice.value} value={choice.value}>{translated(choice, language)}</option>)}
            </select>
          </Field>
          <Field error={errors["company.city"]} htmlFor="city" label={t.city}>
            <input autoComplete="address-level2" id="city" maxLength={100} onChange={(event) => updateSection("company", { city: event.target.value })} value={answers.company.city} />
          </Field>
          <Field error={errors["company.size"]} label={t.companySize}>
            <ChoiceGrid choices={companySizes} columns={2} language={language} onChange={(value) => updateSection("company", { size: value })} value={answers.company.size} />
          </Field>
          <Field error={errors["company.website"]} hint={t.websiteHint} htmlFor="website" label={t.website}>
            <input autoComplete="url" id="website" inputMode="url" maxLength={240} onChange={(event) => updateSection("company", { website: event.target.value })} placeholder="https://" value={answers.company.website} />
          </Field>
          <Field error={errors["company.socials"]} label={t.socials}>
            <ChoiceGrid choices={socialNetworks} columns={3} language={language} onChange={(value) => toggleList("socials", value)} value={answers.company.socials} />
          </Field>
        </div>
      );
    }
    if (step === 2) {
      return (
        <div className="form-grid">
          <Field error={errors["goals.primary"]} htmlFor="primary-objective" label={t.primaryObjective}>
            <select id="primary-objective" onChange={(event) => choosePrimary(event.target.value)} value={answers.goals.primary}>
              <option value="">{t.select}</option>
              {objectives.map((choice) => <option key={choice.value} value={choice.value}>{translated(choice, language)}</option>)}
            </select>
          </Field>
          {answers.goals.primary === "other" && (
            <Field error={errors["goals.primaryOther"]} htmlFor="primary-other" label={t.otherObjective}>
              <input id="primary-other" maxLength={160} onChange={(event) => updateSection("goals", { primaryOther: event.target.value })} value={answers.goals.primaryOther} />
            </Field>
          )}
          <Field error={errors["goals.secondary"]} hint={t.secondaryHint} label={t.secondaryObjectives}>
            <ChoiceGrid choices={objectives.filter((choice) => choice.value !== answers.goals.primary)} columns={2} disabledValues={answers.goals.secondary.length >= 2 ? objectives.filter((choice) => !answers.goals.secondary.includes(choice.value)).map((choice) => choice.value) : []} language={language} onChange={(value) => toggleList("secondary", value, 2)} value={answers.goals.secondary} />
          </Field>
          {answers.goals.secondary.includes("other") && (
            <Field error={errors["goals.secondaryOther"]} htmlFor="secondary-other" label={t.otherObjective}>
              <input id="secondary-other" maxLength={160} onChange={(event) => updateSection("goals", { secondaryOther: event.target.value })} value={answers.goals.secondaryOther} />
            </Field>
          )}
          <Field error={errors["goals.horizon"]} label={t.horizon}>
            <ChoiceGrid choices={horizons} columns={2} language={language} onChange={(value) => updateSection("goals", { horizon: value })} value={answers.goals.horizon} />
          </Field>
        </div>
      );
    }
    if (step === 3) {
      return (
        <div className="form-grid">
          <Field error={errors["audience.clientele"]} label={t.clientele}>
            <ChoiceGrid choices={clientTypes} columns={3} language={language} onChange={(value) => updateSection("audience", { clientele: value })} value={answers.audience.clientele} />
          </Field>
          <Field error={errors["audience.profile"]} hint={t.profileHint} htmlFor="audience-profile" label={t.profile}>
            <textarea id="audience-profile" maxLength={500} onChange={(event) => updateSection("audience", { profile: event.target.value })} rows={3} value={answers.audience.profile} />
          </Field>
          <Field error={errors["audience.zone"]} label={t.zone}>
            <ChoiceGrid choices={targetZones} columns={3} language={language} onChange={(value) => updateSection("audience", { zone: value })} value={answers.audience.zone} />
          </Field>
        </div>
      );
    }
    if (step === 4) {
      return (
        <div className="form-grid">
          <Field error={errors["situation.channels"]} label={t.channels}>
            <ChoiceGrid choices={marketingChannels} columns={3} language={language} onChange={(value) => toggleList("channels", value)} value={answers.situation.channels} />
          </Field>
          <Field error={errors["situation.satisfaction"]} label={t.satisfaction}>
            <div className="rating" role="radiogroup" aria-label={t.satisfaction}>
              {[1, 2, 3, 4, 5].map((rating) => (
                <button
                  aria-checked={answers.situation.satisfaction === rating}
                  aria-label={`${rating} / 5`}
                  className={rating <= answers.situation.satisfaction ? "rating__star rating__star--active" : "rating__star"}
                  key={rating}
                  onClick={() => updateSection("situation", { satisfaction: rating })}
                  role="radio"
                  type="button"
                >
                  ★
                </button>
              ))}
              <span>{answers.situation.satisfaction ? `${answers.situation.satisfaction} / 5` : ""}</span>
            </div>
          </Field>
          <Field error={errors["situation.marketingBudgetInvested"]} label={t.invested}>
            <ChoiceGrid choices={yesNo} columns={2} language={language} onChange={(value) => updateSection("situation", { marketingBudgetInvested: value })} value={answers.situation.marketingBudgetInvested} />
          </Field>
          <Field hint={t.optional} htmlFor="competitors" label={t.competitors}>
            <textarea id="competitors" maxLength={500} onChange={(event) => updateSection("situation", { competitors: event.target.value })} rows={3} value={answers.situation.competitors} />
          </Field>
        </div>
      );
    }
    if (step === 5) {
      return (
        <div className="form-grid">
          {answers.company.country === "other" && (
            <Field htmlFor="currency" label={t.currency}>
              <select id="currency" onChange={(event) => updateSection("budget", { currency: event.target.value, amountBand: "" })} value={answers.budget.currency}>
                {currencies.map((choice) => <option key={choice.value} value={choice.value}>{translated(choice, language)}</option>)}
              </select>
            </Field>
          )}
          <Field error={errors["budget.amountBand"]} hint={t.budgetPrivacy} label={t.budgetAmount}>
            <ChoiceGrid choices={budgetChoices} columns={3} language={language} onChange={(value) => updateSection("budget", { amountBand: value })} value={answers.budget.amountBand} />
          </Field>
          <Field error={errors["budget.frequency"]} label={t.frequency}>
            <ChoiceGrid choices={budgetFrequencies} columns={2} language={language} onChange={(value) => updateSection("budget", { frequency: value })} value={answers.budget.frequency} />
          </Field>
          <Field error={errors["budget.urgency"]} label={t.urgency}>
            <ChoiceGrid choices={urgencies} columns={3} language={language} onChange={(value) => updateSection("budget", { urgency: value })} value={answers.budget.urgency} />
          </Field>
        </div>
      );
    }
    return (
      <div className="form-grid">
        <Field error={errors["contact.fullName"]} htmlFor="full-name" label={t.fullName}>
          <input autoComplete="name" id="full-name" maxLength={160} onChange={(event) => updateSection("contact", { fullName: event.target.value })} value={answers.contact.fullName} />
        </Field>
        <Field error={errors["contact.role"]} htmlFor="role" label={t.role}>
          <input autoComplete="organization-title" id="role" maxLength={120} onChange={(event) => updateSection("contact", { role: event.target.value })} value={answers.contact.role} />
        </Field>
        <Field error={errors["contact.email"]} htmlFor="email" label={t.email}>
          <input autoComplete="email" id="email" maxLength={254} onChange={(event) => updateSection("contact", { email: event.target.value })} type="email" value={answers.contact.email} />
        </Field>
        <Field error={errors["contact.phone"]} htmlFor="phone" label={t.phone}>
          <input autoComplete="tel" id="phone" inputMode="tel" maxLength={32} onChange={(event) => updateSection("contact", { phone: event.target.value })} type="tel" value={answers.contact.phone} />
        </Field>
        <div className="consent-field">
          <label className="consent-check">
            <input checked={answers.contact.consent} onChange={(event) => updateSection("contact", { consent: event.target.checked })} type="checkbox" />
            <span>{t.consent}</span>
          </label>
          {errors["contact.consent"] && <span className="field__error" role="alert">{errors["contact.consent"]}</span>}
          <button className="privacy-link" onClick={() => setPrivacyOpen(true)} type="button">{t.privacyLink}</button>
        </div>
      </div>
    );
  }

  if (!ready) {
    return <main className="loading-screen"><span className="loading-mark">5</span><span>DOCTOR COM</span></main>;
  }

  if (screen === "landing") {
    return (
      <main className="landing">
        <header className="topbar">
          <a className="wordmark" href="#top" aria-label="Doctor Com, accueil">
            <span className="wordmark__name">DOCTOR COM</span>
            <span className="wordmark__agency">par 5 Sens Advertising</span>
          </a>
          <LanguageSwitch language={language} onChange={selectLanguage} />
        </header>
        <section className="hero" id="top">
          <div className="hero__copy">
            <p className="eyebrow">{t.eyebrow}</p>
            <h1>{t.title}</h1>
            <p className="hero__body">{t.body}</p>
            <button className="primary-button" onClick={beginQuestionnaire} type="button">
              {t.action}<span aria-hidden="true">→</span>
            </button>
            <p className="hero__note">{t.note}</p>
            {pageError && <p className="banner-error" role="alert">{pageError}</p>}
          </div>
          <div className="hero__stamp" aria-hidden="true"><span>5</span><span>SENS</span><span>ADVERTISING</span></div>
        </section>
      </main>
    );
  }

  if (screen === "report") {
    return (
      <main className="app-frame">
        <AppHeader language={language} onLanguageChange={selectLanguage} />
        <section className="report-page">
          <div className={`success-mark${reportStatus === "ready" ? " success-mark--ready" : ""}`} aria-hidden="true">
            {reportStatus === "ready" ? "✓" : <span className="report-spinner" />}
          </div>
          <p className="eyebrow">DOCTOR COM · 5 SENS ADVERTISING</p>
          <h1>{t.reportTitle}</h1>
          <p className="report-message" aria-live="polite">
            {reportStatus === "ready" ? t.reportReady : reportStatus === "failed" ? t.reportFailure : t.reportPending}
          </p>
          {(reportStatus === "pending" || reportStatus === "processing") && <p className="report-loading">{t.reportLoading}</p>}
          {reportStatus === "ready" && (
            <>
              <a className="primary-button report-open" href="/api/questionnaire/report.pdf" rel="noreferrer" target="_blank">
                {t.reportOpen}<span aria-hidden="true">↗</span>
              </a>
              <iframe className="report-viewer" src="/api/questionnaire/report.pdf" title={t.reportTitle} />
            </>
          )}
          {reportStatus === "failed" && (
            <button className="primary-button" onClick={retryReport} type="button">
              {t.reportRetry}<span aria-hidden="true">↻</span>
            </button>
          )}
          <button className="text-button" onClick={() => { setScreen("landing"); setHasDraft(false); setAnswers(emptyAnswers()); setStep(1); }} type="button">{t.startAgain} →</button>
        </section>
      </main>
    );
  }

  return (
    <main className="app-frame">
      <AppHeader backLabel={t.previous} language={language} onBack={moveBack} onLanguageChange={selectLanguage} />
      <section className="questionnaire">
        <div className="questionnaire__meta">
          <span className="visually-hidden">{t.step} {step} {t.of} 6</span>
          <span className="visually-hidden" role="status" aria-live="polite">
            {saveError ? t.saveFailed : saving ? t.saving : savedAt ? t.saved : t.minutes}
          </span>
        </div>
        <div className="stepper" aria-label={`${t.step} ${step} ${t.of} 6`}>
          {stepLabels.map((label, index) => (
            <div aria-current={step === index + 1 ? "step" : undefined} className={`stepper__item${step === index + 1 ? " stepper__item--active" : ""}${step > index + 1 ? " stepper__item--complete" : ""}`} key={label}>
              <span className="stepper__node" aria-hidden="true">{step > index + 1 ? "✓" : index + 1}</span>
              <span className="stepper__label">{t[label]}</span>
              {index < stepLabels.length - 1 && <span className="stepper__line" aria-hidden="true" />}
            </div>
          ))}
        </div>
        <header className="step-heading">
          <p className="eyebrow">0{step} / 06 · {t[stepLabels[step - 1]]}</p>
          <h1>{headings[step - 1]}</h1>
          <p>{descriptions[step - 1]}</p>
        </header>
        <form className="step-form" onSubmit={moveNext} noValidate>
          {renderStep()}
          {pageError && <p className="banner-error" role="alert">{pageError}</p>}
          <footer className="form-footer">
            <button className="back-button" onClick={moveBack} type="button">← {step === 1 ? t.previous : t.back}</button>
            <button className="primary-button" type="submit">
              {step === 6 ? t.submit : t.next}<span aria-hidden="true">→</span>
            </button>
          </footer>
        </form>
      </section>
      {privacyOpen && (
        <div className="modal-backdrop" onClick={() => setPrivacyOpen(false)} role="presentation">
          <section aria-labelledby="privacy-title" aria-modal="true" className="privacy-modal" onClick={(event) => event.stopPropagation()} role="dialog">
            <button aria-label={t.close} className="modal-close" onClick={() => setPrivacyOpen(false)} type="button">×</button>
            <p className="eyebrow">5 SENS ADVERTISING</p>
            <h2 id="privacy-title">{t.privacyTitle}</h2>
            <p>{t.privacyBody}</p>
          </section>
        </div>
      )}
    </main>
  );
}

function LanguageSwitch({ language, onChange }: { language: Language; onChange: (language: Language) => void }) {
  return (
    <div className="language-switch" aria-label="Language">
      {(["fr", "en"] as const).map((item) => (
        <button aria-pressed={language === item} className={language === item ? "language-switch__active" : ""} key={item} onClick={() => onChange(item)} type="button">
          {item.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

function AppHeader({
  language,
  onLanguageChange,
  onBack,
  backLabel,
}: {
  language: Language;
  onLanguageChange: (language: Language) => void;
  onBack?: () => void;
  backLabel?: string;
}) {
  return (
    <header className="topbar app-topbar">
      {onBack && <button aria-label={backLabel} className="app-topbar__back" onClick={onBack} type="button">←</button>}
      <a className="wordmark" href="#top" aria-label="Doctor Com, accueil">
        <span className="wordmark__name">DOCTOR COM</span>
        <span className="wordmark__agency">par 5 Sens Advertising</span>
      </a>
      <LanguageSwitch language={language} onChange={onLanguageChange} />
    </header>
  );
}