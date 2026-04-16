import bcrypt from "bcryptjs";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { notifyOwner } from "./_core/notification";
import {
  createMentee,
  createMaterial,
  createNpsResponse,
  createOnboardingForm,
  createSessionRequest,
  deleteMaterial,
  deleteMentee,
  getAllMentees,
  getAllOnboardingForms,
  getChecklistItems,
  getDefaultDespesas,
  getDefaultIvmpCategories,
  getDefaultMapaSala,
  getDefaultPrecificacao,
  getFinancialData,
  getIvmpData,
  getMaterials,
  getMenteeByAccessCode,
  getMenteeById,
  getMentorNote,
  getNpsResponses,
  getPillarReleases,
  getSessionRequests,
  updateFinancialData,
  updateIvmpData,
  updateMentee,
  updateOnboardingFormStatus,
  updatePillarRelease,
  updateSessionRequest,
  upsertChecklistItem,
  upsertMentorNote,
  upsertUser,
  getUserByOpenId,
  getPillarDiagnostic,
  upsertPillarDiagnostic,
  getAllPillarDiagnostics,
  getPillarAnswers,
  getPillarAnswerBySection,
  upsertPillarAnswers,
  getAllPillarAnswersForMentee,
  getPillarFeedback,
  upsertPillarFeedback,
  upsertPillarConclusion,
  getPillarConclusion,
  createDiagnosisSession,
  getAllDiagnosisSessions,
  getQuestionnairePhase,
  getAllQuestionnairePhases,
  upsertQuestionnairePhase,
  getMenteeDocuments,
  createMenteeDocument,
  getMenteeDocumentById,
  markDocumentRead,
  deleteMenteeDocument,
  getMentorAiChatHistory,
  saveMentorAiChatMessage,
  clearMentorAiChatHistory,
  getMentorSuggestions,
  addMentorSuggestion,
  toggleMentorSuggestion,
  deleteMentorSuggestion,
  getChatConclusions,
  addChatConclusion,
  updateChatConclusion,
  deleteChatConclusion,
  toggleConclusionInReport,
  getPartReleases,
  upsertPartRelease,
  initPartReleases,
  getExpenseData,
  saveExpenseData,
  getIvmpAnswers,
  saveIvmpAnswers,
  getSimulationData,
  saveSimulationData,
} from "./db";
import { calculateIvmpScores, IVMP_DIMENSIONS } from "../shared/ivmp-questions";
import { calculateSimulation, calculateTarget } from "../shared/pricing-model";
import type { Service } from "../shared/pricing-model";
import { PILLAR_PARTS } from "../shared/pillar-parts";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { ENV } from "./_core/env";
import { invokeLLM } from "./_core/llm";
import { getPillarPrompt } from "../shared/pillar-prompts";

// Helper: extract JSON from LLM response that may contain markdown
function extractJSON(text: string): string {
  // Try direct parse first
  try { JSON.parse(text); return text; } catch {}
  // Try extracting from markdown code block
  const jsonBlock = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonBlock) {
    try { JSON.parse(jsonBlock[1].trim()); return jsonBlock[1].trim(); } catch {}
  }
  // Try finding first { to last }
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    const candidate = text.substring(start, end + 1);
    try { JSON.parse(candidate); return candidate; } catch {}
  }
  // Try finding first [ to last ]
  const startArr = text.indexOf("[");
  const endArr = text.lastIndexOf("]");
  if (startArr !== -1 && endArr !== -1 && endArr > startArr) {
    const candidate = text.substring(startArr, endArr + 1);
    try { JSON.parse(candidate); return candidate; } catch {}
  }
  return text;
}
import { pillarReportRouter } from "./routers/pillarReport";
import { getPillarPartContent, upsertPillarPartContent } from "./db";
import { generateReportPdf } from "./pdfPremium";
import { pillarReports, mentorAiChat } from "../drizzle/schema";
import { eq, and, gte, desc } from "drizzle-orm";
import { getDb } from "./db";

// ============================================================
// MENTEE AUTH — Sessão separada do OAuth (cookie mentee_session)
// ============================================================
const MENTEE_COOKIE = "medmentoring_mentee";

const menteeRouter = router({
  // Login do mentorado por código único
  login: publicProcedure
    .input(z.object({ code: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      const mentee = await getMenteeByAccessCode(input.code.toUpperCase());
      if (!mentee) throw new TRPCError({ code: "UNAUTHORIZED", message: "Código inválido" });
      if (!mentee.ativo) throw new TRPCError({ code: "FORBIDDEN", message: "Acesso desativado" });

      const valid = await bcrypt.compare(input.code.toUpperCase(), mentee.accessCodeHash);
      if (!valid) throw new TRPCError({ code: "UNAUTHORIZED", message: "Código inválido" });

      // Salvar ID do mentorado em cookie
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(MENTEE_COOKIE, String(mentee.id), { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 });

      return { success: true, menteeId: mentee.id, nome: mentee.nome };
    }),

  logout: publicProcedure.mutation(({ ctx }) => {
    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.clearCookie(MENTEE_COOKIE, { ...cookieOptions, maxAge: -1 });
    return { success: true };
  }),

  // Retorna o mentorado logado (lê cookie)
  me: publicProcedure.query(async ({ ctx }) => {
    const menteeId = ctx.req.cookies?.[MENTEE_COOKIE];
    if (!menteeId) return null;
    const mentee = await getMenteeById(Number(menteeId));
    if (!mentee || !mentee.ativo) return null;
    // Não retornar o hash
    const { accessCodeHash, ...safe } = mentee;
    return safe;
  }),
});

// ============================================================
// MENTOR ROUTER — Protegido por Manus OAuth (role admin)
// ============================================================
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito ao mentor" });
  return next({ ctx });
});

