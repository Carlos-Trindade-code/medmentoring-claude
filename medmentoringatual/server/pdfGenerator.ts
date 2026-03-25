import PDFDocument from "pdfkit";

// ─── Color palette (matches pdfPremium.ts) ──────────────────────────────────
const NAVY = "#1a2332";
const GOLD = "#c9a84c";
const WHITE = "#ffffff";
const LIGHT_BG = "#f8f6f0";
const GREEN = "#059669";
const AMBER = "#d97706";
const GRAY = "#6b7280";
const LIGHT_GRAY = "#e5e7eb";

const PILLAR_TITLES: Record<number, string> = {
  1: "Identidade e Propósito",
  2: "Posicionamento",
  3: "Diagnóstico Financeiro",
  4: "Processos e Gestão",
  5: "Precificação",
  6: "Marketing e Comunicação",
  7: "Vendas e Conversão",
};

function humanizeKey(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace("Recomendacao Mentor", "Recomendação do Mentor (Confidencial)");
}

// ─── Helper: check page space and add page if needed ────────────────────────
function ensureSpace(doc: PDFKit.PDFDocument, needed: number): number {
  if (doc.y > doc.page.height - needed) {
    doc.addPage();
    // Subtle gold line at top of continuation pages
    doc.rect(50, 0, doc.page.width - 100, 3).fill(GOLD);
    doc.y = 50;
  }
  return doc.y;
}

// ─── Helper: render a section label ─────────────────────────────────────────
function renderSectionLabel(doc: PDFKit.PDFDocument, label: string, y: number, pageWidth: number): number {
  ensureSpace(doc, 80);
  y = doc.y;
  // Gold accent bar
  doc.rect(50, y, 4, 18).fill(GOLD);
  doc
    .font("Helvetica-Bold")
    .fontSize(12)
    .fillColor(NAVY)
    .text(label, 62, y + 2, { width: pageWidth - 12 });
  doc.moveDown(0.4);
  return doc.y;
}

// ─── Helper: render narrative text in a card ────────────────────────────────
function renderNarrativeCard(doc: PDFKit.PDFDocument, text: string, pageWidth: number): number {
  ensureSpace(doc, 80);
  const y = doc.y;
  doc.font("Helvetica").fontSize(10);
  const textHeight = doc.heightOfString(text, { width: pageWidth - 20 });
  doc.roundedRect(50, y, pageWidth, textHeight + 16, 4).fill(LIGHT_BG);
  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor("#374151")
    .text(text, 60, y + 8, { width: pageWidth - 20 });
  doc.y = y + textHeight + 24;
  return doc.y;
}

// ─── Helper: render bulleted list ───────────────────────────────────────────
function renderBulletList(doc: PDFKit.PDFDocument, items: string[], pageWidth: number): number {
  for (const item of items) {
    if (!item || (typeof item === "string" && !item.trim())) continue;
    ensureSpace(doc, 60);
    const y = doc.y;
    // Gold bullet
    doc.circle(62, y + 5, 3).fill(GOLD);
    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor("#374151")
      .text(String(item), 74, y, { width: pageWidth - 24 });
    doc.moveDown(0.3);
  }
  return doc.y;
}

// ─── Helper: render key-value table ─────────────────────────────────────────
function renderKeyValueTable(
  doc: PDFKit.PDFDocument,
  entries: Array<[string, string]>,
  pageWidth: number
): number {
  const keyColWidth = pageWidth * 0.35;
  const valColWidth = pageWidth * 0.65;
  const rowPadding = 6;

  for (let i = 0; i < entries.length; i++) {
    const [key, val] = entries[i];
    ensureSpace(doc, 40);
    const y = doc.y;

    // Measure row height
    doc.font("Helvetica").fontSize(9);
    const valHeight = doc.heightOfString(String(val ?? ""), { width: valColWidth - 16 });
    const rowHeight = Math.max(20, valHeight + rowPadding * 2);

    // Alternating row background
    const bgColor = i % 2 === 0 ? WHITE : LIGHT_BG;
    doc.rect(50, y, pageWidth, rowHeight).fill(bgColor);

    // Key cell
    doc
      .font("Helvetica-Bold")
      .fontSize(9)
      .fillColor(NAVY)
      .text(humanizeKey(key), 54, y + rowPadding, { width: keyColWidth - 8 });

    // Value cell
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#374151")
      .text(String(val ?? ""), 50 + keyColWidth + 4, y + rowPadding, {
        width: valColWidth - 16,
      });

    doc.y = y + rowHeight;
  }
  doc.moveDown(0.3);
  return doc.y;
}

