import { and, desc, eq, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  ChecklistItem,
  FinancialData,
  InsertMentee,
  InsertUser,
  IvmpData,
  Material,
  Mentee,
  MentorNote,
  NpsResponse,
  OnboardingForm,
  PillarRelease,
  SessionRequest,
  MenteeQuestionnaire,
  MenteeDocument,
  PillarAnswer,
  PillarFeedback,
  pillarAnswers,
  pillarFeedback,
  checklistItems,
  diagnosisSessions,
  financialData,
  ivmpData,
  materials,
  mentees,
  mentorNotes,
  npsResponses,
  onboardingForms,
  pillarDiagnostics,
  pillarReleases,
  sessionRequests,
  users,
  menteeQuestionnaire,
  menteeDocuments,
  pillarConclusions,
  PillarConclusion,
  InsertPillarConclusion,
  mentorAiChat,
  MentorAiChat,
  mentorSuggestions,
  MentorSuggestion,
  partReleases,
  pillarPartContent,
  PillarPartContent,
  InsertPillarPartContent,
  pillarReports,
  PillarReport,
  InsertPillarReport,
} from "../drizzle/schema";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ============================================================
// USERS
// ============================================================
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};

  const textFields = ["name", "email", "loginMethod"] as const;
  textFields.forEach((field) => {
    const value = user[field];
    if (value === undefined) return;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  });

  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  // O owner (OWNER_OPEN_ID) sempre recebe role admin automaticamente
  const ownerOpenId = process.env.OWNER_OPEN_ID;
  if (ownerOpenId && user.openId === ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  } else if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

// ============================================================
// MENTEES
// ============================================================
export async function getAllMentees(): Promise<Mentee[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(mentees).orderBy(desc(mentees.createdAt));
}

export async function getMenteeById(id: number): Promise<Mentee | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(mentees).where(eq(mentees.id, id)).limit(1);
  return result[0];
}

export async function getMenteeByAccessCode(code: string): Promise<Mentee | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(mentees).where(eq(mentees.accessCode, code.toUpperCase())).limit(1);
  return result[0];
}

export async function createMentee(data: InsertMentee): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(mentees).values(data);
  const insertId = (result[0] as any).insertId;

  // Criar registros de liberação para todos os 7 pilares
  for (let pillarId = 1; pillarId <= 7; pillarId++) {
    await db.insert(pillarReleases).values({ menteeId: insertId, pillarId });
  }

  // Criar dados iVMP padrão
  const defaultCategories = getDefaultIvmpCategories();
  await db.insert(ivmpData).values({
    menteeId: insertId,
    categoriesJson: defaultCategories,
    ivmpFinal: "0",
  });

  // Criar dados financeiros padrão
  await db.insert(financialData).values({
    menteeId: insertId,
    despesasJson: getDefaultDespesas(),
    mapaSalaJson: getDefaultMapaSala(),
    precificacaoJson: getDefaultPrecificacao(),
  });

  return insertId;
}

export async function updateMentee(id: number, data: Partial<InsertMentee>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(mentees).set(data).where(eq(mentees.id, id));
}

export async function deleteMentee(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(mentees).where(eq(mentees.id, id));
}

// ============================================================
// PILLAR RELEASES
// ============================================================
export async function getPillarReleases(menteeId: number): Promise<PillarRelease[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(pillarReleases).where(eq(pillarReleases.menteeId, menteeId));
}

export async function updatePillarRelease(
  menteeId: number,
  pillarId: number,
  updates: Partial<Omit<PillarRelease, "id" | "menteeId" | "pillarId" | "updatedAt">>
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(pillarReleases)
    .set(updates)
    .where(and(eq(pillarReleases.menteeId, menteeId), eq(pillarReleases.pillarId, pillarId)));
}

// ============================================================
// CHECKLIST ITEMS
// ============================================================
export async function getChecklistItems(menteeId: number, pillarId?: number): Promise<ChecklistItem[]> {
  const db = await getDb();
  if (!db) return [];
  const conditions = pillarId
    ? and(eq(checklistItems.menteeId, menteeId), eq(checklistItems.pillarId, pillarId))
    : eq(checklistItems.menteeId, menteeId);
  return db.select().from(checklistItems).where(conditions);
}

export async function upsertChecklistItem(
  menteeId: number,
  pillarId: number,
  itemIndex: number,
  status: "pending" | "requested" | "completed",
  timestamp?: Date
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const existing = await db
    .select()
    .from(checklistItems)
    .where(
      and(
        eq(checklistItems.menteeId, menteeId),
        eq(checklistItems.pillarId, pillarId),
        eq(checklistItems.itemIndex, itemIndex)
      )
    )
    .limit(1);

  const now = timestamp || new Date();
  if (existing.length === 0) {
    await db.insert(checklistItems).values({
      menteeId,
      pillarId,
      itemIndex,
      status,
      completedAt: status === "completed" ? now : undefined,
      requestedAt: status === "requested" ? now : undefined,
    });
  } else {
    await db
      .update(checklistItems)
      .set({
        status,
        completedAt: status === "completed" ? now : existing[0].completedAt,
        requestedAt: status === "requested" ? now : existing[0].requestedAt,
      })
      .where(eq(checklistItems.id, existing[0].id));
  }
}

