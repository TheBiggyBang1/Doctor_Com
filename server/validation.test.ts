import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import test from "node:test";
import type { SqliteDatabase } from "./database.js";
import { createApp } from "./app.js";
import { draftPayloadSchema, validateSubmission } from "./validation.js";

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

async function withApi<T>(run: (baseUrl: string) => Promise<T>, database: SqliteDatabase = {} as SqliteDatabase) {
  const server = createApp(database).listen(0);
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

test("accepts a complete questionnaire and a public email provider", () => {
  const result = validateSubmission(completeAnswers);
  assert.equal(result.success, true);
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

test("health endpoint verifies database connectivity", async () => {
  let queried = false;
  const database = {
    get: () => {
      queried = true;
      return [[], []];
    },
  } as unknown as Pool;
  await withApi(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/health`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: "ok" });
  }, database);
  assert.equal(queried, true);
});

test("health endpoint returns unavailable when SQLite cannot be reached", async () => {
  const database = { get: () => { throw new Error("database offline"); } } as unknown as SqliteDatabase;
  await withApi(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/health`);
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { status: "unavailable" });
  }, database);
});