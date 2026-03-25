/**
 * pillarReportRouter — Gerador de relatórios finais premium por pilar
 * Mentor gera, edita, pré-visualiza e libera. Mentorado baixa após liberação.
 * Inclui: análises por parte, diagnóstico IA, análise IA, conclusões do mentor, checklist.
 */
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { notifyOwner } from "../_core/notification";
import { invokeLLM } from "../_core/llm";
import {
  getMenteeById,
  getPillarAnswers,
  getPillarConclusion,
  getMentorSuggestions,
  getMentorAiChatHistory,
  getPillarFeedback,
  getPillarPartContent,
  getDb,
} from "../db";
import { generatePillarReportHtml, PILLAR_THEMES, PartAnalysis, DiagnosisData } from "../reportGenerator";
import { pillarReports, mentees } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import {
  generateReportPdf,
  createPremiumPdf,
  addCoverPage,
  addSectionPage,
  addNarrative,
  addBulletList,
  addActionPlan,
  addClosingPage,
  addTable,
} from "../pdfPremium";

// ── DB helpers for pillarReports ──
async function getPillarReport(menteeId: number, pillarId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(pillarReports)
    .where(and(eq(pillarReports.menteeId, menteeId), eq(pillarReports.pillarId, pillarId)));
  return rows[0] ?? null;
}

async function getAllPillarReports(menteeId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(pillarReports)
    .where(eq(pillarReports.menteeId, menteeId));
}

async function upsertPillarReport(
  menteeId: number,
  pillarId: number,
  data: Partial<Omit<typeof pillarReports.$inferInsert, "id" | "menteeId" | "pillarId">>
) {
  const db = await getDb();
  if (!db) return;
  const existing = await getPillarReport(menteeId, pillarId);
  if (existing) {
    await db.update(pillarReports)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(pillarReports.menteeId, menteeId), eq(pillarReports.pillarId, pillarId)));
  } else {
    await db.insert(pillarReports).values({ menteeId, pillarId, ...data });
  }
}

async function releasePillarReport(menteeId: number, pillarId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(pillarReports)
    .set({ status: "released", releasedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(pillarReports.menteeId, menteeId), eq(pillarReports.pillarId, pillarId)));
}

// ── Final Report types & PDF generator ──
interface FinalReportData {
  menteeName: string;
  menteeSpecialty: string;
  title: string;
  diagnosticoGeral: string;
  principaisConquistas: string[];
  areasTransformacao: string[];
  propostasMelhoria: { proposta: string; area: string; impacto: string; prioridade: string }[];
  proximosPassos: string[];
  mensagemFinal: string;
  pillarSummaries: { pillarId: number; title: string | null; summary: string | null }[];
  totalPillarsCompleted: number;
}

