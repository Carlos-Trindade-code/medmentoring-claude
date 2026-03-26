import {
  boolean,
  decimal,
  int,
  json,
  mediumtext,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

// ============================================================
// USERS — Manus OAuth (mentor = admin)
// ============================================================
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ============================================================
// MENTEES — Mentorados
// ============================================================
export const mentees = mysqlTable("mentees", {
  id: int("id").autoincrement().primaryKey(),
  // Código único de acesso (ex: ANA2025) — hash bcrypt
  accessCode: varchar("accessCode", { length: 64 }).notNull().unique(),
  accessCodeHash: varchar("accessCodeHash", { length: 255 }).notNull(),
  nome: varchar("nome", { length: 255 }).notNull(),
  especialidade: varchar("especialidade", { length: 255 }).default(""),
  cidade: varchar("cidade", { length: 255 }).default(""),
  estado: varchar("estado", { length: 2 }).default(""),
  telefone: varchar("telefone", { length: 20 }).default(""),
  email: varchar("email", { length: 320 }).default(""),
  // Dados do negócio
  tipoClinica: varchar("tipoClinica", { length: 100 }).default(""),
  tempoFormacao: int("tempoFormacao").default(0),
  faturamentoMedio: decimal("faturamentoMedio", { precision: 12, scale: 2 }).default("0"),
  // Controle de mentoria
  dataInicio: timestamp("dataInicio"),
  dataCadastro: timestamp("dataCadastro").defaultNow().notNull(),
  horasRealizadas: decimal("horasRealizadas", { precision: 6, scale: 1 }).default("0"),
  sessoesRealizadas: int("sessoesRealizadas").default(0),
  ativo: boolean("ativo").default(true).notNull(),
  // Notas gerais do mentor sobre o mentorado
  notasGerais: text("notasGerais"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Mentee = typeof mentees.$inferSelect;
export type InsertMentee = typeof mentees.$inferInsert;

// ============================================================
// PILLAR_RELEASES — Liberações granulares (módulo × bloco)
// ============================================================
export const pillarReleases = mysqlTable("pillar_releases", {
  id: int("id").autoincrement().primaryKey(),
  menteeId: int("menteeId").notNull().references(() => mentees.id, { onDelete: "cascade" }),
  pillarId: int("pillarId").notNull(), // 1–7
  // Blocos: checklist, resumo, financeiro, materiais, sessoes
  checklistReleased: boolean("checklistReleased").default(false).notNull(),
  resumoReleased: boolean("resumoReleased").default(false).notNull(),
  financeiroReleased: boolean("financeiroReleased").default(false).notNull(),
  materiaisReleased: boolean("materiaisReleased").default(false).notNull(),
  sessoesReleased: boolean("sessoesReleased").default(false).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PillarRelease = typeof pillarReleases.$inferSelect;
export type InsertPillarRelease = typeof pillarReleases.$inferInsert;

// ============================================================
// CHECKLIST_ITEMS — Status de cada item do checklist
// ============================================================
export const checklistItems = mysqlTable("checklist_items", {
  id: int("id").autoincrement().primaryKey(),
  menteeId: int("menteeId").notNull().references(() => mentees.id, { onDelete: "cascade" }),
  pillarId: int("pillarId").notNull(), // 1–7
  itemIndex: int("itemIndex").notNull(), // índice do item no array do pilar
  // Estados: pending → requested (mentorado solicita) → completed (mentor confirma)
  status: mysqlEnum("status", ["pending", "requested", "completed"]).default("pending").notNull(),
  completedAt: timestamp("completedAt"),
  requestedAt: timestamp("requestedAt"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ChecklistItem = typeof checklistItems.$inferSelect;
export type InsertChecklistItem = typeof checklistItems.$inferInsert;

// ============================================================
// SESSION_REQUESTS — Solicitações de sessão
// ============================================================
export const sessionRequests = mysqlTable("session_requests", {
  id: int("id").autoincrement().primaryKey(),
  menteeId: int("menteeId").notNull().references(() => mentees.id, { onDelete: "cascade" }),
  pillarId: int("pillarId"), // pilar relacionado (opcional)
  assunto: varchar("assunto", { length: 500 }).notNull(),
  mensagem: text("mensagem"),
  dataPreferida: varchar("dataPreferida", { length: 50 }).default(""),
  status: mysqlEnum("status", ["pending", "confirmed", "refused", "completed"]).default("pending").notNull(),
  // Resposta do mentor
  mentorResposta: text("mentorResposta"),
  dataConfirmada: varchar("dataConfirmada", { length: 50 }).default(""),
  horaConfirmada: varchar("horaConfirmada", { length: 10 }).default(""),
  linkSessao: varchar("linkSessao", { length: 500 }).default(""),
  // Registro de sessão realizada
  duracaoMinutos: int("duracaoMinutos").default(0),
  notasSessao: text("notasSessao"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SessionRequest = typeof sessionRequests.$inferSelect;
export type InsertSessionRequest = typeof sessionRequests.$inferInsert;

// ============================================================
// MATERIALS — Materiais por módulo
// ============================================================
export const materials = mysqlTable("materials", {
  id: int("id").autoincrement().primaryKey(),
  menteeId: int("menteeId").notNull().references(() => mentees.id, { onDelete: "cascade" }),
  pillarId: int("pillarId").notNull(),
  titulo: varchar("titulo", { length: 500 }).notNull(),
  tipo: mysqlEnum("tipo", ["link", "pdf", "video", "planilha", "apresentacao", "exercicio"]).notNull(),
  url: text("url").notNull(),
  fileKey: varchar("fileKey", { length: 500 }).default(""), // chave S3 se for upload
  descricao: text("descricao"),
  tamanhoBytes: int("tamanhoBytes").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Material = typeof materials.$inferSelect;
export type InsertMaterial = typeof materials.$inferInsert;

// ============================================================
// MENTOR_NOTES — Notas privadas do mentor por módulo
// ============================================================
export const mentorNotes = mysqlTable("mentor_notes", {
  id: int("id").autoincrement().primaryKey(),
  menteeId: int("menteeId").notNull().references(() => mentees.id, { onDelete: "cascade" }),
  pillarId: int("pillarId").notNull(),
  conteudo: text("conteudo").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MentorNote = typeof mentorNotes.$inferSelect;
export type InsertMentorNote = typeof mentorNotes.$inferInsert;

// ============================================================
// IVMP_DATA — Dados do questionário iVMP por mentorado
// ============================================================
export const ivmpData = mysqlTable("ivmp_data", {
  id: int("id").autoincrement().primaryKey(),
  menteeId: int("menteeId").notNull().references(() => mentees.id, { onDelete: "cascade" }).unique(),
  // JSON com array de categorias e scores
  categoriesJson: json("categoriesJson").notNull(),
  ivmpFinal: decimal("ivmpFinal", { precision: 5, scale: 4 }).default("0"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type IvmpData = typeof ivmpData.$inferSelect;
export type InsertIvmpData = typeof ivmpData.$inferInsert;

// ============================================================
// FINANCIAL_DATA — Dados financeiros por mentorado
// ============================================================
export const financialData = mysqlTable("financial_data", {
  id: int("id").autoincrement().primaryKey(),
  menteeId: int("menteeId").notNull().references(() => mentees.id, { onDelete: "cascade" }).unique(),
  // JSON com despesas, mapa de sala e precificação
  despesasJson: json("despesasJson"),
  mapaSalaJson: json("mapaSalaJson"),
  precificacaoJson: json("precificacaoJson"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type FinancialData = typeof financialData.$inferSelect;
export type InsertFinancialData = typeof financialData.$inferInsert;

// ============================================================
// ONBOARDING_FORMS — Formulários de prospecção (sessão gratuita)
// ============================================================
export const onboardingForms = mysqlTable("onboarding_forms", {
  id: int("id").autoincrement().primaryKey(),
  nome: varchar("nome", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  telefone: varchar("telefone", { length: 20 }).default(""),
  especialidade: varchar("especialidade", { length: 255 }).default(""),
  tempoFormacao: varchar("tempoFormacao", { length: 50 }).default(""),
  estruturaAtual: varchar("estruturaAtual", { length: 100 }).default(""),
  faturamentoFaixa: varchar("faturamentoFaixa", { length: 50 }).default(""),
  principalDor: text("principalDor"),
  tentouResolver: text("tentouResolver"),
  disponibilidade: varchar("disponibilidade", { length: 255 }).default(""),
  // Análise automática dos pilares prioritários
  pilaresIdentificados: json("pilaresIdentificados"),
  status: mysqlEnum("status", ["new", "contacted", "converted", "lost"]).default("new").notNull(),
  menteeId: int("menteeId").references(() => mentees.id), // preenchido se virar mentorado
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type OnboardingForm = typeof onboardingForms.$inferSelect;
export type InsertOnboardingForm = typeof onboardingForms.$inferInsert;

// ============================================================
// PILLAR_DIAGNOSTICS — Respostas de diagnóstico por pilar e mentorado
// ============================================================
export const pillarDiagnostics = mysqlTable("pillar_diagnostics", {
  id: int("id").autoincrement().primaryKey(),
  menteeId: int("menteeId").notNull().references(() => mentees.id, { onDelete: "cascade" }),
  pillarId: int("pillarId").notNull(), // 1–7
  // Respostas às perguntas de investigação do mentor (JSON: { pergunta: string, resposta: string }[])
  respostasJson: json("respostasJson"),
  // Angústias identificadas (JSON: string[])
  angustiasJson: json("angustiasJson"),
  // Técnicas selecionadas pelo mentor (JSON: { angustia: string, tecnica: string }[])
  tecnicasJson: json("tecnicasJson"),
  // Análise estratégica gerada pelo mentor (texto livre)
  analiseEstrategica: text("analiseEstrategica"),
  // Pilares prioritários identificados neste diagnóstico (JSON: number[])
  pilaresUrgentes: json("pilaresUrgentes"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PillarDiagnostic = typeof pillarDiagnostics.$inferSelect;
export type InsertPillarDiagnostic = typeof pillarDiagnostics.$inferInsert;

// ============================================================
// DIAGNOSIS_SESSIONS — Sessões de diagnóstico gratuito (prospecção)
// ============================================================
export const diagnosisSessions = mysqlTable("diagnosis_sessions", {
  id: int("id").autoincrement().primaryKey(),
  // Pode ser um prospecto (sem menteeId) ou mentorado existente
  menteeId: int("menteeId").references(() => mentees.id, { onDelete: "set null" }),
  nomeProspecto: varchar("nomeProspecto", { length: 255 }).default(""),
  // Respostas do roteiro de diagnóstico (JSON estruturado)
  respostasRoteiro: json("respostasRoteiro"),
  // Pilares prioritários identificados
  pilaresUrgentes: json("pilaresUrgentes"),
  // iVMP estimado durante a sessão
  ivmpEstimado: decimal("ivmpEstimado", { precision: 5, scale: 4 }),
  // Notas do mentor durante a sessão
  notasSessao: text("notasSessao"),
  status: mysqlEnum("status", ["draft", "completed", "converted"]).default("draft").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DiagnosisSession = typeof diagnosisSessions.$inferSelect;
export type InsertDiagnosisSession = typeof diagnosisSessions.$inferInsert;

// ============================================================
// NPS_RESPONSES — NPS por módulo concluído
// ============================================================
export const npsResponses = mysqlTable("nps_responses", {
  id: int("id").autoincrement().primaryKey(),
  menteeId: int("menteeId").notNull().references(() => mentees.id, { onDelete: "cascade" }),
  pillarId: int("pillarId").notNull(),
  score: int("score").notNull(), // 0–10
  comentario: text("comentario"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type NpsResponse = typeof npsResponses.$inferSelect;
export type InsertNpsResponse = typeof npsResponses.$inferInsert;

// ============================================================
// MENTEE_QUESTIONNAIRE — Questionário autônomo por fases
// ============================================================
// Cada fase é salva como uma linha separada (faseId 1–6)
// O mentorado pode retomar de onde parou a qualquer momento
export const menteeQuestionnaire = mysqlTable("mentee_questionnaire", {
  id: int("id").autoincrement().primaryKey(),
  menteeId: int("menteeId").notNull().references(() => mentees.id, { onDelete: "cascade" }),
  // Fase: 1=Identidade, 2=Perfil, 3=Situação Atual, 4=Sonhos, 5=Presença Digital, 6=Paciente Ideal
  faseId: int("faseId").notNull(),
  // Respostas em JSON: { perguntaId: string, pergunta: string, resposta: string }[]
  respostasJson: json("respostasJson"),
  // Status da fase
  status: mysqlEnum("status", ["nao_iniciada", "em_progresso", "concluida"]).default("nao_iniciada").notNull(),
  // Resumo gerado pela IA para esta fase (para o mentor)
  resumoIa: text("resumoIa"),
  concluidaEm: timestamp("concluidaEm"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type MenteeQuestionnaire = typeof menteeQuestionnaire.$inferSelect;
export type InsertMenteeQuestionnaire = typeof menteeQuestionnaire.$inferInsert;

// ============================================================
// MENTEE_DOCUMENTS — Pasta de documentos gerados pelo mentorado
// ============================================================
// Centraliza todos os documentos para o mentor formular o prompt de marketing
export const menteeDocuments = mysqlTable("mentee_documents", {
  id: int("id").autoincrement().primaryKey(),
  menteeId: int("menteeId").notNull().references(() => mentees.id, { onDelete: "cascade" }),
  // Tipo do documento
  tipo: mysqlEnum("tipo", [
    "resumo_questionario",   // Resumo completo do questionário por fases
    "resumo_fase",           // Resumo de uma fase específica
    "prompt_marketing",      // Prompt de marketing gerado pela IA
    "persona",               // Persona do paciente ideal
    "diagnostico_pilar",     // Diagnóstico de um pilar específico
  ]).notNull(),
  titulo: varchar("titulo", { length: 255 }).notNull(),
  // Conteúdo do documento (texto completo)
  conteudo: text("conteudo").notNull(),
  // Metadados extras (ex: faseId, pillarId, etc.)
  metadados: json("metadados"),
  // Lido pelo mentor?
  lidoPeloMentor: boolean("lidoPeloMentor").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type MenteeDocument = typeof menteeDocuments.$inferSelect;
export type InsertMenteeDocument = typeof menteeDocuments.$inferInsert;

// ============================================================
// PILLAR_ANSWERS — Respostas do mentorado por pilar (questionário autônomo)
// ============================================================
// Cada pilar tem suas próprias seções de perguntas
// O mentorado responde autonomamente, sem o mentor presente
// As respostas alimentam automaticamente as tabelas do mentor
export const pillarAnswers = mysqlTable("pillar_answers", {
  id: int("id").autoincrement().primaryKey(),
  menteeId: int("menteeId").notNull().references(() => mentees.id, { onDelete: "cascade" }),
  pillarId: int("pillarId").notNull(), // 1-7
  // Seção dentro do pilar (ex: "custos_fixos", "perfil", "posicionamento")
  secao: varchar("secao", { length: 100 }).notNull(),
  // Respostas em JSON: { id: string, pergunta: string, resposta: string | number | boolean | null, naoSabe: boolean }[]
  respostas: json("respostas"),
  // Status da seção
  status: mysqlEnum("status", ["nao_iniciada", "em_progresso", "concluida"]).default("nao_iniciada").notNull(),
  concluidaEm: timestamp("concluidaEm"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type PillarAnswer = typeof pillarAnswers.$inferSelect;
export type InsertPillarAnswer = typeof pillarAnswers.$inferInsert;

// ============================================================
// PILLAR_FEEDBACK — Feedback do mentor por pilar
// ============================================================
export const pillarFeedback = mysqlTable("pillar_feedback", {
  id: int("id").autoincrement().primaryKey(),
  menteeId: int("menteeId").notNull().references(() => mentees.id, { onDelete: "cascade" }),
  pillarId: int("pillarId").notNull(), // 1-7
  // Feedback textual do mentor
  feedback: text("feedback"),
  // Plano de ação gerado pelo mentor
  planoAcao: text("planoAcao"),
  // Pontos fortes identificados
  pontosFortesJson: json("pontosFortesJson"),
  // Pontos de melhoria

  pontosMelhoriaJson: json("pontosMelhoriaJson"),
  // Conclusão liberada para o mentorado?
  conclusaoLiberada: boolean("conclusaoLiberada").default(false).notNull(),
  conclusaoLiberadaEm: timestamp("conclusaoLiberadaEm"),
  // IA — Análise gerada para o Pilar 1 (sugestões de especialização + roteiro estratégico)
  aiSpecializationSuggestions: json("aiSpecializationSuggestions"),
  aiPillarRoadmap: json("aiPillarRoadmap"),
  aiAnalysisGeneratedAt: timestamp("aiAnalysisGeneratedAt"),
  // IA — Diagnóstico individualizado por pilar (visível apenas para o mentor)
  aiDiagnosis: json("aiDiagnosis"),
  aiDiagnosisGeneratedAt: timestamp("aiDiagnosisGeneratedAt"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type PillarFeedback = typeof pillarFeedback.$inferSelect;
export type InsertPillarFeedback = typeof pillarFeedback.$inferInsert;

// ============================================================
// PILLAR_CONCLUSIONS — Conclusões do mentor por pilar (geradas com IA, editáveis)
// ============================================================
export const pillarConclusions = mysqlTable("pillar_conclusions", {
  id: int("id").autoincrement().primaryKey(),
  menteeId: int("menteeId").notNull().references(() => mentees.id, { onDelete: "cascade" }),
  pillarId: int("pillarId").notNull(), // 1-7
  // Conclusões em JSON — estrutura varia por pilar
  // Pilar 1: { missao, visao, ikigai: { ama, bomNisso, mundoPrecisa, podeSerPago, sintese }, valores: string[] }
  // Pilar 2: { proposta_valor, nicho_definido, diferencial_competitivo, tagline }
  // Pilar 3: { diagnostico_financeiro, ponto_equilibrio, metas, plano_acao_financeiro }
  // Pilar 4: { mapa_processos, o_que_delegar, prioridades_operacionais }
  // Pilar 5: { tabela_precos, estrategia_reajuste, argumentos_valor }
  // Pilar 6: { estrategia_conteudo, tom_voz, plano_30_dias }
  // Pilar 7: { script_apresentacao, tratamento_objecoes, plano_followup }
  conclusoesJson: json("conclusoesJson"),
  // Gerado pela IA?
  geradoPorIa: boolean("geradoPorIa").default(false).notNull(),
  iaGeneratedAt: timestamp("iaGeneratedAt"),
  // Liberado para o mentorado ver no PDF?
  liberadoParaMentorado: boolean("liberadoParaMentorado").default(false).notNull(),
  liberadoEm: timestamp("liberadoEm"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type PillarConclusion = typeof pillarConclusions.$inferSelect;
export type InsertPillarConclusion = typeof pillarConclusions.$inferInsert;

// ============================================================
// MENTOR_AI_CHAT — Chat de IA contínuo do mentor por pilar
// ============================================================
export const mentorAiChat = mysqlTable("mentor_ai_chat", {
  id: int("id").autoincrement().primaryKey(),
  menteeId: int("menteeId").notNull().references(() => mentees.id, { onDelete: "cascade" }),
  pillarId: int("pillarId").notNull(), // 1-7
  // Papel: "user" (mentor) ou "assistant" (IA)
  role: mysqlEnum("role", ["user", "assistant"]).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type MentorAiChat = typeof mentorAiChat.$inferSelect;
export type InsertMentorAiChat = typeof mentorAiChat.$inferInsert;

// ============================================================
// MENTOR_SUGGESTIONS — Sugestões geradas pela IA (checklist)
// ============================================================
export const mentorSuggestions = mysqlTable("mentor_suggestions", {
  id: int("id").autoincrement().primaryKey(),
  menteeId: int("menteeId").notNull().references(() => mentees.id, { onDelete: "cascade" }),
  pillarId: int("pillarId").notNull(), // 1-7 (0 = geral)
  texto: text("texto").notNull(),
  categoria: varchar("categoria", { length: 100 }), // ex: "ação", "reflexão", "próximo passo"
  concluida: boolean("concluida").default(false).notNull(),
  concluidaEm: timestamp("concluidaEm"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type MentorSuggestion = typeof mentorSuggestions.$inferSelect;
export type InsertMentorSuggestion = typeof mentorSuggestions.$inferInsert;

// ============================================================
// PART_RELEASES — Liberações granulares por parte de cada pilar
// ============================================================
export const partReleases = mysqlTable("part_releases", {
  id: int("id").primaryKey().autoincrement(),
  menteeId: int("mentee_id").notNull().references(() => mentees.id, { onDelete: "cascade" }),
  pillarId: int("pillar_id").notNull(),
  partId: varchar("part_id", { length: 50 }).notNull(),
  partLabel: varchar("part_label", { length: 200 }).notNull(),
  released: boolean("released").default(false),
  releasedAt: timestamp("released_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type PartRelease = typeof partReleases.$inferSelect;
export type InsertPartRelease = typeof partReleases.$inferInsert;

// ============================================================
// PILLAR_PART_CONTENT — Análises geradas por IA por parte de cada pilar
// ============================================================
export const pillarPartContent = mysqlTable("pillar_part_content", {
  id: int("id").autoincrement().primaryKey(),
  menteeId: int("mentee_id").notNull().references(() => mentees.id, { onDelete: "cascade" }),
  pillarId: int("pillar_id").notNull(), // 1-7
  partId: varchar("part_id", { length: 10 }).notNull(), // "a", "b", "c", "d"
  partLabel: varchar("part_label", { length: 200 }).notNull(),
  titulo: varchar("titulo", { length: 300 }),
  conteudo: text("conteudo"),
  guiaUso: text("guia_uso"),
  destaques: text("destaques"), // JSON string
  proximosPassos: text("proximos_passos"), // JSON string
  status: varchar("status", { length: 50 }).default("draft").notNull(),
  generatedByAi: boolean("generated_by_ai").default(false).notNull(),
  generatedAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});
export type PillarPartContent = typeof pillarPartContent.$inferSelect;
export type InsertPillarPartContent = typeof pillarPartContent.$inferInsert;

// ============================================================
// PILLAR_REPORTS — Relatórios PDF premium por pilar
// ============================================================
export const pillarReports = mysqlTable("pillar_reports", {
  id: int("id").autoincrement().primaryKey(),
  menteeId: int("mentee_id").notNull().references(() => mentees.id, { onDelete: "cascade" }),
  pillarId: int("pillar_id").notNull(), // 1-7
  // Campos do relatório gerado pela IA
  title: varchar("title", { length: 300 }),
  subtitle: varchar("subtitle", { length: 300 }),
  executiveSummary: text("executive_summary"),
  strengthsJson: text("strengths_json"),
  attentionJson: text("attention_json"),
  actionPlanJson: text("action_plan_json"),
  conclusionsText: text("conclusions_text"),
  suggestionsJson: text("suggestions_json"),
  htmlContent: mediumtext("html_content"),
  pdfUrl: varchar("pdf_url", { length: 500 }),
  generatedAt: timestamp("generated_at"),
  // Status
  status: varchar("status", { length: 50 }).default("draft").notNull(),
  releasedAt: timestamp("released_at"),
  emailSentAt: timestamp("email_sent_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});
export type PillarReport = typeof pillarReports.$inferSelect;
export type InsertPillarReport = typeof pillarReports.$inferInsert;

// ============================================================
// CHAT_CONCLUSIONS — Conclusões marcadas pelo mentor no chat IA
// ============================================================
export const chatConclusions = mysqlTable("chat_conclusions", {
  id: int("id").autoincrement().primaryKey(),
  menteeId: int("mentee_id").notNull().references(() => mentees.id, { onDelete: "cascade" }),
  pillarId: int("pillar_id").notNull(),
  chatMessageId: int("chat_message_id"),
  content: text("content").notNull(),
  titulo: varchar("titulo", { length: 300 }),
  categoria: varchar("categoria", { length: 100 }),
  includedInReport: boolean("included_in_report").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});
export type ChatConclusion = typeof chatConclusions.$inferSelect;
export type InsertChatConclusion = typeof chatConclusions.$inferInsert;
