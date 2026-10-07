import assert from "node:assert/strict";
import test from "node:test";
import { buildReportDocument, renderHtmlReportPdf } from "./htmlPdf.js";

test("wraps report HTML in the print template and preserves safe tables and citations", () => {
  const document = buildReportDocument(
    "<h1>Benchmark</h1><table><thead><tr><th>Concurrents</th></tr></thead><tbody><tr><td>Atelier A</td></tr></tbody></table><a href=\"https://example.com\">Source</a>",
    "fr",
  );

  assert.match(document, /@page/);
  assert.match(document, /<table>/);
  assert.match(document, /<a href="https:\/\/example\.com">Source<\/a>/);
});

test("removes active content and remote assets from model-generated HTML", () => {
  const document = buildReportDocument(
    "<p onclick=\"steal()\">Plan sûr</p><script>alert(1)</script><img src=\"https://attacker.example/pixel\"><a href=\"javascript:alert(1)\">bad</a>",
    "en",
  );

  assert.match(document, /Plan sûr/);
  assert.doesNotMatch(document, /<script|onclick|attacker\.example|javascript:/i);
});

test("does not append a contact page after the generated report", () => {
  const document = buildReportDocument("<h1>Plan généré</h1><p>Contenu Claude.</p>", "fr");

  assert.match(document, /<main><h1>Plan généré<\/h1><p>Contenu Claude\.<\/p><\/main>/);
  assert.doesNotMatch(document, /contact-page|Contactez-nous|Contact us|Contact@5sens\.tn/);
});

test("does not append a contact page to English reports", () => {
  const document = buildReportDocument("<h1>Generated plan</h1>", "en");
  assert.match(document, /<html lang="en">/);
  assert.match(document, /<main><h1>Generated plan<\/h1><\/main>/);
  assert.doesNotMatch(document, /contact-page|Contact us|Follow us online/);
});

test("compiles the sanitized report to a PDF with Chromium", async () => {
  const pdf = await renderHtmlReportPdf(
    "<h1>Communications plan</h1><p>Ready to display.</p>",
    "en",
  );

  assert.equal(pdf.subarray(0, 5).toString("ascii"), "%PDF-");
  assert.ok(pdf.byteLength > 1000);
  assert.equal([...pdf.toString("latin1").matchAll(/\/Type\s*\/Page\b/g)].length, 1);
});