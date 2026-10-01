import PDFDocument from "pdfkit";

function plainMarkdown(text: string) {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/<[^>]+>/g, "");
}

export function renderPlanPdf(markdown: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const document = new PDFDocument({
      size: "A4",
      margins: { top: 58, bottom: 64, left: 58, right: 58 },
      info: { Title: "Plan de communication personnalisé", Author: "5 Sens Advertising" },
      bufferPages: true,
    });
    const chunks: Buffer[] = [];
    document.on("data", (chunk: Buffer) => chunks.push(chunk));
    document.on("error", reject);
    document.on("end", () => resolve(Buffer.concat(chunks)));

    document.fillColor("#1B2A4A").font("Helvetica-Bold").fontSize(9).text("5 SENS ADVERTISING");
    document.moveDown(1.2);
    document.fillColor("#1B2A4A").font("Times-Bold").fontSize(24).text("Plan de communication", { lineGap: 2 });
    document.moveDown(0.25);
    document.fillColor("#B08D57").font("Helvetica-Bold").fontSize(8).text("DOCTOR COM  ·  STRATÉGIE PERSONNALISÉE");
    document.moveDown(1.7);

    for (const sourceLine of markdown.split(/\r?\n/)) {
      const line = sourceLine.trim();
      if (!line || /^[-*_]{3,}$/.test(line)) {
        document.moveDown(0.45);
        continue;
      }
      const heading = /^(#{1,6})\s+(.+)$/.exec(line);
      if (heading) {
        const level = heading[1].length;
        const size = level === 1 ? 20 : level === 2 ? 15 : 12;
        document.moveDown(level < 3 ? 0.6 : 0.35);
        document.fillColor(level === 1 ? "#1B2A4A" : "#24365E");
        document.font(level <= 2 ? "Times-Bold" : "Helvetica-Bold").fontSize(size).text(plainMarkdown(heading[2]), { paragraphGap: 5 });
        document.moveDown(0.25);
        continue;
      }
      if (/^\s*\|/.test(line) || /^\|[-| :]+\|$/.test(line)) continue;
      const bullet = /^[-*+]\s+(.+)$/.exec(line);
      const numbered = /^\d+[.)]\s+(.+)$/.exec(line);
      const text = bullet?.[1] ?? numbered?.[1] ?? line.replace(/^>\s?/, "");
      document.fillColor("#353B47").font("Helvetica").fontSize(10);
      document.text(`${bullet ? "•  " : numbered ? "   " : ""}${plainMarkdown(text)}`, {
        indent: bullet || numbered ? 10 : 0,
        paragraphGap: 5,
        lineGap: 2,
      });
    }

    const pages = document.bufferedPageRange();
    for (let index = pages.start; index < pages.start + pages.count; index += 1) {
      document.switchToPage(index);
      const footerTop = document.page.height - 44;
      document.moveTo(58, footerTop).lineTo(document.page.width - 58, footerTop).lineWidth(0.5).strokeColor("#E7E2D8").stroke();
      document.fillColor("#74777C").font("Helvetica").fontSize(8)
        .text("5 Sens Advertising  ·  Document confidentiel", 58, footerTop + 10, { lineBreak: false });
      document.text(`${index + 1} / ${pages.count}`, document.page.width - 100, footerTop + 10, { width: 42, align: "right", lineBreak: false });
    }

    document.end();
  });
}