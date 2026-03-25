import { Router } from "express";
import { sdk } from "./_core/sdk";
import { getDb } from "./db";
import { pillarConclusions, users, mentees } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { generatePillarConclusionsPDF } from "./pdfGenerator";
import {
  createPremiumPdf,
  addCoverPage,
  addSectionPage,
  addKpiCards,
  addNarrative,
  addClosingPage,
  type PdfOptions,
} from "./pdfPremium";

export const pdfRouter = Router();

// GET /api/pdf/pilar-conclusoes/:menteeId/:pillarId
pdfRouter.get("/api/pdf/pilar-conclusoes/:menteeId/:pillarId", async (req, res) => {
  try {
    // Verifica autenticação (somente mentor/admin)
    let user: Awaited<ReturnType<typeof sdk.authenticateRequest>> | null = null;
    try {
      user = await sdk.authenticateRequest(req);
    } catch {
      user = null;
    }
    if (!user || user.role !== "admin") {
      res.status(403).json({ error: "Acesso negado" });
      return;
    }

    const menteeId = parseInt(req.params.menteeId);
    const pillarId = parseInt(req.params.pillarId);

    if (isNaN(menteeId) || isNaN(pillarId)) {
      res.status(400).json({ error: "Parâmetros inválidos" });
      return;
    }

    const db = await getDb();
    if (!db) {
      res.status(500).json({ error: "Erro de conexão com o banco de dados" });
      return;
    }

    // Busca as conclusões
    const [conclusion] = await db
      .select()
      .from(pillarConclusions)
      .where(
        and(
          eq(pillarConclusions.menteeId, menteeId),
          eq(pillarConclusions.pillarId, pillarId)
        )
      )
      .limit(1);

    if (!conclusion || !conclusion.conclusoesJson) {
      res.status(404).json({ error: "Conclusões não encontradas. Gere as conclusões primeiro." });
      return;
    }

    // Busca dados do mentorado
    const [mentee] = await db
      .select()
      .from(mentees)
      .where(eq(mentees.id, menteeId))
      .limit(1);

    // Busca dados do mentor (owner)
    const [mentor] = await db
      .select()
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    const menteeName = mentee?.nome ?? "Mentorado";
    const menteeSpecialty = mentee?.especialidade ?? undefined;
    const mentorName = mentor?.name ?? "Dr. Carlos Trindade";

    // Gera o PDF
    const pdfBuffer = await generatePillarConclusionsPDF({
      menteeName,
      menteeSpecialty,
      mentorName,
      pillarId,
      conclusoesJson: conclusion.conclusoesJson as Record<string, unknown>,
      generatedAt: new Date(),
    });

    const pillarTitles: Record<number, string> = {
      1: "Identidade-e-Proposito",
      2: "Posicionamento",
      3: "Diagnostico-Financeiro",
      4: "Processos-e-Gestao",
      5: "Precificacao",
      6: "Marketing-e-Comunicacao",
      7: "Vendas-e-Conversao",
    };

    const fileName = `ITCmentor_Pilar${pillarId}_${pillarTitles[pillarId] ?? "Conclusoes"}_${menteeName.replace(/\s+/g, "-")}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.setHeader("Content-Length", pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (err) {
    console.error("[PDF] Error generating PDF:", err);
    res.status(500).json({ error: "Erro ao gerar PDF" });
  }
});

// ============================================================
// PREMIUM PDF ROUTES
// ============================================================

const PILLAR_TITLES_PT: Record<number, string> = {
  1: "Identidade e Propósito",
  2: "Posicionamento",
  3: "Diagnóstico Financeiro",
  4: "Processos e Gestão",
  5: "Precificação",
  6: "Marketing e Comunicação",
  7: "Vendas e Conversão",
};

/** Helper: authenticate mentor (admin role) */
async function authenticateMentor(req: any) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (user && user.role === "admin") return user;
    return null;
  } catch {
    return null;
  }
}

/** Helper: collect a premium PDF document into a Buffer */
function pdfToBuffer(doc: PDFKit.PDFDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
}

/** Format date in Brazilian Portuguese */
function formatDateBR(d: Date): string {
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

// GET /api/pdf/premium/:menteeId/:pillarId/:partId
pdfRouter.get("/api/pdf/premium/:menteeId/:pillarId/:partId", async (req, res) => {
  try {
    const user = await authenticateMentor(req);
    if (!user) {
      res.status(403).json({ error: "Acesso negado" });
      return;
    }

    const menteeId = parseInt(req.params.menteeId);
    const pillarId = parseInt(req.params.pillarId);
    const partId = parseInt(req.params.partId);

    if (isNaN(menteeId) || isNaN(pillarId) || isNaN(partId)) {
      res.status(400).json({ error: "Parâmetros inválidos" });
      return;
    }

    const db = await getDb();
    if (!db) {
      res.status(500).json({ error: "Erro de conexão com o banco de dados" });
      return;
    }

    // Busca dados do mentorado
    const [mentee] = await db
      .select()
      .from(mentees)
      .where(eq(mentees.id, menteeId))
      .limit(1);

    if (!mentee) {
      res.status(404).json({ error: "Mentorado não encontrado" });
      return;
    }

    // Busca dados do mentor
    const [mentor] = await db
      .select()
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    // Busca conclusões do pilar (se existirem)
    const [conclusion] = await db
      .select()
      .from(pillarConclusions)
      .where(
        and(
          eq(pillarConclusions.menteeId, menteeId),
          eq(pillarConclusions.pillarId, pillarId)
        )
      )
      .limit(1);

    const menteeName = mentee.nome ?? "Mentorado";
    const mentorName = mentor?.name ?? "Dr. Carlos Trindade";
    const pillarTitle = PILLAR_TITLES_PT[pillarId] ?? `Pilar ${pillarId}`;
    const dataFormatada = formatDateBR(new Date());

    const pdfOptions: PdfOptions = {
      menteeNome: menteeName,
      mentorNome: mentorName,
      titulo: pillarTitle,
      subtitulo: `Parte ${partId}`,
      data: dataFormatada,
    };

    // Create premium PDF
    const doc = createPremiumPdf(pdfOptions);
    const bufferPromise = pdfToBuffer(doc);

    // Cover page
    addCoverPage(doc, pdfOptions);

    // Content section
    const y = addSectionPage(doc, pillarTitle, `Parte ${partId} — Análise personalizada`);

    // Add narrative text from mentor's perspective (first person, no AI mention)
    addNarrative(
      doc,
      y,
      `${menteeName}, preparei esta análise com base nas nossas sessões de mentoria. ` +
        `Aqui estão os pontos que identifiquei como mais relevantes para o seu desenvolvimento ` +
        `em ${pillarTitle}. Vamos trabalhar juntos nesses aspectos nas próximas etapas.`
    );

    // If we have conclusion data, render it
    if (conclusion?.conclusoesJson) {
      const conclusoesData = conclusion.conclusoesJson as Record<string, unknown>;
      const publicEntries = Object.entries(conclusoesData).filter(
        ([key]) => key !== "recomendacao_mentor"
      );

      let currentY = addSectionPage(doc, "Análise Detalhada", "Pontos identificados na mentoria");

      for (const [, val] of publicEntries) {
        if (Array.isArray(val)) {
          for (const item of val as string[]) {
            if (!item?.trim()) continue;
            currentY = addNarrative(doc, currentY, item);
          }
        } else if (typeof val === "string" && val.trim()) {
          currentY = addNarrative(doc, currentY, val);
        }
      }
    }

    // Closing page
    addClosingPage(doc, {
      ...pdfOptions,
      proximosPassos: [
        "Revisar os pontos levantados neste documento",
        "Aplicar as recomendações no dia a dia do consultório",
        "Trazer dúvidas e resultados para a próxima sessão de mentoria",
      ],
    });

    doc.end();

    const pdfBuffer = await bufferPromise;
    const fileName = `MedMentoring_${pillarTitle.replace(/\s+/g, "-")}_Parte${partId}_${menteeName.replace(/\s+/g, "-")}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.setHeader("Content-Length", pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (err) {
    console.error("[PDF Premium] Error generating PDF:", err);
    res.status(500).json({ error: "Erro ao gerar PDF premium" });
  }
});

// GET /api/pdf/premium/:menteeId/cumulative
pdfRouter.get("/api/pdf/premium/:menteeId/cumulative", async (req, res) => {
  try {
    const user = await authenticateMentor(req);
    if (!user) {
      res.status(403).json({ error: "Acesso negado" });
      return;
    }

    const menteeId = parseInt(req.params.menteeId);

    if (isNaN(menteeId)) {
      res.status(400).json({ error: "Parâmetros inválidos" });
      return;
    }

    const db = await getDb();
    if (!db) {
      res.status(500).json({ error: "Erro de conexão com o banco de dados" });
      return;
    }

    // Busca dados do mentorado
    const [mentee] = await db
      .select()
      .from(mentees)
      .where(eq(mentees.id, menteeId))
      .limit(1);

    if (!mentee) {
      res.status(404).json({ error: "Mentorado não encontrado" });
      return;
    }

    // Busca dados do mentor
    const [mentor] = await db
      .select()
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    // Busca todas as conclusões do mentorado
    const conclusions = await db
      .select()
      .from(pillarConclusions)
      .where(eq(pillarConclusions.menteeId, menteeId));

    const menteeName = mentee.nome ?? "Mentorado";
    const mentorName = mentor?.name ?? "Dr. Carlos Trindade";
    const dataFormatada = formatDateBR(new Date());

    const pdfOptions: PdfOptions = {
      menteeNome: menteeName,
      mentorNome: mentorName,
      titulo: "Relatório Cumulativo de Mentoria",
      subtitulo: "Visão completa do progresso",
      data: dataFormatada,
    };

    // Create premium PDF
    const doc = createPremiumPdf(pdfOptions);
    const bufferPromise = pdfToBuffer(doc);

    // Cover page
    addCoverPage(doc, pdfOptions);

    // Summary section with KPI cards
    let y = addSectionPage(doc, "Visão Geral", "Resumo do progresso na mentoria");

    const completedPillars = conclusions.filter((c) => c.conclusoesJson).length;
    y = addKpiCards(doc, y, [
      { label: "Pilares Concluídos", value: `${completedPillars}/7`, color: completedPillars >= 5 ? "#059669" : "#d97706" },
      { label: "Mentorado", value: menteeName },
      { label: "Data do Relatório", value: dataFormatada },
    ]);

    y = addNarrative(
      doc,
      y,
      `${menteeName}, este relatório consolida todo o trabalho que realizamos juntos até o momento. ` +
        `Cada pilar representa uma área fundamental para o sucesso da sua prática médica, ` +
        `e aqui você encontrará um resumo das principais conclusões e recomendações que elaborei para você.`
    );

    // One section per completed pillar
    for (const conclusion of conclusions) {
      if (!conclusion.conclusoesJson) continue;

      const pillarTitle = PILLAR_TITLES_PT[conclusion.pillarId] ?? `Pilar ${conclusion.pillarId}`;
      let sectionY = addSectionPage(doc, pillarTitle, "Conclusões e recomendações");

      const conclusoesData = conclusion.conclusoesJson as Record<string, unknown>;
      const publicEntries = Object.entries(conclusoesData).filter(
        ([key]) => key !== "recomendacao_mentor"
      );

      for (const [, val] of publicEntries) {
        if (Array.isArray(val)) {
          for (const item of val as string[]) {
            if (!item?.trim()) continue;
            sectionY = addNarrative(doc, sectionY, item);
          }
        } else if (typeof val === "string" && val.trim()) {
          sectionY = addNarrative(doc, sectionY, val);
        }
      }
    }

    // Closing page
    addClosingPage(doc, {
      ...pdfOptions,
      proximosPassos: [
        "Revisar as conclusões de cada pilar com atenção",
        "Priorizar as ações de maior impacto para sua prática",
        "Definir metas e prazos para implementação",
        "Acompanhar os resultados nas próximas sessões de mentoria",
      ],
    });

    doc.end();

    const pdfBuffer = await bufferPromise;
    const fileName = `MedMentoring_Relatorio-Cumulativo_${menteeName.replace(/\s+/g, "-")}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.setHeader("Content-Length", pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (err) {
    console.error("[PDF Premium] Error generating cumulative PDF:", err);
    res.status(500).json({ error: "Erro ao gerar PDF cumulativo" });
  }
});
