import assert from "node:assert/strict";
import test from "node:test";
import { renderPlanPdf } from "./pdf.js";

test("renders the generated plan as an in-memory PDF", async () => {
  const pdf = await renderPlanPdf("# Diagnostic\n\n## Positionnement\nUne stratégie claire pour votre entreprise.\n\n- Premier axe stratégique\n- Deuxième axe stratégique");
  assert.equal(pdf.subarray(0, 5).toString("ascii"), "%PDF-");
  assert.ok(pdf.byteLength > 1000);
});

test("renders Markdown table content instead of dropping its rows", async () => {
  const tablePlan = "## Canaux\n\n| Canal | Action prioritaire | Indicateur |\n| --- | --- | --- |\n| Réseaux sociaux | Publier deux fois par semaine | Portée qualifiée |\n| Site web | Améliorer la page de contact | Demandes entrantes |";
  const plainPlan = "## Canaux\n\nDeux canaux sont recommandés.";
  const tablePdf = await renderPlanPdf(tablePlan);
  const plainPdf = await renderPlanPdf(plainPlan);

  assert.equal(tablePdf.subarray(0, 5).toString("ascii"), "%PDF-");
  assert.ok(tablePdf.byteLength > plainPdf.byteLength + 250);
});