const mentorRouter = router({
  // Dashboard stats
  stats: adminProcedure.query(async () => {
    const allMentees = await getAllMentees();
    const active = allMentees.filter((m) => m.ativo);
    const sessions = await getSessionRequests();
    const pending = sessions.filter((s) => s.status === "pending");
    const forms = await getAllOnboardingForms();
    const newForms = forms.filter((f) => f.status === "new");

    return {
      totalMentees: allMentees.length,
      activeMentees: active.length,
      pendingSessions: pending.length,
      newLeads: newForms.length,
      totalHours: active.reduce((sum, m) => sum + Number(m.horasRealizadas || 0), 0),
      totalSessions: active.reduce((sum, m) => sum + (m.sessoesRealizadas || 0), 0),
    };
  }),

  // CRUD Mentorados
  listMentees: adminProcedure.query(async () => {
    const all = await getAllMentees();
    return all.map(({ accessCodeHash, ...m }) => m);
  }),

  getMentee: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const mentee = await getMenteeById(input.id);
      if (!mentee) throw new TRPCError({ code: "NOT_FOUND" });
      const { accessCodeHash, ...safe } = mentee;
      return safe;
    }),

  createMentee: adminProcedure
    .input(
      z.object({
        nome: z.string().min(2),
        accessCode: z.string().min(3).max(20),
        especialidade: z.string().optional(),
        cidade: z.string().optional(),
        estado: z.string().max(2).optional(),
        telefone: z.string().optional(),
        email: z.string().email().optional().or(z.literal("")),
        tipoClinica: z.string().optional(),
        tempoFormacao: z.number().optional(),
        faturamentoMedio: z.number().optional(),
        dataInicio: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const code = input.accessCode.toUpperCase();
      const existing = await getMenteeByAccessCode(code);
      if (existing) throw new TRPCError({ code: "CONFLICT", message: "Código já em uso" });

      const hash = await bcrypt.hash(code, 10);
      const id = await createMentee({
        ...input,
        accessCode: code,
        accessCodeHash: hash,
        faturamentoMedio: input.faturamentoMedio ? String(input.faturamentoMedio) : "0",
        dataInicio: input.dataInicio ? new Date(input.dataInicio) : undefined,
      });

      await notifyOwner({
        title: "Novo mentorado cadastrado",
        content: `${input.nome} (${code}) foi adicionado à plataforma.`,
      });

      const allParts: Array<{pillarId: number; partId: string; partLabel: string}> = [];
      for (const [pillarIdStr, parts] of Object.entries(PILLAR_PARTS)) {
        for (const part of parts) {
          allParts.push({ pillarId: Number(pillarIdStr), partId: part.id, partLabel: part.label });
        }
      }
      await initPartReleases(id, allParts);

      return { id };
    }),

  updateMentee: adminProcedure
    .input(
      z.object({
        id: z.number(),
        nome: z.string().min(2).optional(),
        especialidade: z.string().optional(),
        cidade: z.string().optional(),
        estado: z.string().max(2).optional(),
        telefone: z.string().optional(),
        email: z.string().optional(),
        tipoClinica: z.string().optional(),
        tempoFormacao: z.number().optional(),
        faturamentoMedio: z.number().optional(),
        dataInicio: z.string().optional(),
        horasRealizadas: z.number().optional(),
        sessoesRealizadas: z.number().optional(),
        ativo: z.boolean().optional(),
        notasGerais: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, faturamentoMedio, dataInicio, ...rest } = input;
      await updateMentee(id, {
        ...rest,
        faturamentoMedio: faturamentoMedio !== undefined ? String(faturamentoMedio) : undefined,
        dataInicio: dataInicio ? new Date(dataInicio) : undefined,
        horasRealizadas: rest.horasRealizadas !== undefined ? String(rest.horasRealizadas) : undefined,
      });
      return { success: true };
    }),

  deleteMentee: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteMentee(input.id);
      return { success: true };
    }),

  // Liberações granulares
  getReleases: adminProcedure
    .input(z.object({ menteeId: z.number() }))
    .query(async ({ input }) => getPillarReleases(input.menteeId)),

  updateRelease: adminProcedure
    .input(
      z.object({
        menteeId: z.number(),
        pillarId: z.number().min(1).max(7),
        checklistReleased: z.boolean().optional(),
        resumoReleased: z.boolean().optional(),
        financeiroReleased: z.boolean().optional(),
        materiaisReleased: z.boolean().optional(),
        sessoesReleased: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { menteeId, pillarId, ...updates } = input;
      await updatePillarRelease(menteeId, pillarId, updates);
      return { success: true };
    }),

  // Checklist
  getChecklist: adminProcedure
    .input(z.object({ menteeId: z.number(), pillarId: z.number().optional() }))
    .query(async ({ input }) => getChecklistItems(input.menteeId, input.pillarId)),

  updateChecklistItem: adminProcedure
    .input(
      z.object({
        menteeId: z.number(),
        pillarId: z.number(),
        itemIndex: z.number(),
        status: z.enum(["pending", "requested", "completed"]),
      })
    )
    .mutation(async ({ input }) => {
      await upsertChecklistItem(input.menteeId, input.pillarId, input.itemIndex, input.status);
      return { success: true };
    }),

  // Sessões
  getAllSessions: adminProcedure.query(async () => {
    const sessions = await getSessionRequests();
    // Enriquecer com nome do mentorado
    const enriched = await Promise.all(
      sessions.map(async (s) => {
        const mentee = await getMenteeById(s.menteeId);
        return { ...s, menteeName: mentee?.nome || "Desconhecido" };
      })
    );
    return enriched;
  }),

  respondSession: adminProcedure
    .input(
      z.object({
        sessionId: z.number(),
        status: z.enum(["confirmed", "refused"]),
        mentorResposta: z.string().optional(),
        dataConfirmada: z.string().optional(),
        horaConfirmada: z.string().optional(),
        linkSessao: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { sessionId, ...updates } = input;
      await updateSessionRequest(sessionId, updates);

      // Notificar mentorado (via owner notification por ora)
      const session = await getSessionRequests();
      const s = session.find((x) => x.id === sessionId);
      if (s) {
        const mentee = await getMenteeById(s.menteeId);
        const statusLabel = input.status === "confirmed" ? "confirmada" : "recusada";
        await notifyOwner({
          title: `Sessão ${statusLabel}`,
          content: `Sessão de ${mentee?.nome} foi ${statusLabel}. ${input.mentorResposta || ""}`,
        });
      }

      return { success: true };
    }),

  completeSession: adminProcedure
    .input(
      z.object({
        sessionId: z.number(),
        duracaoMinutos: z.number(),
        notasSessao: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { sessionId, ...updates } = input;
      await updateSessionRequest(sessionId, { ...updates, status: "completed" });

      // Atualizar horas e sessões do mentorado
      const sessions = await getSessionRequests();
      const s = sessions.find((x) => x.id === sessionId);
      if (s) {
        const mentee = await getMenteeById(s.menteeId);
        if (mentee) {
          const newHours = Number(mentee.horasRealizadas || 0) + input.duracaoMinutos / 60;
          await updateMentee(s.menteeId, {
            horasRealizadas: String(newHours.toFixed(1)),
            sessoesRealizadas: (mentee.sessoesRealizadas || 0) + 1,
          });
        }
      }
      return { success: true };
    }),

  // Materiais
  getMaterials: adminProcedure
    .input(z.object({ menteeId: z.number(), pillarId: z.number().optional() }))
    .query(async ({ input }) => getMaterials(input.menteeId, input.pillarId)),

  addMaterial: adminProcedure
    .input(
      z.object({
        menteeId: z.number(),
        pillarId: z.number(),
        titulo: z.string().min(1),
        tipo: z.enum(["link", "pdf", "video", "planilha", "apresentacao", "exercicio"]),
        url: z.string().min(1),
        fileKey: z.string().optional(),
        descricao: z.string().optional(),
        tamanhoBytes: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const id = await createMaterial(input);
      return { id };
    }),

  deleteMaterial: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteMaterial(input.id);
      return { success: true };
    }),

  // Notas do mentor
  getNote: adminProcedure
    .input(z.object({ menteeId: z.number(), pillarId: z.number() }))
    .query(async ({ input }) => getMentorNote(input.menteeId, input.pillarId)),

  saveNote: adminProcedure
    .input(z.object({ menteeId: z.number(), pillarId: z.number(), conteudo: z.string() }))
    .mutation(async ({ input }) => {
      await upsertMentorNote(input.menteeId, input.pillarId, input.conteudo);
      return { success: true };
    }),

  // iVMP
  getIvmp: adminProcedure
    .input(z.object({ menteeId: z.number() }))
    .query(async ({ input }) => getIvmpData(input.menteeId)),

  updateIvmp: adminProcedure
    .input(z.object({ menteeId: z.number(), categories: z.any(), ivmpFinal: z.number() }))
    .mutation(async ({ input }) => {
      await updateIvmpData(input.menteeId, input.categories, input.ivmpFinal);
      return { success: true };
    }),

  // Expanded iVMP — análise completa (scores, radar, alertas)
  getIvmpAnalysis: adminProcedure
    .input(z.object({ menteeId: z.number() }))
    .query(async ({ input }) => {
      const data = await getIvmpAnswers(input.menteeId);
      if (!data || !data.answers) return null;

      const scores = calculateIvmpScores(data.answers);

      // Build radar data
      const radarData = IVMP_DIMENSIONS.map(dim => ({
        dimension: dim.label,
        dimensionId: dim.id,
        score: scores.dimensionScores[dim.id]?.percentage || 0,
        peso: dim.peso,
        benchmark: 65, // Reference benchmark
      }));

      // Top 3 strengths and gaps
      const sorted = [...radarData].sort((a, b) => b.score - a.score);
      const top3Fortes = sorted.slice(0, 3);
      const top3Gaps = sorted.slice(-3).reverse();

      // Questions with low scores (< 4)
      const alertas: Array<{ questionId: string; texto: string; dimension: string; score: number }> = [];
      for (const dim of IVMP_DIMENSIONS) {
        for (const q of dim.perguntas) {
          const score = data.answers[q.id];
          if (score !== undefined && score < 4) {
            alertas.push({ questionId: q.id, texto: q.texto, dimension: dim.label, score });
          }
        }
      }

      return {
        answers: data.answers,
        ivmpFinal: scores.ivmpFinal,
        dimensionScores: scores.dimensionScores,
        radarData,
        top3Fortes,
        top3Gaps,
        alertas,
      };
    }),

  // Expanded iVMP — editar uma resposta individual
  updateIvmpAnswer: adminProcedure
    .input(z.object({
      menteeId: z.number(),
      questionId: z.string(),
      value: z.number().min(0).max(10),
    }))
    .mutation(async ({ input }) => {
      const data = await getIvmpAnswers(input.menteeId);
      const answers = (data?.answers || {}) as Record<string, number>;
      const oldValue = answers[input.questionId];
      answers[input.questionId] = input.value;

      const oldScores = calculateIvmpScores({ ...answers, [input.questionId]: oldValue ?? 0 });
      const newScores = calculateIvmpScores(answers);

      await saveIvmpAnswers(input.menteeId, answers, newScores.ivmpFinal);

      return {
        oldIvmpFinal: oldScores.ivmpFinal,
        newIvmpFinal: newScores.ivmpFinal,
        impactMessage: `iVMP alterado de ${oldScores.ivmpFinal.toFixed(1)}% para ${newScores.ivmpFinal.toFixed(1)}%`,
      };
    }),

  // Dados financeiros
  getFinancial: adminProcedure
    .input(z.object({ menteeId: z.number() }))
    .query(async ({ input }) => getFinancialData(input.menteeId)),

  updateFinancial: adminProcedure
    .input(
      z.object({
        menteeId: z.number(),
        despesasJson: z.any().optional(),
        mapaSalaJson: z.any().optional(),
        precificacaoJson: z.any().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { menteeId, ...updates } = input;
      await updateFinancialData(menteeId, updates);
      return { success: true };
    }),

  // Granular Expense Analysis — análise detalhada de despesas
  getExpenseAnalysis: adminProcedure
    .input(z.object({ menteeId: z.number() }))
    .query(async ({ input }) => {
      const data = await getExpenseData(input.menteeId);
      if (!data) return null;

      // Calculate totals per category
      const expenses = data.expenses || {};
      const categoryTotals: Record<string, number> = {};
      let grandTotal = 0;

      for (const [key, value] of Object.entries(expenses)) {
        const categoryId = key.split(".")[0];
        categoryTotals[categoryId] = (categoryTotals[categoryId] || 0) + value;
        grandTotal += value;
      }

      // Calculate room map metrics
      const mapaSala = data.mapaSala;
      let horasDisponiveis = 0;
      let taxaSala = 0;
      let custoHoraDisponivel = 0;
      let custoOciosidade = 0;
      let percentOcupacao = 0;

      if (mapaSala) {
        const diasPorSemana = mapaSala.diasSemana?.length || 0;
        const horasPorDia = (mapaSala.turnoManha || 0) + (mapaSala.turnoTarde || 0);
        const semanas = mapaSala.semanasMes || 4;
        horasDisponiveis = diasPorSemana * horasPorDia * semanas;
        const horasOcupadas = mapaSala.horasOcupadas || 0;

        if (horasDisponiveis > 0) {
          custoHoraDisponivel = grandTotal / horasDisponiveis;
          percentOcupacao = (horasOcupadas / horasDisponiveis) * 100;
        }
        if (horasOcupadas > 0) {
          taxaSala = grandTotal / horasOcupadas;
        }
        custoOciosidade = (horasDisponiveis - (mapaSala.horasOcupadas || 0)) * custoHoraDisponivel;
      }

      return {
        expenses,
        categoryTotals,
        grandTotal,
        mapaSala,
        metrics: {
          horasDisponiveis,
          taxaSala,
          custoHoraDisponivel,
          custoOciosidade,
          percentOcupacao,
          faturamentoMensal: mapaSala?.faturamentoMensal || 0,
        },
      };
    }),

  getPricingAnalysis: adminProcedure
    .input(z.object({ menteeId: z.number() }))
    .query(async ({ input }) => {
      const simData = await getSimulationData(input.menteeId);
      if (!simData || !simData.servicos || simData.servicos.length === 0) return null;

      const expData = await getExpenseData(input.menteeId);
      const expenses = (expData?.expenses || {}) as Record<string, number>;
      const totalExpenses = Object.values(expenses).reduce((a, b) => a + (Number(b) || 0), 0);

      const mapaSala = expData?.mapaSala;
      let horasDisponiveis = 0;
      let taxaSalaHora = 0;
      if (mapaSala) {
        const diasPorSemana = mapaSala.diasSemana?.length || 0;
        const horasPorDia = (mapaSala.turnoManha || 0) + (mapaSala.turnoTarde || 0);
        horasDisponiveis = diasPorSemana * horasPorDia * (mapaSala.semanasMes || 4);
        taxaSalaHora = horasDisponiveis > 0 ? totalExpenses / horasDisponiveis : 0;
      }

      const simulation = calculateSimulation({
        custoFixoTotal: totalExpenses,
        custosVariaveisPercent: 20,
        taxaSalaHora,
        horasDisponiveisMes: horasDisponiveis || 160,
        horasOcupadasMes: mapaSala?.horasOcupadas || 80,
        faturamentoMensal: simData.params?.faturamentoMensal || 0,
        servicos: simData.servicos,
        mixAtendimentos: simData.mixAtendimentos || {},
      });

      return {
        servicos: simData.servicos,
        mixAtendimentos: simData.mixAtendimentos || {},
        simulation,
        custoFixoTotal: totalExpenses,
        taxaSalaHora,
        horasDisponiveis,
      };
    }),

  // Leads / Onboarding
  getLeads: adminProcedure.query(async () => getAllOnboardingForms()),

  updateLeadStatus: adminProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["new", "contacted", "converted", "lost"]),
        menteeId: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      await updateOnboardingFormStatus(input.id, input.status, input.menteeId);
      return { success: true };
    }),

  // NPS
  getAllNps: adminProcedure.query(async () => getNpsResponses()),

  // Upload de arquivo para S3
  getUploadUrl: adminProcedure
    .input(z.object({
      menteeId: z.number(),
      pillarId: z.number(),
      filename: z.string(),
      contentType: z.string(),
      titulo: z.string(),
      tipo: z.enum(["pdf", "video", "planilha", "apresentacao", "exercicio", "link"]),
    }))
    .mutation(async ({ input }) => {
      const { storagePut } = await import("./storage");
      const nanoid = (await import("nanoid")).nanoid;
      const suffix = nanoid(8);
      const ext = input.filename.split(".").pop() || "bin";
      const fileKey = `materiais/${input.menteeId}/pilar${input.pillarId}/${suffix}.${ext}`;
      // Return key so client can upload directly
      return { fileKey, uploadReady: true };
    }),

  // Salvar material após upload S3
  saveMaterial: adminProcedure
    .input(z.object({
      menteeId: z.number(),
      pillarId: z.number(),
      titulo: z.string().min(1),
      tipo: z.enum(["pdf", "video", "planilha", "apresentacao", "exercicio", "link"]),
      url: z.string().min(1),
      fileKey: z.string().optional(),
      descricao: z.string().optional(),
      tamanhoBytes: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const id = await createMaterial(input);
      return { id };
    }),

  // Gerar apresentação PPTX do mentorado
  generatePptx: adminProcedure
    .input(z.object({ menteeId: z.number(), pillarId: z.number().optional() }))
    .mutation(async ({ input }) => {
      const { storagePut } = await import("./storage");
      const PptxGenJs = (await import("pptxgenjs")).default;
      const nanoid = (await import("nanoid")).nanoid;

      const mentee = await getMenteeById(input.menteeId);
      if (!mentee) throw new TRPCError({ code: "NOT_FOUND", message: "Mentorado não encontrado" });

      const releases = await getPillarReleases(input.menteeId);
      const checklist = await getChecklistItems(input.menteeId);

      const pptx = new PptxGenJs();
      pptx.layout = "LAYOUT_16x9";
      pptx.author = "MedMentoring";
      pptx.title = `Relatório de Progresso — ${mentee.nome}`;

      // Slide 1 — Capa
      const slide1 = pptx.addSlide();
      slide1.background = { color: "1B3A5C" };
      slide1.addText("MedMentoring", { x: 0.5, y: 0.5, w: 9, h: 0.6, fontSize: 14, color: "D4AF37", bold: true });
      slide1.addText(mentee.nome, { x: 0.5, y: 1.5, w: 9, h: 1, fontSize: 32, color: "FFFFFF", bold: true });
      slide1.addText(`${mentee.especialidade || "Médico"} — Relatório de Progresso`, { x: 0.5, y: 2.8, w: 9, h: 0.5, fontSize: 16, color: "AAAAAA" });
      slide1.addText(new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" }), { x: 0.5, y: 3.5, w: 9, h: 0.4, fontSize: 13, color: "888888" });

      // Slide 2 — Visão Geral
      const slide2 = pptx.addSlide();
      slide2.background = { color: "FFFFFF" };
      slide2.addText("Visão Geral da Mentoria", { x: 0.5, y: 0.3, w: 9, h: 0.6, fontSize: 22, color: "1B3A5C", bold: true });
      const infoRows = [
        ["Especialidade", mentee.especialidade || "—"],
        ["Cidade", `${mentee.cidade || "—"} / ${mentee.estado || "—"}`],
        ["Horas realizadas", `${mentee.horasRealizadas || 0}h`],
        ["Sessões realizadas", String(mentee.sessoesRealizadas || 0)],
        ["Início da mentoria", mentee.dataInicio ? new Date(mentee.dataInicio).toLocaleDateString("pt-BR") : "—"],
      ];
      slide2.addTable(
        infoRows.map(([label, value]) => [
          { text: label, options: { bold: true, color: "1B3A5C", fill: { color: "F5F7FA" } } },
          { text: value, options: { color: "333333" } },
        ]),
        { x: 0.5, y: 1.2, w: 9, h: 2.5, colW: [3, 6], border: { type: "solid", color: "E2E8F0" } }
      );

      // Slides dos pilares
      const PILLAR_NAMES = [
        "Identidade e Posicionamento",
        "Estrutura Clínica e Operacional",
        "Finanças e Precificação",
        "Marketing e Captação",
        "Atendimento e Experiência",
        "Equipe e Liderança",
        "Crescimento e Escalabilidade",
      ];

      for (let i = 1; i <= 7; i++) {
        const release = releases.find((r) => r.pillarId === i);
        const pillarChecklist = checklist.filter((c) => c.pillarId === i);
        const completed = pillarChecklist.filter((c) => c.status === "completed").length;
        const total = pillarChecklist.length;

        const slide = pptx.addSlide();
        slide.background = { color: release ? "F0F7FF" : "F8F8F8" };
        slide.addText(`Pilar ${i} — ${PILLAR_NAMES[i - 1]}`, {
          x: 0.5, y: 0.3, w: 9, h: 0.6, fontSize: 20, color: "1B3A5C", bold: true,
        });
        slide.addText(release ? "✅ Liberado" : "🔒 Aguardando liberação", {
          x: 0.5, y: 1.0, w: 4, h: 0.4, fontSize: 13, color: release ? "16A34A" : "888888",
        });
        if (total > 0) {
          slide.addText(`Progresso: ${completed}/${total} itens concluídos (${Math.round((completed / total) * 100)}%)`, {
            x: 0.5, y: 1.5, w: 9, h: 0.4, fontSize: 13, color: "444444",
          });
        }
      }

      // Export to buffer
      const buffer = (await pptx.write({ outputType: "nodebuffer" })) as Buffer;
      const fileKey = `pptx/${input.menteeId}/progresso-${nanoid(6)}.pptx`;
      const { url } = await storagePut(fileKey, buffer, "application/vnd.openxmlformats-officedocument.presentationml.presentation");

      return { url, filename: `MedMentoring_${mentee.nome.replace(/\s+/g, "_")}.pptx` };
    }),

  // ============================================================
  // Diagnóstico por Pilar (angústias, notas, roteiro)
  // ============================================================
  getPillarDiagnostic: adminProcedure
    .input(z.object({ menteeId: z.number(), pillarId: z.number() }))
    .query(async ({ input }) => {
      return await getPillarDiagnostic(input.menteeId, input.pillarId);
    }),

  getAllPillarDiagnostics: adminProcedure
    .input(z.object({ menteeId: z.number() }))
    .query(async ({ input }) => {
      return await getAllPillarDiagnostics(input.menteeId);
    }),

  savePillarDiagnostic: adminProcedure
    .input(z.object({
      menteeId: z.number(),
      pillarId: z.number(),
      angustiasJson: z.any().optional(),
      tecnicasJson: z.any().optional(),
      respostasJson: z.any().optional(),
      analiseEstrategica: z.string().optional(),
      pilaresUrgentes: z.any().optional(),
    }))
    .mutation(async ({ input }) => {
      const { menteeId, pillarId, ...data } = input;
      await upsertPillarDiagnostic(menteeId, pillarId, data);
      return { success: true };
    }),

  // ============================================================
  // Sessões de Diagnóstico Gratuitas (prospectos)
  // ============================================================
  getDiagnosisSessions: adminProcedure
    .query(async () => {
      return await getAllDiagnosisSessions();
    }),

   createDiagnosisSession: adminProcedure
    .input(z.object({
      nomeProspecto: z.string().min(2),
      respostasRoteiro: z.any().optional(),
      pilaresUrgentes: z.any().optional(),
      ivmpEstimado: z.string().optional(),
      notasSessao: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const id = await createDiagnosisSession(input);
      return { id };
    }),

  // Admin simula ser um mentorado — seta o cookie de sessão do mentorado
  // Isso permite que o mentor teste o portal sem precisar de outro login
  simulateMentee: adminProcedure
    .input(z.object({ menteeId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const mentee = await getMenteeById(input.menteeId);
      if (!mentee) throw new TRPCError({ code: "NOT_FOUND", message: "Mentorado não encontrado" });
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(MENTEE_COOKIE, String(mentee.id), { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 });
      return { success: true, menteeId: mentee.id, nome: mentee.nome };
    }),

  // Admin para de simular o mentorado — limpa o cookie de sessão do mentorado
  stopSimulation: adminProcedure.mutation(({ ctx }) => {
    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.clearCookie(MENTEE_COOKIE, { ...cookieOptions, maxAge: -1 });
    return { success: true };
  }),

  // Part Releases — liberações granulares por parte
  getPartReleases: adminProcedure
    .input(z.object({ menteeId: z.number(), pillarId: z.number().optional() }))
    .query(async ({ input }) => {
      return getPartReleases(input.menteeId, input.pillarId);
    }),

  updatePartRelease: adminProcedure
    .input(z.object({
      menteeId: z.number(),
      pillarId: z.number(),
      partId: z.string(),
      partLabel: z.string(),
      released: z.boolean(),
    }))
    .mutation(async ({ input }) => {
      return upsertPartRelease(input.menteeId, input.pillarId, input.partId, input.partLabel, input.released);
    }),

  // ============================================================
  // SIMULATION / PRICING — Simulador de cenários financeiros
  // ============================================================
  getSimulationData: adminProcedure
    .input(z.object({ menteeId: z.number() }))
    .query(async ({ input }) => {
      return getSimulationData(input.menteeId);
    }),

  saveSimulationData: adminProcedure
    .input(z.object({
      menteeId: z.number(),
      servicos: z.array(z.object({
        id: z.string(),
        nome: z.string(),
        duracaoHoras: z.number(),
        precoVenda: z.number(),
        impostoPercent: z.number(),
        taxaCartaoPercent: z.number(),
        mod: z.number(),
        matMed: z.number(),
        bonusPercent: z.number(),
        taxaEquipamento: z.number(),
      })),
      mixAtendimentos: z.record(z.string(), z.number()),
      params: z.object({
        custoFixoTotal: z.number(),
        custosVariaveisPercent: z.number(),
        taxaSalaHora: z.number(),
        horasDisponiveisMes: z.number(),
        horasOcupadasMes: z.number(),
        faturamentoMensal: z.number(),
      }),
    }))
    .mutation(async ({ input }) => {
      await saveSimulationData(input.menteeId, {
        servicos: input.servicos,
        mixAtendimentos: input.mixAtendimentos,
        params: input.params,
      });
      return { success: true };
    }),

  runSimulation: adminProcedure
    .input(z.object({
      menteeId: z.number(),
      overrideParams: z.object({
        custoFixoTotal: z.number().optional(),
        faturamentoMensal: z.number().optional(),
        mixAtendimentos: z.record(z.string(), z.number()).optional(),
      }).optional(),
    }))
    .query(async ({ input }) => {
      const data = await getSimulationData(input.menteeId);
      if (!data || !data.params) return null;

      const expenseData = await getExpenseData(input.menteeId);
      const custoFixo = input.overrideParams?.custoFixoTotal ?? data.params.custoFixoTotal;

      const params = {
        ...data.params,
        custoFixoTotal: custoFixo,
        servicos: data.servicos as Service[],
        mixAtendimentos: input.overrideParams?.mixAtendimentos ?? data.mixAtendimentos,
      };

      return calculateSimulation(params);
    }),

  calculateMeta: adminProcedure
    .input(z.object({
      menteeId: z.number(),
      metaLucro: z.number(),
    }))
    .query(async ({ input }) => {
      const data = await getSimulationData(input.menteeId);
      if (!data || !data.params) return null;
      return calculateTarget(data.params.custoFixoTotal, data.params.custosVariaveisPercent, input.metaLucro);
    }),

  // Tool data — salva/carrega dados de ferramentas por pilar (protocolo consulta, etc.)
  saveToolData: adminProcedure
    .input(z.object({
      menteeId: z.number(),
      pillarId: z.number(),
      toolData: z.any(),
    }))
    .mutation(async ({ input }) => {
      const existing = await getPillarFeedback(input.menteeId, input.pillarId);
      const current = (existing?.toolDataJson as Record<string, unknown>) || {};
      const merged = { ...current, ...input.toolData };
      await upsertPillarFeedback(input.menteeId, input.pillarId, {
        toolDataJson: merged,
      });
      return { success: true };
    }),

  getToolData: adminProcedure
    .input(z.object({
      menteeId: z.number(),
      pillarId: z.number(),
    }))
    .query(async ({ input }) => {
      const existing = await getPillarFeedback(input.menteeId, input.pillarId);
      return (existing?.toolDataJson as Record<string, unknown>) || {};
    }),
});
// ============================================================
// MENTORADO ROUTER — Autenticado via cookie mentee_session
// ============================================================
// Middleware para verificar cookie do mentorado
const menteeProcedure = publicProcedure.use(async ({ ctx, next }) => {
  const menteeId = ctx.req.cookies?.[MENTEE_COOKIE];
  if (!menteeId) throw new TRPCError({ code: "UNAUTHORIZED", message: "Faça login com seu código" });
  const mentee = await getMenteeById(Number(menteeId));
  if (!mentee || !mentee.ativo) throw new TRPCError({ code: "UNAUTHORIZED" });
  return next({ ctx: { ...ctx, menteeId: mentee.id, mentee } });
});

const menteePortalRouter = router({
  // Home do mentorado
  myData: menteeProcedure.query(async ({ ctx }) => {
    const mentee = ctx.mentee;
    const releases = await getPillarReleases(mentee.id);
    const checklist = await getChecklistItems(mentee.id);
    const sessions = await getSessionRequests(mentee.id);
    const mats = await getMaterials(mentee.id);
    const nps = await getNpsResponses(mentee.id);
    const { accessCodeHash, ...safeMentee } = mentee;

    return { mentee: safeMentee, releases, checklist, sessions, materials: mats, nps };
  }),

  // Part Releases — liberações granulares por parte (visão do mentorado)
  getMyPartReleases: menteeProcedure
    .query(async ({ ctx }) => {
      return getPartReleases(ctx.menteeId);
    }),

  // Solicitar conclusão de item do checklist
  requestChecklistItem: menteeProcedure
    .input(z.object({ pillarId: z.number(), itemIndex: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await upsertChecklistItem(ctx.menteeId, input.pillarId, input.itemIndex, "requested", new Date());
      await notifyOwner({
        title: "Solicitação de checklist",
        content: `${ctx.mentee.nome} solicitou conclusão do item ${input.itemIndex + 1} do Pilar ${input.pillarId}.`,
      });
      return { success: true };
    }),

  // Solicitar sessão
  requestSession: menteeProcedure
    .input(
      z.object({
        assunto: z.string().min(3),
        mensagem: z.string().optional(),
        dataPreferida: z.string().optional(),
        pillarId: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const id = await createSessionRequest({
        menteeId: ctx.menteeId,
        ...input,
      });

      await notifyOwner({
        title: "Nova solicitação de sessão",
        content: `${ctx.mentee.nome} solicitou uma sessão: "${input.assunto}". Data preferida: ${input.dataPreferida || "não informada"}.`,
      });

      return { id };
    }),

  // Responder NPS
  submitNps: menteeProcedure
    .input(z.object({ pillarId: z.number(), score: z.number().min(0).max(10), comentario: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      await createNpsResponse(ctx.menteeId, input.pillarId, input.score, input.comentario);
      return { success: true };
    }),

  // Granular Expense Tracking — salvar despesas detalhadas
  saveExpenses: menteeProcedure
    .input(z.object({
      expenses: z.record(z.string(), z.number()),
      mapaSala: z.object({
        diasSemana: z.array(z.string()).optional(),
        turnoManha: z.number().optional(),
        turnoTarde: z.number().optional(),
        semanasMes: z.number().optional(),
        horasOcupadas: z.number().optional(),
        faturamentoMensal: z.number().optional(),
      }).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await saveExpenseData(ctx.menteeId, input.expenses, input.mapaSala);
      return { success: true };
    }),

  getMyExpenses: menteeProcedure
    .query(async ({ ctx }) => {
      return getExpenseData(ctx.menteeId);
    }),

  // Expanded iVMP — salvar respostas do mentorado
  saveIvmpAnswers: menteeProcedure
    .input(z.object({
      answers: z.record(z.string(), z.number()),
    }))
    .mutation(async ({ ctx, input }) => {
      const { ivmpFinal } = calculateIvmpScores(input.answers);
      await saveIvmpAnswers(ctx.menteeId, input.answers, ivmpFinal);
      return { success: true };
    }),

  // Expanded iVMP — progresso (quais perguntas foram respondidas, SEM scores)
  getMyIvmpProgress: menteeProcedure
    .query(async ({ ctx }) => {
      const data = await getIvmpAnswers(ctx.menteeId);
      if (!data || !data.answers) return { answeredIds: [] as string[], answers: {} as Record<string, number> };
      // Return answered IDs and raw answers (NO scores, NO analysis)
      const answers = data.answers as Record<string, number>;
      return { answeredIds: Object.keys(answers), answers };
    }),

  // Simulation — read-only results for mentee
  getMySimulation: menteeProcedure
    .query(async ({ ctx }) => {
      const data = await getSimulationData(ctx.menteeId);
      if (!data || !data.params) return null;
      const result = calculateSimulation({
        ...data.params,
        servicos: data.servicos as Service[],
        mixAtendimentos: data.mixAtendimentos,
      });
      // Return read-only results (no raw service data that could reveal cost structure)
      return {
        result,
        baseParams: {
          custoFixoTotal: data.params.custoFixoTotal,
          horasDisponiveisMes: data.params.horasDisponiveisMes,
          horasOcupadasMes: data.params.horasOcupadasMes,
        },
      };
    }),
  getPendencies: menteeProcedure
    .query(async ({ ctx }) => {
      const menteeId = ctx.menteeId;

      // 1. Respostas dos questionários
      const allAnswers = await getAllPillarAnswersForMentee(menteeId);
      // Map: pillarId -> sectionId -> status
      const answerMap: Record<number, Record<string, string>> = {};
      for (const a of allAnswers) {
        if (!answerMap[a.pillarId]) answerMap[a.pillarId] = {};
        answerMap[a.pillarId][a.secao] = a.status;
      }

      // 2. Pilares liberados (part_releases)
      const partReleasesList = await getPartReleases(menteeId);
      const releasedParts = new Set(partReleasesList.filter(p => p.released).map(p => `${p.pillarId}-${p.partId}`));

      // 3. Despesas fixas
      const expenseData = await getExpenseData(menteeId);
      // despesasJson é um array de categorias [{cat, items:[{name, values:[...]}]}]
      // Verifica se há pelo menos um item com valor > 0
      let hasExpenses = false;
      let expensesTotal = 0;
      const rawExpenses = expenseData?.expenses;
      if (rawExpenses) {
        if (Array.isArray(rawExpenses)) {
          // Estrutura real: array de categorias
          for (const cat of rawExpenses as any[]) {
            if (cat.items && Array.isArray(cat.items)) {
              for (const item of cat.items) {
                if (item.values && Array.isArray(item.values)) {
                  const sum = item.values.reduce((s: number, v: number) => s + (v || 0), 0);
                  if (sum > 0) { hasExpenses = true; expensesTotal += sum; }
                }
              }
            }
          }
        } else if (typeof rawExpenses === "object") {
          // Fallback: estrutura antiga como Record<string, number>
          const vals = Object.values(rawExpenses as Record<string, number>);
          expensesTotal = vals.reduce((s, v) => s + (v || 0), 0);
          hasExpenses = vals.length > 0;
        }
      }

      // 4. iVMP — a estrutura é um array de categorias com perguntas individuais
      const ivmpData = await getIvmpAnswers(menteeId);
      // Conta perguntas com score diferente do padrão (0.5) para saber se foi realmente preenchido
      let ivmpAnsweredCount = 0;
      const TOTAL_IVMP = 53;
      if (ivmpData?.answers && Array.isArray(ivmpData.answers)) {
        for (const cat of ivmpData.answers as any[]) {
          if (cat.questions && Array.isArray(cat.questions)) {
            for (const q of cat.questions) {
              if (q.score !== undefined && q.score !== 0.5) ivmpAnsweredCount++;
            }
          }
        }
      } else if (ivmpData?.answers && typeof ivmpData.answers === "object") {
        // Fallback: estrutura antiga como objeto
        ivmpAnsweredCount = Object.keys(ivmpData.answers).length;
      }

      // Build pendencies list
      const pendencies: Array<{
        type: "questionnaire" | "tool" | "urgent";
        pillarId: number;
        pillarTitle: string;
        sectionId?: string;
        sectionTitle?: string;
        message: string;
        partId?: string;
      }> = [];

      const PILLAR_NAMES: Record<number, string> = {
        1: "Identidade e Propósito",
        2: "Posicionamento",
        3: "Diagnóstico Financeiro",
        4: "Gestão e Processos",
        5: "Engenharia de Preços",
        6: "Marketing Digital",
        7: "Vendas e Atendimento",
      };

      // Mapeamento parte -> seções do questionário (igual ao frontend PART_SECTION_MAP)
      const PART_SECTION_MAP: Record<number, Record<string, string[]>> = {
        1: { a: ["quem_sou", "valores"], b: ["ikigai", "valores_avancados"], c: ["missao_visao", "reflexao_identidade"] },
        2: { a: ["especialidade_atuacao", "publico_ideal"], b: ["diferencial"], c: ["proposta_valor"] },
        3: { a: ["estrutura_clinica", "custos_fixos", "custos_deslocamento", "faturamento_producao", "ociosidade_potencial", "reflexao_financeira"] },
        4: { a: ["equipe_gestao"], b: ["processos_atendimento"], c: ["reflexao_operacional"] },
        5: { a: ["precificacao_atual"], b: ["custos_variaveis"], c: ["reflexao_precificacao"] },
        6: { a: ["presenca_digital_atual"], b: ["comunicacao_tom_voz"], c: ["reflexao_marketing"] },
        7: { a: ["apresentacao_tratamento"], b: ["objecoes_comuns"], c: ["reflexao_conversao"] },
      };

      // Verifica pendências por parte liberada individualmente
      for (const pr of partReleasesList.filter(p => p.released)) {
        const { pillarId, partId } = pr;
        const pillarTitle = PILLAR_NAMES[pillarId] || `Pilar ${pillarId}`;

        // Partes de questionário: verifica se as seções específicas desta parte foram respondidas
        const partSections = PART_SECTION_MAP[pillarId]?.[partId];
        if (partSections && partSections.length > 0) {
          const sectionAnswers = answerMap[pillarId] || {};
          // Verifica se TODAS as seções desta parte específica foram concluídas
          const allSectionsCompleted = partSections.every(s => sectionAnswers[s] === "concluida");
          const anySectionInProgress = partSections.some(s => sectionAnswers[s] === "em_progresso");
          const anySectionStarted = partSections.some(s => sectionAnswers[s] !== undefined);

          if (!allSectionsCompleted) {
            if (!anySectionStarted) {
              pendencies.push({
                type: "urgent",
                pillarId,
                pillarTitle,
                partId,
                message: `Pilar ${pillarId} (${pillarTitle}) — Parte ${partId.toUpperCase()} liberada mas ainda não iniciada`,
              });
            } else if (anySectionInProgress || !allSectionsCompleted) {
              // Conta quantas seções faltam
              const missing = partSections.filter(s => sectionAnswers[s] !== "concluida");
              pendencies.push({
                type: "questionnaire",
                pillarId,
                pillarTitle,
                partId,
                message: `Pilar ${pillarId} Parte ${partId.toUpperCase()} — ${missing.length} seção(s) pendente(s): ${missing.map(s => s.replace(/_/g, " ")).join(", ")}`,
              });
            }
          }
        }
        // Partes de ferramenta (b, c, d do Pilar 3) são verificadas separadamente abaixo
      }

      // Check expenses tool (Pilar 3 part b)
      const expensesReleased = releasedParts.has("3-b") || partReleasesList.some(p => p.pillarId === 3);
      if (expensesReleased) {
        if (!hasExpenses) {
          pendencies.push({
            type: "tool",
            pillarId: 3,
            pillarTitle: PILLAR_NAMES[3],
            partId: "b",
            message: "Despesas Fixas (Pilar 3) — nenhuma despesa preenchida ainda",
          });
        } else if (expensesTotal === 0) {
          pendencies.push({
            type: "tool",
            pillarId: 3,
            pillarTitle: PILLAR_NAMES[3],
            partId: "b",
            message: "Despesas Fixas (Pilar 3) — todas as despesas estão zeradas. Verifique se os valores estão corretos.",
          });
        }
      }

      // Check iVMP (Pilar 3 part c)
      const ivmpReleased = releasedParts.has("3-c") || partReleasesList.some(p => p.pillarId === 3);
      if (ivmpReleased) {
        if (ivmpAnsweredCount === 0) {
          pendencies.push({
            type: "tool",
            pillarId: 3,
            pillarTitle: PILLAR_NAMES[3],
            partId: "c",
            message: `iVMP (Pilar 3) — nenhuma das ${TOTAL_IVMP} perguntas respondidas ainda`,
          });
        } else if (ivmpAnsweredCount < TOTAL_IVMP) {
          pendencies.push({
            type: "tool",
            pillarId: 3,
            pillarTitle: PILLAR_NAMES[3],
            partId: "c",
            message: `iVMP (Pilar 3) — ${ivmpAnsweredCount} de ${TOTAL_IVMP} perguntas respondidas. Faltam ${TOTAL_IVMP - ivmpAnsweredCount}.`,
          });
        }
      }

      return {
        pendencies,
        summary: {
          total: pendencies.length,
          urgent: pendencies.filter(p => p.type === "urgent").length,
          questionnaire: pendencies.filter(p => p.type === "questionnaire").length,
          tools: pendencies.filter(p => p.type === "tool").length,
        },
      };
    }),
  // AI Proativa — sugestão de dados esquecidos em qualquer contexto
  getAiSuggestion: menteeProcedure
    .input(z.object({
      contexto: z.string(), // qual pilar/seção/ferramenta está sendo preenchida
      dados: z.string(),    // JSON string dos dados já preenchidos
      tipo: z.enum(["expenses", "questionnaire", "ivmp", "services", "general"]),
    }))
    .mutation(async ({ input }) => {
      const tipoPrompts: Record<string, string> = {
        expenses: `Você é um assistente especializado em gestão financeira de consultórios médicos.
Sua única função é ajudar o médico a lembrar de custos que ele pode ter esquecido.
REGRAS ABSOLUTAS:
- NUNCA faça análises, totais, percentuais ou comparações
- NUNCA sugira melhorias de gestão ou estratégias
- APENAS aponte custos específicos que podem estar faltando, baseado nos dados já preenchidos
- Seja muito específico: mencione o nome exato do custo e por que ele pode existir
- Máximo 3 sugestões por vez, em formato de lista simples
- Use linguagem direta: "Você tem custo com X?" ou "Médicos que atendem em Y costumam ter custo com Z"
- Se todos os custos parecem completos, diga apenas: "Os dados desta categoria parecem completos."`,
        questionnaire: `Você é um guia discreto que ajuda médicos a responder questionários de autoavaliação com mais profundidade.
Sua função é sugerir aspectos que o médico pode não ter considerado ao responder.
REGRAS:
- NUNCA analise as respostas dadas
- NUNCA sugira que algo está errado ou incompleto
- Apenas aponte perspectivas ou aspectos adicionais que enriquecem a resposta
- Máximo 2-3 frases
- Tom de guia útil, não de avaliador`,
        ivmp: `Você é um guia para questionários de autoavaliação de gestão médica.
Ajude o médico a refletir com mais profundidade sobre cada dimensão do iVMP.
REGRAS:
- NUNCA mostre scores, médias ou comparações
- NUNCA analise as respostas
- Apenas ofereça perspectivas para reflexão mais profunda
- Máximo 2 frases por sugestão`,
        services: `Você é um especialista em precificação de serviços médicos.
Sua função é ajudar o médico a lembrar de serviços ou custos variáveis que ele pode ter esquecido ao listar seus procedimentos.
REGRAS:
- NUNCA calcule valores ou sugira preços
- APENAS aponte serviços ou custos que podem estar faltando
- Seja específico para a especialidade médica mencionada
- Máximo 3 sugestões`,
        general: `Você é um assistente que ajuda médicos a não esquecer informações importantes durante o preenchimento de formulários.
Seja específico, breve e útil. Máximo 2-3 frases.`,
      };
      const systemPrompt = tipoPrompts[input.tipo] || tipoPrompts.general;
      const response = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Contexto: ${input.contexto}\n\nDados já preenchidos:\n${input.dados}\n\nO que pode estar faltando ou o que o médico pode não ter considerado?` },
        ],
      });
      const suggestion = String(response?.choices?.[0]?.message?.content || "");
      return { suggestion };
    }),
  // Pilar 5 — Mentorado salva lista de serviços para a planilha de precificação
  saveMyServices: menteeProcedure
    .input(z.object({
      servicos: z.array(z.object({
        id: z.string(),
        nome: z.string(),
        duracaoHoras: z.number(),
        precoVenda: z.number(),
        impostoPercent: z.number(),
        taxaCartaoPercent: z.number(),
        mod: z.number(),
        matMed: z.number(),
        bonusPercent: z.number(),
        taxaEquipamento: z.number(),
        rateioPercent: z.number().optional(), // rateio medico/clinica
        quantidadeMes: z.number().optional(), // qtd atendimentos/mês (simulador)
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      const existing = await getSimulationData(ctx.menteeId);
      // Extrai mixAtendimentos do campo quantidadeMes de cada serviço
      const mixAtendimentos: Record<string, number> = { ...(existing?.mixAtendimentos || {}) };
      for (const s of input.servicos) {
        if (s.quantidadeMes !== undefined) {
          mixAtendimentos[s.id] = s.quantidadeMes;
        }
      }
      // Remove quantidadeMes dos serviços antes de salvar (fica só no mix)
      const servicosSemQtd = input.servicos.map(({ quantidadeMes: _qty, ...rest }) => rest);
      await saveSimulationData(ctx.menteeId, {
        servicos: servicosSemQtd,
        mixAtendimentos,
        params: existing?.params || {
          custoFixoTotal: 0,
          custosVariaveisPercent: 20,
          taxaSalaHora: 0,
          horasDisponiveisMes: 160,
          horasOcupadasMes: 80,
          faturamentoMensal: 0,
        },
      });
      return { success: true };
    }),
  // Pilar 5 — Busca dados pré-preenchidos para a planilha de precificação
  getPricingTableData: menteeProcedure
    .query(async ({ ctx }) => {
      // Busca despesas fixas do Pilar 3
      const expenses = await getExpenseData(ctx.menteeId);
      const totalExpenses = expenses?.expenses
        ? Object.values(expenses.expenses as Record<string, unknown>).reduce((a: number, b) => a + (Number(b) || 0), 0)
        : 0;
      const taxaSalaHora = expenses?.mapaSala?.horasOcupadas && expenses.mapaSala.horasOcupadas > 0
        ? totalExpenses / expenses.mapaSala.horasOcupadas
        : 0;
      // Busca serviços já salvos
      const simData = await getSimulationData(ctx.menteeId);
      // Busca respostas do Pilar 5 para pré-preencher
      const pillar5Answers = await getPillarAnswers(ctx.menteeId, 5);
      const p5Flat: Record<string, string> = {};
      for (const row of pillar5Answers || []) {
        for (const ans of (row.respostas as any[]) || []) {
          if (ans.resposta !== null && ans.resposta !== undefined) {
            p5Flat[ans.id] = String(ans.resposta);
          }
        }
      }
      return {
        custoFixoTotal: totalExpenses,
        taxaSalaHora,
        horasOcupadas: expenses?.mapaSala?.horasOcupadas || 0,
        servicos: simData?.servicos || [],
        mixAtendimentos: simData?.mixAtendimentos || {},
        // Dados do Pilar 5 para pré-preencher
        taxaCartaoDefault: p5Flat["p3_taxa_cartao"] ? parseFloat(p5Flat["p3_taxa_cartao"]) : 5,
        procedimentosLista: p5Flat["p5_procedimentos_lista"] || "",
        materialPorConsulta: p5Flat["p5_material_por_consulta"] ? parseFloat(p5Flat["p5_material_por_consulta"]) : 0,
        valorConsultaParticular: p5Flat["p3_valor_consulta_particular"] ? parseFloat(p5Flat["p3_valor_consulta_particular"]) : 0,
      };
    }),
  // Pilar 5 — IA assistente para simulações de precificação (mentorado)
  getPricingAiAdvice: menteeProcedure
    .input(z.object({
      pergunta: z.string(),
      servicos: z.array(z.any()),
      custoFixoTotal: z.number(),
      objetivo: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const systemPrompt = `Você é um assistente especializado em precificação de serviços médicos.
Sua função é ajudar o médico a entender sua planilha de precificação e simular cenários.
REGRAS ABSOLUTAS:
- NUNCA revele os custos fixos totais nem a estrutura de custos completa
- NUNCA faça julgamentos sobre os valores cobrados
- Responda de forma prática e direta sobre o impacto de ajustes específicos
- Se o médico perguntar "o que acontece se eu cobrar X?", calcule o impacto na margem
- Use linguagem acessível, sem jargão financeiro complexo
- Máximo 3 parágrafos por resposta`;
      const servicosStr = input.servicos.map((s: any) =>
        `${s.nome}: R$${s.precoVenda}, ${s.duracaoHoras}h, margem bruta estimada ${((1 - (s.impostoPercent + s.taxaCartaoPercent + s.bonusPercent) / 100) * 100).toFixed(0)}%`
      ).join("; ");
      const response = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Meus serviços: ${servicosStr}\nCusto fixo mensal: R$${input.custoFixoTotal}\n${input.objetivo ? `Meu objetivo: ${input.objetivo}\n` : ""}\nPergunta: ${input.pergunta}` },
        ],
      });
      const advice = String(response?.choices?.[0]?.message?.content || "");
      return { advice };
    }),

  // ── Mentorado: gera PDF do relatório liberado e retorna como base64 ──
  generatePdf: menteeProcedure
    .input(z.object({ pillarId: z.number().min(1).max(7) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível" });
      const [report] = await db.select().from(pillarReports)
        .where(and(eq(pillarReports.menteeId, ctx.menteeId), eq(pillarReports.pillarId, input.pillarId)))
        .limit(1);
      if (!report || report.status !== "released" || !report.htmlContent) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Relatório não encontrado ou ainda não liberado pelo mentor." });
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
      const pillarName = PILLAR_NAMES[input.pillarId] ?? `Pilar-${input.pillarId}`;
      const mentee = await getMenteeById(ctx.menteeId);
      const menteeName = mentee?.nome ?? "Mentorado";
      const fileName = `MedMentoring_Pilar${input.pillarId}-${pillarName}_${menteeName.replace(/\s+/g, "-")}.pdf`;

      // Parse stored JSON fields
      const strengths: string[] = JSON.parse(report.strengthsJson ?? "[]");
      const attentionPoints: string[] = JSON.parse(report.attentionJson ?? "[]");
      const actionPlan = JSON.parse(report.actionPlanJson ?? "[]");
      const suggestions = JSON.parse(report.suggestionsJson ?? "[]");

      const pdfBuffer = await generateReportPdf({
        menteeName,
        pillarId: input.pillarId,
        pillarName: pillarName.replace(/-/g, " "),
        title: report.title ?? `Relatório — Pilar ${input.pillarId}`,
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

});

// ============================================================
// ONBOARDING PÚBLICO — Formulário de prospecção
// ============================================================
const onboardingRouter = router({
  submit: publicProcedure
    .input(
      z.object({
        nome: z.string().min(2),
        email: z.string().email(),
        telefone: z.string().optional(),
        especialidade: z.string().optional(),
        tempoFormacao: z.string().optional(),
        estruturaAtual: z.string().optional(),
        faturamentoFaixa: z.string().optional(),
        principalDor: z.string().optional(),
        tentouResolver: z.string().optional(),
        disponibilidade: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      // Identificar pilares prioritários automaticamente
      const pilaresIdentificados: number[] = [];
      const dor = (input.principalDor || "").toLowerCase();
      if (dor.includes("dinheiro") || dor.includes("financeiro") || dor.includes("sobra")) pilaresIdentificados.push(3, 5);
      if (dor.includes("diferenci") || dor.includes("posicion")) pilaresIdentificados.push(1, 2);
      if (dor.includes("equipe") || dor.includes("depende")) pilaresIdentificados.push(4);
      if (dor.includes("google") || dor.includes("instagram") || dor.includes("digital")) pilaresIdentificados.push(6);
      if (dor.includes("vend") || dor.includes("tratamento") || dor.includes("fechar")) pilaresIdentificados.push(7);
      if (pilaresIdentificados.length === 0) pilaresIdentificados.push(3);

      const id = await createOnboardingForm({ ...input, pilaresIdentificados });

      await notifyOwner({
        title: "Novo lead — Sessão de Diagnóstico",
        content: `${input.nome} (${input.especialidade || "especialidade não informada"}) solicitou uma sessão de diagnóstico gratuita. Email: ${input.email}`,
      });

      return { id };
    }),
});

// ============================================================
// MARKETING ROUTER — Gerador de prompt personalizado por IA
// ============================================================
const marketingRouter = router({
  generatePrompt: protectedProcedure
    .input(z.object({
      menteeId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const mentee = await getMenteeById(input.menteeId);
      if (!mentee) throw new TRPCError({ code: "NOT_FOUND", message: "Mentorado não encontrado" });

      // Buscar dados de todos os pilares para personalizar o prompt
      const [p1, p2, p6] = await Promise.all([
        getPillarDiagnostic(input.menteeId, 1),
        getPillarDiagnostic(input.menteeId, 2),
        getPillarDiagnostic(input.menteeId, 6),
      ]);

      const p1Data = p1?.respostasJson as Record<string, unknown> | null;
      const p2Data = p2?.respostasJson as Record<string, unknown> | null;
      const p6Data = p6?.respostasJson as Record<string, unknown> | null;

      const missaoFinal = p1Data?.missaoFinal as string || "";
      const visaoFinal = p1Data?.visaoFinal as string || "";
      const valoresSelecionados = p1Data?.valoresSelecionados as string[] || [];
      const ikigaiProposta = p1Data?.ikigaiProposta as string || "";
      const posicionamento = p2Data?.posicionamentoFinal as string || "";
      const publicoAlvo = p2Data?.publicoAlvoFinal as string || "";
      const bloqueiosMarketing = p6Data?.bloqueiosMarketing as string || "";

      const systemPrompt = `Você é um especialista em marketing médico digital para profissionais de saúde de alto padrão no Brasil. 
Sua tarefa é criar um prompt personalizado de marketing pessoal para um médico específico, baseado nos dados coletados durante a mentoria.
O prompt deve ser estruturado para ser usado com ferramentas de IA (ChatGPT, Claude, Gemini) que se integram com Canva.
O resultado deve ser um prompt completo, pronto para uso, que o médico possa copiar e colar em qualquer IA.`;

      const userPrompt = `Crie um prompt de marketing pessoal personalizado para o seguinte médico:

**DADOS DO MÉDICO:**
- Nome: ${mentee.nome}
- Especialidade: ${mentee.especialidade || "não informada"}
- Cidade: ${mentee.cidade || "não informada"}
- Missão: ${missaoFinal || "não definida ainda"}
- Visão: ${visaoFinal || "não definida ainda"}
- Valores: ${valoresSelecionados.join(", ") || "não definidos ainda"}
- Propósito (Ikigai): ${ikigaiProposta || "não definido ainda"}
- Posicionamento: ${posicionamento || "não definido ainda"}
- Público-alvo: ${publicoAlvo || "não definido ainda"}
- Bloqueios com marketing: ${bloqueiosMarketing || "não identificados"}

**BASEIE-SE NESTA ESTRUTURA DE REFERÊNCIA:**
O prompt deve incluir:
1. ALMA DA MARCA: arquétipo, tom de voz, público-alvo específico para este médico
2. ESTRATÉGIA DE CONTEÚDO: 3 pilares semanais (Segunda: educação profunda em carrossel; Quarta: desmistificação rápida em Reels; Sexta: branding e posicionamento)
3. REGRAS DE ESCRITA: vocabulário técnico com analogias, validação da experiência do paciente, linguagem empática e científica
4. POSICIONAMENTO PREMIUM: como comunicar valor sem parecer arrogante
5. CALENDÁRIO EDITORIAL: sugestão de 4 semanas de conteúdo com temas específicos para a especialidade
6. FERRAMENTAS: instruções para usar ChatGPT + Canva para criar os conteúdos
7. HORÁRIOS DE POSTAGEM: Segunda 12h (carrossel), Quarta 19h (Reels), Sexta 12h (branding)

O prompt deve:
- Ser escrito em português brasileiro
- Usar a especialidade e o posicionamento do médico para sugerir temas específicos
- Incluir exemplos concretos de posts para a especialidade dele
- Ser pronto para copiar e colar em qualquer IA
- Ter no máximo 2000 palavras
- Começar com: "Você é o agente de marketing pessoal do Dr./Dra. [nome]..."`;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      });

      const promptGerado = response.choices?.[0]?.message?.content || "";

      // Salvar no diagnóstico do pilar 6
      await upsertPillarDiagnostic(input.menteeId, 6, {
        respostasJson: { ...((p6Data as object) || {}), promptGerado, promptGeradoEm: new Date().toISOString() },
      });

      return { prompt: promptGerado };
    }),

  saveMarketingData: protectedProcedure
    .input(z.object({
      menteeId: z.number(),
      data: z.any(),
    }))
    .mutation(async ({ input }) => {
      const existing = await getPillarDiagnostic(input.menteeId, 6);
      const existingData = (existing?.respostasJson as object) || {};
      await upsertPillarDiagnostic(input.menteeId, 6, {
        respostasJson: { ...existingData, ...input.data },
      });
      return { success: true };
    }),

  getMarketingData: protectedProcedure
    .input(z.object({ menteeId: z.number() }))
    .query(async ({ input }) => {
      return await getPillarDiagnostic(input.menteeId, 6);
    }),
});

// ============================================================
// QUESTIONNAIRE ROUTER — Questionário autônomo por fases (mentorado)
// ============================================================
const questionnaireRouter = router({
  // Busca todas as fases do mentorado (progresso)
  getProgress: menteeProcedure.query(async ({ ctx }) => {
    const phases = await getAllQuestionnairePhases(ctx.menteeId);
    return phases;
  }),

  // Busca uma fase específica
  getPhase: menteeProcedure
    .input(z.object({ faseId: z.number().min(1).max(6) }))
    .query(async ({ ctx, input }) => {
      return await getQuestionnairePhase(ctx.menteeId, input.faseId);
    }),

  // Salva respostas de uma fase (auto-save)
  savePhaseAnswers: menteeProcedure
    .input(z.object({
      faseId: z.number().min(1).max(6),
      respostas: z.array(z.object({
        perguntaId: z.string(),
        pergunta: z.string(),
        resposta: z.string(),
      })),
      status: z.enum(["em_progresso", "concluida"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const data: Record<string, unknown> = {
        respostasJson: input.respostas,
        status: input.status,
      };
      if (input.status === "concluida") {
        data.concluidaEm = new Date();
      }
      await upsertQuestionnairePhase(ctx.menteeId, input.faseId, data);
      return { success: true };
    }),

  // Conclui uma fase e gera resumo via IA para o mentor
  completePhase: menteeProcedure
    .input(z.object({
      faseId: z.number().min(1).max(6),
      respostas: z.array(z.object({
        perguntaId: z.string(),
        pergunta: z.string(),
        resposta: z.string(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      const faseNomes = [
        "", "Identidade e Propósito", "Perfil Profissional",
        "Situação Atual", "Sonhos e Objetivos",
        "Presença Digital", "Paciente Ideal"
      ];
      const faseNome = faseNomes[input.faseId] || `Fase ${input.faseId}`;
      const mentee = ctx.mentee;

      // Formata as respostas para o LLM
      const respostasFormatadas = input.respostas
        .map(r => `**${r.pergunta}**\n${r.resposta}`)
        .join("\n\n");

      // Gera resumo via IA
      const systemPrompt = `Você é um assistente especializado em mentoria médica. 
Analise as respostas do mentorado e gere um resumo estruturado, perspicaz e acionável para o mentor.
O resumo deve:
1. Sintetizar os pontos principais revelados nas respostas
2. Identificar padrões, crenças e oportunidades implícitas
3. Destacar elementos relevantes para construção da persona de marketing
4. Usar linguagem profissional e objetiva
5. Ter no máximo 400 palavras`;

      const userPrompt = `Mentorado: ${mentee.nome} | Especialidade: ${mentee.especialidade || 'não informada'}
Fase: ${faseNome}

Respostas:
${respostasFormatadas}`;

      let resumoIa = "";
      try {
        const response = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        });
        resumoIa = String(response.choices?.[0]?.message?.content || "");
      } catch (e) {
        resumoIa = "Resumo não disponível (erro na geração)";
      }

      // Salva fase como concluída com resumo
      await upsertQuestionnairePhase(ctx.menteeId, input.faseId, {
        respostasJson: input.respostas,
        status: "concluida",
        resumoIa,
        concluidaEm: new Date(),
      });

      // Cria documento na pasta do mentor
      await createMenteeDocument({
        menteeId: ctx.menteeId,
        tipo: "resumo_fase",
        titulo: `Fase ${input.faseId} — ${faseNome} (${mentee.nome})`,
        conteudo: `# ${faseNome}\n\n## Respostas do Mentorado\n\n${respostasFormatadas}\n\n---\n\n## Análise do Sistema\n\n${resumoIa}`,
        metadados: { faseId: input.faseId, faseNome },
        lidoPeloMentor: false,
      });

      // Notifica o mentor
      try {
        await notifyOwner({
          title: `📋 ${mentee.nome} concluiu: ${faseNome}`,
          content: `O mentorado ${mentee.nome} concluiu a ${faseNome} do questionário autônomo. Um novo documento foi gerado na pasta de documentos.`,
        });
      } catch (_) {}

      return { success: true, resumoIa };
    }),
});

// ============================================================
// DOCUMENTS ROUTER — Pasta de documentos do mentor
// ============================================================
const documentsRouter = router({
  // Lista todos os documentos de um mentorado (para o mentor)
  list: protectedProcedure
    .input(z.object({ menteeId: z.number() }))
    .query(async ({ input }) => {
      return await getMenteeDocuments(input.menteeId);
    }),

  // Marca documento como lido
  markRead: protectedProcedure
    .input(z.object({ documentId: z.number() }))
    .mutation(async ({ input }) => {
      await markDocumentRead(input.documentId);
      return { success: true };
    }),

  // Deleta documento
  delete: protectedProcedure
    .input(z.object({ documentId: z.number() }))
    .mutation(async ({ input }) => {
      await deleteMenteeDocument(input.documentId);
      return { success: true };
    }),

  // Gera prompt de marketing consolidado com TODOS os documentos do mentorado
  generateMarketingPrompt: protectedProcedure
    .input(z.object({ menteeId: z.number() }))
    .mutation(async ({ input }) => {
      const mentee = await getMenteeById(input.menteeId);
      if (!mentee) throw new TRPCError({ code: "NOT_FOUND" });

      // Busca todos os documentos e fases do questionário
      const docs = await getMenteeDocuments(input.menteeId);
      const phases = await getAllQuestionnairePhases(input.menteeId);
      const p6Diag = await getPillarDiagnostic(input.menteeId, 6);
      const p1Diag = await getPillarDiagnostic(input.menteeId, 1);
      const p2Diag = await getPillarDiagnostic(input.menteeId, 2);

      // Consolida todo o conteúdo
      const fasesContent = phases
        .filter(p => p.status === "concluida" && p.resumoIa)
        .map(p => {
          const nomes = ["","Identidade e Propósito","Perfil Profissional","Situação Atual","Sonhos e Objetivos","Presença Digital","Paciente Ideal"];
          return `### ${nomes[p.faseId] || `Fase ${p.faseId}`}\n${p.resumoIa}`;
        })
        .join("\n\n");

      const systemPrompt = `Você é um especialista em marketing médico e branding pessoal para profissionais de saúde.
Com base em todas as informações coletadas sobre o médico durante a mentoria, crie um PROMPT MESTRE completo e detalhado.

Este prompt deve ser usado pelo médico diretamente no ChatGPT, Claude ou qualquer IA para gerar conteúdo de marketing personalizado.

O prompt deve:
1. Definir a persona completa do médico (quem é, valores, missão, estilo de comunicação)
2. Descrever o paciente ideal com profundidade (perfil demográfico, psicográfico, dores, desejos)
3. Definir o tom de voz e linguagem ideal para as redes sociais
4. Incluir os diferenciais únicos do médico
5. Especificar os pilares de conteúdo (temas que deve abordar)
6. Dar instruções claras para a IA sobre o que NUNCA fazer
7. Incluir exemplos de tipos de post ideais para este médico

Formate o prompt de forma que o médico possa copiar e colar diretamente em qualquer IA.`;

      const userPrompt = `MÉDICO: ${mentee.nome}
ESPECIALIDADE: ${mentee.especialidade || 'não informada'}
CIDADE: ${mentee.cidade || 'não informada'}

## DADOS DO QUESTIONÁRIO AUTÔNOMO
${fasesContent || 'Questionário não preenchido'}

## DADOS DO DIAGNÓSTICO DE IDENTIDADE (Pilar 1)
${JSON.stringify(p1Diag?.respostasJson || {}, null, 2)}

## DADOS DE POSICIONAMENTO (Pilar 2)
${JSON.stringify(p2Diag?.respostasJson || {}, null, 2)}

## DADOS DE MARKETING (Pilar 6)
${JSON.stringify(p6Diag?.respostasJson || {}, null, 2)}`;

      let promptGerado = "";
      try {
        const response = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        });
        promptGerado = String(response.choices?.[0]?.message?.content || "");
      } catch (e) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao gerar prompt" });
      }

      // Salva o prompt como documento
      await createMenteeDocument({
        menteeId: input.menteeId,
        tipo: "prompt_marketing",
        titulo: `Prompt de Marketing — ${mentee.nome} (${new Date().toLocaleDateString('pt-BR')})`,
        conteudo: promptGerado,
        metadados: { geradoEm: new Date().toISOString() },
        lidoPeloMentor: false,
      });

      return { prompt: promptGerado };
    }),

  // Gera resumo completo do questionário (todos os documentos juntos)
  generateFullSummary: protectedProcedure
    .input(z.object({ menteeId: z.number() }))
    .mutation(async ({ input }) => {
      const mentee = await getMenteeById(input.menteeId);
      if (!mentee) throw new TRPCError({ code: "NOT_FOUND" });

      const phases = await getAllQuestionnairePhases(input.menteeId);
      const completedPhases = phases.filter(p => p.status === "concluida");

      if (completedPhases.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Nenhuma fase concluída ainda" });
      }

      const faseNomes = ["","Identidade e Propósito","Perfil Profissional","Situação Atual","Sonhos e Objetivos","Presença Digital","Paciente Ideal"];

      const conteudo = completedPhases.map(p => {
        const respostas = (p.respostasJson as Array<{pergunta: string, resposta: string}> | null) || [];
        const respostasText = respostas.map(r => `**${r.pergunta}**\n${r.resposta}`).join("\n\n");
        return `# ${faseNomes[p.faseId] || `Fase ${p.faseId}`}\n\n${respostasText}\n\n---\n\n**Análise:**\n${p.resumoIa || 'Sem análise'}`;
      }).join("\n\n---\n\n");

      const docId = await createMenteeDocument({
        menteeId: input.menteeId,
        tipo: "resumo_questionario",
        titulo: `Resumo Completo — ${mentee.nome} (${new Date().toLocaleDateString('pt-BR')})`,
        conteudo,
        metadados: { fasesIncluidas: completedPhases.map(p => p.faseId), geradoEm: new Date().toISOString() },
        lidoPeloMentor: false,
      });

      return { success: true, documentId: docId };
    }),
});

// ============================================================
// PILLAR TOOLS ROUTER — LLM-powered tools for each pillar
// ============================================================
const pillarToolsRouter = router({
  // Pilar 2 — Avalia se o diferencial do médico é genérico ou único
  evaluateDifferential: protectedProcedure
    .input(z.object({
      menteeId: z.number(),
      diferencial: z.string().min(10),
      especialidade: z.string().optional(),
      cidade: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `Você é um especialista em posicionamento de marca para médicos. Avalie o diferencial declarado pelo médico e forneça um feedback estruturado em JSON com os campos: score (0-10), classificacao ("genérico" | "mediano" | "único"), pontos_fortes (array de strings), pontos_fracos (array de strings), sugestao_melhorada (string com versão aprimorada do diferencial), explicacao (string explicando a avaliação em 2-3 frases diretas).`,
          },
          {
            role: "user",
            content: `Médico especialidade: ${input.especialidade || "não informada"} | Cidade: ${input.cidade || "não informada"}\n\nDiferencial declarado: "${input.diferencial}"\n\nAvalie este diferencial e retorne o JSON estruturado.`,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "differential_evaluation",
            strict: true,
            schema: {
              type: "object",
              properties: {
                score: { type: "number" },
                classificacao: { type: "string" },
                pontos_fortes: { type: "array", items: { type: "string" } },
                pontos_fracos: { type: "array", items: { type: "string" } },
                sugestao_melhorada: { type: "string" },
                explicacao: { type: "string" },
              },
              required: ["score", "classificacao", "pontos_fortes", "pontos_fracos", "sugestao_melhorada", "explicacao"],
              additionalProperties: false,
            },
          },
        },
      });
      const content = String(response?.choices?.[0]?.message?.content || "{}");
      return JSON.parse(extractJSON(content));
    }),

  // Pilar 7 — Gera resposta ética personalizada para objeção de paciente
  generateObjectionResponse: protectedProcedure
    .input(z.object({
      menteeId: z.number(),
      objecao: z.string(),
      especialidade: z.string().optional(),
      tratamento: z.string().optional(),
      estilo: z.enum(["empático", "direto", "consultivo"]).default("empático"),
    }))
    .mutation(async ({ input }) => {
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `Você é um especialista em comunicação médica ética e vendas consultivas para médicos. Gere respostas para objeções de pacientes que sejam éticas, empáticas e eficazes. Retorne JSON com: resposta_principal (string — resposta direta à objeção), tecnica_usada (string — nome da técnica de comunicação), explicacao_tecnica (string — por que essa técnica funciona aqui), variacao_alternativa (string — outra forma de responder), dica_comportamental (string — postura/tom recomendado).`,
          },
          {
            role: "user",
            content: `Médico: especialidade ${input.especialidade || "médica"} | Tratamento em discussão: ${input.tratamento || "não especificado"} | Estilo preferido: ${input.estilo}\n\nObjeção do paciente: "${input.objecao}"\n\nGere a resposta ética e eficaz para esta objeção.`,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "objection_response",
            strict: true,
            schema: {
              type: "object",
              properties: {
                resposta_principal: { type: "string" },
                tecnica_usada: { type: "string" },
                explicacao_tecnica: { type: "string" },
                variacao_alternativa: { type: "string" },
                dica_comportamental: { type: "string" },
              },
              required: ["resposta_principal", "tecnica_usada", "explicacao_tecnica", "variacao_alternativa", "dica_comportamental"],
              additionalProperties: false,
            },
          },
        },
      });
      const content = String(response?.choices?.[0]?.message?.content || "{}");
      return JSON.parse(extractJSON(content));
    }),

  // Pilar 1 — Sugere especializações e áreas de atuação alinhadas ao propósito do médico
  suggestSpecializations: adminProcedure
    .input(z.object({
      menteeId: z.number(),
    }))
    .mutation(async ({ input }) => {
      // Busca respostas do Pilar 1 e Pilar 2 (especialidade)
      const pillar1Answers = await getPillarAnswers(input.menteeId, 1);
      const pillar2Answers = await getPillarAnswers(input.menteeId, 2);

      // Monta contexto das respostas
      const formatAnswers = (answers: Awaited<ReturnType<typeof getPillarAnswers>>) => {
        return answers.flatMap(row => {
          const respostas = (row.respostas as Array<{ pergunta: string; resposta: unknown; naoSabe?: boolean }>) ?? [];
          return respostas
            .filter(r => !r.naoSabe && r.resposta !== null && r.resposta !== undefined && r.resposta !== "")
            .map(r => `- ${r.pergunta}: ${String(r.resposta)}`);
        }).join("\n");
      };

      const p1Context = formatAnswers(pillar1Answers);
      const p2Context = formatAnswers(pillar2Answers);

      if (!p1Context) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "O mentorado ainda não respondeu o Pilar 1." });
      }

      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `Você é um consultor especialista em carreiras médicas e posicionamento profissional no Brasil. 
Sua tarefa é analisar o perfil, propósito, valores, missão e visão de um médico — coletados no Pilar 1 (Identidade e Propósito) — e sugerir especializações, subespecialidades ou áreas de atuação que sejam autenticamente alinhadas ao que ele quer construir.

Retorne um JSON estruturado com:
- sugestoes: array de objetos com { titulo, descricao, alinhamento, mercado, como_comecar } — mínimo 3, máximo 5 sugestões
- analise_perfil: string com análise do perfil do médico em 2-3 parágrafos
- aviso_importante: string com um aviso sobre o que NÃO fazer baseado no perfil

Cada sugestão deve ter:
- titulo: nome da especialização/área (ex: "Medicina do Estilo de Vida", "Cardiologia Preventiva", "Medicina Integrativa")
- descricao: o que é essa área e por que existe demanda (2-3 frases)
- alinhamento: por que essa área se alinha especificamente ao perfil DESTE médico (seja específico, cite as respostas dele)
- mercado: perspectiva de mercado e remuneração no Brasil (1-2 frases)
- como_comecar: próximos passos concretos para entrar nessa área (1-2 frases)`,
          },
          {
            role: "user",
            content: `=== RESPOSTAS DO PILAR 1 — IDENTIDADE E PROPÓSITO ===\n${p1Context}\n\n${p2Context ? `=== RESPOSTAS DO PILAR 2 — POSICIONAMENTO (especialidade) ===\n${p2Context}\n\n` : ""}Com base neste perfil, sugira as especializações e áreas de atuação mais alinhadas ao propósito e valores deste médico.`,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "specialization_suggestions",
            strict: true,
            schema: {
              type: "object",
              properties: {
                sugestoes: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      titulo: { type: "string" },
                      descricao: { type: "string" },
                      alinhamento: { type: "string" },
                      mercado: { type: "string" },
                      como_comecar: { type: "string" },
                    },
                    required: ["titulo", "descricao", "alinhamento", "mercado", "como_comecar"],
                    additionalProperties: false,
                  },
                },
                analise_perfil: { type: "string" },
                aviso_importante: { type: "string" },
              },
              required: ["sugestoes", "analise_perfil", "aviso_importante"],
              additionalProperties: false,
            },
          },
        },
      });
      const content = String(response?.choices?.[0]?.message?.content || "{}");
      const result = JSON.parse(extractJSON(content));

      // Salva no banco para não precisar regerar
      await upsertPillarFeedback(input.menteeId, 1, {
        aiSpecializationSuggestions: result,
        aiAnalysisGeneratedAt: new Date(),
      });

      return result;
    }),

  // Pilar 1 — Gera roteiro estratégico indicando quais pilares priorizar
  generatePillarRoadmap: adminProcedure
    .input(z.object({
      menteeId: z.number(),
    }))
    .mutation(async ({ input }) => {
      // Busca respostas de todos os pilares respondidos
      const allAnswers = await getAllPillarAnswersForMentee(input.menteeId);

      // Agrupa por pilar
      const byPillar: Record<number, string[]> = {};
      for (const row of allAnswers) {
        const respostas = (row.respostas as Array<{ pergunta: string; resposta: unknown; naoSabe?: boolean }>) ?? [];
        const formatted = respostas
          .filter(r => !r.naoSabe && r.resposta !== null && r.resposta !== undefined && r.resposta !== "")
          .map(r => `- ${r.pergunta}: ${String(r.resposta)}`);
        if (formatted.length > 0) {
          if (!byPillar[row.pillarId]) byPillar[row.pillarId] = [];
          byPillar[row.pillarId].push(...formatted);
        }
      }

      const pillarNames: Record<number, string> = {
        1: "Identidade e Propósito",
        2: "Posicionamento",
        3: "Financeiro",
        4: "Processos e Gestão",
        5: "Precificação",
        6: "Marketing Digital",
        7: "Comunicação e Vendas Éticas",
      };

      const contextByPillar = Object.entries(byPillar)
        .map(([pillarId, answers]) => `=== PILAR ${pillarId} — ${pillarNames[Number(pillarId)]} ===\n${answers.join("\n")}`)
        .join("\n\n");

      if (!contextByPillar) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "O mentorado ainda não respondeu nenhum pilar." });
      }

      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `Você é um consultor especialista em mentoria médica e desenvolvimento de clínicas. 
Sua tarefa é analisar as respostas de um médico em múltiplos pilares e gerar um roteiro estratégico personalizado indicando:
1. Em quais pilares ele deve se aprofundar PRIMEIRO (prioridade alta)
2. Em quais pilares ele já tem boa base (prioridade média)
3. Quais pilares podem esperar (prioridade baixa)

Retorne um JSON com:
- resumo_diagnostico: string com diagnóstico geral do médico em 2-3 parágrafos
- pilares_prioritarios: array de objetos { pillar_id, nome, urgencia ("alta"|"media"|"baixa"), motivo, acao_imediata } — todos os 7 pilares devem aparecer
- proximos_passos: array de strings com 3-5 ações concretas para o mentor tomar nas próximas sessões
- ponto_critico: string com o principal gargalo identificado no negócio deste médico
- potencial_transformacao: string com o maior potencial de transformação identificado`,
          },
          {
            role: "user",
            content: `Analise as respostas deste médico e gere o roteiro estratégico personalizado:\n\n${contextByPillar}`,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "pillar_roadmap",
            strict: true,
            schema: {
              type: "object",
              properties: {
                resumo_diagnostico: { type: "string" },
                pilares_prioritarios: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      pillar_id: { type: "number" },
                      nome: { type: "string" },
                      urgencia: { type: "string" },
                      motivo: { type: "string" },
                      acao_imediata: { type: "string" },
                    },
                    required: ["pillar_id", "nome", "urgencia", "motivo", "acao_imediata"],
                    additionalProperties: false,
                  },
                },
                proximos_passos: { type: "array", items: { type: "string" } },
                ponto_critico: { type: "string" },
                potencial_transformacao: { type: "string" },
              },
              required: ["resumo_diagnostico", "pilares_prioritarios", "proximos_passos", "ponto_critico", "potencial_transformacao"],
              additionalProperties: false,
            },
          },
        },
      });
      const content = String(response?.choices?.[0]?.message?.content || "{}");
      const result = JSON.parse(extractJSON(content));

      // Salva no banco
      await upsertPillarFeedback(input.menteeId, 1, {
        aiPillarRoadmap: result,
        aiAnalysisGeneratedAt: new Date(),
      });

      return result;
    }),

  // Todos os pilares — Diagnóstico individualizado por pilar (somente mentor)
  generatePillarDiagnosis: adminProcedure
    .input(z.object({
      menteeId: z.number(),
      pillarId: z.number().min(1).max(7),
    }))
    .mutation(async ({ input }) => {
      const answers = await getPillarAnswers(input.menteeId, input.pillarId);

      const formattedAnswers = answers.flatMap(row => {
        const respostas = (row.respostas as Array<{ pergunta: string; resposta: unknown; naoSabe?: boolean }>) ?? [];
        return respostas
          .filter(r => !r.naoSabe && r.resposta !== null && r.resposta !== undefined && r.resposta !== "")
          .map(r => `- ${r.pergunta}: ${String(r.resposta)}`);
      }).join("\n");

      if (!formattedAnswers) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "O mentorado ainda não respondeu este pilar." });
      }

      const pillarContexts: Record<number, string> = {
        1: `Você é um especialista em mentoria médica analisando o Pilar 1 — Identidade e Propósito. Analise as respostas do médico sobre seus valores, missão, visão, propósito de vida e identidade profissional. Identifique: clareza de propósito, alinhamento entre valores e prática, pontos de confusão ou conflito interno, e o que o médico precisa trabalhar para construir uma identidade profissional sólida.`,
        2: `Você é um especialista em posicionamento médico analisando o Pilar 2 — Posicionamento. Analise as respostas sobre especialidade, público-alvo, diferencial, concorrência percebida e proposta de valor. Identifique: nível de clareza no posicionamento, lacunas entre o que o médico oferece e como ele se comunica, oportunidades de nicho e o que precisa ser refinado para um posicionamento de mercado forte.`,
        3: `Você é um especialista em gestão financeira médica analisando o Pilar 3 — Financeiro. Analise as respostas sobre faturamento, custos, lucro, ociosidade e saúde financeira da clínica. Identifique: principais vazamentos financeiros, nível de controle financeiro, margem de lucro real, riscos financeiros imediatos e oportunidades de otimização de receita.`,
        4: `Você é um especialista em gestão de processos médicos analisando o Pilar 4 — Processos e Gestão. Analise as respostas sobre fluxo de pacientes, equipe, processos internos, tecnologia e eficiência operacional. Identifique: gargalos operacionais, processos que drenam energia do médico, oportunidades de automação e delegação, e o que precisa ser sistematizado para escalar.`,
        5: `Você é um especialista em precificação médica analisando o Pilar 5 — Precificação. Analise as respostas sobre valores cobrados, último reajuste, percepção de valor, tabelas de convênio e posicionamento de preço. Identifique: se o médico está subcobrado, medo de reajuste, desalinhamento entre valor percebido e cobrado, e o impacto financeiro de uma estratégia de precificação mais assertiva.`,
        6: `Você é um especialista em marketing digital médico analisando o Pilar 6 — Marketing Digital. Analise as respostas sobre presença online, redes sociais, conteúdo produzido, SEO, Google Meu Negócio e estratégia digital. Identifique: nível de visibilidade digital atual, canais com maior potencial para este perfil, erros comuns na estratégia atual e o que implementar primeiro para gerar resultados rápidos.`,
        7: `Você é um especialista em comunicação médica e vendas éticas analisando o Pilar 7 — Comunicação e Vendas Éticas. Analise as respostas sobre comunicação com pacientes, apresentação de tratamentos, manejo de objeções e conversão de consultas. Identifique: barreiras de comunicação, oportunidades de melhoria na apresentação de valor, pontos de perda de pacientes e como o médico pode comunicar melhor seu trabalho sem ferir a ética.`,
      };

      const systemPrompt = `${getPillarPrompt(input.pillarId)}

Alem da analise completa, retorne obrigatoriamente estes campos no JSON:
- resumo: string — diagnostico geral (2-3 paragrafos)
- pontos_fortes: array de strings — 3 a 5 pontos fortes
- lacunas_criticas: array de objetos { lacuna, impacto, urgencia ("alta"|"media"|"baixa") }
- recomendacoes: array de objetos { acao, prazo ("imediato"|"curto_prazo"|"medio_prazo"), resultado_esperado }
- frase_chave: string — frase de impacto que resume o momento deste medico
- nivel_maturidade: string — "iniciante", "em_desenvolvimento", "avancado" ou "expert"
- recomendacao_mentor: string — orientacao para o Dr. Carlos conduzir a proxima sessao`;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Analise as respostas deste médico no Pilar ${input.pillarId} e gere o diagnóstico individualizado:\n\n${formattedAnswers}`,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "pillar_diagnosis",
            strict: true,
            schema: {
              type: "object",
              properties: {
                resumo: { type: "string" },
                pontos_fortes: { type: "array", items: { type: "string" } },
                lacunas_criticas: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      lacuna: { type: "string" },
                      impacto: { type: "string" },
                      urgencia: { type: "string" },
                    },
                    required: ["lacuna", "impacto", "urgencia"],
                    additionalProperties: false,
                  },
                },
                recomendacoes: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      acao: { type: "string" },
                      prazo: { type: "string" },
                      resultado_esperado: { type: "string" },
                    },
                    required: ["acao", "prazo", "resultado_esperado"],
                    additionalProperties: false,
                  },
                },
                frase_chave: { type: "string" },
                nivel_maturidade: { type: "string" },
              },
              required: ["resumo", "pontos_fortes", "lacunas_criticas", "recomendacoes", "frase_chave", "nivel_maturidade"],
              additionalProperties: false,
            },
          },
        },
      });
      const content = String(response?.choices?.[0]?.message?.content || "{}");
      const result = JSON.parse(extractJSON(content));

      // Salva no banco
      await upsertPillarFeedback(input.menteeId, input.pillarId, {
        aiDiagnosis: result,
        aiDiagnosisGeneratedAt: new Date(),
      });

      return result;
    }),

  saveDiagnosis: adminProcedure
    .input(z.object({
      menteeId: z.number(),
      pillarId: z.number(),
      diagnosis: z.object({
        resumo: z.string(),
        pontos_fortes: z.array(z.string()),
        lacunas_criticas: z.array(z.object({
          lacuna: z.string(),
          impacto: z.string(),
          urgencia: z.string(),
        })),
        recomendacoes: z.array(z.object({
          acao: z.string(),
          prazo: z.string(),
          resultado_esperado: z.string(),
        })),
        frase_chave: z.string(),
        nivel_maturidade: z.string(),
      }),
    }))
    .mutation(async ({ input }) => {
      await upsertPillarFeedback(input.menteeId, input.pillarId, {
        aiDiagnosis: input.diagnosis,
      });
      return { success: true };
    }),

  saveSpecializations: adminProcedure
    .input(z.object({
      menteeId: z.number(),
      specializations: z.any(),
    }))
    .mutation(async ({ input }) => {
      await upsertPillarFeedback(input.menteeId, 1, {
        aiSpecializationSuggestions: input.specializations,
      });
      return { success: true };
    }),

  saveRoadmap: adminProcedure
    .input(z.object({
      menteeId: z.number(),
      roadmap: z.any(),
    }))
    .mutation(async ({ input }) => {
      await upsertPillarFeedback(input.menteeId, 1, {
        aiPillarRoadmap: input.roadmap,
      });
      return { success: true };
    }),

  // Pilar 2 — Gera frase de posicionamento personalizada
  generatePositioningStatement: protectedProcedure
    .input(z.object({
      menteeId: z.number(),
      publico: z.string(),
      resultado: z.string(),
      diferencial: z.string(),
      especialidade: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `Você é especialista em branding médico. Crie 3 versões de frase de posicionamento para o médico, usando o template "Eu ajudo [quem] a [resultado] através de [diferencial]". Retorne JSON com: versao_1 (string), versao_2 (string), versao_3 (string), recomendada ("versao_1" | "versao_2" | "versao_3"), motivo_recomendacao (string).`,
          },
          {
            role: "user",
            content: `Especialidade: ${input.especialidade || "médica"}\nPúblico-alvo: ${input.publico}\nResultado entregue: ${input.resultado}\nDiferencial: ${input.diferencial}\n\nGere as 3 versões de frase de posicionamento.`,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "positioning_statement",
            strict: true,
            schema: {
              type: "object",
              properties: {
                versao_1: { type: "string" },
                versao_2: { type: "string" },
                versao_3: { type: "string" },
                recomendada: { type: "string" },
                motivo_recomendacao: { type: "string" },
              },
              required: ["versao_1", "versao_2", "versao_3", "recomendada", "motivo_recomendacao"],
              additionalProperties: false,
            },
          },
        },
      });
      const content = String(response?.choices?.[0]?.message?.content || "{}");
      return JSON.parse(extractJSON(content));
    }),

  // IA: Gera rascunho de feedback estruturado para o mentor revisar e editar
  generateFeedbackDraft: adminProcedure
    .input(z.object({
      menteeId: z.number(),
      pillarId: z.number().min(1).max(7),
    }))
    .mutation(async ({ input }) => {
      const answers = await getPillarAnswers(input.menteeId, input.pillarId);

      const formattedAnswers = answers.flatMap(row => {
        const respostas = (row.respostas as Array<{ pergunta: string; resposta: unknown; naoSabe?: boolean }>) ?? [];
        return respostas
          .filter(r => !r.naoSabe && r.resposta !== null && r.resposta !== undefined && r.resposta !== "")
          .map(r => `- ${r.pergunta}: ${String(r.resposta)}`);
      }).join("\n");

      if (!formattedAnswers) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "O mentorado ainda não respondeu este pilar." });
      }

      const pillarNames: Record<number, string> = {
        1: "Identidade e Propósito",
        2: "Posicionamento",
        3: "Diagnóstico Financeiro",
        4: "Processos e Gestão",
        5: "Precificação",
        6: "Marketing Digital",
        7: "Comunicação e Vendas Éticas",
      };

      const pillarFeedbackContexts: Record<number, string> = {
        1: `Você é um mentor médico especialista em identidade e propósito profissional. Com base nas respostas do médico sobre seus valores, missão, visão, Ikigai e identidade, gere um feedback de mentor — não um diagnóstico frio, mas uma devolutiva calorosa, encorajadora e precisa que o médico receberá do seu mentor. Use linguagem direta, elegante e motivadora. Destaque o que o médico já tem de forte, aponte com clareza o que precisa ser desenvolvido e sugira passos concretos e alcançáveis.`,
        2: `Você é um mentor especialista em posicionamento médico. Com base nas respostas sobre especialidade, diferencial, público-alvo e proposta de valor, gere um feedback de mentor que ajude o médico a entender onde está seu posicionamento atual, o que está funcionando e o que precisa ser refinado para se destacar no mercado. Seja específico, use exemplos práticos e oriente com clareza.`,
        3: `Você é um mentor especialista em gestão financeira médica. Com base nas respostas sobre custos, faturamento, lucro e saúde financeira, gere um feedback de mentor que revele os principais vazamentos financeiros, o nível de controle atual e as oportunidades mais urgentes de melhoria. Seja direto sobre números e impactos, sem julgamentos, mas com clareza cirúrgica.`,
        4: `Você é um mentor especialista em processos e gestão clínica. Com base nas respostas sobre equipe, fluxo de pacientes, processos internos e eficiência, gere um feedback de mentor que identifique os gargalos mais críticos, o que está drenando energia e tempo do médico, e quais processos precisam ser sistematizados primeiro para liberar o médico para o que importa.`,
        5: `Você é um mentor especialista em precificação médica. Com base nas respostas sobre valores cobrados, reajustes, percepção de valor e posicionamento de preço, gere um feedback de mentor que revele se o médico está subcobrado, qual o impacto financeiro disso, e como abordar o tema de reajuste e posicionamento de preço de forma estratégica e ética.`,
        6: `Você é um mentor especialista em marketing digital médico. Com base nas respostas sobre presença online, redes sociais e estratégia de conteúdo, gere um feedback de mentor que mostre o nível de visibilidade atual, o que está funcionando, o que precisa mudar e qual canal ou ação tem maior potencial de resultado imediato para este perfil específico de médico.`,
        7: `Você é um mentor especialista em comunicação médica e vendas éticas. Com base nas respostas sobre como o médico apresenta tratamentos, lida com objeções e converte consultas, gere um feedback de mentor que identifique as principais barreiras de comunicação, as oportunidades de melhoria mais impactantes e como o médico pode comunicar melhor o valor do seu trabalho sem ferir a ética.`,
      };

      const systemPrompt = `${pillarFeedbackContexts[input.pillarId]}

