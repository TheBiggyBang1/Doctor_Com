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

test("compiles the sanitized report to a PDF with Chromium", async () => {
  const pdf = await renderHtmlReportPdf(
    "<h1>Communications plan</h1><p>Ready to display.</p><table><thead><tr><th>Channel</th></tr></thead><tbody><tr><td>Social</td></tr></tbody></table>",
    "en",
  );

  assert.equal(pdf.subarray(0, 5).toString("ascii"), "%PDF-");
  assert.ok(pdf.byteLength > 1000);
});