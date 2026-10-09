import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import test from "node:test";
import { createApp } from "./app.js";
import {
  createEmailCodeProof,
  buildVerificationEmail,
  emailCodeLifetimeMs,
  generateEmailCode,
  isDisposableEmail,
  normalizeEmail,
  verifyEmailCodeProof,
} from "./emailVerification.js";
import { createReportJobs } from "./reportJobs.js";
import { buildLeadAlertEmail } from "./leadAlert.js";
import { draftPayloadSchema, validateSubmission } from "./validation.js";

const testEmailCodeSecret = "test-email-code-secret-at-least-32-characters-long";

const completeAnswers = {
  company: {
    name: "Atelier du Lac",
    sector: "crafts",
    sectorOther: "",
    country: "tunisia",
    city: "Tunis",
    size: "tpe",
    website: "atelier.example",
    socials: ["instagram"],
  },
  goals: {
    primary: "awareness",
    primaryOther: "",
    secondary: ["events"],
    secondaryOther: "",
    horizon: "three-months",
  },
  audience: {
    clientele: "b2c",
    profile: "Adults interested in local crafts",
    zone: "national",
  },
  situation: {
    channels: ["social"],
    satisfaction: 3,
    competitors: "",
    marketingBudgetInvested: "no",
  },
  budget: {
    amountBand: "medium",
    currency: "TND",
    frequency: "monthly",
    urgency: "three-months",
  },
  contact: {
    fullName: "Sana Ben Ali",
    role: "Founder",
    email: "sana.personal@gmail.com",
    phone: "+216 22 123 456",
    consent: true,
  },
};

async function withApi<T>(
  run: (baseUrl: string) => Promise<T>,
  options: NonNullable<Parameters<typeof createApp>[0]> = {},
) {
  const server = createApp({
    emailCodeSecret: testEmailCodeSecret,
    emailExists: async () => false,
    sendVerificationEmail: async () => undefined,
    ...options,
  }).listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address() as AddressInfo;
  try {
    return await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
}

async function createDraftCookie(baseUrl: string) {
  const response = await fetch(`${baseUrl}/api/questionnaire/draft`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ language: "fr", currentStep: 6, answers: completeAnswers }),
  });
  assert.equal(response.status, 201);
  const cookie = response.headers.get("set-cookie")?.split(";")[0];
  assert.ok(cookie);
  return cookie;
}

function responseCookie(response: Response) {
  return response.headers.get("set-cookie")?.split(";")[0] ?? "";
}

async function sendCode(
  baseUrl: string,
  draftCookie: string,
  email = completeAnswers.contact.email,
  headers: Record<string, string> = {},
  language: "fr" | "en" = "fr",
) {
  return fetch(`${baseUrl}/api/email/send-code`, {
    method: "POST",
    headers: { cookie: draftCookie, "content-type": "application/json", ...headers },
    body: JSON.stringify({ email, language }),
  });
}

async function verifyCode(baseUrl: string, draftCookie: string, codeCookie: string, code: string, headers: Record<string, string> = {}) {
  return fetch(`${baseUrl}/api/email/verify`, {
    method: "POST",
    headers: { cookie: `${draftCookie}; ${codeCookie}`, "content-type": "application/json", ...headers },
    body: JSON.stringify({ code }),
  });
}

test("accepts a complete questionnaire and a public email provider", () => {
  const result = validateSubmission(completeAnswers);
  assert.equal(result.success, true);
});

test("normalizes Gmail aliases and strips plus tags from all email addresses", () => {
  assert.equal(normalizeEmail(" First.Last+campaign@GoogleMail.com "), "firstlast@gmail.com");
  assert.equal(normalizeEmail("User.Name+campaign@example.com"), "user.name@example.com");
  assert.equal(normalizeEmail("not-an-email"), null);
});

test("rejects disposable email domains", () => {
  assert.equal(isDisposableEmail("person@mailinator.com"), true);
  assert.equal(isDisposableEmail("person@example.com"), false);
});

