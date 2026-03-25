import PDFDocument from "pdfkit";

// Color palette
const NAVY = "#1a2332";
const GOLD = "#c9a84c";
const WHITE = "#ffffff";
const LIGHT_BG = "#f8f6f0";
const GREEN = "#059669";
const RED = "#dc2626";
const AMBER = "#d97706";
const GRAY = "#6b7280";
const LIGHT_GRAY = "#e5e7eb";

export interface PdfOptions {
  menteeNome: string;
  mentorNome?: string;
  titulo: string;
  subtitulo?: string;
  data: string; // formatted date
}

export function createPremiumPdf(options: PdfOptions): PDFKit.PDFDocument {
  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 50, bottom: 50, left: 50, right: 50 },
    bufferPages: true,
    info: {
      Title: `${options.titulo} — ${options.menteeNome}`,
      Author: options.mentorNome ?? "MedMentoring",
      Subject: "MedMentoring",
    },
  });

  return doc;
}

// ============================================================
// COVER PAGE
// ============================================================
export function addCoverPage(doc: PDFKit.PDFDocument, options: PdfOptions) {
  // Navy background rectangle at top (40% of page)
  doc.rect(0, 0, doc.page.width, doc.page.height * 0.4).fill(NAVY);

  // Logo text "MedMentoring" in gold
  doc.font("Helvetica-Bold").fontSize(14).fillColor(GOLD).text("MedMentoring", 50, 50);

  // Title in white, large
  doc
    .font("Helvetica-Bold")
    .fontSize(32)
    .fillColor(WHITE)
    .text(options.titulo, 50, 150, { width: doc.page.width - 100 });

  // Subtitle if exists
  if (options.subtitulo) {
    doc
      .font("Helvetica")
      .fontSize(16)
      .fillColor(GOLD)
      .text(options.subtitulo, 50, 200, { width: doc.page.width - 100 });
  }

  // Mentee name below navy area
  const yAfterNavy = doc.page.height * 0.4 + 40;
  doc.font("Helvetica-Bold").fontSize(20).fillColor(NAVY).text(options.menteeNome, 50, yAfterNavy);

  // Date
  doc.font("Helvetica").fontSize(12).fillColor(GRAY).text(options.data, 50, yAfterNavy + 40);

  // Mentor signature at bottom
  if (options.mentorNome) {
    doc
      .font("Helvetica")
      .fontSize(11)
      .fillColor(GRAY)
      .text(`Preparado por ${options.mentorNome}`, 50, doc.page.height - 80);
  }
}

// ============================================================
// SECTION HEADER (new page with title)
// ============================================================
export function addSectionPage(doc: PDFKit.PDFDocument, title: string, subtitle?: string): number {
  doc.addPage();
  // Gold accent line
  doc.rect(50, 50, 4, 30).fill(GOLD);
  doc.font("Helvetica-Bold").fontSize(24).fillColor(NAVY).text(title, 62, 50);
  if (subtitle) {
    doc.font("Helvetica").fontSize(12).fillColor(GRAY).text(subtitle, 62, 82);
  }
  return 120; // y position for content
}

// ============================================================
// KPI CARD ROW
// ============================================================
export function addKpiCards(
  doc: PDFKit.PDFDocument,
  y: number,
  cards: Array<{ label: string; value: string; color?: string }>
): number {
  const cardWidth = (doc.page.width - 100 - (cards.length - 1) * 10) / cards.length;

  cards.forEach((card, i) => {
    const x = 50 + i * (cardWidth + 10);
    // Card background
    doc.roundedRect(x, y, cardWidth, 60, 4).fill(LIGHT_BG);
    // Label
    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor(GRAY)
      .text(card.label, x + 10, y + 10, { width: cardWidth - 20 });
    // Value
    doc
      .font("Helvetica-Bold")
      .fontSize(16)
      .fillColor(card.color || NAVY)
      .text(card.value, x + 10, y + 28, { width: cardWidth - 20 });
  });

  return y + 75;
}

// ============================================================
// TABLE
// ============================================================
export function addTable(
  doc: PDFKit.PDFDocument,
  y: number,
  headers: string[],
  rows: string[][],
  options?: {
    colWidths?: number[];
    highlightTotals?: boolean;
    categoryRows?: number[]; // row indices that are category headers
  }
): number {
  const tableWidth = doc.page.width - 100;
  const colCount = headers.length;
  const colWidths = options?.colWidths || headers.map(() => tableWidth / colCount);
  const rowHeight = 22;

  // Header row
  let x = 50;
  doc.rect(50, y, tableWidth, rowHeight).fill(NAVY);
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
  rows.forEach((row, rowIdx) => {
    if (y > doc.page.height - 80) {
      doc.addPage();
      y = 50;
    }

    const isCategory = options?.categoryRows?.includes(rowIdx);
    const isTotal = options?.highlightTotals && rowIdx === rows.length - 1;
    const bgColor = isCategory ? LIGHT_BG : isTotal ? "#f0f0f0" : rowIdx % 2 === 0 ? WHITE : "#fafafa";

    doc.rect(50, y, tableWidth, rowHeight).fill(bgColor);

    x = 50;
    row.forEach((cell, i) => {
      const textColor = isCategory || isTotal ? NAVY : "#374151";
      const fontName = isCategory || isTotal ? "Helvetica-Bold" : "Helvetica";
      doc
        .font(fontName)
        .fontSize(isCategory ? 9 : 8)
        .fillColor(textColor)
        .text(cell, x + 4, y + 6, { width: colWidths[i] - 8 });
      x += colWidths[i];
    });
    y += rowHeight;
  });

  return y + 10;
}

