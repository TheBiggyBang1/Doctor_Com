import { chromium } from "playwright";
import sanitizeHtml from "sanitize-html";
import { companyLogoBuffer } from "./pdfAssets.js";

const allowedTags = [
  "a", "blockquote", "br", "code", "div", "em", "h1", "h2", "h3", "h4", "hr", "li", "ol", "p", "pre", "span", "strong", "table", "tbody", "td", "th", "thead", "tr", "ul",
];
const maximumPdfBytes = 20_000_000;

export function buildReportDocument(fragment: string, language: "fr" | "en") {
  const body = sanitizeHtml(fragment, {
    allowedTags,
    allowedAttributes: {
      a: ["href", "title"],
      td: ["colspan", "rowspan"],
      th: ["colspan", "rowspan"],
    },
    allowedSchemes: ["https", "http", "mailto"],
  });
  const title = language === "fr" ? "Plan de communication" : "Communications plan";

  return `<!doctype html>
<html lang="${language}">
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    @page { size: A4; }
    * { box-sizing: border-box; }
    body { color: #303743; font: 10pt/1.55 "DejaVu Sans", sans-serif; }
    .brand { border-bottom: 2px solid #b08d57; color: #1b2a4a; font-size: 9pt; font-weight: 700; letter-spacing: .12em; margin-bottom: 18pt; padding-bottom: 8pt; }
    h1, h2, h3, h4 { break-after: avoid; color: #1b2a4a; line-height: 1.2; }
    h1 { font-size: 24pt; margin: 0 0 18pt; }
    h2 { border-bottom: 1px solid #dce1e8; font-size: 16pt; margin: 22pt 0 8pt; padding-bottom: 5pt; }
    h3 { font-size: 12pt; margin: 15pt 0 6pt; }
    h4 { font-size: 10pt; margin: 12pt 0 5pt; }
    p { margin: 0 0 8pt; orphans: 3; widows: 3; }
    ul, ol { margin: 4pt 0 10pt; padding-left: 20pt; }
    li { margin: 0 0 4pt; }
    blockquote { border-left: 3px solid #b08d57; color: #505968; margin: 10pt 0; padding: 4pt 12pt; }
    table { border-collapse: collapse; font-size: 8.5pt; margin: 9pt 0 14pt; table-layout: fixed; width: 100%; }
    thead { display: table-header-group; }
    th { background: #1b2a4a; color: #fff; font-weight: 700; text-align: left; }
    th, td { border: 1px solid #dce1e8; overflow-wrap: anywhere; padding: 6pt; vertical-align: top; }
    tbody tr:nth-child(even) { background: #f3f5f8; }
    tr { break-inside: avoid; }
    a { color: #254d7a; overflow-wrap: anywhere; text-decoration: underline; }
    code, pre { font-family: "DejaVu Sans Mono", monospace; font-size: 8.5pt; }
    pre { background: #f3f5f8; padding: 8pt; white-space: pre-wrap; }
    hr { border: 0; border-top: 1px solid #dce1e8; margin: 14pt 0; }
  </style>
</head>
<body>
  <div class="brand">5 SENS ADVERTISING · DOCTOR COM</div>
  <main>${body}</main>
</body>
</html>`;
}

export async function renderHtmlReportPdf(fragment: string, language: "fr" | "en"): Promise<Buffer> {
  const browser = await chromium.launch({
    headless: true,
    args: process.env.NODE_ENV === "production" ? ["--no-sandbox", "--disable-dev-shm-usage"] : [],
  });
  try {
    const page = await browser.newPage({ javaScriptEnabled: false });
    await page.setContent(buildReportDocument(fragment, language), { waitUntil: "load", timeout: 15_000 });
    const logo = companyLogoBuffer().toString("base64");
    const footerTemplate = `<div style="box-sizing:border-box;width:100%;padding:3mm 17mm 0;border-top:0.5px solid #dce1e8;color:#596273;font:7pt Arial,sans-serif;display:flex;align-items:center;justify-content:space-between">
      <div style="display:flex;align-items:center;gap:3mm;white-space:nowrap">
        <img src="data:image/png;base64,${logo}" style="display:block;width:15mm;height:auto;max-height:10mm">
        <span>
          <a href="https://5sens.tn/" style="color:#1b8793;font-weight:700;text-decoration:none">5sens.tn</a>
          <span style="color:#b08d57"> &nbsp;·&nbsp; </span>+216 26 00 00 88
          <span style="color:#b08d57"> &nbsp;·&nbsp; </span>+216 22 50 55 01
        </span>
      </div>
      <span style="color:#74777c;font-size:6.5pt;white-space:nowrap"><span class="pageNumber"></span> / <span class="totalPages"></span></span>
    </div>`;
    let pdfTimeout: NodeJS.Timeout | undefined;
    try {
      const pdf = await Promise.race([
        page.pdf({
          format: "A4",
          printBackground: true,
          displayHeaderFooter: true,
          headerTemplate: "<span></span>",
          footerTemplate,
          margin: { top: "18mm", right: "17mm", bottom: "20mm", left: "17mm" },
        }),
        new Promise<never>((_resolve, reject) => {
          pdfTimeout = setTimeout(() => reject(new Error("PDF rendering exceeded the 30-second limit")), 30_000);
        }),
      ]);
      if (pdf.length > maximumPdfBytes) throw new Error("Rendered PDF exceeded the 20 MB limit");
      return Buffer.from(pdf);
    } finally {
      if (pdfTimeout) clearTimeout(pdfTimeout);
    }
  } finally {
    await browser.close();
  }
}