async function generateFinalPdf(data: FinalReportData): Promise<Buffer> {
  const today = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

  const pdfOpts = {
    menteeNome: data.menteeName,
    titulo: data.title,
    subtitulo: `${data.menteeName} — ${data.menteeSpecialty}`,
    data: today,
  };

  const doc = createPremiumPdf(pdfOpts);

  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));

  // Cover page
  addCoverPage(doc, {
    ...pdfOpts,
    subtitulo: `Consolidação de ${data.totalPillarsCompleted} pilares`,
  });

  // Page 2: Diagnóstico Geral
  let y = addSectionPage(doc, "Diagnóstico Geral");
  y = addNarrative(doc, y, data.diagnosticoGeral);

  // Page 3: Resumo dos Pilares
  y = addSectionPage(doc, "Resumo por Pilar");
  for (const p of data.pillarSummaries) {
    if (y > doc.page.height - 120) {
      doc.addPage();
      y = 50;
    }
    doc.font("Helvetica-Bold").fontSize(12).fillColor("#1a2332")
      .text(`Pilar ${p.pillarId}: ${p.title ?? ""}`, 50, y);
    y += 18;
    doc.font("Helvetica").fontSize(10).fillColor("#6b7280")
      .text(p.summary ?? "Sem resumo disponível.", 50, y, { width: doc.page.width - 100 });
    const textH = doc.heightOfString(p.summary ?? "Sem resumo disponível.", { width: doc.page.width - 100 });
    y += textH + 15;
  }

  // Page 4: Principais Conquistas
  y = addSectionPage(doc, "Principais Conquistas");
  y = addBulletList(doc, y, data.principaisConquistas, { accentColor: "#059669" });

  // Page 5: Áreas de Transformação
  y = addSectionPage(doc, "Áreas de Maior Transformação");
  y = addBulletList(doc, y, data.areasTransformacao, { accentColor: "#c9a84c" });

  // Page 6: Propostas de Melhoria
  y = addSectionPage(doc, "Propostas de Melhoria");
  const tableW = doc.page.width - 100;
  const colWidths = [tableW * 0.35, tableW * 0.20, tableW * 0.30, tableW * 0.15];
  const rows = data.propostasMelhoria.map(p => [p.proposta, p.area, p.impacto, p.prioridade]);
  y = addTable(doc, y, ["Proposta", "Área", "Impacto Esperado", "Prioridade"], rows, { colWidths });

  // Page 7: Próximos Passos
  addClosingPage(doc, { ...pdfOpts, proximosPassos: data.proximosPassos });

  // Mensagem final on new page
  doc.addPage();
  doc.font("Helvetica-Bold").fontSize(20).fillColor("#1a2332")
    .text("Mensagem Final", 50, 60);
  doc.moveDown(0.5);
  doc.font("Helvetica").fontSize(11).fillColor("#374151")
    .text(data.mensagemFinal, 50, doc.y, { width: doc.page.width - 100, lineGap: 4 });

  // Footer on last page
  doc.moveDown(3);
  doc.font("Helvetica").fontSize(9).fillColor("#9ca3af")
    .text("Relatório gerado por ITC MedMentoring — Confidencial", 50, doc.page.height - 60, { align: "center", width: doc.page.width - 100 });

  doc.end();

  return new Promise((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });
}

