import assert from "node:assert/strict";
import test from "node:test";
import { renderPlanPdf } from "./pdf.js";

test("renders the Claude plan as an in-memory PDF", async () => {
  const pdf = await renderPlanPdf("# Diagnostic\n\n## Positionnement\nUne stratégie claire pour votre entreprise.\n\n- Premier axe stratégique\n- Deuxième axe stratégique");
  assert.equal(pdf.subarray(0, 5).toString("ascii"), "%PDF-");
  assert.ok(pdf.byteLength > 1000);
});