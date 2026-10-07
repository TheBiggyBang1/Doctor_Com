import assert from "node:assert/strict";
import test from "node:test";
import { buildGoogleSheetRow } from "./googleSheets.js";

test("buildGoogleSheetRow includes full form data and scores without browser coordinates", () => {
  const row = buildGoogleSheetRow({
    language: "fr",
    answers: {
      company: { name: "Acme", sector: "crafts", sectorOther: "", country: "tunisia", city: "Tunis", size: "tpe", website: "https://acme.tn", socials: ["instagram"] },
      goals: { primary: "awareness", primaryOther: "", secondary: ["events"], secondaryOther: "", horizon: "three-months" },
      audience: { clientele: "b2c", profile: "Artisan local", zone: "national" },
      situation: { channels: ["social"], satisfaction: 4, competitors: "Alpha", marketingBudgetInvested: "yes" },
      budget: { amountBand: "medium", currency: "TND", frequency: "monthly", urgency: "three-months" },
      contact: { fullName: "Samira", role: "Founder", email: "samira@example.com", phone: "+21622123456", consent: true },
    },
    score: { total: 61, category: "B" },
    submittedAt: "2026-10-07T21:30:00.000Z",
  });

  assert.equal(row[0], "fr");
  assert.equal(row.length, 31);
  assert.equal(row[1], "Acme");
  assert.equal(row[4], "Tunis");
  assert.equal(row[25], "+21622123456");
  assert.equal(row[26], "yes");
  assert.equal(row[27], "61");
  assert.equal(row[28], "B");
  assert.equal(row[29], "2026-10-07T21:30:00.000Z");
  assert.match(row[30], /"company".*"name".*"Acme"/s);
});