// ============================================================
// NARRATIVE TEXT (mentor's voice — first person, NO AI mention)
// ============================================================
export function addNarrative(doc: PDFKit.PDFDocument, y: number, text: string): number {
  if (y > doc.page.height - 150) {
    doc.addPage();
    y = 50;
  }
  // Light background card
  doc.font("Helvetica").fontSize(10);
  const textHeight = doc.heightOfString(text, { width: doc.page.width - 120 });
  doc.roundedRect(50, y, doc.page.width - 100, textHeight + 20, 4).fill(LIGHT_BG);
  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor("#374151")
    .text(text, 60, y + 10, { width: doc.page.width - 120 });
  return y + textHeight + 35;
}

// ============================================================
// ACTION PLAN (checklist style)
// ============================================================
export function addActionPlan(
  doc: PDFKit.PDFDocument,
  y: number,
  title: string,
  items: Array<{ text: string; priority?: "alta" | "media" | "baixa" }>
): number {
  if (y > doc.page.height - 100) {
    doc.addPage();
    y = 50;
  }

  // Title
  doc.font("Helvetica-Bold").fontSize(14).fillColor(NAVY).text(title, 50, y);
  y += 25;

  items.forEach((item, i) => {
    if (y > doc.page.height - 60) {
      doc.addPage();
      y = 50;
    }

    const priorityColor = item.priority === "alta" ? RED : item.priority === "media" ? AMBER : GREEN;

    // Numbered circle
    doc.circle(62, y + 7, 10).fill(GOLD);
    doc
      .font("Helvetica-Bold")
      .fontSize(9)
      .fillColor(WHITE)
      .text(String(i + 1), 57, y + 3);

    // Text
    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor(NAVY)
      .text(item.text, 80, y, { width: doc.page.width - 150 });

    // Priority badge
    if (item.priority) {
      const badgeX = doc.page.width - 100;
      doc.roundedRect(badgeX, y, 50, 16, 3).fill(priorityColor);
      doc
        .font("Helvetica-Bold")
        .fontSize(7)
        .fillColor(WHITE)
        .text(item.priority.toUpperCase(), badgeX + 5, y + 4);
    }

    y += 30;
  });

  return y;
}

// ============================================================
// CLOSING PAGE
// ============================================================
export function addClosingPage(
  doc: PDFKit.PDFDocument,
  options: PdfOptions & { proximosPassos?: string[] }
) {
  doc.addPage();

  // Gold accent bar at bottom
  doc.rect(0, doc.page.height - 80, doc.page.width, 80).fill(NAVY);

  doc.font("Helvetica-Bold").fontSize(24).fillColor(NAVY).text("Próximos Passos", 50, 80);

  let y = 120;
  if (options.proximosPassos) {
    options.proximosPassos.forEach((passo, i) => {
      doc
        .font("Helvetica")
        .fontSize(11)
        .fillColor(NAVY)
        .text(`${i + 1}. ${passo}`, 60, y);
      y += 25;
    });
  }

  // Footer
  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor(WHITE)
    .text(`MedMentoring • ${options.data}`, 50, doc.page.height - 50, {
      width: doc.page.width - 100,
      align: "center",
    });
}

// ============================================================
// GAUGE CHART (score visualization) — simple arc drawing
// ============================================================
// ============================================================
// BULLET LIST (colored accent)
// ============================================================
export function addBulletList(
  doc: PDFKit.PDFDocument,
  y: number,
  items: string[],
  options?: { accentColor?: string }
): number {
  const accent = options?.accentColor ?? GOLD;

  items.forEach((item) => {
    if (y > doc.page.height - 60) {
      doc.addPage();
      y = 50;
    }

    // Colored bullet
    doc.circle(60, y + 5, 4).fill(accent);

    // Text
    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor(NAVY)
      .text(item, 72, y, { width: doc.page.width - 140 });

    const textH = doc.heightOfString(item, { width: doc.page.width - 140 });
    y += Math.max(textH + 8, 20);
  });

  return y + 5;
}

// ============================================================
// GENERATE REPORT PDF — Replaces Puppeteer HTML-to-PDF
// ============================================================
export interface ReportPdfOptions {
  menteeName: string;
  menteeSpecialty?: string;
  pillarId: number;
  pillarName: string;
  title: string;
  subtitle: string;
  executiveSummary: string;
  strengths: string[];
  attentionPoints: string[];
  actionPlan: Array<{
    action: string;
    deadline: string;
    expectedResult: string;
    priority: string;
  }>;
  conclusions: string;
  suggestions?: Array<{ texto: string; concluida: boolean }>;
  partAnalyses?: Array<{ partLabel: string; conteudo: string }>;
  mentorConclusions?: Record<string, unknown>;
}

