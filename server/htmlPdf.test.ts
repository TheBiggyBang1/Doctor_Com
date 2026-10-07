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

test("appends a branded French contact page after the generated report", () => {
  const document = buildReportDocument("<h1>Plan généré</h1><p>Contenu Claude.</p>", "fr");
  const reportEnd = document.indexOf("</main>");
  const contactStart = document.indexOf("class=\"contact-page\"");

  assert.ok(reportEnd >= 0 && contactStart > reportEnd);
  assert.match(document, /class="contact-page__logo" src="data:image\/png;base64,/);
  assert.match(document, /Contactez-nous/);
  assert.match(document, /\+216 26 00 00 88/);
  assert.match(document, /\+216 22 50 55 01/);
  assert.match(document, /Contact@5sens\.tn/);
  assert.match(document, /7 Boulevard de l’Environnement/);
  assert.match(document, /facebook\.com\/5sensadvertising/);
});

test("localizes the final contact page in English", () => {
  const document = buildReportDocument("<h1>Generated plan</h1>", "en");
  assert.match(document, /<html lang="en">/);
  assert.match(document, /Contact us/);
  assert.match(document, /Get in touch/);
  assert.match(document, /Head office/);
  assert.match(document, /Office no\. 6\.13, 6th floor/);
  assert.match(document, /Kantaoui, Tunisia/);
  assert.match(document, /Follow us online/);
});

test("compiles the sanitized report to a PDF with Chromium", async () => {
  const pdf = await renderHtmlReportPdf(
    "<h1>Communications plan</h1><p>Ready to display.</p><table><thead><tr><th>Channel</th></tr></thead><tbody><tr><td>Social</td></tr></tbody></table>",
    "en",
  );

  assert.equal(pdf.subarray(0, 5).toString("ascii"), "%PDF-");
  assert.ok(pdf.byteLength > 1000);
  assert.ok([...pdf.toString("latin1").matchAll(/\/Type\s*\/Page\b/g)].length >= 2);
});