IMPORTANTE: Este feedback será lido pelo MENTOR antes de ser enviado ao mentorado. O mentor poderá editar livremente. Gere um rascunho completo e de alta qualidade que o mentor possa usar como base.

Retorne um JSON com:
- pontos_fortes: array de 3 a 5 strings — pontos fortes identificados nas respostas (frases curtas, diretas, específicas)
- pontos_melhoria: array de 3 a 5 strings — pontos que precisam de desenvolvimento (frases curtas, diretas, específicas)
- feedback_geral: string — devolutiva completa do mentor para o mentorado (3-4 parágrafos, tom caloroso e profissional, primeira pessoa do plural como mentor)
- plano_acao: string — próximos passos numerados (3-5 ações concretas com prazo, formato: "1. Ação — prazo\n2. Ação — prazo")`;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Gere o rascunho de feedback para o Pilar ${input.pillarId} — ${pillarNames[input.pillarId]} com base nas respostas deste médico:\n\n${formattedAnswers}`,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "feedback_draft",
            strict: true,
            schema: {
              type: "object",
              properties: {
                pontos_fortes: { type: "array", items: { type: "string" } },
                pontos_melhoria: { type: "array", items: { type: "string" } },
                feedback_geral: { type: "string" },
                plano_acao: { type: "string" },
              },
              required: ["pontos_fortes", "pontos_melhoria", "feedback_geral", "plano_acao"],
              additionalProperties: false,
            },
          },
        },
      });
      const content = String(response?.choices?.[0]?.message?.content || "{}");
      return JSON.parse(extractJSON(content)) as {
        pontos_fortes: string[];
        pontos_melhoria: string[];
        feedback_geral: string;
        plano_acao: string;
      };
    }),

  // ============================================================
  // GENERATE PILLAR CONCLUSIONS — Gera conclusões editáveis por pilar
  // ============================================================
  generatePillarConclusions: adminProcedure
    .input(z.object({ menteeId: z.number(), pillarId: z.number() }))
    .mutation(async ({ input }) => {
      const { menteeId, pillarId } = input;
      const answers = await getAllPillarAnswersForMentee(menteeId);
      const pillarAnswersList = answers.filter(a => a.pillarId === pillarId);
      const allAnswersText = pillarAnswersList
        .flatMap(a => (a.respostas as Array<{ pergunta: string; resposta: unknown }> || []))
        .filter(r => r.resposta !== null && r.resposta !== undefined && r.resposta !== "")
        .map(r => `- ${r.pergunta}: ${r.resposta}`)
        .join("\n");

      const pillarContexts: Record<number, { nome: string; objetivo: string; schema: object }> = {
        1: {
          nome: "Identidade e Propósito",
          objetivo: "Construir a Missão, Visão, síntese do Ikigai e Valores Inegociáveis do médico",
          schema: {
            type: "object",
            properties: {
              missao: { type: "string", description: "Frase de missão profissional do médico (1-2 frases poderosas)" },
              visao: { type: "string", description: "Visão de futuro para 2030 (1-2 frases inspiradoras)" },
              ikigai_sintese: { type: "string", description: "Síntese do Ikigai em 1 parágrafo: o que ama + é bom + mundo precisa + pode ser pago" },
              valores: { type: "array", items: { type: "string" }, description: "Lista de 3-5 valores inegociáveis com manifestação prática" },
              diferencial_identidade: { type: "string", description: "O diferencial único deste médico baseado em sua identidade" },
              recomendacao_mentor: { type: "string", description: "Orientação estratégica para o mentor sobre como trabalhar a identidade deste médico" },
            },
            required: ["missao", "visao", "ikigai_sintese", "valores", "diferencial_identidade", "recomendacao_mentor"],
            additionalProperties: false,
          },
        },
        2: {
          nome: "Posicionamento",
          objetivo: "Definir a Proposta de Valor, Nicho e Diferencial Competitivo do médico",
          schema: {
            type: "object",
            properties: {
              proposta_valor: { type: "string", description: "Proposta de valor refinada: 'Eu ajudo [quem] a [resultado] através de [como]'" },
              nicho_definido: { type: "string", description: "Nicho de mercado específico recomendado" },
              diferencial_competitivo: { type: "string", description: "O que diferencia este médico dos concorrentes" },
              tagline: { type: "string", description: "Frase curta e memorável para usar no perfil e comunicação" },
              recomendacao_mentor: { type: "string", description: "Orientação estratégica para o mentor sobre posicionamento" },
            },
            required: ["proposta_valor", "nicho_definido", "diferencial_competitivo", "tagline", "recomendacao_mentor"],
            additionalProperties: false,
          },
        },
        3: {
          nome: "Diagnóstico Financeiro",
          objetivo: "Gerar diagnóstico financeiro, ponto de equilíbrio e plano de ação financeiro",
          schema: {
            type: "object",
            properties: {
              diagnostico_financeiro: { type: "string", description: "Diagnóstico da saúde financeira atual do negócio" },
              ponto_equilibrio: { type: "string", description: "Análise do ponto de equilíbrio e margem de lucro" },
              principais_vazamentos: { type: "array", items: { type: "string" }, description: "Principais vazamentos financeiros identificados" },
              metas_financeiras: { type: "string", description: "Metas financeiras recomendadas para 6 e 12 meses" },
              plano_acao_financeiro: { type: "string", description: "Plano de ação financeiro com 3 prioridades imediatas" },
              recomendacao_mentor: { type: "string", description: "Orientação estratégica para o mentor sobre o trabalho financeiro" },
            },
            required: ["diagnostico_financeiro", "ponto_equilibrio", "principais_vazamentos", "metas_financeiras", "plano_acao_financeiro", "recomendacao_mentor"],
            additionalProperties: false,
          },
        },
        4: {
          nome: "Gestão e Processos",
          objetivo: "Mapear processos, identificar o que delegar e definir prioridades operacionais",
          schema: {
            type: "object",
            properties: {
              diagnostico_operacional: { type: "string", description: "Diagnóstico da maturidade operacional do consultório" },
              mapa_processos: { type: "string", description: "Mapa dos principais processos e gargalos identificados" },
              o_que_delegar: { type: "array", items: { type: "string" }, description: "Lista de tarefas que devem ser delegadas imediatamente" },
              prioridades_operacionais: { type: "string", description: "3 prioridades operacionais para os próximos 90 dias" },
              recomendacao_mentor: { type: "string", description: "Orientação estratégica para o mentor sobre gestão" },
            },
            required: ["diagnostico_operacional", "mapa_processos", "o_que_delegar", "prioridades_operacionais", "recomendacao_mentor"],
            additionalProperties: false,
          },
        },
        5: {
          nome: "Precificação",
          objetivo: "Definir estratégia de precificação, tabela recomendada e argumentos de valor",
          schema: {
            type: "object",
            properties: {
              diagnostico_precificacao: { type: "string", description: "Diagnóstico da estratégia de precificação atual" },
              tabela_precos_recomendada: { type: "string", description: "Tabela de preços recomendada com justificativa" },
              estrategia_reajuste: { type: "string", description: "Estratégia para reajuste de preços sem perder pacientes" },
              argumentos_valor: { type: "array", items: { type: "string" }, description: "Argumentos de valor para usar com pacientes que questionam o preço" },
              recomendacao_mentor: { type: "string", description: "Orientação estratégica para o mentor sobre precificação" },
            },
            required: ["diagnostico_precificacao", "tabela_precos_recomendada", "estrategia_reajuste", "argumentos_valor", "recomendacao_mentor"],
            additionalProperties: false,
          },
        },
        6: {
          nome: "Marketing Digital",
          objetivo: "Criar estratégia de conteúdo, tom de voz e plano de marketing para 30 dias",
          schema: {
            type: "object",
            properties: {
              diagnostico_marketing: { type: "string", description: "Diagnóstico da presença digital atual" },
              estrategia_conteudo: { type: "string", description: "Estratégia de conteúdo personalizada para o perfil deste médico" },
              tom_voz_definido: { type: "string", description: "Tom de voz definido com exemplos práticos" },
              plano_30_dias: { type: "array", items: { type: "string" }, description: "Plano de conteúdo para 30 dias com temas e formatos" },
              recomendacao_mentor: { type: "string", description: "Orientação estratégica para o mentor sobre marketing" },
            },
            required: ["diagnostico_marketing", "estrategia_conteudo", "tom_voz_definido", "plano_30_dias", "recomendacao_mentor"],
            additionalProperties: false,
          },
        },
        7: {
          nome: "Vendas e Comunicação",
          objetivo: "Criar script de apresentação ética, tratamento de objeções e plano de follow-up",
          schema: {
            type: "object",
            properties: {
              diagnostico_conversao: { type: "string", description: "Diagnóstico do processo atual de conversão" },
              script_apresentacao: { type: "string", description: "Script de apresentação de tratamento ético e eficaz" },
              tratamento_objecoes: { type: "array", items: { type: "object", properties: { objecao: { type: "string" }, resposta: { type: "string" } }, required: ["objecao", "resposta"], additionalProperties: false }, description: "Respostas para as 3 principais objeções" },
              plano_followup: { type: "string", description: "Plano de follow-up pós-consulta" },
              recomendacao_mentor: { type: "string", description: "Orientação estratégica para o mentor sobre vendas éticas" },
            },
            required: ["diagnostico_conversao", "script_apresentacao", "tratamento_objecoes", "plano_followup", "recomendacao_mentor"],
            additionalProperties: false,
          },
        },
      };

      const ctx = pillarContexts[pillarId];
      if (!ctx) throw new TRPCError({ code: "BAD_REQUEST", message: "Pilar inválido" });

      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: getPillarPrompt(pillarId) + `\n\nVoce esta gerando as conclusoes do pilar ${ctx.nome}. Baseie-se EXCLUSIVAMENTE nas respostas fornecidas. Use as proprias palavras do medico sempre que possivel. Responda em portugues brasileiro.`,
          },
          {
            role: "user",
            content: `Objetivo: ${ctx.objetivo}\n\nRespostas do médico no Pilar ${pillarId} — ${ctx.nome}:\n${allAnswersText || "(nenhuma resposta registrada ainda)"}\n\nGere as conclusões estruturadas para este pilar.`,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: `pilar${pillarId}_conclusoes`,
            strict: true,
            schema: ctx.schema as Record<string, unknown>,
          },
        },
      });

      const content = String(response?.choices?.[0]?.message?.content || "{}");
      const conclusoesJson = JSON.parse(extractJSON(content)) as Record<string, unknown>;
      await upsertPillarConclusion(menteeId, pillarId, {
        conclusoesJson,
        geradoPorIa: true,
        iaGeneratedAt: new Date(),
      });;

      return conclusoesJson;
    }),

  // Salvar conclusões editadas pelo mentor
  savePillarConclusions: adminProcedure
    .input(z.object({
      menteeId: z.number(),
      pillarId: z.number(),
      conclusoesJson: z.record(z.string(), z.unknown()),
      liberarParaMentorado: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const { menteeId, pillarId, conclusoesJson, liberarParaMentorado } = input;
      await upsertPillarConclusion(menteeId, pillarId, {
        conclusoesJson: conclusoesJson as Record<string, unknown>,
        ...(liberarParaMentorado !== undefined ? {
          liberadoParaMentorado: liberarParaMentorado,
          ...(liberarParaMentorado ? { liberadoEm: new Date() } : {}),
        } : {}),
      });
      return { ok: true };
    }),

  // Buscar conclusões salvas
  getPillarConclusions: adminProcedure
    .input(z.object({ menteeId: z.number(), pillarId: z.number() }))
    .query(async ({ input }) => {
      return await getPillarConclusion(input.menteeId, input.pillarId);
    }),

  // Gerar plano de ação via IA
  generateActionPlan: adminProcedure
    .input(z.object({ menteeId: z.number(), pillarId: z.number() }))
    .mutation(async ({ input }) => {
      const answers = await getPillarAnswers(input.menteeId, input.pillarId);
      const feedback = await getPillarFeedback(input.menteeId, input.pillarId);

      const answersText = (answers ?? []).map((a: any) =>
        (a.respostas as any[])?.map((r: any) => `${r.pergunta}: ${r.resposta}`).join("\n")
      ).join("\n") || "Sem respostas";

      const diagText = feedback?.aiDiagnosis ? JSON.stringify(feedback.aiDiagnosis) : "";

      const result = await invokeLLM({
        messages: [
          { role: "system", content: "Voce e um consultor de negocios para medicos. Gere um plano de acao pratico e estruturado em formato de timeline (Semana 1-2, Semana 3-4, Mes 2, Mes 3) com acoes concretas. Maximo 500 palavras. Seja direto e pratico." },
          { role: "user", content: `Baseado nestas respostas do mentorado:\n${answersText}\n\nE neste diagnostico:\n${diagText}\n\nGere um plano de acao para o Pilar ${input.pillarId}.` }
        ],
      });

      const rawContent = result?.choices?.[0]?.message?.content;
      const plano = typeof rawContent === "string" ? rawContent : "";
      return { plano };
    }),
});
// ============================================================
// ============================================================
// PILLAR ANSWERS ROUTERR — Respostas do mentorado por pilar
// ============================================================
const pillarAnswersRouter = router({
  // Mentorado salva respostas de uma seção de um pilar
  save: menteeProcedure
    .input(z.object({
      pillarId: z.number().min(1).max(7),
      secao: z.string(),
      respostas: z.array(z.object({
        id: z.string(),
        pergunta: z.string(),
        resposta: z.union([z.string(), z.number(), z.boolean(), z.null()]).optional(),
        naoSabe: z.boolean().optional(),
      })),
      status: z.enum(["em_progresso", "concluida"]).default("em_progresso"),
    }))
    .mutation(async ({ ctx, input }) => {
      await upsertPillarAnswers(ctx.menteeId, input.pillarId, input.secao, input.respostas, input.status);
      // Notifica mentor quando seção é concluída
      if (input.status === "concluida") {
        const mentee = ctx.mentee;
        await notifyOwner({
          title: `${mentee.nome} concluiu uma seção do Pilar ${input.pillarId}`,
          content: `Seção: ${input.secao}. Acesse o painel para ver as respostas.`,
        });
      }
      return { success: true };
    }),

  // Mentor edita uma resposta individual do mentorado
  adminUpdateAnswer: adminProcedure
    .input(z.object({
      menteeId: z.number(),
      pillarId: z.number().min(1).max(7),
      secao: z.string(),
      questionId: z.string(),
      pergunta: z.string(),
      resposta: z.union([z.string(), z.number(), z.boolean(), z.null()]),
    }))
    .mutation(async ({ input }) => {
      // Get existing answers for this section
      const existing = await getPillarAnswers(input.menteeId, input.pillarId);
      const sectionRow = existing?.find((r: any) => r.secao === input.secao);
      const respostas = (sectionRow?.respostas as any[]) || [];

      // Update or add the specific answer
      const idx = respostas.findIndex((r: any) => r.id === input.questionId);
      const updated = { id: input.questionId, pergunta: input.pergunta, resposta: input.resposta, naoSabe: false };
      if (idx >= 0) {
        respostas[idx] = updated;
      } else {
        respostas.push(updated);
      }

      await upsertPillarAnswers(input.menteeId, input.pillarId, input.secao, respostas, sectionRow?.status || "em_progresso");
      return { success: true };
    }),

  // Mentorado busca respostas de um pilar (para retomar)
  getByPillar: menteeProcedure
    .input(z.object({ pillarId: z.number().min(1).max(7) }))
    .query(async ({ ctx, input }) => {
      return getPillarAnswers(ctx.menteeId, input.pillarId);
    }),

  // Mentorado verifica se conclusão foi liberada pelo mentor
  isConclusionReleased: menteeProcedure
    .input(z.object({ pillarId: z.number().min(1).max(7) }))
    .query(async ({ ctx, input }) => {
      const feedback = await getPillarFeedback(ctx.menteeId, input.pillarId);
      return {
        released: feedback?.conclusaoLiberada ?? false,
        mentorMessage: feedback?.conclusaoLiberada ? (feedback?.feedback || null) : null,
        mentorName: "Carlos Trindade",
      };
    }),

  // Mentorado busca feedback do mentor (só se liberado)
  getFeedback: menteeProcedure
    .input(z.object({ pillarId: z.number().min(1).max(7) }))
    .query(async ({ ctx, input }) => {
      const feedback = await getPillarFeedback(ctx.menteeId, input.pillarId);
      if (!feedback?.conclusaoLiberada) return null;
      return feedback;
    }),

  // Mentorado busca todas as respostas de todos os pilares (para progresso geral)
  getAllAnswers: menteeProcedure
    .query(async ({ ctx }) => {
      return getAllPillarAnswersForMentee(ctx.menteeId);
    }),

  // Mentorado pede dica da IA para uma pergunta específica
  getAiHint: menteeProcedure
    .input(z.object({
      pillarId: z.number().min(1).max(7),
      pergunta: z.string(),
      guia: z.string().optional(),
      respostasAnteriores: z.array(z.object({
        pergunta: z.string(),
        resposta: z.string(),
      })).optional(),
    }))
    .mutation(async ({ input }) => {
      const contextoAnterior = (input.respostasAnteriores ?? []).length > 0
        ? `\n\nRespostas anteriores do médico nesta sessão:\n${(input.respostasAnteriores ?? []).map(r => `- ${r.pergunta}: ${r.resposta}`).join("\n")}`
        : "";

      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `Voce e um assistente discreto que ajuda medicos a preencher formularios de autoavaliacao profissional.

REGRAS ABSOLUTAS:
- NUNCA faca analises, comparacoes ou conclusoes sobre os dados
- NUNCA mostre resultados, scores, totais ou percentuais
- NUNCA sugira melhorias ou pontos de atencao
- Seu UNICO papel e ajudar o usuario a responder a pergunta com mais profundidade e completude
- Use tom de 'dica util', como se fosse um guia integrado ao formulario
- Nao se apresente como IA ou assistente — voce e uma funcionalidade do sistema
- Seja breve (maximo 2-3 frases)
- Use linguagem simples e pratica

EXEMPLOS DO QUE FAZER:
- 'Para responder esta pergunta, pense em como voce se sentiria se um paciente descrevesse seu atendimento para um amigo.'
- 'Considere incluir nesta resposta os custos que voce paga mesmo nos meses em que nao atende.'
- 'Uma boa forma de pensar nisso: o que seus pacientes mais elogiam quando falam de voce?'

EXEMPLOS DO QUE NAO FAZER:
- 'Sua nota nesta dimensao esta abaixo da media' (PROIBIDO - analise)
- 'Sugiro focar em melhorar este aspecto' (PROIBIDO - sugestao de melhoria)
- 'Comparando com outros medicos...' (PROIBIDO - comparacao)${input.guia ? `\n\nContexto da pergunta: ${input.guia}` : ""}`,
          },
          {
            role: "user",
            content: `Estou respondendo o questionário do Pilar ${input.pillarId} e preciso de ajuda para responder esta pergunta:\n\n"${input.pergunta}"${contextoAnterior}\n\nComo posso pensar sobre isso?`,
          },
        ],
      });
      const hint = String(response?.choices?.[0]?.message?.content || "Reflita com calma sobre esta pergunta. Não existe resposta certa ou errada.");
      return { hint };
    }),
});