// ============================================================
// SESSION REQUESTS
// ============================================================
export async function getSessionRequests(menteeId?: number): Promise<SessionRequest[]> {
  const db = await getDb();
  if (!db) return [];
  if (menteeId) {
    return db.select().from(sessionRequests).where(eq(sessionRequests.menteeId, menteeId)).orderBy(desc(sessionRequests.createdAt));
  }
  return db.select().from(sessionRequests).orderBy(desc(sessionRequests.createdAt));
}

export async function createSessionRequest(data: {
  menteeId: number;
  pillarId?: number;
  assunto: string;
  mensagem?: string;
  dataPreferida?: string;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(sessionRequests).values({
    menteeId: data.menteeId,
    pillarId: data.pillarId,
    assunto: data.assunto,
    mensagem: data.mensagem,
    dataPreferida: data.dataPreferida || "",
  });
  return (result[0] as any).insertId;
}

export async function updateSessionRequest(
  id: number,
  updates: Partial<Omit<SessionRequest, "id" | "menteeId" | "createdAt">>
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(sessionRequests).set(updates).where(eq(sessionRequests.id, id));
}

// ============================================================
// MATERIALS
// ============================================================
export async function getMaterials(menteeId: number, pillarId?: number): Promise<Material[]> {
  const db = await getDb();
  if (!db) return [];
  const conditions = pillarId
    ? and(eq(materials.menteeId, menteeId), eq(materials.pillarId, pillarId))
    : eq(materials.menteeId, menteeId);
  return db.select().from(materials).where(conditions).orderBy(desc(materials.createdAt));
}

export async function createMaterial(data: {
  menteeId: number;
  pillarId: number;
  titulo: string;
  tipo: "link" | "pdf" | "video" | "planilha" | "apresentacao" | "exercicio";
  url: string;
  fileKey?: string;
  descricao?: string;
  tamanhoBytes?: number;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(materials).values(data);
  return (result[0] as any).insertId;
}

export async function deleteMaterial(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(materials).where(eq(materials.id, id));
}

// ============================================================
// MENTOR NOTES
// ============================================================
export async function getMentorNote(menteeId: number, pillarId: number): Promise<MentorNote | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(mentorNotes)
    .where(and(eq(mentorNotes.menteeId, menteeId), eq(mentorNotes.pillarId, pillarId)))
    .limit(1);
  return result[0];
}

export async function upsertMentorNote(menteeId: number, pillarId: number, conteudo: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const existing = await getMentorNote(menteeId, pillarId);
  if (existing) {
    await db.update(mentorNotes).set({ conteudo }).where(eq(mentorNotes.id, existing.id));
  } else {
    await db.insert(mentorNotes).values({ menteeId, pillarId, conteudo });
  }
}

// ============================================================
// IVMP DATA
// ============================================================
export async function getIvmpData(menteeId: number): Promise<IvmpData | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(ivmpData).where(eq(ivmpData.menteeId, menteeId)).limit(1);
  return result[0];
}

export async function updateIvmpData(menteeId: number, categoriesJson: unknown, ivmpFinal: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(ivmpData)
    .set({ categoriesJson, ivmpFinal: ivmpFinal.toFixed(4) })
    .where(eq(ivmpData.menteeId, menteeId));
}

// ============================================================
// FINANCIAL DATA
// ============================================================
export async function getFinancialData(menteeId: number): Promise<FinancialData | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(financialData).where(eq(financialData.menteeId, menteeId)).limit(1);
  return result[0];
}

export async function updateFinancialData(
  menteeId: number,
  updates: { despesasJson?: unknown; mapaSalaJson?: unknown; precificacaoJson?: unknown }
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(financialData).set(updates).where(eq(financialData.menteeId, menteeId));
}

// ============================================================
// ONBOARDING FORMS
// ============================================================
export async function getAllOnboardingForms(): Promise<OnboardingForm[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(onboardingForms).orderBy(desc(onboardingForms.createdAt));
}

