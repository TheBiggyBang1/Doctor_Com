import { chromium } from "playwright";
import sanitizeHtml from "sanitize-html";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const allowedTags = [
  "a", "blockquote", "br", "code", "div", "em", "h1", "h2", "h3", "h4", "hr", "li", "ol", "p", "pre", "span", "strong", "table", "tbody", "td", "th", "thead", "tr", "ul",
];
const maximumPdfBytes = 20_000_000;

function companyLogoDataUrl() {
  let logo: Buffer;
  try {
    logo = readFileSync(new URL("../client/logo_5sens.png", import.meta.url));
  } catch {
    const assetsDirectory = fileURLToPath(new URL("../client/assets/", import.meta.url));
    const logoFile = readdirSync(assetsDirectory).find((file) => /^logo_5sens-.*\.png$/i.test(file));
    if (!logoFile) throw new Error("The 5 Sens logo asset is missing from the PDF build");
    logo = readFileSync(join(assetsDirectory, logoFile));
  }
  return `data:image/png;base64,${logo.toString("base64")}`;
}

function contactPage(language: "fr" | "en", logo: string) {
  const french = language === "fr";
  const copy = french
    ? {
      title: "Contactez-nous",
      lead: "Donnons vie à votre prochain projet de communication.",
      contact: "Contactez-nous",
      email: "Envoyez-nous un courriel",
      locations: "Trouvez-nous à",
      headOffice: "Siège social",
      tunisOffice: "Bureau de Tunis",
      follow: "Retrouvez-nous en ligne",
    }
    : {
      title: "Contact us",
      lead: "Let's bring your next communications project to life.",
      contact: "Get in touch",
      email: "Send us an email",
      locations: "Find us at",
      headOffice: "Head office",
      tunisOffice: "Tunis office",
      follow: "Follow us online",
    };
  const sousseAddress = french
    ? "7 Boulevard de l’Environnement,<br>4089 Kantaoui, Tunisie"
    : "7 Boulevard de l’Environnement,<br>4089 Kantaoui, Tunisia";
  const tunisAddress = french
    ? "Bureau n° 6.13, 6ème étage,<br>Résidence Cercle des Bureaux,<br>Bd de la Terre, Tunis 1082"
    : "Office no. 6.13, 6th floor,<br>Résidence Cercle des Bureaux,<br>Bd de la Terre, Tunis 1082";

  return `<section class="contact-page">
  <div class="contact-page__content">
    <img class="contact-page__logo" src="${logo}" alt="5 Sens Advertising">
    <h1>${copy.title}</h1>
    <p class="contact-page__lead">${copy.lead}</p>
    <div class="contact-page__rule"></div>
    <section class="contact-page__group">
      <h2>${copy.contact}</h2>
      <p><strong>Sousse</strong><br><a href="tel:+21626000088">+216 26 00 00 88</a></p>
      <p><strong>Tunis</strong><br><a href="tel:+21622505501">+216 22 50 55 01</a></p>
    </section>
    <section class="contact-page__group">
      <h2>${copy.email}</h2>
      <p><a href="mailto:Contact@5sens.tn">Contact@5sens.tn</a></p>
    </section>
    <section class="contact-page__group">
      <h2>${copy.locations}</h2>
      <p><strong>Sousse · ${copy.headOffice}</strong><br>${sousseAddress}</p>
      <p><strong>Tunis · ${copy.tunisOffice}</strong><br>${tunisAddress}</p>
    </section>
    <section class="contact-page__group contact-page__socials">
      <h2>${copy.follow}</h2>
      <p><a href="https://www.facebook.com/5sensadvertising">Facebook</a><span> · </span><a href="https://www.instagram.com/5sensadvertising/">Instagram</a><span> · </span><a href="https://www.linkedin.com/company/5sensadvertising">LinkedIn</a></p>
    </section>
  </div>
</section>`;
}

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
  const finalContactPage = contactPage(language, companyLogoDataUrl());

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
    .contact-page { break-before: page; page-break-before: always; color: #353b47; }
    .contact-page__content { max-width: 500px; margin: 0 auto; padding-top: 16pt; }
    .contact-page__logo { display: block; width: 142px; height: auto; max-height: 82px; margin: 0 auto 24pt; object-fit: contain; }
    .contact-page h1 { margin: 0; color: #1b2a4a; font: 25pt/1.2 "DejaVu Sans", sans-serif; text-align: center; }
    .contact-page__lead { margin: 10pt 0 0; color: #626875; font-size: 11pt; text-align: center; }
    .contact-page__rule { width: 56px; height: 2px; margin: 20pt auto 22pt; background: #b08d57; }
    .contact-page__group { margin: 0 0 15pt; }
    .contact-page__group h2 { margin: 0 0 5pt; padding: 0; border: 0; color: #1b2a4a; font-size: 11pt; }
    .contact-page__group p { margin: 0 0 6pt; font-size: 9.5pt; line-height: 1.5; }
    .contact-page__socials p { color: #b08d57; font-weight: 700; }
    .contact-page__socials span { color: #74777c; }
    code, pre { font-family: "DejaVu Sans Mono", monospace; font-size: 8.5pt; }
    pre { background: #f3f5f8; padding: 8pt; white-space: pre-wrap; }
    hr { border: 0; border-top: 1px solid #dce1e8; margin: 14pt 0; }
  </style>
</head>
<body>
  <div class="brand">5 SENS ADVERTISING · DOCTOR COM</div>
  <main>${body}</main>
  ${finalContactPage}
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
    const footer = language === "fr" ? "Document confidentiel" : "Confidential document";
    const footerTemplate = `<div style="box-sizing:border-box;color:#74777c;font:8pt Arial,sans-serif;padding:0 17mm;width:100%;display:flex;justify-content:space-between"><span>5 Sens Advertising · ${footer}</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`;
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