// ============================================================
// PILLAR FEEDBACK ROUTER — Feedback do mentor por pilar
// ============================================================
const pillarFeedbackRouter = router({
  // Mentor busca todas as respostas de um pilar
  getAnswers: adminProcedure
    .input(z.object({ menteeId: z.number(), pillarId: z.number().min(1).max(7) }))
    .query(async ({ input }) => {
      return getPillarAnswers(input.menteeId, input.pillarId);
    }),

  // Mentor busca todas as respostas de todos os pilares
  getAllAnswers: adminProcedure
    .input(z.object({ menteeId: z.number() }))
    .query(async ({ input }) => {
      return getAllPillarAnswersForMentee(input.menteeId);
    }),

  // Mentor salva feedback de um pilar
  saveFeedback: adminProcedure
    .input(z.object({
      menteeId: z.number(),
      pillarId: z.number().min(1).max(7),
      feedback: z.string().optional(),
      planoAcao: z.string().optional(),
      pontosFortesJson: z.array(z.string()).optional(),
      pontosMelhoriaJson: z.array(z.string()).optional(),
    }))
    .mutation(async ({ input }) => {
      const { menteeId, pillarId, ...data } = input;
      await upsertPillarFeedback(menteeId, pillarId, data);
      return { success: true };
    }),

  // Mentor libera conclusão do pilar para o mentorado
  releaseConclusion: adminProcedure
    .input(z.object({
      menteeId: z.number(),
      pillarId: z.number().min(1).max(7),
    }))
    .mutation(async ({ input }) => {
      await upsertPillarFeedback(input.menteeId, input.pillarId, { conclusaoLiberada: true });
      return { success: true };
    }),

  // Mentor busca feedback existente de um pilar
  getFeedback: adminProcedure
    .input(z.object({ menteeId: z.number(), pillarId: z.number().min(1).max(7) }))
    .query(async ({ input }) => {
      return getPillarFeedback(input.menteeId, input.pillarId);
    }),
});