export async function createOnboardingForm(data: {
  nome: string;
  email: string;
  telefone?: string;
  especialidade?: string;
  tempoFormacao?: string;
  estruturaAtual?: string;
  faturamentoFaixa?: string;
  principalDor?: string;
  tentouResolver?: string;
  disponibilidade?: string;
  pilaresIdentificados?: unknown;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(onboardingForms).values(data);
  return (result[0] as any).insertId;
}

export async function updateOnboardingFormStatus(
  id: number,
  status: "new" | "contacted" | "converted" | "lost",
  menteeId?: number
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(onboardingForms).set({ status, menteeId }).where(eq(onboardingForms.id, id));
}

// ============================================================
// NPS RESPONSES
// ============================================================
export async function getNpsResponses(menteeId?: number): Promise<NpsResponse[]> {
  const db = await getDb();
  if (!db) return [];
  if (menteeId) {
    return db.select().from(npsResponses).where(eq(npsResponses.menteeId, menteeId));
  }
  return db.select().from(npsResponses);
}

export async function createNpsResponse(menteeId: number, pillarId: number, score: number, comentario?: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(npsResponses).values({ menteeId, pillarId, score, comentario });
}

// ============================================================
// DEFAULT DATA — iVMP Categories
// ============================================================
export function getDefaultIvmpCategories() {
  return [
    {
      name: "Sobre Você", short: "Profissional", weight: 0.15,
      questions: [
        { text: "Títulos e certificados de formação que possui", score: 0.5 },
        { text: "Segurança técnica sobre os procedimentos que mais geram receita", score: 0.5 },
        { text: "Tempo de atuação e experiência clínica", score: 0.5 },
        { text: "Habilidade de empatia com o seu paciente", score: 0.5 },
        { text: "Qualidade da relação médico-paciente", score: 0.5 },
        { text: "Taxa de ocupação da sua agenda", score: 0.5 },
        { text: "Habilidade de liderança e gestão de pessoas", score: 0.5 },
        { text: "Reputação e destaque no seu mercado de atuação", score: 0.5 },
        { text: "Seu diferencial, e o quanto é reconhecido e procurado por ele", score: 0.5 },
      ],
    },
    {
      name: "Sobre a Equipe", short: "Equipe", weight: 0.12,
      questions: [
        { text: "Possui método estruturado de contratação", score: 0.5 },
        { text: "Programa de treinamento periódico da equipe", score: 0.5 },
        { text: "Baixo índice de rotatividade", score: 0.5 },
        { text: "Perfil adequado do setor de atendimento", score: 0.5 },
        { text: "Perfil adequado da área clínica", score: 0.5 },
        { text: "Perfil adequado da área administrativa", score: 0.5 },
        { text: "Uniformes e apresentação pessoal", score: 0.5 },
        { text: "Atitude proativa da equipe", score: 0.5 },
        { text: "Espírito de equipe e colaboração", score: 0.5 },
        { text: "Relação da equipe com os pacientes", score: 0.5 },
        { text: "Programa de incentivo e premiações", score: 0.5 },
        { text: "Equipe sabe a quem recorrer em dúvidas", score: 0.5 },
        { text: "Engajamento em dar o melhor", score: 0.5 },
      ],
    },
    {
      name: "Sobre a Infraestrutura", short: "Infraestrutura", weight: 0.10,
      questions: [
        { text: "Localização do consultório/clínica", score: 0.5 },
        { text: "Arquitetura, decoração e conservação", score: 0.5 },
        { text: "Atualização tecnológica dos equipamentos", score: 0.5 },
        { text: "Sinalização interna clara e segura", score: 0.5 },
      ],
    },
    {
      name: "Comunicação e Marketing", short: "Marketing", weight: 0.18,
      questions: [
        { text: "Identidade visual atualizada e profissional", score: 0.5 },
        { text: "Presença digital (site, redes sociais, vídeos)", score: 0.5 },
        { text: "Materiais gráficos personalizados", score: 0.5 },
        { text: "Planejamento de campanhas internas", score: 0.5 },
        { text: "É convidado para entrevistas", score: 0.5 },
        { text: "Eventos de relacionamento com pacientes", score: 0.5 },
        { text: "Busca ativa para retornos de pacientes", score: 0.5 },
      ],
    },
    {
      name: "Perfil do Paciente", short: "Paciente", weight: 0.10,
      questions: [
        { text: "Pacientes procuram por indicação", score: 0.5 },
        { text: "Acompanham seu trabalho nas mídias digitais", score: 0.5 },
        { text: "Satisfeito com o perfil de paciente", score: 0.5 },
        { text: "Pacientes aceitam indicações de tratamento", score: 0.5 },
        { text: "Atende somente particular", score: 0.5 },
      ],
    },
    {
      name: "Jornada do Paciente", short: "Jornada", weight: 0.15,
      questions: [
        { text: "Mapeamento dos pontos de interação", score: 0.5 },
        { text: "Sabe o que o paciente pensa/sente em cada ponto", score: 0.5 },
        { text: "Experiência sensorial em cada ponto (5 sentidos)", score: 0.5 },
        { text: "Acolhimento ao paciente é prioridade", score: 0.5 },
      ],
    },
    {
      name: "Sobre a Gestão", short: "Gestão", weight: 0.20,
      questions: [
        { text: "Missão, visão e valores definidos e divulgados", score: 0.5 },
        { text: "Finanças da clínica separadas da pessoa física", score: 0.5 },
        { text: "Pessoa qualificada para controle de dados", score: 0.5 },
        { text: "Plano de ação para os próximos 3 anos", score: 0.5 },
        { text: "Confia no trabalho da contabilidade", score: 0.5 },
        { text: "Processos bem definidos", score: 0.5 },
        { text: "Descrição clara das tarefas por cargo", score: 0.5 },
        { text: "Sistema de gestão e prontuário eletrônico", score: 0.5 },
        { text: "Controle de produção e fluxo de caixa", score: 0.5 },
        { text: "Guarda correta dos documentos", score: 0.5 },
        { text: "Indicadores de desempenho definidos", score: 0.5 },
      ],
    },
  ];
}

export function getDefaultDespesas() {
  return [
    { cat: "INFRAESTRUTURA", items: [
      { name: "Aluguel", type: "Fixo", values: [4500,4500,4500,4500,4500,4500,4500,4500,4500,4500,4500,4500] },
      { name: "Condomínio", type: "Fixo", values: [800,800,800,800,800,800,800,800,800,800,800,800] },
      { name: "Energia Elétrica", type: "Semifixo", values: [380,400,420,350,330,310,300,320,340,360,380,400] },
      { name: "Telefone e Internet", type: "Fixo", values: [250,250,250,250,250,250,250,250,250,250,250,250] },
    ]},
    { cat: "FOLHA DE PAGAMENTO", items: [
      { name: "Salários", type: "Fixo", values: [3200,3200,3200,3200,3200,3200,3200,3200,3200,3200,3200,3200] },
      { name: "Encargos", type: "Fixo", values: [960,960,960,960,960,960,960,960,960,960,960,960] },
      { name: "VT + VR", type: "Fixo", values: [800,800,800,800,800,800,800,800,800,800,800,800] },
    ]},
    { cat: "TERCEIRIZADOS", items: [
      { name: "Contabilidade", type: "Fixo", values: [500,500,500,500,500,500,500,500,500,500,500,500] },
      { name: "Limpeza", type: "Fixo", values: [600,600,600,600,600,600,600,600,600,600,600,600] },
    ]},
    { cat: "MARKETING", items: [
      { name: "Marketing Digital", type: "Semifixo", values: [1500,1500,1500,1500,1500,1500,1500,1500,1500,1500,1500,1500] },
    ]},
    { cat: "OUTROS", items: [
      { name: "Pró-labore", type: "Fixo", values: [8000,8000,8000,8000,8000,8000,8000,8000,8000,8000,8000,8000] },
    ]},
  ];
}

export function getDefaultMapaSala() {
  return {
    semanas: 4,
    horasOcupadas: 100,
    turnos: { manha: [5,5,0,5,5,0], tarde: [5,5,5,5,5,0], noite: [0,0,0,0,0,0] },
  };
}

export function getDefaultPrecificacao() {
  return {
    params: { imposto: 0.10, cartao: 0.05, taxaSala: 140, ratMedico: 0.5, ratClinica: 0.5, horasMes: 160, diasMes: 20, custoFixoMes: 10750 },
    servicos: [
      { name: "Consulta", horas: 1, preco: 600, mod: 0, comissao: 50, matmed: 0, equip: 0, qtdMes: 10 },
      { name: "Procedimento 1", horas: 0.5, preco: 800, mod: 0, comissao: 50, matmed: 0, equip: 125, qtdMes: 8 },
      { name: "Procedimento 2", horas: 1, preco: 1500, mod: 0, comissao: 50, matmed: 250, equip: 35, qtdMes: 6 },
    ],
    cenarios: {
      conservador: { vol: 0.7, precoAdj: 0 },
      moderado: { vol: 1.0, precoAdj: 0.1 },
      agressivo: { vol: 1.3, precoAdj: 0.2 },
    },
  };
}


// ============================================================
// PILLAR DIAGNOSTICS — Diagnóstico por pilar e mentorado
// ============================================================
export async function getPillarDiagnostic(menteeId: number, pillarId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(pillarDiagnostics)
    .where(and(eq(pillarDiagnostics.menteeId, menteeId), eq(pillarDiagnostics.pillarId, pillarId)))
    .limit(1);
  return result[0] ?? null;
}

export async function upsertPillarDiagnostic(
  menteeId: number,
  pillarId: number,
  data: {
    respostasJson?: unknown;
    angustiasJson?: unknown;
    tecnicasJson?: unknown;
    analiseEstrategica?: string;
    pilaresUrgentes?: unknown;
  }
) {
  const db = await getDb();
  if (!db) return;
  const existing = await getPillarDiagnostic(menteeId, pillarId);
  if (existing) {
    await db
      .update(pillarDiagnostics)
      .set({ ...data })
      .where(and(eq(pillarDiagnostics.menteeId, menteeId), eq(pillarDiagnostics.pillarId, pillarId)));
  } else {
    await db.insert(pillarDiagnostics).values({ menteeId, pillarId, ...data });
  }
}

export async function getAllPillarDiagnostics(menteeId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(pillarDiagnostics).where(eq(pillarDiagnostics.menteeId, menteeId));
}

// ============================================================
// DIAGNOSIS SESSIONS — Sessões de diagnóstico gratuito
// ============================================================
export async function createDiagnosisSession(data: {
  menteeId?: number;
  nomeProspecto?: string;
  respostasRoteiro?: unknown;
  pilaresUrgentes?: unknown;
  ivmpEstimado?: string;
  notasSessao?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(diagnosisSessions).values({
    ...data,
    status: "draft",
  });
  return (result as any).insertId as number;
}

export async function updateDiagnosisSession(
  id: number,
  data: {
    respostasRoteiro?: unknown;
    pilaresUrgentes?: unknown;
    ivmpEstimado?: string;
    notasSessao?: string;
    status?: "draft" | "completed" | "converted";
    menteeId?: number;
  }
) {
  const db = await getDb();
  if (!db) return;
  await db.update(diagnosisSessions).set(data).where(eq(diagnosisSessions.id, id));
}

export async function getAllDiagnosisSessions() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(diagnosisSessions).orderBy(diagnosisSessions.createdAt);
}

export async function getDiagnosisSessionById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(diagnosisSessions).where(eq(diagnosisSessions.id, id)).limit(1);
  return result[0] ?? null;
}

