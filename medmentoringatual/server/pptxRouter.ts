import { Router } from "express";
import { sdk } from "./_core/sdk";
import { getMenteeById, getPillarFeedback, getSimulationData } from "./db";
import { generateConsultationPptx } from "./pptxGenerator";

export const pptxRouter = Router();

async function authenticateMentor(req: any) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (user && user.role === "admin") return user;
    return null;
  } catch {
    return null;
  }
}

// GET /api/pptx/:menteeId/consultation
pptxRouter.get("/api/pptx/:menteeId/consultation", async (req, res) => {
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

    // Load consultation protocol from pillar 7 (dbPillarId for Pilar 6)
    const feedback = await getPillarFeedback(menteeId, 7);
    const toolData = (feedback?.toolDataJson as Record<string, unknown>) || {};
    const phases = (toolData.consultationProtocol as any[]) || [];

    // Load products from simulation data
    const simData = await getSimulationData(menteeId);
    const products = (simData?.servicos || []).map((s: any) => ({
      nome: s.nome || "",
      paraQuem: s.paraQuem || "",
      oQueInclui: s.oQueInclui || "",
      formato: s.formato || "",
      duracao: s.duracao || (s.duracaoHoras ? `${s.duracaoHoras}h` : ""),
      precoSugerido: s.precoSugerido || (s.precoVenda ? `R$ ${s.precoVenda}` : ""),
    }));

    const buffer = await generateConsultationPptx({
      mentorName: "Carlos Trindade",
      menteeName: mentee.nome || "Mentorado",
      specialty: mentee.especialidade || undefined,
      phases,
      products,
    });

    const filename = `protocolo-consulta-${(mentee.nome || "mentorado").replace(/\s+/g, "-").toLowerCase()}.pptx`;
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.presentationml.presentation");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (err) {
    console.error("Erro ao gerar PPTX:", err);
    res.status(500).json({ error: "Erro ao gerar apresentacao" });
  }
});