// ============================================================
// MENTOR AI ROUTER — Chat de IA contínuo + checklist de sugestões
// ============================================================
const mentorAiRouter = router({
  // Busca histórico do chat de IA por pilar
  getChatHistory: adminProcedure
    .input(z.object({ menteeId: z.number(), pillarId: z.number().min(1).max(7) }))
    .query(async ({ input }) => {
      return getMentorAiChatHistory(input.menteeId, input.pillarId);
    }),

  // Envia mensagem ao chat de IA e recebe resposta
  sendMessage: adminProcedure
    .input(z.object({
      menteeId: z.number(),
      pillarId: z.number().min(1).max(7),
      message: z.string().min(1).max(2000),
    }))
    .mutation(async ({ input }) => {
      const { menteeId, pillarId, message } = input;

      // Salva mensagem do mentor
      await saveMentorAiChatMessage(menteeId, pillarId, "user", message);

      // Busca histórico para contexto
      const history = await getMentorAiChatHistory(menteeId, pillarId, 20);

      // Busca respostas do mentorado neste pilar
      const answers = await getPillarAnswers(menteeId, pillarId);
      const allAnswersText = answers
        .flatMap(a => (a.respostas as any[] ?? []))
        .filter((r: any) => r.resposta !== null && r.resposta !== undefined && r.resposta !== "" && !r.naoSabe)
        .map((r: any) => `- ${r.pergunta}: ${r.resposta}`)
        .join("\n");

      // Busca dados adicionais para enriquecer o contexto
      const [financialData, ivmpData, conclusions, feedback, chatConclusionsData] = await Promise.all([
        getFinancialData(menteeId),
        getIvmpData(menteeId),
        getPillarConclusion(menteeId, pillarId),
        getPillarFeedback(menteeId, pillarId),
        getChatConclusions(menteeId, pillarId),
      ]);

      // Monta contexto enriquecido
      const contextParts: string[] = [];

      if (allAnswersText) {
        contextParts.push(`RESPOSTAS DO MENTORADO:\n${allAnswersText}`);
      }

      if (financialData?.despesasJson) {
        const expenses = typeof financialData.despesasJson === 'string'
          ? JSON.parse(financialData.despesasJson)
          : financialData.despesasJson;
        const total = Object.values(expenses).reduce((sum: number, val) => sum + Number(val || 0), 0);
        contextParts.push(`DADOS FINANCEIROS:\nDespesas fixas totais: R$ ${total.toLocaleString('pt-BR')}\nDetalhamento: ${JSON.stringify(expenses)}`);
      }

      if (ivmpData?.ivmpFinal) {
        contextParts.push(`ÍNDICE DE MATURIDADE PROFISSIONAL (iVMP): ${ivmpData.ivmpFinal}/10`);
      }

      if (conclusions?.conclusoesJson) {
        const concData = typeof conclusions.conclusoesJson === 'string'
          ? JSON.parse(conclusions.conclusoesJson)
          : conclusions.conclusoesJson;
        contextParts.push(`CONCLUSÕES JÁ GERADAS:\n${JSON.stringify(concData)}`);
      }

      if (feedback?.feedback) {
        contextParts.push(`FEEDBACK DO MENTOR:\n${feedback.feedback}`);
      }

      if (chatConclusionsData?.length) {
        const concTexts = chatConclusionsData.map((c: any) => `- ${c.titulo || ''}: ${c.content}`).join('\n');
        contextParts.push(`ORIENTAÇÕES JÁ DEFINIDAS:\n${concTexts}`);
      }

      const fullContext = contextParts.join('\n\n---\n\n');

      const pillarNames: Record<number, string> = {
        1: "Identidade e Propósito",
        2: "Posicionamento",
        3: "Diagnóstico do Negócio",
        4: "Gestão e Processos",
        5: "Precificação",
        6: "Marketing Digital",
        7: "Vendas e Comunicação",
      };

      // Monta mensagens para o LLM
      const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
        {
          role: "system",
          content: `Você é um consultor especializado em gestão de negócios médicos, auxiliando o mentor no Pilar ${pillarId} — ${pillarNames[pillarId]}.

Sua função é ajudar o MENTOR (não o mentorado) a:
1. Analisar as respostas do mentorado com profundidade
2. Criar conclusões, missão, visão, ikigai e outros entregáveis do pilar
3. Identificar padrões, oportunidades e pontos cegos nas respostas
4. Sugerir ações concretas e próximos passos
5. Quando houver dados financeiros, usar números reais para fundamentar análises

IMPORTANTE: Você é um consultor humano. NUNCA mencione inteligência artificial, IA, AI, algoritmos ou sistemas automatizados. Fale como um assessor experiente.

DADOS DISPONÍVEIS:
${fullContext || "(nenhum dado registrado ainda)"}

Seja direto, perspicaz e prático. Use linguagem profissional em português. Quando sugerir ações, seja específico e acionável. Use números e dados concretos sempre que disponíveis.`,
        },
        // Histórico da conversa (sem a última mensagem do usuário que já foi salva)
        ...history.slice(0, -1).map(h => ({
          role: h.role as "user" | "assistant",
          content: h.content,
        })),
        { role: "user" as const, content: message },
      ];

      const response = await invokeLLM({ messages });
      const assistantContent = String(response?.choices?.[0]?.message?.content || "Não foi possível gerar uma resposta. Tente novamente.");

      // Salva resposta da IA
      await saveMentorAiChatMessage(menteeId, pillarId, "assistant", assistantContent);

      return { content: assistantContent };
    }),

  // Limpa histórico do chat
  clearChat: adminProcedure
    .input(z.object({ menteeId: z.number(), pillarId: z.number().min(1).max(7) }))
    .mutation(async ({ input }) => {
      await clearMentorAiChatHistory(input.menteeId, input.pillarId);
      return { success: true };
    }),

  // Busca sugestões (checklist) por pilar ou todas
  getSuggestions: adminProcedure
    .input(z.object({ menteeId: z.number(), pillarId: z.number().optional() }))
    .query(async ({ input }) => {
      return getMentorSuggestions(input.menteeId, input.pillarId);
    }),

  // Adiciona sugestão ao checklist
  addSuggestion: adminProcedure
    .input(z.object({
      menteeId: z.number(),
      pillarId: z.number().min(0).max(7),
      texto: z.string().min(1).max(1000),
      categoria: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      await addMentorSuggestion(input.menteeId, input.pillarId, input.texto, input.categoria);
      return { success: true };
    }),

  // Marca/desmarca sugestão como concluída
  toggleSuggestion: adminProcedure
    .input(z.object({ id: z.number(), concluida: z.boolean() }))
    .mutation(async ({ input }) => {
      await toggleMentorSuggestion(input.id, input.concluida);
      return { success: true };
    }),

  // Remove sugestão
  deleteSuggestion: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteMentorSuggestion(input.id);
      return { success: true };
    }),

  // ---- Chat Conclusions ----
  getChatConclusions: adminProcedure
    .input(z.object({ menteeId: z.number(), pillarId: z.number() }))
    .query(async ({ input }) => {
      return getChatConclusions(input.menteeId, input.pillarId);
    }),

  addChatConclusion: adminProcedure
    .input(z.object({
      menteeId: z.number(),
      pillarId: z.number(),
      content: z.string().min(1),
      chatMessageId: z.number().optional(),
      titulo: z.string().optional(),
      categoria: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      await addChatConclusion(input.menteeId, input.pillarId, input.content, input.chatMessageId, input.titulo, input.categoria);
      return { success: true };
    }),

  updateChatConclusion: adminProcedure
    .input(z.object({
      id: z.number(),
      content: z.string().min(1),
      titulo: z.string().optional(),
      categoria: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      await updateChatConclusion(input.id, input.content, input.titulo, input.categoria);
      return { success: true };
    }),

  deleteChatConclusion: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteChatConclusion(input.id);
      return { success: true };
    }),

  toggleConclusionInReport: adminProcedure
    .input(z.object({ id: z.number(), included: z.boolean() }))
    .mutation(async ({ input }) => {
      await toggleConclusionInReport(input.id, input.included);
      return { success: true };
    }),

  // Gera narrativa de análise de despesas para o mentor
  generateExpenseNarrative: adminProcedure
    .input(z.object({ menteeId: z.number() }))
    .mutation(async ({ input }) => {
      const expenseData = await getExpenseData(input.menteeId);
      const mentee = await getMenteeById(input.menteeId);
      if (!expenseData || !expenseData.expenses) throw new TRPCError({ code: "NOT_FOUND", message: "Dados de despesas não encontrados" });

      // Calculate totals for context
      const expenses = expenseData.expenses;
      let total = 0;
      const categoryTotals: Record<string, number> = {};
      for (const [key, val] of Object.entries(expenses)) {
        const cat = key.split(".")[0];
        const numVal = Number(val) || 0;
        categoryTotals[cat] = (categoryTotals[cat] || 0) + numVal;
        total += numVal;
      }

      const prompt = `Voce e um consultor de negocios especializado em clinicas medicas no Brasil.
Analise os dados financeiros abaixo e gere um texto em PRIMEIRA PESSOA do mentor (como se o mentor estivesse falando diretamente ao mentorado).

DADOS DO MENTORADO: ${mentee?.nome || "Mentorado"}
ESPECIALIDADE: ${mentee?.especialidade || "nao informada"}
CUSTO FIXO TOTAL: R$ ${total.toFixed(2)}
DESPESAS POR CATEGORIA: ${JSON.stringify(categoryTotals)}
FATURAMENTO MENSAL: R$ ${expenseData.mapaSala?.faturamentoMensal || "nao informado"}

GERE UM TEXTO com no maximo 4 paragrafos contendo:
1. Visao geral do custo fixo (se esta saudavel ou preocupante)
2. Custos ocultos identificados (provisoes ausentes, depreciacao, ociosidade)
3. Maiores oportunidades de otimizacao
4. Proximo passo pratico recomendado

TOM: Profissional, direto, empatico. Como um mentor experiente falando ao mentorado.
NAO mencione IA, algoritmos ou sistemas. Escreva como se VOCE fosse o mentor.`;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: "Voce e um mentor de negocios medicos experiente. Escreva sempre em primeira pessoa, como se voce fosse o mentor falando diretamente ao mentorado. Nunca mencione inteligencia artificial, algoritmos ou sistemas automatizados." },
          { role: "user", content: prompt },
        ],
      });
      const narrative = String(response?.choices?.[0]?.message?.content || "Nao foi possivel gerar a analise. Tente novamente.");
      return { narrative };
    }),

  // Gera narrativa de análise iVMP para o mentor
  generateIvmpNarrative: adminProcedure
    .input(z.object({ menteeId: z.number() }))
    .mutation(async ({ input }) => {
      const ivmpData = await getIvmpAnswers(input.menteeId);
      const mentee = await getMenteeById(input.menteeId);
      if (!ivmpData || !ivmpData.answers) throw new TRPCError({ code: "NOT_FOUND", message: "Dados do iVMP não encontrados" });

      const scores = calculateIvmpScores(ivmpData.answers);

      const prompt = `Voce e um consultor de negocios especializado em clinicas medicas no Brasil.
Analise o iVMP (Indice de Valor Medico Percebido) abaixo e gere um texto em PRIMEIRA PESSOA do mentor.

MENTORADO: ${mentee?.nome || "Mentorado"}
iVMP FINAL: ${scores.ivmpFinal.toFixed(1)}%
SCORES POR DIMENSAO: ${JSON.stringify(scores.dimensionScores)}

Para cada dimensao com score abaixo de 60%, gere 2-3 SUGESTOES PRATICAS de como melhorar, com acoes concretas que o mentorado pode implementar.

FORMATO:
1. Paragrafo de visao geral do iVMP
2. Para cada dimensao fraca: titulo da dimensao + sugestoes praticas numeradas
3. Paragrafo de conclusao com proximo passo

TOM: Profissional, direto, pratico. Como um mentor experiente.
NAO mencione IA. Escreva como se VOCE fosse o mentor.
O texto sera incluido num PDF entregue ao mentorado, entao deve ser claro e didatico.`;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: "Voce e um mentor de negocios medicos experiente. Escreva sempre em primeira pessoa, como se voce fosse o mentor falando diretamente ao mentorado. Nunca mencione inteligencia artificial, algoritmos ou sistemas automatizados." },
          { role: "user", content: prompt },
        ],
      });
      const narrative = String(response?.choices?.[0]?.message?.content || "Nao foi possivel gerar a analise. Tente novamente.");
      return { narrative };
    }),

  // Calcula impacto de uma edição em campo do iVMP ou despesas
  calculateEditImpact: adminProcedure
    .input(z.object({
      menteeId: z.number(),
      tool: z.enum(["expenses", "ivmp"]),
      field: z.string(),
      oldValue: z.number(),
      newValue: z.number(),
    }))
    .mutation(async ({ input }) => {
      if (input.tool === "ivmp") {
        const data = await getIvmpAnswers(input.menteeId);
        const answers = { ...(data?.answers || {}) };

        const oldAnswers = { ...answers, [input.field]: input.oldValue };
        const newAnswers = { ...answers, [input.field]: input.newValue };

        const oldScores = calculateIvmpScores(oldAnswers);
        const newScores = calculateIvmpScores(newAnswers);

        return {
          message: `iVMP alterado de ${oldScores.ivmpFinal.toFixed(1)}% para ${newScores.ivmpFinal.toFixed(1)}%`,
          oldScore: oldScores.ivmpFinal,
          newScore: newScores.ivmpFinal,
          diff: newScores.ivmpFinal - oldScores.ivmpFinal,
        };
      }

      // For expenses, recalculate totals
      return { message: "Custo fixo atualizado", oldScore: 0, newScore: 0, diff: 0 };
    }),

  // Auto-summary: gera resumo rápido ao abrir pilar (com cache de 24h)
  autoSummary: adminProcedure
    .input(z.object({ menteeId: z.number(), pillarId: z.number().min(1).max(7) }))
    .query(async ({ input }) => {
      const { menteeId, pillarId } = input;
      const db = await getDb();
      if (!db) return { summary: null, cached: false };

      // Verifica cache: mensagem "assistant" com prefixo [AUTO_SUMMARY] nas últimas 24h
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentMessages = await db.select().from(mentorAiChat)
        .where(and(
          eq(mentorAiChat.menteeId, menteeId),
          eq(mentorAiChat.pillarId, pillarId),
          eq(mentorAiChat.role, "assistant"),
          gte(mentorAiChat.createdAt, oneDayAgo),
        ))
        .orderBy(desc(mentorAiChat.createdAt))
        .limit(10);

      const cachedEntry = recentMessages.find(m => m.content.startsWith("[AUTO_SUMMARY]"));
      if (cachedEntry) {
        return { summary: cachedEntry.content.replace("[AUTO_SUMMARY]\n", ""), cached: true };
      }

      // Sem cache — busca respostas do mentorado
      const answers = await getPillarAnswers(menteeId, pillarId);
      const allAnswersText = answers
        .flatMap(a => (a.respostas as any[] ?? []))
        .filter((r: any) => r.resposta !== null && r.resposta !== undefined && r.resposta !== "" && !r.naoSabe)
        .map((r: any) => `- ${r.pergunta}: ${r.resposta}`)
        .join("\n");

      if (!allAnswersText) return { summary: null, cached: false };

      const pillarNames: Record<number, string> = {
        1: "Identidade e Propósito",
        2: "Posicionamento",
        3: "Diagnóstico do Negócio",
        4: "Gestão e Processos",
        5: "Precificação",
        6: "Marketing Digital",
        7: "Vendas e Comunicação",
      };

      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `Voce e um assistente de mentoria medica. Gere um RESUMO EXECUTIVO curto (3-5 frases) das respostas do mentorado no Pilar ${pillarId} — ${pillarNames[pillarId]}. Destaque os pontos-chave, gaps e oportunidades. Seja direto e pratico. Escreva em portugues.`,
          },
          {
            role: "user",
            content: `Respostas do mentorado:\n${allAnswersText}`,
          },
        ],
      });

      const summaryText = String(response?.choices?.[0]?.message?.content || "").trim();
      if (!summaryText) return { summary: null, cached: false };

      // Salva no cache com prefixo [AUTO_SUMMARY]
      await saveMentorAiChatMessage(menteeId, pillarId, "assistant", `[AUTO_SUMMARY]\n${summaryText}`);

      return { summary: summaryText, cached: false };
    }),
});