// ============================================================
// QUESTIONNAIRE HELPERS
// ============================================================
export async function getQuestionnairePhase(menteeId: number, faseId: number): Promise<MenteeQuestionnaire | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(menteeQuestionnaire)
    .where(and(eq(menteeQuestionnaire.menteeId, menteeId), eq(menteeQuestionnaire.faseId, faseId)))
    .limit(1);
  return result[0] ?? null;
}

export async function getAllQuestionnairePhases(menteeId: number): Promise<MenteeQuestionnaire[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(menteeQuestionnaire)
    .where(eq(menteeQuestionnaire.menteeId, menteeId))
    .orderBy(menteeQuestionnaire.faseId);
}

export async function upsertQuestionnairePhase(
  menteeId: number,
  faseId: number,
  data: Partial<Omit<MenteeQuestionnaire, "id" | "menteeId" | "faseId">>
) {
  const db = await getDb();
  if (!db) return;
  const existing = await getQuestionnairePhase(menteeId, faseId);
  if (existing) {
    await db.update(menteeQuestionnaire)
      .set(data)
      .where(and(eq(menteeQuestionnaire.menteeId, menteeId), eq(menteeQuestionnaire.faseId, faseId)));
  } else {
    await db.insert(menteeQuestionnaire).values({ menteeId, faseId, ...data });
  }
}

