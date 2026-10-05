import assert from "node:assert/strict";
import test from "node:test";
import { buildGoogleSheetRow } from "./googleSheets.js";

test("buildGoogleSheetRow includes full form data plus client coordinates", () => {
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
    coordinates: { latitude: 36.8, longitude: 10.18, accuracy: 25, source: "browser-geolocation" },
    score: { total: 61, category: "B" },
  });

  assert.equal(row[0], "fr");
  assert.equal(row[1], "Acme");
  assert.equal(row[4], "Tunis");
  assert.equal(row[25], "+21622123456");
  assert.equal(row[27], "36.8");
  assert.equal(row[28], "10.18");
  assert.equal(row[29], "25");
  assert.match(row[34], /"company".*"name".*"Acme"/s);
  assert.equal(row[33], "B");
});