test("email code proof validates code and ten-minute expiry without storing the code", () => {
  const code = "004281";
  const expiresAt = 1_000_000 + emailCodeLifetimeMs;
  const proof = createEmailCodeProof(testEmailCodeSecret, "person@example.com", code, expiresAt);
  const decoded = JSON.parse(Buffer.from(proof, "base64url").toString("utf8")) as Record<string, unknown>;
  assert.equal("code" in decoded, false);
  assert.deepEqual(verifyEmailCodeProof(proof, code, testEmailCodeSecret, 1_000_000), { email: "person@example.com" });
  assert.deepEqual(verifyEmailCodeProof(proof, "999999", testEmailCodeSecret, 1_000_000), { error: "invalid_code" });
  assert.deepEqual(verifyEmailCodeProof(proof, code, testEmailCodeSecret, expiresAt), { error: "expired_code" });
  assert.match(generateEmailCode(), /^\d{6}$/);
});

test("verification email content is branded and localized in French or English", () => {
  const french = buildVerificationEmail("004281", "fr");
  const english = buildVerificationEmail("004281", "en");

  assert.match(french.subject, /Votre code/);
  assert.match(french.html, /lang="fr"/);
  assert.match(french.html, /Confirmez votre adresse email/);
  assert.match(french.html, /004281/);
  assert.match(french.html, /10 minutes/);
  assert.match(french.html, /#00b5cd/i);
  assert.match(french.html, /#4f2c88/i);
  assert.match(english.subject, /Your verification code/);
  assert.match(english.html, /lang="en"/);
  assert.match(english.html, /Confirm your email address/);
  assert.match(english.html, /004281/);
  assert.match(english.html, /10 minutes/);
});

test("category A alert email uses the current brand colors", () => {
  const email = buildLeadAlertEmail({
    answers: completeAnswers,
    score: { total: 100, category: "A" },
    submittedAt: "2026-10-08T12:00:00.000Z",
  });

  assert.match(email.html, /#00b5cd/i);
  assert.match(email.html, /#4f2c88/i);
  assert.doesNotMatch(email.html, /#b08d57/i);
});

test("accepts a final submission without collecting browser geolocation", () => {
  const result = draftPayloadSchema.safeParse({
    language: "fr",
    currentStep: 6,
    answers: completeAnswers,
  });
  assert.equal(result.success, true);
});

test("accepts the empty initial draft while requiring answers at submission", () => {
  const result = draftPayloadSchema.safeParse({
    language: "fr",
    currentStep: 1,
    answers: {
      company: { name: "", sector: "", sectorOther: "", country: "tunisia", city: "", size: "", website: "", socials: [] },
      goals: { primary: "", primaryOther: "", secondary: [], secondaryOther: "", horizon: "" },
      audience: { clientele: "", profile: "", zone: "" },
      situation: { channels: [], satisfaction: 0, competitors: "", marketingBudgetInvested: "" },
      budget: { amountBand: "", currency: "TND", frequency: "", urgency: "" },
      contact: { fullName: "", role: "", email: "", phone: "+216", consent: false },
    },
  });
  assert.equal(result.success, true);
  const submission = validateSubmission(result.success ? result.data.answers : {});
  assert.equal(submission.success, false);
});

test("requires explicit consent and reports missing contact fields", () => {
  const result = validateSubmission({
    ...completeAnswers,
    contact: { ...completeAnswers.contact, email: "not-an-email", consent: false },
  });
  assert.equal(result.success, false);
  if (!result.success) {
    assert.ok(result.invalidFields.includes("contact.email"));
    assert.ok(result.invalidFields.includes("contact.consent"));
  }
});

test("rejects a budget currency that does not match the selected country", () => {
  const result = validateSubmission({
    ...completeAnswers,
    budget: { ...completeAnswers.budget, currency: "EUR" },
  });
  assert.equal(result.success, false);
  if (!result.success) assert.ok(result.invalidFields.includes("budget.currency"));
});

test("rejects more than two secondary objectives", () => {
  const result = validateSubmission({
    ...completeAnswers,
    goals: { ...completeAnswers.goals, secondary: ["events", "digital", "identity"] },
  });
  assert.equal(result.success, false);
  if (!result.success) assert.ok(result.invalidFields.includes("goals.secondary"));
});

test("requires a specified value when Other is selected", () => {
  const result = validateSubmission({
    ...completeAnswers,
    company: { ...completeAnswers.company, sector: "other", sectorOther: "  " },
  });
  assert.equal(result.success, false);
  if (!result.success) assert.ok(result.invalidFields.includes("company.sectorOther"));
});

test("submit endpoint requires the resume cookie", async () => {
  await withApi(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/questionnaire/draft/submit`, { method: "POST" });
    assert.equal(response.status, 401);
  });
});

test("submit endpoint rejects missing consent before accessing storage", async () => {
  await withApi(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/questionnaire/draft/submit`, {
      method: "POST",
      headers: {
        cookie: "doctor_com_draft=test-token",
        "content-type": "application/json",
      },
      body: JSON.stringify({ language: "fr", currentStep: 6, answers: { ...completeAnswers, contact: { ...completeAnswers.contact, consent: false } } }),
    });
    assert.equal(response.status, 400);
    const result = await response.json() as { invalidFields: string[] };
    assert.ok(result.invalidFields.includes("contact.consent"));
  });
});

test("email verification sends a code without returning it and accepts the valid code", async () => {
  let deliveredCode = "";
  let deliveredLanguage: string | undefined;
  let appendedAnswers: unknown;
  let leadAlertSent = false;
  await withApi(async (baseUrl) => {
    const draftCookie = await createDraftCookie(baseUrl);
    const sent = await sendCode(baseUrl, draftCookie);
    assert.equal(sent.status, 200);
    const sentBody = await sent.json() as Record<string, unknown>;
    assert.deepEqual(sentBody, { sent: true, expiresInSeconds: 600 });
    assert.ok(!JSON.stringify(sentBody).includes(deliveredCode));
    const codeCookieHeader = sent.headers.get("set-cookie") ?? "";
    assert.match(codeCookieHeader, /HttpOnly/i);
    if (process.env.NODE_ENV === "production") assert.match(codeCookieHeader, /Secure/i);
    else assert.doesNotMatch(codeCookieHeader, /Secure/i);
    assert.match(codeCookieHeader, /SameSite=Lax/i);
    const codeCookie = responseCookie(sent);

    const verified = await verifyCode(baseUrl, draftCookie, codeCookie.split(";")[0], deliveredCode);
    assert.equal(verified.status, 200);
    assert.deepEqual(await verified.json(), { verified: true });
    assert.match(verified.headers.get("set-cookie") ?? "", /Expires=Thu, 01 Jan 1970/i);

    const submitted = await fetch(`${baseUrl}/api/questionnaire/draft/submit`, {
      method: "POST",
      headers: { cookie: draftCookie, "content-type": "application/json" },
      body: JSON.stringify({ language: "fr", currentStep: 7, answers: completeAnswers }),
    });
    assert.equal(submitted.status, 202);
  }, {
    sendVerificationEmail: async (_email, code, language) => { deliveredCode = code; deliveredLanguage = language; },
    sendLeadAlert: async () => { leadAlertSent = true; },
    appendSubmission: async ({ answers }) => { appendedAnswers = answers; return true; },
    generatePlan: async () => "<h1>Plan</h1>",
  });
  assert.deepEqual(appendedAnswers, completeAnswers);
  assert.match(deliveredCode, /^\d{6}$/);
  assert.equal(deliveredLanguage, "fr");
  assert.equal(leadAlertSent, false);
});

test("authenticated report viewer renders the generated PDF for mobile WebViews", async () => {
  let deliveredCode = "";
  await withApi(async (baseUrl) => {
    const cookie = await createDraftCookie(baseUrl);
    const sent = await sendCode(baseUrl, cookie);
    await verifyCode(baseUrl, cookie, responseCookie(sent), deliveredCode);

    const submitted = await fetch(`${baseUrl}/api/questionnaire/draft/submit`, {
      method: "POST",
      headers: { cookie, "content-type": "application/json" },
      body: JSON.stringify({ language: "fr", currentStep: 7, answers: completeAnswers }),
    });
    assert.equal(submitted.status, 202);

    let viewer: Response | undefined;
    for (let attempt = 0; attempt < 50; attempt += 1) {
      viewer = await fetch(`${baseUrl}/api/questionnaire/report/viewer`, { headers: { cookie } });
      if (viewer.status !== 409) break;
      await new Promise((resolve) => setTimeout(resolve, 20));
    }

    assert.equal(viewer?.status, 200);
    assert.match(viewer?.headers.get("content-type") ?? "", /text\/html/);
    const html = await viewer!.text();
    assert.match(html, /pdf\.js\/3\.11\.174\/pdf\.min\.js/);
    assert.match(html, /\/api\/questionnaire\/report\.pdf/);
    assert.match(html, /withCredentials: true/);
  }, {
    sendVerificationEmail: async (_email, code) => { deliveredCode = code; },
    appendSubmission: async () => true,
    generatePlan: async () => "<h1>Plan</h1>",
  });
});

test("sends a category A alert after a successful submission with contact details and timestamp", async () => {
  let deliveredCode = "";
  let alert: {
    answers: typeof completeAnswers;
    score: { total: number; category: string };
    submittedAt: string;
  } | undefined;
  let sheetTimestamp = "";
  const submittedAt = 1_800_000_000_000;

  await withApi(async (baseUrl) => {
    const draftCookie = await createDraftCookie(baseUrl);
    const sent = await sendCode(baseUrl, draftCookie);
    await verifyCode(baseUrl, draftCookie, responseCookie(sent), deliveredCode);

    const highValueAnswers = {
      ...completeAnswers,
      company: { ...completeAnswers.company, size: "enterprise" as const },
      budget: { ...completeAnswers.budget, amountBand: "high" as const, urgency: "one-month" as const },
    };
    const response = await fetch(`${baseUrl}/api/questionnaire/draft/submit`, {
      method: "POST",
      headers: { cookie: draftCookie, "content-type": "application/json" },
      body: JSON.stringify({ language: "fr", currentStep: 7, answers: highValueAnswers }),
    });

    assert.equal(response.status, 202);
    assert.deepEqual(await response.json(), { status: "submitted", reportStatus: "pending" });
  }, {
    now: () => submittedAt,
    sendVerificationEmail: async (_email, code) => { deliveredCode = code; },
    sendLeadAlert: async (input) => { alert = input; },
    appendSubmission: async (input) => { sheetTimestamp = input.submittedAt; return true; },
    generatePlan: async () => "<h1>Plan</h1>",
  });

  assert.ok(alert);
  assert.equal(alert.score.category, "A");
  assert.equal(alert.score.total, 100);
  assert.equal(alert.answers.contact.fullName, "Sana Ben Ali");
  assert.equal(alert.answers.contact.email, "sana.personal@gmail.com");
  assert.equal(alert.submittedAt, new Date(submittedAt).toISOString());
  assert.equal(sheetTimestamp, alert.submittedAt);
});

test("send-code sends the verification email in the selected questionnaire language", async () => {
  let deliveredLanguage: string | undefined;
  await withApi(async (baseUrl) => {
    const cookie = await createDraftCookie(baseUrl);
    const response = await sendCode(baseUrl, cookie, "english@example.com", {}, "en");
    assert.equal(response.status, 200);
  }, { sendVerificationEmail: async (_email, _code, language) => { deliveredLanguage = language; } });
  assert.equal(deliveredLanguage, "en");
});

test("send-code rejects email already in finalized sheet data", async () => {
  let sent = false;
  await withApi(async (baseUrl) => {
    const draftCookie = await createDraftCookie(baseUrl);
    const response = await sendCode(baseUrl, draftCookie, "First.Last+campaign@googlemail.com");
    assert.equal(response.status, 409);
    assert.deepEqual(await response.json(), { error: "email_already_used" });
  }, {
    emailExists: async (email) => email === "firstlast@gmail.com",
    sendVerificationEmail: async () => { sent = true; },
  });
  assert.equal(sent, false);
});

test("send-code enforces the 60-second resend cooldown", async () => {
  let sentCount = 0;
  let now = 20_000;
  await withApi(async (baseUrl) => {
    const draftCookie = await createDraftCookie(baseUrl);
    assert.equal((await sendCode(baseUrl, draftCookie)).status, 200);
    const cooldown = await sendCode(baseUrl, draftCookie);
    assert.equal(cooldown.status, 429);
    assert.deepEqual(await cooldown.json(), { error: "resend_wait", retryAfterSeconds: 60 });
    now += 60_000;
    assert.equal((await sendCode(baseUrl, draftCookie)).status, 200);
  }, {
    now: () => now,
    sendVerificationEmail: async () => { sentCount += 1; },
  });
  assert.equal(sentCount, 2);
});

test("email verification rejects wrong codes and reports expiry", async () => {
  let deliveredCode = "";
  let now = 10_000;
  await withApi(async (baseUrl) => {
    const draftCookie = await createDraftCookie(baseUrl);
    const sent = await sendCode(baseUrl, draftCookie);
    const codeCookie = responseCookie(sent).split(";")[0];

    const wrong = await verifyCode(baseUrl, draftCookie, codeCookie, "999999");
    assert.equal(wrong.status, 400);
    assert.deepEqual(await wrong.json(), { error: "invalid_code" });

    now += emailCodeLifetimeMs + 1;
    const expired = await verifyCode(baseUrl, draftCookie, codeCookie, deliveredCode);
    assert.equal(expired.status, 410);
    assert.deepEqual(await expired.json(), { error: "expired_code" });
  }, {
    now: () => now,
    sendVerificationEmail: async (_email, code) => { deliveredCode = code; },
  });
});

test("verified email survives draft reload but is cleared when the contact email changes", async () => {
  let deliveredCode = "";
  await withApi(async (baseUrl) => {
    const cookie = await createDraftCookie(baseUrl);
    const sent = await sendCode(baseUrl, cookie);
    await verifyCode(baseUrl, cookie, responseCookie(sent), deliveredCode);

    const restored = await fetch(`${baseUrl}/api/questionnaire/draft`, { headers: { cookie } });
    assert.equal((await restored.json() as { draft: { emailVerified: boolean } }).draft.emailVerified, true);

    const updatedAnswers = { ...completeAnswers, contact: { ...completeAnswers.contact, email: "another@example.com" } };
    const updated = await fetch(`${baseUrl}/api/questionnaire/draft`, {
      method: "PUT",
      headers: { cookie, "content-type": "application/json" },
      body: JSON.stringify({ language: "fr", currentStep: 6, answers: updatedAnswers }),
    });
    assert.equal(updated.status, 200);
    const restoredAfterChange = await fetch(`${baseUrl}/api/questionnaire/draft`, { headers: { cookie } });
    assert.equal((await restoredAfterChange.json() as { draft: { emailVerified: boolean } }).draft.emailVerified, false);
  }, { sendVerificationEmail: async (_email, code) => { deliveredCode = code; } });
});

test("send-code enforces the per-IP limit", async () => {
  await withApi(async (baseUrl) => {
    const draftCookie = await createDraftCookie(baseUrl);
    const email = "rate-limit-ip@example.com";
    const first = await sendCode(baseUrl, draftCookie, email);
    assert.equal(first.status, 200);
    assert.equal((await sendCode(baseUrl, draftCookie, email)).status, 429);
    assert.equal((await sendCode(baseUrl, draftCookie, email)).status, 429);
    const limited = await sendCode(baseUrl, draftCookie, email);
    assert.equal(limited.status, 429);
    assert.deepEqual(await limited.json(), { error: "rate_limited" });
  });
});

test("send-code enforces the normalized-email limit across IPs", async () => {
  await withApi(async (baseUrl) => {
    const draftCookie = await createDraftCookie(baseUrl);
    const email = "Rate.Limit+tag@example.com";
    assert.equal((await sendCode(baseUrl, draftCookie, email, { "x-forwarded-for": "203.0.113.11" })).status, 200);
    assert.equal((await sendCode(baseUrl, draftCookie, email, { "x-forwarded-for": "203.0.113.12" })).status, 429);
    assert.equal((await sendCode(baseUrl, draftCookie, email, { "x-forwarded-for": "203.0.113.13" })).status, 429);
    const limited = await sendCode(baseUrl, draftCookie, email, { "x-forwarded-for": "203.0.113.14" });
    assert.equal(limited.status, 429);
    assert.deepEqual(await limited.json(), { error: "rate_limited" });
  });
});

test("verify-code allows five attempts per IP in fifteen minutes", async () => {
  let deliveredCode = "";
  await withApi(async (baseUrl) => {
    const draftCookie = await createDraftCookie(baseUrl);
    const sent = await sendCode(baseUrl, draftCookie);
    const codeCookie = responseCookie(sent);
    const wrongCode = deliveredCode === "000000" ? "000001" : "000000";
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await verifyCode(baseUrl, draftCookie, codeCookie, wrongCode);
      assert.equal(response.status, 400);
    }
    const limited = await verifyCode(baseUrl, draftCookie, codeCookie, wrongCode);
    assert.equal(limited.status, 429);
    assert.deepEqual(await limited.json(), { error: "too_many_attempts" });
  }, { sendVerificationEmail: async (_email, code) => { deliveredCode = code; } });
});

test("submission is refused until the session email is verified", async () => {
  let appended = false;
  await withApi(async (baseUrl) => {
    const draftCookie = await createDraftCookie(baseUrl);
    const response = await fetch(`${baseUrl}/api/questionnaire/draft/submit`, {
      method: "POST",
      headers: { cookie: draftCookie, "content-type": "application/json" },
      body: JSON.stringify({ language: "fr", currentStep: 7, answers: completeAnswers }),
    });
    assert.equal(response.status, 403);
    assert.deepEqual(await response.json(), { error: "email_verification_required" });
  }, { appendSubmission: async () => { appended = true; return true; } });
  assert.equal(appended, false);
});

test("submission appends its answers to Google Sheets before acceptance", async () => {
  let appendedAnswers: unknown;
  let deliveredCode = "";
  await withApi(async (baseUrl) => {
    const cookie = await createDraftCookie(baseUrl);
    const sent = await sendCode(baseUrl, cookie);
    await verifyCode(baseUrl, cookie, responseCookie(sent), deliveredCode);
    const response = await fetch(`${baseUrl}/api/questionnaire/draft/submit`, {
      method: "POST",
      headers: { cookie: cookie!, "content-type": "application/json" },
      body: JSON.stringify({ language: "fr", currentStep: 6, answers: completeAnswers }),
    });
    assert.equal(response.status, 202);
    assert.deepEqual(await response.json(), { status: "submitted", reportStatus: "pending" });
  }, {
    sendVerificationEmail: async (_email, code) => { deliveredCode = code; },
    appendSubmission: async ({ answers }) => {
      appendedAnswers = answers;
      return true;
    },
    generatePlan: async () => "<h1>Plan</h1>",
  });
  assert.deepEqual(appendedAnswers, completeAnswers);
});

test("submission is not accepted when Google Sheets append fails", async () => {
  let deliveredCode = "";
  await withApi(async (baseUrl) => {
    const cookie = await createDraftCookie(baseUrl);
    const sent = await sendCode(baseUrl, cookie);
    await verifyCode(baseUrl, cookie, responseCookie(sent), deliveredCode);
    const response = await fetch(`${baseUrl}/api/questionnaire/draft/submit`, {
      method: "POST",
      headers: { cookie: cookie!, "content-type": "application/json" },
      body: JSON.stringify({ language: "fr", currentStep: 6, answers: completeAnswers }),
    });
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { error: "spreadsheet_unavailable" });
  }, {
    sendVerificationEmail: async (_email, code) => { deliveredCode = code; },
    appendSubmission: async () => false,
  });
});

test("daily report cap refuses submission before appending to Sheets", async () => {
  const previousCap = process.env.DAILY_REPORT_CAP;
  process.env.DAILY_REPORT_CAP = "0";
  let deliveredCode = "";
  let appended = false;
  try {
    await withApi(async (baseUrl) => {
      const cookie = await createDraftCookie(baseUrl);
      const sent = await sendCode(baseUrl, cookie);
      await verifyCode(baseUrl, cookie, responseCookie(sent), deliveredCode);
      const response = await fetch(`${baseUrl}/api/questionnaire/draft/submit`, {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({ language: "fr", currentStep: 7, answers: completeAnswers }),
      });
      assert.equal(response.status, 429);
      assert.deepEqual(await response.json(), { error: "daily_report_cap" });
    }, {
      reportJobs: createReportJobs(),
      sendVerificationEmail: async (_email, code) => { deliveredCode = code; },
      appendSubmission: async () => { appended = true; return true; },
    });
  } finally {
    if (previousCap === undefined) delete process.env.DAILY_REPORT_CAP;
    else process.env.DAILY_REPORT_CAP = previousCap;
  }
  assert.equal(appended, false);
});

test("submission rechecks the Sheet for a duplicate after email verification", async () => {
  let emailChecks = 0;
  let appended = false;
  let deliveredCode = "";
  await withApi(async (baseUrl) => {
    const cookie = await createDraftCookie(baseUrl);
    const sent = await sendCode(baseUrl, cookie);
    await verifyCode(baseUrl, cookie, responseCookie(sent), deliveredCode);
    const response = await fetch(`${baseUrl}/api/questionnaire/draft/submit`, {
      method: "POST",
      headers: { cookie, "content-type": "application/json" },
      body: JSON.stringify({ language: "fr", currentStep: 7, answers: completeAnswers }),
    });
    assert.equal(response.status, 409);
    assert.deepEqual(await response.json(), { error: "email_already_used" });
  }, {
    emailExists: async () => ++emailChecks > 1,
    sendVerificationEmail: async (_email, code) => { deliveredCode = code; },
    appendSubmission: async () => { appended = true; return true; },
  });
  assert.equal(emailChecks, 2);
  assert.equal(appended, false);
});

test("send-code IP limits use CF-Connecting-IP behind a shared Render proxy", async () => {
  await withApi(async (baseUrl) => {
    const sendFrom = async (clientIp: string, index: number) => {
      const draftCookie = await createDraftCookie(baseUrl);
      return sendCode(baseUrl, draftCookie, `cloudflare-${index}@example.com`, {
        "x-forwarded-for": "198.51.100.20",
        "cf-connecting-ip": clientIp,
      });
    };

    assert.equal((await sendFrom("203.0.113.10", 1)).status, 200);
    assert.equal((await sendFrom("203.0.113.11", 2)).status, 200);
    assert.equal((await sendFrom("203.0.113.12", 3)).status, 200);
    assert.equal((await sendFrom("203.0.113.10", 4)).status, 200);
    assert.equal((await sendFrom("203.0.113.10", 5)).status, 200);
    const limited = await sendFrom("203.0.113.10", 6);
    assert.equal(limited.status, 429);
  });
});

test("verify-code IP limits use CF-Connecting-IP behind a shared Render proxy", async () => {
  let deliveredCode = "";
  await withApi(async (baseUrl) => {
    const cookie = await createDraftCookie(baseUrl);
    const sent = await sendCode(baseUrl, cookie);
    const codeCookie = responseCookie(sent);
    for (let attempt = 1; attempt <= 6; attempt += 1) {
      const response = await verifyCode(
        baseUrl,
        cookie,
        codeCookie,
        deliveredCode === "000000" ? "000001" : "000000",
        {
          "x-forwarded-for": "198.51.100.20",
          "cf-connecting-ip": `203.0.113.${attempt}`,
        },
      );
      assert.equal(response.status, 400);
    }
  }, { sendVerificationEmail: async (_email, code) => { deliveredCode = code; } });
});

test("Express trusts one Render proxy hop", () => {
  assert.equal(createApp().get("trust proxy"), 1);
});