// ============================================================
// DOCUMENTS HELPERS
// ============================================================
export async function getMenteeDocuments(menteeId: number): Promise<MenteeDocument[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(menteeDocuments)
    .where(eq(menteeDocuments.menteeId, menteeId))
    .orderBy(desc(menteeDocuments.createdAt));
}

export async function createMenteeDocument(
  data: Omit<MenteeDocument, "id" | "createdAt" | "updatedAt">
): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.insert(menteeDocuments).values(data);
  return (result[0] as any).insertId ?? 0;
}

export async function getMenteeDocumentById(id: number): Promise<MenteeDocument | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(menteeDocuments).where(eq(menteeDocuments.id, id)).limit(1);
  return result[0] ?? null;
}

export async function markDocumentRead(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(menteeDocuments).set({ lidoPeloMentor: true }).where(eq(menteeDocuments.id, id));
}

export async function deleteMenteeDocument(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(menteeDocuments).where(eq(menteeDocuments.id, id));
}

// ============================================================
// PILLAR ANSWERS — Respostas do mentorado por pilar
// ============================================================
export async function getPillarAnswers(menteeId: number, pillarId: number): Promise<PillarAnswer[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(pillarAnswers)
    .where(and(eq(pillarAnswers.menteeId, menteeId), eq(pillarAnswers.pillarId, pillarId)));
}

export async function getPillarAnswerBySection(menteeId: number, pillarId: number, secao: string): Promise<PillarAnswer | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(pillarAnswers)
    .where(and(
      eq(pillarAnswers.menteeId, menteeId),
      eq(pillarAnswers.pillarId, pillarId),
      eq(pillarAnswers.secao, secao)
    )).limit(1);
  return result[0] ?? null;
}

export async function upsertPillarAnswers(
  menteeId: number,
  pillarId: number,
  secao: string,
  respostas: unknown,
  status: "nao_iniciada" | "em_progresso" | "concluida" = "em_progresso"
) {
  const db = await getDb();
  if (!db) return;
  const existing = await getPillarAnswerBySection(menteeId, pillarId, secao);
  const concluidaEm = status === "concluida" ? new Date() : undefined;
  if (existing) {
    await db.update(pillarAnswers)
      .set({ respostas, status, ...(concluidaEm ? { concluidaEm } : {}) })
      .where(eq(pillarAnswers.id, existing.id));
  } else {
    await db.insert(pillarAnswers).values({
      menteeId, pillarId, secao, respostas, status,
      ...(concluidaEm ? { concluidaEm } : {}),
    });
  }
}