export const pillarReportRouter = router({
  // ── Mentor: gera relatório com IA consolidando todos os dados do pilar ──
  generate: protectedProcedure
    .input(z.object({
      menteeId: z.number(),
      pillarId: z.number().min(1).max(7),
    }))
    .mutation(async ({ input }) => {
      const mentee = await getMenteeById(input.menteeId);
      if (!mentee) throw new Error("Mentorado não encontrado");

      const theme = PILLAR_THEMES[input.pillarId as keyof typeof PILLAR_THEMES];

      // Consolidar todos os dados do pilar
      const answers = await getPillarAnswers(input.menteeId, input.pillarId);
      const conclusion = await getPillarConclusion(input.menteeId, input.pillarId);
      const suggestions = await getMentorSuggestions(input.menteeId, input.pillarId);
      const chatHistory = await getMentorAiChatHistory(input.menteeId, input.pillarId);
      const feedback = await getPillarFeedback(input.menteeId, input.pillarId);
      const partContents = await getPillarPartContent(input.menteeId, input.pillarId);

      const answersContext = answers
        .map((a) => `Seção ${a.secao}: ${JSON.stringify(a.respostas)}`)
        .join("\n");
      const conclusionContext = conclusion?.conclusoesJson ? JSON.stringify(conclusion.conclusoesJson) : "";
      const suggestionsContext = suggestions.map((s) => s.texto).join("; ");
      const chatContext = chatHistory
        .slice(-10)
        .map((m) => `${m.role}: ${m.content}`)
        .join("\n");

      // Diagnóstico de IA salvo
      const diagnosisData = feedback?.aiDiagnosis as DiagnosisData | null;
      const diagnosisContext = diagnosisData
        ? `Diagnóstico IA: ${JSON.stringify(diagnosisData)}`
        : "";

      // Análises por parte salvas
      const partAnalysesContext = (partContents as any[])
        .filter((p: any) => p.conteudo)
        .map((p: any) => `Parte ${p.partId} (${p.partLabel}): ${p.conteudo?.substring(0, 300)}`)
        .join("\n");

      const llmPrompt = `Você é um especialista em mentoria médica. Com base nos dados abaixo do médico ${mentee.nome}, gere um relatório final premium para o Pilar ${input.pillarId} — ${theme.name}.

RESPOSTAS DO MENTORADO:
${answersContext || "Sem respostas registradas."}

DIAGNÓSTICO DE IA:
${diagnosisContext || "Sem diagnóstico gerado."}

ANÁLISES POR PARTE:
${partAnalysesContext || "Sem análises por parte."}

CONCLUSÕES DO MENTOR:
${conclusionContext || "Sem conclusões registradas."}

SUGESTÕES REGISTRADAS:
${suggestionsContext || "Sem sugestões."}

HISTÓRICO DO CHAT DE ORIENTAÇÃO (últimas 10 mensagens):
${chatContext || "Sem histórico."}

Gere um JSON com exatamente estes campos:
- title: título impactante do relatório (máx 60 chars)
- subtitle: foco principal do pilar para este médico (máx 100 chars)
- executiveSummary: parágrafo de 3-4 frases resumindo o diagnóstico e o caminho
- strengths: array de 3-5 pontos fortes identificados (frases completas)
- attentionPoints: array de 3-5 pontos de atenção (frases completas, sem julgamento)
- actionPlan: array de 3-6 ações, cada uma com: action (o que fazer), deadline (prazo ex: "30 dias"), expectedResult (resultado esperado), priority ("alta"|"média"|"baixa")
- conclusions: mensagem final do mentor ao mentorado (2-3 parágrafos motivadores e práticos)`;

      const llmResponse = await invokeLLM({
        messages: [
          {
            role: "system",
            content:
              "Você é especialista em mentoria médica e geração de relatórios executivos premium. Responda APENAS com JSON válido.",
          },
          { role: "user", content: llmPrompt },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "pillar_report",
            strict: true,
            schema: {
              type: "object",
              properties: {
                title: { type: "string" },
                subtitle: { type: "string" },
                executiveSummary: { type: "string" },
                strengths: { type: "array", items: { type: "string" } },
                attentionPoints: { type: "array", items: { type: "string" } },
                actionPlan: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      action: { type: "string" },
                      deadline: { type: "string" },
                      expectedResult: { type: "string" },
                      priority: { type: "string", enum: ["alta", "média", "baixa"] },
                    },
                    required: ["action", "deadline", "expectedResult", "priority"],
                    additionalProperties: false,
                  },
                },
                conclusions: { type: "string" },
              },
              required: [
                "title",
                "subtitle",
                "executiveSummary",
                "strengths",
                "attentionPoints",
                "actionPlan",
                "conclusions",
              ],
              additionalProperties: false,
            },
          },
        },
      });

      const content = llmResponse?.choices?.[0]?.message?.content ?? "{}";
      const parsed = JSON.parse(typeof content === "string" ? content : JSON.stringify(content));

      // Prepara análises por parte para o HTML
      const partAnalyses: PartAnalysis[] = (partContents as any[])
        .filter((p: any) => p.conteudo || p.titulo)
        .map((p: any) => ({
          partId: p.partId,
          partLabel: p.partLabel,
          titulo: p.titulo,
          conteudo: p.conteudo,
          guiaUso: p.guiaUso,
          destaques: Array.isArray(p.destaques) ? p.destaques : [],
          proximosPassos: Array.isArray(p.proximosPassos) ? p.proximosPassos : [],
        }));

      // Conclusões do mentor (pillarConclusions)
      const mentorConclusions = conclusion?.conclusoesJson as Record<string, unknown> | null;

      const htmlContent = generatePillarReportHtml({
        menteeName: mentee.nome,
        menteeSpecialty: mentee.especialidade ?? undefined,
        pillarId: input.pillarId,
        title: parsed.title ?? `Relatório — Pilar ${input.pillarId}`,
        subtitle: parsed.subtitle ?? "",
        executiveSummary: parsed.executiveSummary ?? "",
        strengths: parsed.strengths ?? [],
        attentionPoints: parsed.attentionPoints ?? [],
        actionPlan: parsed.actionPlan ?? [],
        conclusions: parsed.conclusions ?? "",
        suggestions: suggestions.map((s) => ({ texto: s.texto, concluida: s.concluida })),
        generatedAt: new Date(),
        partAnalyses,
        diagnosisData,
        mentorConclusions,
      });

      await upsertPillarReport(input.menteeId, input.pillarId, {
        title: parsed.title,
        subtitle: parsed.subtitle,
        executiveSummary: parsed.executiveSummary,
        strengthsJson: JSON.stringify(parsed.strengths ?? []),
        attentionJson: JSON.stringify(parsed.attentionPoints ?? []),
        actionPlanJson: JSON.stringify(parsed.actionPlan ?? []),
        conclusionsText: parsed.conclusions,
        suggestionsJson: JSON.stringify(
          suggestions.map((s) => ({ texto: s.texto, concluida: s.concluida }))
        ),
        htmlContent,
        status: "draft",
        generatedAt: new Date(),
      });

      return { success: true, title: parsed.title, htmlPreview: htmlContent };
    }),

  // ── Mentor: busca o relatório atual de um pilar ──
  get: protectedProcedure
    .input(z.object({ menteeId: z.number(), pillarId: z.number() }))
    .query(async ({ input }) => {
      return getPillarReport(input.menteeId, input.pillarId);
    }),

  // ── Mentor: salva edições manuais no relatório ──
  save: protectedProcedure
    .input(
      z.object({
        menteeId: z.number(),
        pillarId: z.number(),
        title: z.string().optional(),
        subtitle: z.string().optional(),
        executiveSummary: z.string().optional(),
        strengthsJson: z.string().optional(),
        attentionJson: z.string().optional(),
        actionPlanJson: z.string().optional(),
        conclusionsText: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { menteeId, pillarId, ...data } = input;
      const existing = await getPillarReport(menteeId, pillarId);
      if (!existing) throw new Error("Relatório não encontrado. Gere primeiro.");

      const mentee = await getMenteeById(menteeId);
      const strengths = JSON.parse(data.strengthsJson ?? existing.strengthsJson ?? "[]");
      const attentionPoints = JSON.parse(data.attentionJson ?? existing.attentionJson ?? "[]");
      const actionPlan = JSON.parse(data.actionPlanJson ?? existing.actionPlanJson ?? "[]");
      const suggestions = JSON.parse(existing.suggestionsJson ?? "[]");

      // Busca dados adicionais para regenerar o HTML completo
      const feedback = await getPillarFeedback(menteeId, pillarId);
      const partContents = await getPillarPartContent(menteeId, pillarId);
      const conclusion = await getPillarConclusion(menteeId, pillarId);

      const partAnalyses: PartAnalysis[] = (partContents as any[])
        .filter((p: any) => p.conteudo || p.titulo)
        .map((p: any) => ({
          partId: p.partId,
          partLabel: p.partLabel,
          titulo: p.titulo,
          conteudo: p.conteudo,
          guiaUso: p.guiaUso,
          destaques: Array.isArray(p.destaques) ? p.destaques : [],
          proximosPassos: Array.isArray(p.proximosPassos) ? p.proximosPassos : [],
        }));

      const diagnosisData = feedback?.aiDiagnosis as DiagnosisData | null;
      const mentorConclusions = conclusion?.conclusoesJson as Record<string, unknown> | null;

      const htmlContent = generatePillarReportHtml({
        menteeName: mentee?.nome ?? "Mentorado",
        menteeSpecialty: mentee?.especialidade ?? undefined,
        pillarId,
        title: data.title ?? existing.title ?? "",
        subtitle: data.subtitle ?? existing.subtitle ?? "",
        executiveSummary: data.executiveSummary ?? existing.executiveSummary ?? "",
        strengths,
        attentionPoints,
        actionPlan,
        conclusions: data.conclusionsText ?? existing.conclusionsText ?? "",
        suggestions,
        generatedAt: existing.generatedAt ?? new Date(),
        partAnalyses,
        diagnosisData,
        mentorConclusions,
      });

      await upsertPillarReport(menteeId, pillarId, { ...data, htmlContent });
      return { success: true, htmlContent };
    }),

  // ── Mentor: libera o relatório para o mentorado ──
  release: protectedProcedure
    .input(z.object({ menteeId: z.number(), pillarId: z.number() }))
    .mutation(async ({ input }) => {
      const report = await getPillarReport(input.menteeId, input.pillarId);
      if (!report) throw new Error("Relatório não encontrado");
      await releasePillarReport(input.menteeId, input.pillarId);
      const mentee = await getMenteeById(input.menteeId);
      await notifyOwner({
        title: `Relatório do Pilar ${input.pillarId} liberado`,
        content: `O relatório do Pilar ${input.pillarId} foi liberado para ${mentee?.nome ?? "o mentorado"}.`,
      });
      return { success: true };
    }),

  // ── Mentor: lista todos os relatórios de um mentorado ──
  listAll: protectedProcedure
    .input(z.object({ menteeId: z.number() }))
    .query(async ({ input }) => {
      return getAllPillarReports(input.menteeId);
    }),

  // ── Mentorado: busca seu relatório liberado (via cookie de sessão do mentorado) ──
  getMy: protectedProcedure
    .input(z.object({ menteeId: z.number(), pillarId: z.number() }))
    .query(async ({ input }) => {
      const report = await getPillarReport(input.menteeId, input.pillarId);
      if (!report || report.status !== "released") return null;
      return report;
    }),
  // ── Mentor: gera PDF do relatório e retorna como base64 ──
  generatePdf: protectedProcedure
    .input(z.object({ menteeId: z.number(), pillarId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const { menteeId, pillarId } = input;
      // Apenas admin (mentor) pode gerar PDF
      if (ctx.user?.role !== "admin") {
        throw new Error("Acesso negado");
      }
      const report = await getPillarReport(menteeId, pillarId);
      if (!report || !report.htmlContent) {
        throw new Error("Relatório não encontrado. Gere o relatório primeiro.");
      }
      const db = await getDb();
      let menteeName = "Mentorado";
      if (db) {
        const [mentee] = await db.select().from(mentees).where(eq(mentees.id, menteeId)).limit(1);
        menteeName = mentee?.nome ?? "Mentorado";
      }
      const PILLAR_NAMES: Record<number, string> = {
        1: "Identidade-e-Proposito",
        2: "Posicionamento-e-Especializacao",
        3: "Financas-e-Precificacao",
        4: "Estrutura-Operacional",
        5: "Engenharia-de-Precos",
        6: "Marketing-Digital",
        7: "Conversao-e-Vendas",
      };
      const pillarName = PILLAR_NAMES[pillarId] ?? `Pilar-${pillarId}`;
      const fileName = `MedMentoring_Pilar${pillarId}-${pillarName}_${menteeName.replace(/\s+/g, "-")}.pdf`;

      // Parse stored JSON fields
      const strengths: string[] = JSON.parse(report.strengthsJson ?? "[]");
      const attentionPoints: string[] = JSON.parse(report.attentionJson ?? "[]");
      const actionPlan = JSON.parse(report.actionPlanJson ?? "[]");
      const suggestions = JSON.parse(report.suggestionsJson ?? "[]");

      const pdfBuffer = await generateReportPdf({
        menteeName,
        pillarId,
        pillarName: pillarName.replace(/-/g, " "),
        title: report.title ?? `Relatório — Pilar ${pillarId}`,
        subtitle: report.subtitle ?? "",
        executiveSummary: report.executiveSummary ?? "",
        strengths,
        attentionPoints,
        actionPlan,
        conclusions: report.conclusionsText ?? "",
        suggestions,
      });

      const base64 = pdfBuffer.toString("base64");
      return { base64, fileName };
    }),

  // ── Mentor: gera relatório final completo (todos os pilares) ──
  generateFinalReport: protectedProcedure
    .input(z.object({ menteeId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user?.role !== "admin") throw new Error("Acesso negado");

      const mentee = await getMenteeById(input.menteeId);
      if (!mentee) throw new Error("Mentorado não encontrado");

      const allReports = await getAllPillarReports(input.menteeId);
      const generatedReports = allReports.filter(r => r.htmlContent);

      if (generatedReports.length === 0) {
        throw new Error("Nenhum relatório de pilar gerado. Gere pelo menos um relatório de pilar antes.");
      }

      // Collect all data for LLM consolidation
      const pillarSummaries = generatedReports.map(r => ({
        pillarId: r.pillarId,
        title: r.title,
        summary: r.executiveSummary,
        strengths: JSON.parse(r.strengthsJson ?? "[]"),
        attentionPoints: JSON.parse(r.attentionJson ?? "[]"),
        actionPlan: JSON.parse(r.actionPlanJson ?? "[]"),
        conclusions: r.conclusionsText,
      }));

      const llmPrompt = `Você é um especialista em mentoria médica. Com base nos relatórios individuais dos pilares abaixo do médico ${mentee.nome} (${mentee.especialidade || "especialidade não informada"}), gere um RELATÓRIO FINAL CONSOLIDADO de toda a mentoria.

RELATÓRIOS POR PILAR:
${pillarSummaries.map(p => `
=== PILAR ${p.pillarId}: ${p.title} ===
Resumo: ${p.summary}
Pontos Fortes: ${p.strengths.join("; ")}
Pontos de Atenção: ${p.attentionPoints.join("; ")}
Ações: ${p.actionPlan.map((a: any) => a.action).join("; ")}
Conclusão: ${p.conclusions}
`).join("\n")}

Gere um JSON com:
- title: título impactante do relatório final (ex: "Relatório Final de Mentoria")
- diagnosticoGeral: 2-3 parágrafos com visão geral da jornada do mentorado, evolução e momento atual
- principaisConquistas: array de 5-7 conquistas principais ao longo dos pilares
- areasTransformacao: array de 3-5 áreas onde houve maior transformação
- propostasMelhoria: array de 5-8 propostas concretas de melhoria para o próximo ciclo, cada uma com: proposta (o que fazer), area (qual pilar/área), impacto (resultado esperado), prioridade ("alta"|"média"|"baixa")
- proximosPassos: array de 3-5 próximos passos recomendados para após a mentoria
- mensagemFinal: mensagem motivadora e pessoal de encerramento (2-3 parágrafos)`;

      const llmResponse = await invokeLLM({
        messages: [
          { role: "system", content: "Você é especialista em mentoria médica. Responda APENAS com JSON válido." },
          { role: "user", content: llmPrompt },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "final_report",
            strict: true,
            schema: {
              type: "object",
              properties: {
                title: { type: "string" },
                diagnosticoGeral: { type: "string" },
                principaisConquistas: { type: "array", items: { type: "string" } },
                areasTransformacao: { type: "array", items: { type: "string" } },
                propostasMelhoria: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      proposta: { type: "string" },
                      area: { type: "string" },
                      impacto: { type: "string" },
                      prioridade: { type: "string", enum: ["alta", "média", "baixa"] },
                    },
                    required: ["proposta", "area", "impacto", "prioridade"],
                    additionalProperties: false,
                  },
                },
                proximosPassos: { type: "array", items: { type: "string" } },
                mensagemFinal: { type: "string" },
              },
              required: ["title", "diagnosticoGeral", "principaisConquistas", "areasTransformacao", "propostasMelhoria", "proximosPassos", "mensagemFinal"],
              additionalProperties: false,
            },
          },
        },
      });

      const content = llmResponse?.choices?.[0]?.message?.content ?? "{}";
      const parsed = JSON.parse(typeof content === "string" ? content : JSON.stringify(content));

      // Generate PDF using pdfPremium components
      const pdfBuffer = await generateFinalPdf({
        menteeName: mentee.nome,
        menteeSpecialty: mentee.especialidade ?? "",
        title: parsed.title ?? "Relatório Final de Mentoria",
        diagnosticoGeral: parsed.diagnosticoGeral ?? "",
        principaisConquistas: parsed.principaisConquistas ?? [],
        areasTransformacao: parsed.areasTransformacao ?? [],
        propostasMelhoria: parsed.propostasMelhoria ?? [],
        proximosPassos: parsed.proximosPassos ?? [],
        mensagemFinal: parsed.mensagemFinal ?? "",
        pillarSummaries,
        totalPillarsCompleted: generatedReports.length,
      });

      const base64 = pdfBuffer.toString("base64");
      const fileName = `MedMentoring_RelatorioFinal_${mentee.nome.replace(/\s+/g, "-")}.pdf`;
      return { base64, fileName };
    }),
});
