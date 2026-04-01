/**
 * Export Router — Exporta todos os dados do banco para migração
 * Rota: GET /api/export/all?secret=JWT_SECRET
 * Protegida por secret para evitar acesso não autorizado
 */
import { Router } from "express";
import { drizzle } from "drizzle-orm/mysql2";
import {
  users,
  mentees,
  pillarAnswers,
  pillarFeedback,
  financialData,
  ivmpData,
  pillarReleases,
  checklistItems,
  materials,
  mentorNotes,
  npsResponses,
  onboardingForms,
  sessionRequests,
  menteeQuestionnaire,
  menteeDocuments,
  pillarConclusions,
  mentorAiChat,
  mentorSuggestions,
  chatConclusions,
  partReleases,
  pillarPartContent,
  pillarReports,
  pillarDiagnostics,
} from "../drizzle/schema";

export const exportRouter = Router();

exportRouter.get("/api/export/all", async (req, res) => {
  const secret = req.query.secret as string;
  if (!secret || secret !== process.env.JWT_SECRET) {
    res.status(403).json({ error: "Unauthorized" });
    return;
  }

  try {
    const db = drizzle(process.env.DATABASE_URL!);

    const data = {
      exportedAt: new Date().toISOString(),
      users: await db.select().from(users),
      mentees: await db.select().from(mentees),
      pillarAnswers: await db.select().from(pillarAnswers),
      pillarFeedback: await db.select().from(pillarFeedback),
      financialData: await db.select().from(financialData),
      ivmpData: await db.select().from(ivmpData),
      pillarReleases: await db.select().from(pillarReleases),
      checklistItems: await db.select().from(checklistItems),
      materials: await db.select().from(materials),
      mentorNotes: await db.select().from(mentorNotes),
      npsResponses: await db.select().from(npsResponses),
      onboardingForms: await db.select().from(onboardingForms),
      sessionRequests: await db.select().from(sessionRequests),
      menteeQuestionnaire: await db.select().from(menteeQuestionnaire),
      menteeDocuments: await db.select().from(menteeDocuments),
      pillarConclusions: await db.select().from(pillarConclusions),
      mentorAiChat: await db.select().from(mentorAiChat),
      mentorSuggestions: await db.select().from(mentorSuggestions),
      chatConclusions: await db.select().from(chatConclusions),
      partReleases: await db.select().from(partReleases),
      pillarPartContent: await db.select().from(pillarPartContent),
      pillarReports: await db.select().from(pillarReports),
      pillarDiagnostics: await db.select().from(pillarDiagnostics),
    };

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", "attachment; filename=medmentoring-export.json");
    res.json(data);
  } catch (error) {
    console.error("[Export] Failed:", error);
    res.status(500).json({ error: "Export failed", details: String(error) });
  }
});