export async function getAllPillarAnswersForMentee(menteeId: number): Promise<PillarAnswer[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(pillarAnswers).where(eq(pillarAnswers.menteeId, menteeId));
}

// ============================================================
// PILLAR FEEDBACK — Feedback do mentor por pilar
// ============================================================
export async function getPillarFeedback(menteeId: number, pillarId: number): Promise<PillarFeedback | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(pillarFeedback)
    .where(and(eq(pillarFeedback.menteeId, menteeId), eq(pillarFeedback.pillarId, pillarId)))
    .limit(1);
  return result[0] ?? null;
}

export async function upsertPillarFeedback(
  menteeId: number,
  pillarId: number,
  data: Partial<{
    feedback: string;
    planoAcao: string;
    pontosFortesJson: unknown;
    pontosMelhoriaJson: unknown;
    conclusaoLiberada: boolean;
    aiSpecializationSuggestions: unknown;
    aiPillarRoadmap: unknown;
    aiAnalysisGeneratedAt: Date;
    aiDiagnosis: unknown;
    aiDiagnosisGeneratedAt: Date;
  }>
) {
  const db = await getDb();
  if (!db) return;
  const existing = await getPillarFeedback(menteeId, pillarId);
  const conclusaoLiberadaEm = data.conclusaoLiberada ? new Date() : undefined;
  if (existing) {
    await db.update(pillarFeedback)
      .set({ ...data, ...(conclusaoLiberadaEm ? { conclusaoLiberadaEm } : {}) })
      .where(eq(pillarFeedback.id, existing.id));
  } else {
    await db.insert(pillarFeedback).values({
      menteeId, pillarId, ...data,
      ...(conclusaoLiberadaEm ? { conclusaoLiberadaEm } : {}),
    });
  }
}

// ============================================================
// PILLAR_CONCLUSIONS — Conclusões do mentor por pilar
// ============================================================
export async function getPillarConclusion(menteeId: number, pillarId: number): Promise<PillarConclusion | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(pillarConclusions)
    .where(and(eq(pillarConclusions.menteeId, menteeId), eq(pillarConclusions.pillarId, pillarId)))
    .limit(1);
  return result[0] ?? null;
}

export async function upsertPillarConclusion(
  menteeId: number,
  pillarId: number,
  data: Partial<Omit<InsertPillarConclusion, "id" | "menteeId" | "pillarId">>
) {
  const db = await getDb();
  if (!db) return;
  const existing = await getPillarConclusion(menteeId, pillarId);
  if (existing) {
    await db.update(pillarConclusions)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(pillarConclusions.id, existing.id));
  } else {
    await db.insert(pillarConclusions).values({
      menteeId, pillarId, ...data,
    });
  }
}

// ============================================================
// MENTOR_AI_CHAT — Chat de IA contínuo do mentor por pilar
// ============================================================
export async function getMentorAiChatHistory(
  menteeId: number,
  pillarId: number,
  limit = 50
): Promise<MentorAiChat[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(mentorAiChat)
    .where(and(eq(mentorAiChat.menteeId, menteeId), eq(mentorAiChat.pillarId, pillarId)))
    .orderBy(mentorAiChat.createdAt)
    .limit(limit);
}

export async function saveMentorAiChatMessage(
  menteeId: number,
  pillarId: number,
  role: "user" | "assistant",
  content: string
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(mentorAiChat).values({ menteeId, pillarId, role, content });
}

export async function clearMentorAiChatHistory(
  menteeId: number,
  pillarId: number
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(mentorAiChat)
    .where(and(eq(mentorAiChat.menteeId, menteeId), eq(mentorAiChat.pillarId, pillarId)));
}

// ============================================================
// MENTOR_SUGGESTIONS — Sugestões geradas pela IA (checklist)
// ============================================================
export async function getMentorSuggestions(
  menteeId: number,
  pillarId?: number
): Promise<MentorSuggestion[]> {
  const db = await getDb();
  if (!db) return [];
  if (pillarId !== undefined) {
    return db.select().from(mentorSuggestions)
      .where(and(eq(mentorSuggestions.menteeId, menteeId), eq(mentorSuggestions.pillarId, pillarId)))
      .orderBy(mentorSuggestions.createdAt);
  }
  return db.select().from(mentorSuggestions)
    .where(eq(mentorSuggestions.menteeId, menteeId))
    .orderBy(mentorSuggestions.pillarId, mentorSuggestions.createdAt);
}

export async function addMentorSuggestion(
  menteeId: number,
  pillarId: number,
  texto: string,
  categoria?: string
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(mentorSuggestions).values({ menteeId, pillarId, texto, categoria });
}

export async function toggleMentorSuggestion(
  id: number,
  concluida: boolean
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(mentorSuggestions)
    .set({ concluida, concluidaEm: concluida ? new Date() : null, updatedAt: new Date() })
    .where(eq(mentorSuggestions.id, id));
}

export async function deleteMentorSuggestion(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(mentorSuggestions).where(eq(mentorSuggestions.id, id));
}