// ─── Helper: render a data table (rows x cols) ─────────────────────────────
function renderDataTable(
  doc: PDFKit.PDFDocument,
  headers: string[],
  rows: string[][],
  pageWidth: number
): number {
  const colCount = headers.length;
  const colWidths = headers.map(() => pageWidth / colCount);
  const rowHeight = 22;

  ensureSpace(doc, 80);
  let y = doc.y;

  // Header row
  doc.rect(50, y, pageWidth, rowHeight).fill(NAVY);
  let x = 50;
  headers.forEach((h, i) => {
    doc
      .font("Helvetica-Bold")
      .fontSize(8)
      .fillColor(WHITE)
      .text(h, x + 4, y + 6, { width: colWidths[i] - 8 });
    x += colWidths[i];
  });
  y += rowHeight;

  // Data rows
  for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
    if (y > doc.page.height - 80) {
      doc.addPage();
      doc.rect(50, 0, doc.page.width - 100, 3).fill(GOLD);
      y = 50;
    }

    const bgColor = rowIdx % 2 === 0 ? WHITE : LIGHT_BG;
    doc.rect(50, y, pageWidth, rowHeight).fill(bgColor);

    x = 50;
    rows[rowIdx].forEach((cell, i) => {
      doc
        .font("Helvetica")
        .fontSize(8)
        .fillColor("#374151")
        .text(cell, x + 4, y + 6, { width: colWidths[i] - 8 });
      x += colWidths[i];
    });
    y += rowHeight;
  }

  doc.y = y + 10;
  return doc.y;
}

// ─── Helper: smartly render any value ───────────────────────────────────────
function renderValue(
  doc: PDFKit.PDFDocument,
  val: unknown,
  pageWidth: number,
  depth: number = 0
): number {
  if (val === null || val === undefined || val === "") return doc.y;

  // String
  if (typeof val === "string") {
    return renderNarrativeCard(doc, val, pageWidth);
  }

  // Number / boolean
  if (typeof val === "number" || typeof val === "boolean") {
    return renderNarrativeCard(doc, String(val), pageWidth);
  }

  // Array
  if (Array.isArray(val)) {
    // Check if it's an array of objects (table-like data)
    if (val.length > 0 && typeof val[0] === "object" && val[0] !== null && !Array.isArray(val[0])) {
      // Render as table
      const allKeys = new Set<string>();
      for (const item of val) {
        if (typeof item === "object" && item !== null) {
          Object.keys(item as Record<string, unknown>).forEach((k) => allKeys.add(k));
        }
      }
      const headers = Array.from(allKeys);
      const rows = val.map((item) => {
        const obj = item as Record<string, unknown>;
        return headers.map((h) => String(obj[h] ?? ""));
      });
      return renderDataTable(doc, headers.map(humanizeKey), rows, pageWidth);
    }

    // Array of strings/primitives → bullet list
    const items = val.map((v) => String(v ?? ""));
    return renderBulletList(doc, items, pageWidth);
  }

  // Object (key-value or nested)
  if (typeof val === "object") {
    const obj = val as Record<string, unknown>;
    const entries = Object.entries(obj);

    // Check if all values are primitives → key-value table
    const allPrimitive = entries.every(
      ([, v]) => typeof v === "string" || typeof v === "number" || typeof v === "boolean" || v === null
    );

    if (allPrimitive) {
      return renderKeyValueTable(
        doc,
        entries.map(([k, v]) => [k, String(v ?? "")]),
        pageWidth
      );
    }

    // Mixed/nested object → render each key as sub-section
    for (const [subKey, subVal] of entries) {
      if (subKey === "recomendacao_mentor") continue;
      ensureSpace(doc, 80);
      // Sub-section label (indented based on depth)
      doc
        .font("Helvetica-Bold")
        .fontSize(10)
        .fillColor(GOLD)
        .text(humanizeKey(subKey), 50 + depth * 10, doc.y, { width: pageWidth - depth * 10 });
      doc.moveDown(0.2);
      renderValue(doc, subVal, pageWidth, depth + 1);
    }
    return doc.y;
  }

  return doc.y;
}