export function generateReportPdf(options: ReportPdfOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const dataStr = new Date().toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });

      const pdfOpts: PdfOptions = {
        menteeNome: options.menteeName,
        titulo: options.title,
        subtitulo: options.subtitle,
        data: dataStr,
      };

      const doc = createPremiumPdf(pdfOpts);
      const chunks: Buffer[] = [];
      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      // 1. Cover page
      addCoverPage(doc, pdfOpts);

      // 2. Resumo Executivo
      if (options.executiveSummary) {
        let y = addSectionPage(doc, "Resumo Executivo", options.pillarName);
        y = addNarrative(doc, y, options.executiveSummary);
      }

      // 3. Pontos Fortes (green accent)
      if (options.strengths.length > 0) {
        let y = addSectionPage(doc, "Pontos Fortes");
        y = addBulletList(doc, y, options.strengths, { accentColor: GREEN });
      }

      // 4. Pontos de Atencao (amber accent)
      if (options.attentionPoints.length > 0) {
        let y = addSectionPage(doc, "Pontos de Atenção");
        y = addBulletList(doc, y, options.attentionPoints, { accentColor: AMBER });
      }

      // 5. Plano de Acao (table)
      if (options.actionPlan.length > 0) {
        let y = addSectionPage(doc, "Plano de Ação");
        const tableW = doc.page.width - 100;
        const colWidths = [tableW * 0.38, tableW * 0.15, tableW * 0.32, tableW * 0.15];
        const rows = options.actionPlan.map((a) => [
          a.action,
          a.deadline,
          a.expectedResult,
          a.priority,
        ]);
        y = addTable(doc, y, ["Ação", "Prazo", "Resultado Esperado", "Prioridade"], rows, {
          colWidths,
        });
      }

      // 6. Conclusoes
      if (options.conclusions) {
        let y = addSectionPage(doc, "Conclusões");
        y = addNarrative(doc, y, options.conclusions);
      }

      // 7. Part analyses (if any)
      if (options.partAnalyses && options.partAnalyses.length > 0) {
        options.partAnalyses.forEach((part) => {
          if (part.conteudo) {
            let y = addSectionPage(doc, part.partLabel);
            y = addNarrative(doc, y, part.conteudo);
          }
        });
      }

      // 8. Closing page with next steps from action plan
      const proximosPassos = options.actionPlan
        .filter((a) => a.priority === "alta" || a.priority === "média")
        .slice(0, 5)
        .map((a) => `${a.action} (prazo: ${a.deadline})`);

      if (proximosPassos.length === 0 && options.actionPlan.length > 0) {
        // fallback: use all actions
        proximosPassos.push(
          ...options.actionPlan.slice(0, 5).map((a) => `${a.action} (prazo: ${a.deadline})`)
        );
      }

      addClosingPage(doc, { ...pdfOpts, proximosPassos });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

export function addScoreGauge(
  doc: PDFKit.PDFDocument,
  y: number,
  score: number,
  label: string
): number {
  const centerX = doc.page.width / 2;
  const radius = 60;

  // Background arc (light gray)
  doc.save();
  doc.lineWidth(12).strokeColor(LIGHT_GRAY);
  const startAngle = Math.PI;
  const endAngle = 2 * Math.PI;

  // Draw background semicircle
  let started = false;
  for (let angle = startAngle; angle <= endAngle; angle += 0.02) {
    const xPos = centerX + radius * Math.cos(angle);
    const yPos = y + radius + radius * Math.sin(angle);
    if (!started) {
      doc.moveTo(xPos, yPos);
      started = true;
    } else {
      doc.lineTo(xPos, yPos);
    }
  }
  doc.stroke();

  // Score arc (colored based on score)
  const scoreAngle = startAngle + (score / 100) * Math.PI;
  const scoreColor = score >= 70 ? GREEN : score >= 50 ? AMBER : RED;
  doc.lineWidth(12).strokeColor(scoreColor);
  started = false;
  for (let angle = startAngle; angle <= scoreAngle; angle += 0.02) {
    const xPos = centerX + radius * Math.cos(angle);
    const yPos = y + radius + radius * Math.sin(angle);
    if (!started) {
      doc.moveTo(xPos, yPos);
      started = true;
    } else {
      doc.lineTo(xPos, yPos);
    }
  }
  doc.stroke();
  doc.restore();

  // Score text centered
  doc
    .font("Helvetica-Bold")
    .fontSize(28)
    .fillColor(NAVY)
    .text(`${score.toFixed(1)}%`, centerX - 40, y + radius - 15, { width: 80, align: "center" });
  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor(GRAY)
    .text(label, centerX - 60, y + radius + 15, { width: 120, align: "center" });

  return y + radius * 2 + 40;
}