// ============================================================
// PART RELEASES — Liberações granulares por parte de cada pilar
// ============================================================
export async function getPartReleases(menteeId: number, pillarId?: number) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(partReleases.menteeId, menteeId)];
  if (pillarId !== undefined) conditions.push(eq(partReleases.pillarId, pillarId));
  return db.select().from(partReleases).where(and(...conditions));
}

export async function upsertPartRelease(menteeId: number, pillarId: number, partId: string, partLabel: string, released: boolean) {
  const db = await getDb();
  if (!db) return;
  const existing = await db.select().from(partReleases)
    .where(and(
      eq(partReleases.menteeId, menteeId),
      eq(partReleases.pillarId, pillarId),
      eq(partReleases.partId, partId),
    ));
  if (existing.length > 0) {
    await db.update(partReleases)
      .set({ released, releasedAt: released ? new Date() : null })
      .where(eq(partReleases.id, existing[0].id));
    return existing[0].id;
  }
  const [result] = await db.insert(partReleases).values({
    menteeId, pillarId, partId, partLabel, released, releasedAt: released ? new Date() : null,
  });
  return (result as any).insertId;
}

export async function initPartReleases(menteeId: number, parts: Array<{pillarId: number; partId: string; partLabel: string}>) {
  const db = await getDb();
  if (!db) return;
  for (const part of parts) {
    const existing = await db.select().from(partReleases)
      .where(and(
        eq(partReleases.menteeId, menteeId),
        eq(partReleases.pillarId, part.pillarId),
        eq(partReleases.partId, part.partId),
      ));
    if (existing.length === 0) {
      await db.insert(partReleases).values({
        menteeId, pillarId: part.pillarId, partId: part.partId, partLabel: part.partLabel, released: false,
      });
    }
  }
}

// ============================================================
// GRANULAR EXPENSE DATA
// ============================================================
export async function getExpenseData(menteeId: number) {
  const db = await getDb();
  if (!db) return null;
  const data = await db.select().from(financialData)
    .where(eq(financialData.menteeId, menteeId));
  if (data.length === 0) return null;
  return {
    expenses: data[0].despesasJson as Record<string, number> | null,
    mapaSala: data[0].mapaSalaJson as {
      diasSemana?: string[];
      turnoManha?: number;
      turnoTarde?: number;
      semanasMes?: number;
      horasOcupadas?: number;
      faturamentoMensal?: number;
    } | null,
  };
}

export async function saveExpenseData(
  menteeId: number,
  expenses: Record<string, number>,
  mapaSala?: {
    diasSemana?: string[];
    turnoManha?: number;
    turnoTarde?: number;
    semanasMes?: number;
    horasOcupadas?: number;
    faturamentoMensal?: number;
  }
) {
  const db = await getDb();
  if (!db) return;
  const existing = await db.select().from(financialData)
    .where(eq(financialData.menteeId, menteeId));

  const updateData: any = { despesasJson: expenses };
  if (mapaSala) updateData.mapaSalaJson = mapaSala;

  if (existing.length > 0) {
    await db.update(financialData)
      .set(updateData)
      .where(eq(financialData.menteeId, menteeId));
  } else {
    await db.insert(financialData).values({
      menteeId,
      despesasJson: expenses,
      mapaSalaJson: mapaSala || null,
      precificacaoJson: null,
    });
  }
}

// ============================================================
// Expanded iVMP (53 questions)
// ============================================================
export async function getIvmpAnswers(menteeId: number) {
  const db = await getDb();
  if (!db) return null;
  const data = await db.select().from(ivmpData)
    .where(eq(ivmpData.menteeId, menteeId));
  if (data.length === 0) return null;
  return {
    answers: data[0].categoriesJson as Record<string, number> | null,
    ivmpFinal: data[0].ivmpFinal ? Number(data[0].ivmpFinal) : null,
  };
}

export async function saveIvmpAnswers(menteeId: number, answers: Record<string, number>, ivmpFinal: number) {
  const db = await getDb();
  if (!db) return;
  const existing = await db.select().from(ivmpData)
    .where(eq(ivmpData.menteeId, menteeId));

  if (existing.length > 0) {
    await db.update(ivmpData)
      .set({ categoriesJson: answers, ivmpFinal: String(ivmpFinal) })
      .where(eq(ivmpData.menteeId, menteeId));
  } else {
    await db.insert(ivmpData).values({
      menteeId,
      categoriesJson: answers,
      ivmpFinal: String(ivmpFinal),
    });
  }
}

// ============================================================
// SIMULATION DATA (Pricing / Scenario Simulator)
// ============================================================
export async function getSimulationData(menteeId: number) {
  const db = await getDb();
  if (!db) return null;
  const data = await db.select().from(financialData)
    .where(eq(financialData.menteeId, menteeId));
  if (data.length === 0) return null;
  return {
    servicos: (data[0].precificacaoJson as any)?.servicos || [],
    mixAtendimentos: (data[0].precificacaoJson as any)?.mixAtendimentos || {},
    params: (data[0].precificacaoJson as any)?.params || null,
  };
}