// ─── Main export ────────────────────────────────────────────────────────────
export async function generatePillarConclusionsPDF(params: {
  menteeName: string;
  menteeSpecialty?: string;
  mentorName: string;
  pillarId: number;
  conclusoesJson: Record<string, unknown>;
  generatedAt: Date;
}): Promise<Buffer> {
  const { menteeName, menteeSpecialty, mentorName, pillarId, conclusoesJson, generatedAt } = params;
  const pillarTitle = PILLAR_TITLES[pillarId] ?? `Pilar ${pillarId}`;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
      bufferPages: true,
      info: {
        Title: `Conclusões ${pillarTitle} — ${menteeName}`,
        Author: mentorName,
        Subject: `MedMentoring — ${pillarTitle}`,
      },
    });

    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageWidth = doc.page.width - 100; // 50px margin each side

    // ─── COVER PAGE ───────────────────────────────────────────────────────
    // Navy background at top (40% of page)
    doc.rect(0, 0, doc.page.width, doc.page.height * 0.4).fill(NAVY);

    // Logo
    doc.font("Helvetica-Bold").fontSize(14).fillColor(GOLD).text("MedMentoring", 50, 50);

    // Pillar badge
    doc.roundedRect(50, 100, 80, 24, 4).fill(GOLD);
    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .fillColor(NAVY)
      .text(`Pilar ${pillarId}`, 50, 106, { width: 80, align: "center" });

    // Title
    doc
      .font("Helvetica-Bold")
      .fontSize(30)
      .fillColor(WHITE)
      .text(pillarTitle, 50, 140, { width: pageWidth });

    // Subtitle
    doc
      .font("Helvetica")
      .fontSize(14)
      .fillColor(GOLD)
      .text("Conclusões e Recomendações", 50, doc.y + 5, { width: pageWidth });

    // Mentee name below navy area
    const yAfterNavy = doc.page.height * 0.4 + 40;
    doc
      .font("Helvetica-Bold")
      .fontSize(18)
      .fillColor(NAVY)
      .text(menteeName, 50, yAfterNavy);

    if (menteeSpecialty) {
      doc
        .font("Helvetica")
        .fontSize(12)
        .fillColor(GRAY)
        .text(menteeSpecialty, 50, doc.y + 5);
    }

    // Date
    const dateStr = generatedAt.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
    doc
      .font("Helvetica")
      .fontSize(11)
      .fillColor(GRAY)
      .text(dateStr, 50, doc.y + 15);

    // Mentor signature at bottom
    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor(GRAY)
      .text(`Preparado por ${mentorName}`, 50, doc.page.height - 80);

    // ─── CONTENT PAGES ────────────────────────────────────────────────────
    // Filter out mentor-only recommendations
    const publicEntries = Object.entries(conclusoesJson).filter(
      ([key]) => key !== "recomendacao_mentor"
    );

    // Introductory section page
    doc.addPage();
    doc.rect(50, 50, 4, 30).fill(GOLD);
    doc
      .font("Helvetica-Bold")
      .fontSize(24)
      .fillColor(NAVY)
      .text("Análise Detalhada", 62, 50);
    doc
      .font("Helvetica")
      .fontSize(12)
      .fillColor(GRAY)
      .text("Conclusões elaboradas com base nas sessões de mentoria", 62, 82);

    doc.y = 120;

    // Intro narrative
    renderNarrativeCard(
      doc,
      `${menteeName}, preparei esta análise com base nas nossas sessões de mentoria ` +
        `sobre ${pillarTitle}. A seguir, apresento as principais conclusões e recomendações ` +
        `que identifiquei para o seu desenvolvimento neste pilar.`,
      pageWidth
    );

    doc.moveDown(0.5);

    // Render each section
    for (const [key, val] of publicEntries) {
      const label = humanizeKey(key);
      renderSectionLabel(doc, label, doc.y, pageWidth);
      renderValue(doc, val, pageWidth);
      doc.moveDown(0.5);
    }

    // ─── CLOSING PAGE ─────────────────────────────────────────────────────
    doc.addPage();
    doc.rect(0, doc.page.height - 80, doc.page.width, 80).fill(NAVY);

    doc
      .font("Helvetica-Bold")
      .fontSize(24)
      .fillColor(NAVY)
      .text("Próximos Passos", 50, 80);

    let yClose = 120;
    const proximosPassos = [
      "Revisar os pontos levantados neste documento",
      "Aplicar as recomendações no dia a dia do consultório",
      "Trazer dúvidas e resultados para a próxima sessão de mentoria",
    ];

    proximosPassos.forEach((passo, i) => {
      // Numbered gold circle
      doc.circle(62, yClose + 7, 10).fill(GOLD);
      doc
        .font("Helvetica-Bold")
        .fontSize(9)
        .fillColor(WHITE)
        .text(String(i + 1), 57, yClose + 3);
      doc
        .font("Helvetica")
        .fontSize(11)
        .fillColor(NAVY)
        .text(passo, 80, yClose, { width: pageWidth - 30 });
      yClose += 30;
    });

    // Footer on closing page
    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor(WHITE)
      .text(`MedMentoring • ${dateStr}`, 50, doc.page.height - 50, {
        width: pageWidth,
        align: "center",
      });

    // Confidentiality notice
    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor(GRAY)
      .text(
        `Documento confidencial elaborado por ${mentorName} para uso exclusivo de ${menteeName}`,
        50,
        doc.page.height - 100,
        { width: pageWidth, align: "center" }
      );

    doc.end();
  });
}
