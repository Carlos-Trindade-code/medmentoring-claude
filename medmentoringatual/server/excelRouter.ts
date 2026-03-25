import { Router } from "express";
import { sdk } from "./_core/sdk";
import { generateExpenseExcel, generateIvmpExcel, generatePricingExcel, generatePillarCompleteExcel } from "./excelGenerator";
import {
  getExpenseData, getIvmpAnswers, getSimulationData, getMenteeById,
  getPillarAnswers, getPillarFeedback, getMentorSuggestions, getMentorNote,
} from "./db";
import { calculateSimulation } from "../shared/pricing-model";

export const excelRouter = Router();

/** Helper: authenticate mentor (admin role) — same pattern as pdfRouter */
async function authenticateMentor(req: any) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (user && user.role === "admin") return user;
    return null;
  } catch {
    return null;
  }
}

// GET /api/excel/:menteeId/expenses
excelRouter.get("/api/excel/:menteeId/expenses", async (req, res) => {
  try {
    const user = await authenticateMentor(req);
    if (!user) {
      res.status(403).json({ error: "Acesso negado" });
      return;
    }

    const menteeId = parseInt(req.params.menteeId);
    if (isNaN(menteeId)) {
      res.status(400).json({ error: "Parametros invalidos" });
      return;
    }

    const mentee = await getMenteeById(menteeId);
    if (!mentee) {
      res.status(404).json({ error: "Mentorado nao encontrado" });
      return;
    }

    const data = await getExpenseData(menteeId);
    if (!data || !data.expenses) {
      res.status(404).json({ error: "Dados nao encontrados" });
      return;
    }

    const buffer = generateExpenseExcel(data.expenses, data.mapaSala, data.mapaSala?.faturamentoMensal);
    const fileName = `despesas_${(mentee.nome || "mentorado").replace(/\s+/g, "_").replace(/[^\w_-]/g, "")}.xlsx`;

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.setHeader("Content-Length", buffer.length);
    res.send(buffer);
  } catch (err) {
    console.error("[Excel] Error generating expense Excel:", err);
    res.status(500).json({ error: "Erro ao gerar Excel de despesas" });
  }
});

// GET /api/excel/:menteeId/ivmp
excelRouter.get("/api/excel/:menteeId/ivmp", async (req, res) => {
  try {
    const user = await authenticateMentor(req);
    if (!user) {
      res.status(403).json({ error: "Acesso negado" });
      return;
    }

    const menteeId = parseInt(req.params.menteeId);
    if (isNaN(menteeId)) {
      res.status(400).json({ error: "Parametros invalidos" });
      return;
    }

    const mentee = await getMenteeById(menteeId);
    if (!mentee) {
      res.status(404).json({ error: "Mentorado nao encontrado" });
      return;
    }

    const data = await getIvmpAnswers(menteeId);
    if (!data || !data.answers) {
      res.status(404).json({ error: "Dados nao encontrados" });
      return;
    }

    const buffer = generateIvmpExcel(data.answers);
    const fileName = `ivmp_${(mentee.nome || "mentorado").replace(/\s+/g, "_").replace(/[^\w_-]/g, "")}.xlsx`;

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.setHeader("Content-Length", buffer.length);
    res.send(buffer);
  } catch (err) {
    console.error("[Excel] Error generating iVMP Excel:", err);
    res.status(500).json({ error: "Erro ao gerar Excel do iVMP" });
  }
});

// GET /api/excel/:menteeId/pricing
excelRouter.get("/api/excel/:menteeId/pricing", async (req, res) => {
  try {
    const user = await authenticateMentor(req);
    if (!user) {
      res.status(403).json({ error: "Acesso negado" });
      return;
    }

    const menteeId = parseInt(req.params.menteeId);
    if (isNaN(menteeId)) {
      res.status(400).json({ error: "Parametros invalidos" });
      return;
    }

    const mentee = await getMenteeById(menteeId);
    if (!mentee) {
      res.status(404).json({ error: "Mentorado nao encontrado" });
      return;
    }

    const data = await getSimulationData(menteeId);
    if (!data) {
      res.status(404).json({ error: "Dados nao encontrados" });
      return;
    }

    let simResult = null;
    if (data.params && data.servicos && data.servicos.length > 0) {
      simResult = calculateSimulation({
        ...data.params,
        servicos: data.servicos,
        mixAtendimentos: data.mixAtendimentos,
      });
    }

    const buffer = generatePricingExcel(data.servicos, data.mixAtendimentos, simResult);
    const fileName = `precificacao_${(mentee.nome || "mentorado").replace(/\s+/g, "_").replace(/[^\w_-]/g, "")}.xlsx`;

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.setHeader("Content-Length", buffer.length);
    res.send(buffer);
  } catch (err) {
    console.error("[Excel] Error generating pricing Excel:", err);
    res.status(500).json({ error: "Erro ao gerar Excel de precificacao" });
  }
});

const PILLAR_NAMES: Record<number, string> = {
  1: "Identidade-e-Proposito",
  2: "Posicionamento-e-Especializacao",
  3: "Financas-e-Precificacao",
  4: "Estrutura-Operacional",
  5: "Engenharia-de-Precos",
  6: "Marketing-Digital",
  7: "Conversao-e-Vendas",
};

// GET /api/excel/:menteeId/pillar/:pillarId/complete
excelRouter.get("/api/excel/:menteeId/pillar/:pillarId/complete", async (req, res) => {
  try {
    const user = await authenticateMentor(req);
    if (!user) {
      res.status(403).json({ error: "Acesso negado" });
      return;
    }

    const menteeId = parseInt(req.params.menteeId);
    const pillarId = parseInt(req.params.pillarId);
    if (isNaN(menteeId) || isNaN(pillarId) || pillarId < 1 || pillarId > 7) {
      res.status(400).json({ error: "Parametros invalidos" });
      return;
    }

    const mentee = await getMenteeById(menteeId);
    if (!mentee) {
      res.status(404).json({ error: "Mentorado nao encontrado" });
      return;
    }

    // Fetch all pillar data in parallel
    const [answers, feedback, suggestions, mentorNote] = await Promise.all([
      getPillarAnswers(menteeId, pillarId),
      getPillarFeedback(menteeId, pillarId),
      getMentorSuggestions(menteeId, pillarId),
      getMentorNote(menteeId, pillarId),
    ]);

    const pillarName = PILLAR_NAMES[pillarId] || `Pilar-${pillarId}`;

    const buffer = generatePillarCompleteExcel({
      pillarId,
      pillarName,
      answers: answers || [],
      feedback,
      suggestions: suggestions || [],
      mentorNote: mentorNote?.conteudo || null,
    });

    const safeName = (mentee.nome || "mentorado").replace(/\s+/g, "_").replace(/[^\w_-]/g, "");
    const fileName = `pilar${pillarId}_${pillarName}_${safeName}.xlsx`;

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.setHeader("Content-Length", buffer.length);
    res.send(buffer);
  } catch (err) {
    console.error("[Excel] Error generating pillar complete Excel:", err);
    res.status(500).json({ error: "Erro ao gerar Excel completo do pilar" });
  }
});