export async function saveSimulationData(menteeId: number, simulationData: { servicos: any[]; mixAtendimentos: Record<string, number>; params: any }) {
  const db = await getDb();
  if (!db) return;
  const existing = await db.select().from(financialData)
    .where(eq(financialData.menteeId, menteeId));

  if (existing.length > 0) {
    await db.update(financialData)
      .set({ precificacaoJson: simulationData })
      .where(eq(financialData.menteeId, menteeId));
  } else {
    await db.insert(financialData).values({
      menteeId,
      despesasJson: null,
      mapaSalaJson: null,
      precificacaoJson: simulationData,
    });
  }
}

// ============================================================
// PILLAR_PART_CONTENT — Análises geradas por IA por parte
// ============================================================
function parsePartContent(row: typeof pillarPartContent.$inferSelect) {
  return {
    ...row,
    destaques: row.destaques ? (() => { try { return JSON.parse(row.destaques as string); } catch { return []; } })() : [],
    proximosPassos: row.proximosPassos ? (() => { try { return JSON.parse(row.proximosPassos as string); } catch { return []; } })() : [],
  };
}
export async function getPillarPartContent(menteeId: number, pillarId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(pillarPartContent)
    .where(and(eq(pillarPartContent.menteeId, menteeId), eq(pillarPartContent.pillarId, pillarId)));
  return rows.map(parsePartContent);
}

export async function upsertPillarPartContent(
  menteeId: number,
  pillarId: number,
  partId: string,
  partLabel: string,
  data: {
    titulo?: string;
    conteudo?: string;
    guiaUso?: string;
    destaques?: string[];
    proximosPassos?: string[];
    status?: "draft" | "ready" | "released";
    generatedByAi?: boolean;
  }
) {
  const db = await getDb();
  if (!db) return;
  // Serialize arrays to JSON strings for text columns
  const dbData: Record<string, unknown> = { ...data };
  if (data.destaques !== undefined) dbData.destaques = JSON.stringify(data.destaques);
  if (data.proximosPassos !== undefined) dbData.proximosPassos = JSON.stringify(data.proximosPassos);
  const existing = await db.select().from(pillarPartContent)
    .where(and(
      eq(pillarPartContent.menteeId, menteeId),
      eq(pillarPartContent.pillarId, pillarId),
      eq(pillarPartContent.partId, partId)
    ));
  if (existing.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db.update(pillarPartContent) as any)
      .set({
        ...dbData,
        generatedAt: data.generatedByAi ? new Date() : existing[0].generatedAt,
      })
      .where(and(
        eq(pillarPartContent.menteeId, menteeId),
        eq(pillarPartContent.pillarId, pillarId),
        eq(pillarPartContent.partId, partId)
      ));
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db.insert(pillarPartContent) as any).values({
      menteeId,
      pillarId,
      partId,
      partLabel,
      ...dbData,
      generatedAt: data.generatedByAi ? new Date() : undefined,
    });
  }
}

// ============================================================
// PILLAR_REPORTS — Relatórios PDF premium por pilar
// ============================================================
export async function getPillarReport(menteeId: number, pillarId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(pillarReports)
    .where(and(eq(pillarReports.menteeId, menteeId), eq(pillarReports.pillarId, pillarId)));
  return rows[0] ?? null;
}

export async function getAllPillarReports(menteeId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(pillarReports)
    .where(eq(pillarReports.menteeId, menteeId));
}

export async function upsertPillarReport(
  menteeId: number,
  pillarId: number,
  data: {
    title?: string;
    subtitle?: string;
    executiveSummary?: string;
    strengthsJson?: string;
    attentionJson?: string;
    actionPlanJson?: string;
    conclusionsText?: string;
    suggestionsJson?: string;
    htmlContent?: string;
    generatedAt?: Date;
    status?: "draft" | "ready" | "released";
  }
) {
  const db = await getDb();
  if (!db) return;
  const existing = await db.select().from(pillarReports)
    .where(and(eq(pillarReports.menteeId, menteeId), eq(pillarReports.pillarId, pillarId)));
  if (existing.length > 0) {
    await db.update(pillarReports)
      .set(data)
      .where(and(eq(pillarReports.menteeId, menteeId), eq(pillarReports.pillarId, pillarId)));
  } else {
    await db.insert(pillarReports).values({ menteeId, pillarId, ...data });
  }
}

export async function releasePillarReport(menteeId: number, pillarId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(pillarReports)
    .set({ status: "released", releasedAt: new Date() })
    .where(and(eq(pillarReports.menteeId, menteeId), eq(pillarReports.pillarId, pillarId)));
}

export async function markReportEmailSent(menteeId: number, pillarId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(pillarReports)
    .set({ emailSentAt: new Date() })
    .where(and(eq(pillarReports.menteeId, menteeId), eq(pillarReports.pillarId, pillarId)));
}