// ============================================================
// PILLAR PART CONTENT — Análises por parte geradas por IA
// ============================================================
const PART_SECTION_MAP: Record<number, Record<string, string[]>> = {
  1: { a: ["quem_sou", "valores"], b: ["ikigai", "valores_avancados"], c: ["missao_visao", "reflexao_identidade"] },
  2: { a: ["especialidade_atuacao", "publico_ideal"], b: ["diferencial"], c: ["proposta_valor"] },
  3: { a: ["estrutura_clinica", "custos_fixos", "custos_deslocamento", "faturamento_producao", "ociosidade_potencial", "reflexao_financeira"] },
  4: { a: ["equipe_gestao"], b: ["processos_atendimento"], c: ["reflexao_operacional"] },
  5: { a: ["precificacao_atual"], b: ["custos_variaveis"], c: ["reflexao_precificacao"] },
  6: { a: ["presenca_digital_atual"], b: ["comunicacao_tom_voz"], c: ["reflexao_marketing"] },
  7: { a: ["apresentacao_tratamento"], b: ["objecoes_comuns"], c: ["reflexao_conversao"] },
};

const PART_PROMPTS: Record<number, Record<string, string>> = {
  1: {
    a: `Analise as respostas do médico sobre autoconhecimento e valores. Gere um texto rico e personalizado (3-5 parágrafos) que:
1. Sintetize quem é este médico, o que o move e quais são seus valores centrais
2. Identifique padrões de comportamento e motivação
3. Aponte forças de caráter que devem ser aproveitadas na prática médica
4. Destaque possíveis pontos cegos ou contradições
Escreva em 2ª pessoa ("Você é...", "Seus valores..."), de forma direta, empática e profissional.`,
    b: `Com base nas respostas do médico, construa o Ikigai Profissional dele. Gere um texto rico (3-5 parágrafos) que:
1. Identifique a intersecção entre o que ele ama fazer, o que faz bem, o que o mundo precisa e pelo que pode ser pago
2. Nomeie claramente o Ikigai dele em uma frase-síntese
3. Explique como este Ikigai se manifesta (ou deveria se manifestar) na prática clínica
4. Aponte onde há desequilíbrio entre as 4 dimensões
Escreva em 2ª pessoa, de forma inspiradora mas concreta.`,
    c: `Com base nas respostas do médico, formule a Missão, Visão e Propósito profissional dele. Gere:
1. Uma declaração de MISSÃO (o que faz, para quem, como e por quê — máx. 2 frases)
2. Uma declaração de VISÃO (onde quer chegar em 5-10 anos — máx. 2 frases)
3. Uma declaração de PROPÓSITO (o "porquê" profundo — 1 frase impactante)
4. Um parágrafo explicando como essas declarações devem guiar as decisões do dia a dia
Escreva de forma direta, poderosa e memorável.`,
  },
  2: {
    a: `Analise as respostas sobre público e nicho. Gere um texto rico (3-5 parágrafos) que:
1. Defina com precisão o paciente ideal (avatar) com características demográficas e psicográficas
2. Identifique o nicho de mercado mais adequado para este médico
3. Aponte o tamanho e potencial deste nicho na região
4. Sugira como refinar ainda mais o posicionamento de nicho
Escreva em 2ª pessoa, com linguagem de negócios aplicada à medicina.`,
    b: `Analise as respostas sobre diferencial competitivo. Gere um texto rico (3-5 parágrafos) que:
1. Identifique os 3-5 diferenciais reais e únicos deste médico
2. Avalie quais diferenciais são percebidos pelos pacientes vs. apenas técnicos
3. Aponte o diferencial mais poderoso e como amplificá-lo
4. Sugira como comunicar esses diferenciais de forma autêntica
Escreva em 2ª pessoa, de forma estratégica e prática.`,
    c: `Com base em tudo que o médico respondeu, formule a Proposta de Valor e Tagline. Gere:
1. Uma Proposta de Valor completa (problema que resolve, para quem, como, resultado entregue)
2. 3 opções de Tagline (frase curta, memorável, que captura a essência)
3. Um parágrafo explicando onde e como usar cada elemento
4. Orientações sobre tom de voz e linguagem para comunicar esta proposta
Escreva de forma criativa mas fundamentada nas respostas do médico.`,
  },
  3: {
    a: `Analise o diagnóstico financeiro e de estrutura da clínica. Gere um texto rico (4-6 parágrafos) que:
1. Resuma o panorama atual da clínica (estrutura, custos, faturamento)
2. Calcule e interprete os principais indicadores (margem, ponto de equilíbrio, ociosidade)
3. Identifique os maiores gargalos financeiros e operacionais
4. Aponte oportunidades imediatas de melhoria de resultado
5. Compare com benchmarks do setor médico
Escreva de forma analítica, com dados concretos quando disponíveis.`,
    b: `Analise as despesas fixas mapeadas. Gere um texto rico (3-5 parágrafos) que:
1. Categorize e comente os principais grupos de despesa
2. Identifique despesas acima da média do setor ou que merecem revisão
3. Calcule o peso de cada categoria no total
4. Sugira estratégias específicas de redução ou otimização de custos
5. Estabeleça metas de redução de custos com prazos
Escreva de forma prática e orientada a ação.`,
    c: `Analise os resultados do iVMP (Índice de Valor Médico Percebido). Gere um texto rico (4-6 parágrafos) que:
1. Interprete o score geral e por dimensão
2. Identifique as dimensões mais fortes e mais fracas
3. Explique o impacto de cada dimensão na percepção de valor pelo paciente
4. Priorize as dimensões que mais impactariam o resultado se melhoradas
5. Sugira ações concretas para as 3 dimensões prioritárias
Escreva de forma didática, conectando os dados ao impacto no negócio.`,
    d: `Analise os cenários de simulação financeira. Gere um texto rico (3-5 parágrafos) que:
1. Interprete os cenários simulados e o que revelam sobre o potencial da clínica
2. Identifique o cenário mais realista e o mais ambicioso
3. Aponte os principais alavancadores de resultado (preço, volume, mix de serviços)
4. Estabeleça metas de curto (30d), médio (90d) e longo prazo (1 ano)
5. Sugira o próximo passo mais impactante para melhorar o resultado
Escreva de forma estratégica e motivadora.`,
  },
  4: {
    a: `Analise as respostas sobre rotina e gargalos operacionais. Gere um texto rico (3-5 parágrafos) que:
1. Mapeie como está estruturado o dia a dia da clínica
2. Identifique os principais gargalos que limitam produtividade ou qualidade
3. Calcule o impacto financeiro estimado de cada gargalo
4. Priorize os gargalos por impacto e facilidade de resolução
5. Sugira quick wins (melhorias rápidas) para implementar em 30 dias
Escreva de forma analítica e orientada a soluções.`,
    b: `Analise as respostas sobre equipe e delegação. Gere um texto rico (3-5 parágrafos) que:
1. Avalie a estrutura atual da equipe e distribuição de funções
2. Identifique tarefas que o médico faz mas poderia delegar
3. Calcule o valor/hora do médico e o custo de oportunidade de não delegar
4. Sugira um plano de delegação progressiva
5. Oriente sobre como estruturar a equipe para escalar
Escreva de forma prática, com exemplos concretos.`,
    c: `Com base nas respostas operacionais, crie o Mapa de Processos da clínica. Gere um texto rico (3-5 parágrafos) que:
1. Descreva os principais fluxos de atendimento (da marcação ao pós-consulta)
2. Identifique pontos de falha ou inconsistência nos processos
3. Sugira padronizações prioritárias (SOPs — Procedimentos Operacionais Padrão)
4. Oriente sobre como documentar e treinar a equipe nos processos
5. Defina indicadores para monitorar a qualidade dos processos
Escreva de forma estruturada e implementável.`,
  },
  5: {
    a: `Analise as crenças e práticas atuais de precificação do médico. Gere um texto rico (3-5 parágrafos) que:
1. Identifique as crenças limitantes sobre preço e dinheiro
2. Avalie se o preço atual está abaixo, adequado ou acima do mercado
3. Explique o impacto psicológico da precificação na percepção de valor
4. Sugira uma mudança de mentalidade sobre precificação
5. Oriente sobre como comunicar preços com confiança
Escreva de forma empática mas direta, desafiando crenças limitantes.`,
    b: `Analise a engenharia de preços da clínica. Gere um texto rico (4-6 parágrafos) que:
1. Avalie a tabela de serviços atual (preços, custos, margens)
2. Identifique serviços com margem baixa ou negativa
3. Calcule o mix ideal de serviços para maximizar o resultado
4. Sugira ajustes de preço com justificativa de valor
5. Oriente sobre como criar pacotes e serviços de alto valor
Escreva de forma analítica, com dados e cálculos quando disponíveis.`,
    c: `Analise onde o médico está perdendo dinheiro sem perceber. Gere um texto rico (3-5 parágrafos) que:
1. Liste e quantifique as principais fontes de "dinheiro invisível" identificadas
2. Calcule o impacto financeiro anual estimado de cada fonte
3. Priorize as perdas por valor e facilidade de recuperação
4. Sugira ações concretas para recuperar cada fonte de perda
5. Estabeleça metas de recuperação com prazos
Escreva de forma reveladora e motivadora, mostrando o potencial escondido.`,
  },
  6: {
    a: `Analise a presença digital atual do médico. Gere um texto rico (3-5 parágrafos) que:
1. Avalie cada canal digital (Instagram, LinkedIn, Google, site, etc.)
2. Identifique os pontos fortes e fracos de cada canal
3. Calcule o alcance potencial atual vs. o potencial real
4. Priorize os canais com maior retorno para este médico específico
5. Sugira melhorias imediatas para os 2-3 canais prioritários
Escreva de forma estratégica, com benchmarks do setor médico.`,
    b: `Com base no perfil do médico, crie a Estratégia de Conteúdo personalizada. Gere um texto rico (4-6 parágrafos) que:
1. Defina o tom de voz e a persona digital ideal para este médico
2. Identifique os 5-7 pilares de conteúdo mais relevantes para seu nicho
3. Sugira formatos de conteúdo adequados ao perfil e disponibilidade
4. Oriente sobre frequência de publicação realista e sustentável
5. Explique como conectar o conteúdo à geração de pacientes
Escreva de forma prática e personalizada, evitando conselhos genéricos.`,
    c: `Crie um Plano de Conteúdo de 30 Dias personalizado para o médico. Gere:
1. Um parágrafo introdutório explicando a estratégia do mês
2. Uma estrutura semanal de publicações (ex: 3x/semana, quais dias, quais formatos)
3. 8-12 ideias de conteúdo específicas para o nicho deste médico
4. Orientações sobre hashtags, horários e engajamento
5. Métricas para avaliar o sucesso ao final dos 30 dias
Escreva de forma prática e implementável, com exemplos concretos.`,
  },
  7: {
    a: `Analise o processo de atendimento atual. Gere um texto rico (3-5 parágrafos) que:
1. Mapeie a jornada completa do paciente (da descoberta ao pós-consulta)
2. Identifique os momentos de encantamento e os pontos de atrito
3. Avalie como o processo atual impacta a percepção de valor
4. Sugira melhorias concretas em cada etapa da jornada
5. Oriente sobre como criar uma experiência premium e memorável
Escreva de forma orientada à experiência do paciente.`,
    b: `Com base no perfil do médico, crie o Script da Consulta de Alto Valor. Gere um texto rico (4-6 parágrafos) que:
1. Estruture as 6 fases da consulta (acolhimento, anamnese, exame, diagnóstico, proposta, fechamento)
2. Para cada fase, sugira perguntas-chave e abordagens específicas
3. Oriente sobre como comunicar diagnóstico e proposta de tratamento com confiança
4. Explique como criar conexão emocional genuína durante a consulta
5. Sugira como conduzir o fechamento sem pressão mas com clareza
Escreva de forma prática, com exemplos de frases e abordagens.`,
    c: `Analise as objeções mais comuns e crie o sistema de follow-up. Gere um texto rico (3-5 parágrafos) que:
1. Liste as 5-7 objeções mais comuns identificadas e como responder a cada uma
2. Crie um script de resposta para as 3 objeções mais frequentes
3. Estruture um sistema de follow-up em 3 etapas (imediato, 7 dias, 30 dias)
4. Oriente sobre como fazer follow-up sem parecer insistente
5. Sugira ferramentas e automações para facilitar o follow-up
Escreva de forma prática, com scripts e exemplos concretos.`,
  },
};

