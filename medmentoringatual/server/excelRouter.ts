import { Router } from "express";
import { sdk } from "./_core/sdk";
import { generateExpenseExcel, generateIvmpExcel, generatePricingExcel } from "./excelGenerator";
import { getExpenseData, getIvmpAnswers, getSimulationData, getMenteeById } from "./db";
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
