/**
 * reportPdfRouter — Gera PDF do Relatório Final Premium usando Puppeteer
 *
 * GET /api/report/pdf/:menteeId/:pillarId
 *   - Mentor: acesso direto (admin)
 *   - Mentorado: acesso via cookie de sessão do mentorado (status must be "released")
 */
import { Router } from "express";
import { sdk } from "./_core/sdk";
import { getDb, getPillarAnswers, getPillarFeedback, getFinancialData, getIvmpData } from "./db";
import { pillarReports, mentees } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { generateReportPdf } from "./pdfPremium";

export const reportPdfRouter = Router();

const PILLAR_NAMES: Record<number, string> = {
  1: "Identidade-e-Proposito",
  2: "Posicionamento-e-Especializacao",
  3: "Financas-e-Precificacao",
  4: "Estrutura-Operacional",
  5: "Engenharia-de-Precos",
  6: "Marketing-Digital",
  7: "Conversao-e-Vendas",
};

/**
 * GET /api/report/pdf/:menteeId/:pillarId
 * Gera e retorna o PDF do relatório final premium do pilar.
 * Acesso: mentor (admin) ou mentorado autenticado (se relatório liberado).
 */
reportPdfRouter.get("/api/report/pdf/:menteeId/:pillarId", async (req, res) => {
  try {
    const menteeId = parseInt(req.params.menteeId);
    const pillarId = parseInt(req.params.pillarId);

    if (isNaN(menteeId) || isNaN(pillarId)) {
      res.status(400).json({ error: "Parâmetros inválidos" });
      return;
    }

    // Autenticação: mentor (admin) ou mentorado
    let isAdmin = false;
    let isMentee = false;

    try {
      const user = await sdk.authenticateRequest(req);
      if (user && user.role === "admin") {
        isAdmin = true;
      }
    } catch {
      // não é mentor, tenta como mentorado
    }

    if (!isAdmin) {
      // Verifica cookie de mentorado (cookie guarda o menteeId como string)
      const menteeCookieId = req.cookies?.["medmentoring_mentee"];
      if (menteeCookieId && parseInt(menteeCookieId) === menteeId) {
        isMentee = true;
      }
    }

    if (!isAdmin && !isMentee) {
      res.status(403).json({ error: "Acesso negado" });
      return;
    }

    const db = await getDb();
    if (!db) {
      res.status(500).json({ error: "Erro de conexão com o banco de dados" });
      return;
    }

    // Busca o relatório
    const [report] = await db
      .select()
      .from(pillarReports)
      .where(
        and(
          eq(pillarReports.menteeId, menteeId),
          eq(pillarReports.pillarId, pillarId)
        )
      )
      .limit(1);

    if (!report) {
      res.status(404).json({ error: "Relatório não encontrado. Gere o relatório primeiro." });
      return;
    }

    // Mentorado só pode baixar se o relatório foi liberado
    if (isMentee && report.status !== "released") {
      res.status(403).json({ error: "Relatório ainda não liberado pelo mentor." });
      return;
    }

    if (!report.htmlContent) {
      res.status(404).json({ error: "Conteúdo do relatório não disponível." });
      return;
    }

    // Busca nome do mentorado para o nome do arquivo
    const [mentee] = await db
      .select()
      .from(mentees)
      .where(eq(mentees.id, menteeId))
      .limit(1);

    const menteeName = (mentee?.nome ?? "Mentorado").replace(/\s+/g, "-");
    const pillarName = PILLAR_NAMES[pillarId] ?? `Pilar-${pillarId}`;
    const fileName = `MedMentoring_Pilar${pillarId}-${pillarName}_${menteeName}.pdf`;

    // Parse stored JSON fields
    const strengths: string[] = JSON.parse(report.strengthsJson ?? "[]");
    const attentionPoints: string[] = JSON.parse(report.attentionJson ?? "[]");
    const actionPlan = JSON.parse(report.actionPlanJson ?? "[]");
    const suggestions = JSON.parse(report.suggestionsJson ?? "[]");

    // Fetch extra data for new PDF sections
    const answers = await getPillarAnswers(menteeId, pillarId);
    const feedback = await getPillarFeedback(menteeId, pillarId);
    const financialDataRow = await getFinancialData(menteeId);
    const ivmpDataRow = await getIvmpData(menteeId);

    // Gera PDF com PDFKit
    const pdfBuffer = await generateReportPdf({
      menteeName: mentee?.nome ?? "Mentorado",
      pillarId,
      pillarName: (PILLAR_NAMES[pillarId] ?? `Pilar-${pillarId}`).replace(/-/g, " "),
      title: report.title ?? `Relatório — Pilar ${pillarId}`,
      subtitle: report.subtitle ?? "",
      executiveSummary: report.executiveSummary ?? "",
      strengths,
      attentionPoints,
      actionPlan,
      conclusions: report.conclusionsText ?? "",
      suggestions,
      menteeAnswers: answers.map(a => ({
        secao: a.secao,
        respostas: Array.isArray(a.respostas) ? a.respostas as any : [],
        status: a.status,
      })),
      financialData: financialDataRow ? {
        expenses: financialDataRow.despesasJson ? (typeof financialDataRow.despesasJson === 'string' ? JSON.parse(financialDataRow.despesasJson) : financialDataRow.despesasJson) as Record<string, number> : undefined,
        mapaSala: financialDataRow.mapaSalaJson ? (typeof financialDataRow.mapaSalaJson === 'string' ? JSON.parse(financialDataRow.mapaSalaJson) : financialDataRow.mapaSalaJson) as Record<string, unknown> : undefined,
        pricing: financialDataRow.precificacaoJson ? (typeof financialDataRow.precificacaoJson === 'string' ? JSON.parse(financialDataRow.precificacaoJson) : financialDataRow.precificacaoJson) : undefined,
      } : null,
      ivmpData: ivmpDataRow ? {
        categories: ivmpDataRow.categoriesJson ? (typeof ivmpDataRow.categoriesJson === 'string' ? JSON.parse(ivmpDataRow.categoriesJson) : ivmpDataRow.categoriesJson) as Record<string, number> : undefined,
        ivmpFinal: ivmpDataRow.ivmpFinal != null ? Number(ivmpDataRow.ivmpFinal) : undefined,
      } : null,
      mentorFeedback: feedback ? {
        feedbackText: feedback.feedback ?? undefined,
        pontosFortesJson: feedback.pontosFortesJson ?? undefined,
        pontosMelhoriaJson: feedback.pontosMelhoriaJson ?? undefined,
        planoAcao: feedback.planoAcao ?? undefined,
      } : null,
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${fileName}"`
    );
    res.setHeader("Content-Length", pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (err) {
    console.error("[Report PDF] Error generating PDF:", err);
    res.status(500).json({ error: "Erro ao gerar PDF do relatório" });
  }
});