const pillarPartContentRouter = router({
  // Mentorado busca análises liberadas de um pilar
  // Fonte de verdade: part_releases.released = true (o mentor liberou a parte)
  // Mostra análise se existir (status = "ready" ou "released"), independente do status interno
  getMyReleased: menteeProcedure
    .input(z.object({ pillarId: z.number().min(1).max(7) }))
    .query(async ({ ctx, input }) => {
      // 1. Busca quais partes o mentor liberou para este pilar
      const releases = await getPartReleases(ctx.menteeId, input.pillarId);
      const releasedPartIds = new Set(
        releases.filter((r: any) => r.released).map((r: any) => r.partId)
      );
      if (releasedPartIds.size === 0) return [];

      // 2. Busca análises existentes para este pilar
      const all = await getPillarPartContent(ctx.menteeId, input.pillarId);

      // 3. Retorna apenas análises cujas partes foram liberadas pelo mentor
      // (aceita status "ready" ou "released" — não bloqueia por status interno)
      return (all as any[]).filter(
        (p: any) => releasedPartIds.has(p.partId) && (p.status === "ready" || p.status === "released")
      );
    }),
  // Busca todas as análises de partes de um pilar para um mentorado
  getAll: adminProcedure
    .input(z.object({ menteeId: z.number(), pillarId: z.number().min(1).max(7) }))
    .query(async ({ input }) => {
      return getPillarPartContent(input.menteeId, input.pillarId) as Promise<any[]>;
    }),

  // Salva/atualiza análise de uma parte específica
  save: adminProcedure
    .input(z.object({
      menteeId: z.number(),
      pillarId: z.number().min(1).max(7),
      partId: z.string(),
      partLabel: z.string(),
      titulo: z.string().optional(),
      conteudo: z.string().optional(),
      guiaUso: z.string().optional(),
      destaques: z.array(z.string()).optional(),
      proximosPassos: z.array(z.string()).optional(),
      status: z.enum(["draft", "ready", "released"]).optional(),
    }))
    .mutation(async ({ input }) => {
      const { menteeId, pillarId, partId, partLabel, ...data } = input;
      return upsertPillarPartContent(menteeId, pillarId, partId, partLabel, data);
    }),

  // Gera análise de uma parte específica via IA
  generate: adminProcedure
    .input(z.object({
      menteeId: z.number(),
      pillarId: z.number().min(1).max(7),
      partId: z.string(),
      partLabel: z.string(),
    }))
    .mutation(async ({ input }) => {
      const { menteeId, pillarId, partId, partLabel } = input;

      // Busca respostas do mentorado nas seções relevantes para esta parte
      const sectionIds = PART_SECTION_MAP[pillarId]?.[partId] ?? [];
      const allAnswers = await getAllPillarAnswersForMentee(menteeId);
      const pillarAnswersList = allAnswers.filter((a: any) => a.pillarId === pillarId);

      // Filtra respostas das seções desta parte
      let relevantAnswers: string[] = [];
      for (const ans of pillarAnswersList) {
        const respostas = (ans.respostas as any[]) ?? [];
        if (sectionIds.length === 0 || sectionIds.includes((ans as any).secao)) {
          const filtered = respostas
            .filter((r: any) => r.resposta !== null && r.resposta !== undefined && r.resposta !== "" && !r.naoSabe)
            .map((r: any) => `- ${r.pergunta}: ${r.resposta}`);
          relevantAnswers.push(...filtered);
        }
      }

      // Para partes do tipo tool/simulator, busca dados específicos
      let toolData = "";
      if (pillarId === 3) {
        if (partId === "b") {
          const expenses = await getExpenseData(menteeId);
          if (expenses?.expenses) {
            const totalExpenses = Object.values(expenses.expenses).reduce((a: number, b) => a + Number(b), 0);
            toolData = `\nDados de Despesas Fixas:\n- Total despesas fixas: R$ ${totalExpenses.toFixed(2)}\n- Categorias: ${JSON.stringify(expenses.expenses)}\n`;
          }
        } else if (partId === "c") {
          const ivmp = await getIvmpAnswers(menteeId);
          if (ivmp?.answers) {
            const scores = calculateIvmpScores(ivmp.answers as any);
            toolData = `\nResultados iVMP:\n- Score geral: ${scores.ivmpFinal.toFixed(1)}%\n- Por dimensão: ${Object.entries(scores.dimensionScores).map(([k, v]) => `${k}: ${v.percentage.toFixed(1)}%`).join(", ")}\n`;
          }
        } else if (partId === "d") {
          const sim = await getSimulationData(menteeId);
          if (sim) {
            toolData = `\nDados de Simulação:\n- Serviços: ${JSON.stringify(sim.servicos).substring(0, 300)}\n- Mix: ${JSON.stringify(sim.mixAtendimentos)}\n`;
          }
        }
      } else if (pillarId === 5 && partId === "b") {
        const pricing = await getFinancialData(menteeId);
        if (pricing?.precificacaoJson) {
          const p = pricing.precificacaoJson as any;
          toolData = `\nEngenharia de Preços:\n- Serviços: ${JSON.stringify(p.services ?? []).substring(0, 500)}\n- Mix de atendimentos: ${JSON.stringify(p.mixAtendimentos ?? {})}\n`;
        }
      }

      const answersText = relevantAnswers.join("\n") || "(nenhuma resposta registrada para esta parte)";
      const partPrompt = PART_PROMPTS[pillarId]?.[partId] ?? `Analise as respostas do médico sobre "${partLabel}" e gere uma análise profunda e personalizada em 3-5 parágrafos.`;

      const pillarNames: Record<number, string> = {
        1: "Identidade e Propósito", 2: "Posicionamento", 3: "Diagnóstico do Negócio",
        4: "Gestão e Processos", 5: "Precificação", 6: "Marketing Digital", 7: "Vendas e Comunicação",
      };

      const messages: Array<{ role: "system" | "user"; content: string }> = [
        {
          role: "system",
          content: `Você é um especialista em mentoria médica e desenvolvimento de negócios para médicos. Você está analisando o Pilar ${pillarId} — ${pillarNames[pillarId]}, especificamente a Parte ${partId.toUpperCase()} — ${partLabel}.

Sua análise deve ser:
- Personalizada: baseada EXCLUSIVAMENTE nas respostas deste médico
- Profunda: vá além do óbvio, identifique padrões e insights não óbvios
- Prática: sempre conecte a análise a ações concretas
- Empática: reconheça os desafios únicos da carreira médica
- Premium: escreva como um consultor sênior de alto nível

Não use listas com bullets no texto principal — escreva em parágrafos fluidos e bem estruturados.
Ao final, forneça:
1. Um título impactante para esta análise (máx. 10 palavras)
2. O texto principal da análise (3-6 parágrafos)
3. Um "Guia de Uso" explicando como o médico deve usar este resultado no dia a dia (1-2 parágrafos)
4. 3-5 destaques (frases curtas, insights-chave)
5. 3-5 próximos passos concretos e acionáveis

Formate a resposta como JSON com as chaves: titulo, conteudo, guiaUso, destaques (array), proximosPassos (array).`,
        },
        {
          role: "user",
          content: `${partPrompt}\n\nRespostas do mentorado:\n${answersText}${toolData}`,
        },
      ];

      const response = await invokeLLM({
        messages,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "pillar_part_analysis",
            strict: true,
            schema: {
              type: "object",
              properties: {
                titulo: { type: "string" },
                conteudo: { type: "string" },
                guiaUso: { type: "string" },
                destaques: { type: "array", items: { type: "string" } },
                proximosPassos: { type: "array", items: { type: "string" } },
              },
              required: ["titulo", "conteudo", "guiaUso", "destaques", "proximosPassos"],
              additionalProperties: false,
            },
          },
        },
      });

      const content = response?.choices?.[0]?.message?.content ?? "{}";
      const parsed = JSON.parse(typeof content === "string" ? content : JSON.stringify(content));

      // Salva no banco
      await upsertPillarPartContent(menteeId, pillarId, partId, partLabel, {
        titulo: parsed.titulo,
        conteudo: parsed.conteudo,
        guiaUso: parsed.guiaUso,
        destaques: parsed.destaques ?? [],
        proximosPassos: parsed.proximosPassos ?? [],
        status: "draft",
        generatedByAi: true,
      });

      return {
        titulo: parsed.titulo,
        conteudo: parsed.conteudo,
        guiaUso: parsed.guiaUso,
        destaques: parsed.destaques ?? [],
        proximosPassos: parsed.proximosPassos ?? [],
      };
    }),
});

// APP ROUTER
// ============================================================
export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  mentee: menteeRouter,
  mentor: mentorRouter,
  portal: menteePortalRouter,
  onboarding: onboardingRouter,
  marketing: marketingRouter,
  questionnaire: questionnaireRouter,
  documents: documentsRouter,
  pillarTools: pillarToolsRouter,
  pillarAnswers: pillarAnswersRouter,
  pillarFeedback: pillarFeedbackRouter,
  mentorAI: mentorAiRouter,
  pillarReport: pillarReportRouter,
  pillarPartContent: pillarPartContentRouter,
});

export type AppRouter = typeof appRouter;
