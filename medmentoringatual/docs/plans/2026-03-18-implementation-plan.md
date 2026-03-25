# Reestruturacao MedMentoring: Partes por Pilar + Ferramentas Financeiras + PDF Premium

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implementar sistema de partes por pilar com liberacao granular, ferramentas financeiras completas (despesas, iVMP, simulador), PDF premium e export Excel.

**Architecture:** Estender o schema existente com tabela `part_releases` para liberacao por parte. Criar novos componentes de ferramentas financeiras no portal do mentorado. Adicionar geracao de PDF premium com PDFKit e export Excel com xlsx. IA dupla: guia mentorado (sem analise) e assistente mentor (com analise completa).

**Tech Stack:** React 19, tRPC 11, Drizzle ORM, MySQL, PDFKit, xlsx, Tailwind, Shadcn/ui, Recharts (radar chart), Gemini 2.5 Flash via Forge API.

---

## Fase 1: Schema e Backend — Sistema de Partes

### Task 1: Criar tabela `part_releases` no schema

**Files:**
- Modify: `drizzle/schema.ts:385` (antes de pillar_conclusions)

**Step 1: Adicionar tabela part_releases ao schema**

```typescript
// Adicionar apos nps_responses (linha ~274) e antes de mentee_questionnaire

export const partReleases = mysqlTable("part_releases", {
  id: int("id").primaryKey().autoincrement(),
  menteeId: int("mentee_id").notNull(),
  pillarId: int("pillar_id").notNull(),
  partId: varchar("part_id", { length: 50 }).notNull(), // ex: "a", "b", "c", "d"
  partLabel: varchar("part_label", { length: 200 }).notNull(), // ex: "Diagnostico de Estrutura"
  released: boolean("released").default(false),
  releasedAt: timestamp("released_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type PartRelease = typeof partReleases.$inferSelect;
export type InsertPartRelease = typeof partReleases.$inferInsert;
```

**Step 2: Rodar migracao**

Run: `cd /Users/carlostrindade/medmentoring-claude/medmentoringatual && npx drizzle-kit push`
Expected: Schema updated successfully

**Step 3: Commit**

```bash
git add drizzle/schema.ts
git commit -m "feat: add part_releases table for granular pillar part control"
```

---

### Task 2: Definir constante PILLAR_PARTS

**Files:**
- Create: `client/src/lib/pillar-parts.ts`

**Step 1: Criar arquivo com definicao de partes por pilar**

```typescript
export interface PillarPart {
  id: string;       // "a", "b", "c", "d"
  label: string;    // Nome da parte
  description: string;
  type: "questionnaire" | "tool" | "simulator";
}

export const PILLAR_PARTS: Record<number, PillarPart[]> = {
  1: [
    { id: "a", label: "Autoconhecimento e Valores", description: "Quem voce e e o que te move", type: "questionnaire" },
    { id: "b", label: "Ikigai Profissional", description: "Interseccao entre paixao, habilidade, necessidade e remuneracao", type: "questionnaire" },
    { id: "c", label: "Missao, Visao e Proposito", description: "Declaracoes que guiam sua pratica", type: "questionnaire" },
  ],
  2: [
    { id: "a", label: "Publico e Nicho", description: "Quem voce atende e quer atender", type: "questionnaire" },
    { id: "b", label: "Diferencial Competitivo", description: "O que te torna unico no mercado", type: "questionnaire" },
    { id: "c", label: "Proposta de Valor e Tagline", description: "Como comunicar seu valor em uma frase", type: "questionnaire" },
  ],
  3: [
    { id: "a", label: "Diagnostico de Estrutura e Espaco", description: "Como sua clinica esta organizada", type: "questionnaire" },
    { id: "b", label: "Despesas Fixas Completas", description: "Mapeamento detalhado de todos os custos", type: "tool" },
    { id: "c", label: "iVMP — 53 Perguntas", description: "Indice de Valor Medico Percebido", type: "tool" },
    { id: "d", label: "Simulador de Cenarios", description: "Projecoes financeiras e metas", type: "simulator" },
  ],
  4: [
    { id: "a", label: "Rotina e Gargalos", description: "Como funciona o dia a dia da clinica", type: "questionnaire" },
    { id: "b", label: "Equipe e Delegacao", description: "Quem faz o que e o que poderia delegar", type: "questionnaire" },
    { id: "c", label: "Mapa de Processos", description: "Fluxos e procedimentos operacionais", type: "questionnaire" },
  ],
  5: [
    { id: "a", label: "Precificacao Atual e Crencas", description: "Como voce define precos hoje", type: "questionnaire" },
    { id: "b", label: "Engenharia de Precos", description: "Tabela de servicos com custos e margens", type: "tool" },
    { id: "c", label: "Dinheiro Invisivel", description: "Onde voce perde dinheiro sem perceber", type: "questionnaire" },
  ],
  6: [
    { id: "a", label: "Presenca Digital Atual", description: "Redes sociais, site, avaliacao online", type: "questionnaire" },
    { id: "b", label: "Estrategia de Conteudo", description: "Tom de voz, frequencia, formatos", type: "questionnaire" },
    { id: "c", label: "Plano de 30 Dias", description: "Calendario editorial personalizado", type: "questionnaire" },
  ],
  7: [
    { id: "a", label: "Processo de Atendimento", description: "Da recepcao ao pos-consulta", type: "questionnaire" },
    { id: "b", label: "Script da Consulta de Alto Valor", description: "6 fases da consulta estruturada", type: "questionnaire" },
    { id: "c", label: "Objecoes e Follow-up", description: "Tratamento de objecoes e acompanhamento", type: "questionnaire" },
  ],
};
```

**Step 2: Commit**

```bash
git add client/src/lib/pillar-parts.ts
git commit -m "feat: add PILLAR_PARTS constant with part definitions per pillar"
```

---

### Task 3: Backend — procedures para part_releases

**Files:**
- Modify: `server/db.ts` (adicionar funcoes de DB)
- Modify: `server/routers.ts` (adicionar procedures)

**Step 1: Adicionar funcoes de DB para part_releases em `server/db.ts`**

```typescript
// No final do arquivo, adicionar:

export async function getPartReleases(menteeId: number, pillarId?: number) {
  const conditions = [eq(schema.partReleases.menteeId, menteeId)];
  if (pillarId) conditions.push(eq(schema.partReleases.pillarId, pillarId));
  return db.select().from(schema.partReleases).where(and(...conditions));
}

export async function upsertPartRelease(menteeId: number, pillarId: number, partId: string, partLabel: string, released: boolean) {
  const existing = await db.select().from(schema.partReleases)
    .where(and(
      eq(schema.partReleases.menteeId, menteeId),
      eq(schema.partReleases.pillarId, pillarId),
      eq(schema.partReleases.partId, partId),
    ));
  if (existing.length > 0) {
    await db.update(schema.partReleases)
      .set({ released, releasedAt: released ? new Date() : null })
      .where(eq(schema.partReleases.id, existing[0].id));
    return existing[0].id;
  }
  const [result] = await db.insert(schema.partReleases).values({
    menteeId, pillarId, partId, partLabel, released, releasedAt: released ? new Date() : null,
  });
  return result.insertId;
}

export async function initPartReleases(menteeId: number, parts: Array<{pillarId: number; partId: string; partLabel: string}>) {
  for (const part of parts) {
    const existing = await db.select().from(schema.partReleases)
      .where(and(
        eq(schema.partReleases.menteeId, menteeId),
        eq(schema.partReleases.pillarId, part.pillarId),
        eq(schema.partReleases.partId, part.partId),
      ));
    if (existing.length === 0) {
      await db.insert(schema.partReleases).values({
        menteeId, pillarId: part.pillarId, partId: part.partId, partLabel: part.partLabel, released: false,
      });
    }
  }
}
```

**Step 2: Adicionar procedures tRPC em `server/routers.ts`**

Dentro do `mentorRouter`, adicionar:

```typescript
getPartReleases: adminProcedure
  .input(z.object({ menteeId: z.number(), pillarId: z.number().optional() }))
  .query(async ({ input }) => {
    return getPartReleases(input.menteeId, input.pillarId);
  }),

updatePartRelease: adminProcedure
  .input(z.object({ menteeId: z.number(), pillarId: z.number(), partId: z.string(), partLabel: z.string(), released: z.boolean() }))
  .mutation(async ({ input }) => {
    return upsertPartRelease(input.menteeId, input.pillarId, input.partId, input.partLabel, input.released);
  }),
```

Dentro do `menteePortalRouter`, adicionar:

```typescript
getMyPartReleases: menteeProcedure
  .query(async ({ ctx }) => {
    return getPartReleases(ctx.menteeId);
  }),
```

**Step 3: Commit**

```bash
git add server/db.ts server/routers.ts
git commit -m "feat: add part_releases backend (DB functions + tRPC procedures)"
```

---

### Task 4: Inicializar part_releases ao criar mentorado

**Files:**
- Modify: `server/routers.ts` (procedure createMentee)

**Step 1: Importar PILLAR_PARTS no backend**

Criar `shared/pillar-parts.ts` com a mesma constante (para uso server-side) e importar no router.

**Step 2: Apos `createMentee` no router, chamar `initPartReleases`**

Dentro da mutation `createMentee`, apos inserir o mentorado, adicionar:

```typescript
// Apos criar mentorado, inicializar part_releases
const allParts: Array<{pillarId: number; partId: string; partLabel: string}> = [];
for (const [pillarId, parts] of Object.entries(PILLAR_PARTS)) {
  for (const part of parts) {
    allParts.push({ pillarId: Number(pillarId), partId: part.id, partLabel: part.label });
  }
}
await initPartReleases(newMenteeId, allParts);
```

**Step 3: Commit**

```bash
git add shared/pillar-parts.ts server/routers.ts
git commit -m "feat: auto-initialize part_releases when creating new mentee"
```

---

## Fase 2: Despesas Fixas Completas (Pilar 3, Parte B)

### Task 5: Definir constante EXPENSE_CATEGORIES

**Files:**
- Create: `shared/expense-categories.ts`

**Step 1: Criar arquivo com categorias e subcategorias**

```typescript
export interface ExpenseSubcategory {
  id: string;
  label: string;
  hint?: string; // Dica da IA quando zerado
}

export interface ExpenseCategory {
  id: string;
  label: string;
  icon: string; // Lucide icon name
  subcategories: ExpenseSubcategory[];
  zeroHint?: string; // Dica quando categoria inteira esta zerada
}

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  {
    id: "espaco",
    label: "Espaco",
    icon: "Building2",
    zeroHint: "Voce nao tem nenhum custo com espaco? Mesmo consultorio proprio tem custo de oportunidade.",
    subcategories: [
      { id: "aluguel", label: "Aluguel", hint: "Se o espaco e proprio, considere o custo de oportunidade — quanto receberia se alugasse." },
      { id: "condominio", label: "Condominio" },
      { id: "iptu", label: "IPTU" },
      { id: "energia", label: "Energia Eletrica" },
      { id: "agua", label: "Agua e Esgoto" },
      { id: "internet", label: "Telefone e Internet" },
      { id: "manutencao_predial", label: "Manutencao Predial" },
      { id: "limpeza", label: "Limpeza" },
      { id: "seguranca", label: "Seguranca e Alarme" },
    ],
  },
  {
    id: "pessoal",
    label: "Pessoal",
    icon: "Users",
    zeroHint: "Voce trabalha completamente sozinho? Sem secretaria, recepcionista ou assistente?",
    subcategories: [
      { id: "salarios", label: "Salarios" },
      { id: "pro_labore", label: "Pro-labore" },
      { id: "encargos", label: "Encargos Trabalhistas (INSS, FGTS)" },
      { id: "vt", label: "Vale Transporte" },
      { id: "vr", label: "Vale Refeicao" },
      { id: "secretarias", label: "Secretarias / Recepcionistas" },
      { id: "provisao_13_ferias", label: "Provisao 13o e Ferias", hint: "Provisionar 13o e ferias evita surpresas. Equivale a ~2.5 meses extras de folha por ano." },
      { id: "rescisoes", label: "Provisao para Rescisoes" },
      { id: "rh", label: "Servicos de RH" },
    ],
  },
  {
    id: "equipamentos",
    label: "Equipamentos",
    icon: "Cpu",
    zeroHint: "Voce nao tem custos com equipamentos? Considere depreciacao, manutencao e calibracao.",
    subcategories: [
      { id: "leasing", label: "Leasing / Financiamento" },
      { id: "manutencao_aparelhos", label: "Manutencao de Aparelhos" },
      { id: "depreciacao", label: "Depreciacao", hint: "Um equipamento de R$100k tem ~R$1.600/mes de depreciacao em 5 anos." },
      { id: "calibracao", label: "Calibracao" },
      { id: "manutencao_computadores", label: "Manutencao de Computadores" },
    ],
  },
  {
    id: "administrativo",
    label: "Administrativo",
    icon: "FileText",
    subcategories: [
      { id: "material_escritorio", label: "Material de Escritorio" },
      { id: "material_limpeza", label: "Material de Limpeza" },
      { id: "software_gestao", label: "Software de Gestao / Prontuario Eletronico" },
      { id: "agendamento_online", label: "Agendamento Online" },
      { id: "backup", label: "Backup e Seguranca de Dados" },
      { id: "contabilidade", label: "Contabilidade" },
      { id: "consultoria_juridica", label: "Consultoria Juridica" },
    ],
  },
  {
    id: "marketing",
    label: "Marketing",
    icon: "Megaphone",
    subcategories: [
      { id: "trafego_pago", label: "Trafego Pago (Google, Instagram, Facebook)" },
      { id: "criador_conteudo", label: "Criador de Conteudo / Social Media" },
      { id: "fotografo", label: "Fotografo / Videomaker" },
      { id: "site", label: "Site / Dominio / Hospedagem" },
    ],
  },
  {
    id: "deslocamento",
    label: "Deslocamento",
    icon: "Car",
    zeroHint: "Voce nao tem custo de deslocamento? Medicos que atendem em mais de um local costumam esquecer esse custo.",
    subcategories: [
      { id: "combustivel", label: "Combustivel" },
      { id: "pedagio", label: "Pedagio" },
      { id: "estacionamento", label: "Estacionamento" },
      { id: "transporte_unidades", label: "Transporte entre Unidades" },
    ],
  },
  {
    id: "formacao",
    label: "Formacao",
    icon: "GraduationCap",
    subcategories: [
      { id: "cursos", label: "Cursos e Especializacoes" },
      { id: "congressos", label: "Congressos e Eventos" },
      { id: "assinaturas", label: "Assinaturas Cientificas" },
      { id: "livros", label: "Livros e Materiais" },
    ],
  },
  {
    id: "seguros_taxas",
    label: "Seguros e Taxas",
    icon: "Shield",
    subcategories: [
      { id: "seguro_consultorio", label: "Seguro do Consultorio" },
      { id: "crm", label: "CRM (Conselho Regional)" },
      { id: "cfm", label: "CFM" },
      { id: "associacoes", label: "Associacoes e Sociedades Medicas" },
      { id: "alvara", label: "Alvara de Funcionamento" },
    ],
  },
  {
    id: "outros",
    label: "Outros",
    icon: "MoreHorizontal",
    subcategories: [
      { id: "cafe_copa", label: "Cafe / Copa / Agua" },
      { id: "lavanderia", label: "Lavanderia" },
      { id: "coleta_lixo", label: "Coleta de Lixo Hospitalar" },
      { id: "uniformes", label: "Uniformes" },
      { id: "brindes", label: "Brindes para Pacientes" },
    ],
  },
];
```

**Step 2: Commit**

```bash
git add shared/expense-categories.ts
git commit -m "feat: add expense categories constant with 9 categories and ~60 subcategories"
```

---

### Task 6: Backend — procedures para despesas fixas expandidas

**Files:**
- Modify: `server/db.ts`
- Modify: `server/routers.ts`

**Step 1: Usar tabela `financial_data` existente (campo `despesasJson`)**

A tabela `financial_data` ja tem `despesasJson` (JSON). Vamos estender o formato para suportar as novas categorias granulares. Adicionar campo `mapasSalaJson` se nao existir.

**Step 2: Criar procedures no `menteePortalRouter`**

```typescript
saveExpenses: menteeProcedure
  .input(z.object({
    expenses: z.record(z.string(), z.number()), // { "espaco.aluguel": 6000, "pessoal.salarios": 2000, ... }
    mapaSala: z.object({
      diasSemana: z.array(z.string()),
      turnoManha: z.number(),
      turnoTarde: z.number(),
      semanasmes: z.number(),
      horasOcupadas: z.number(),
    }).optional(),
  }))
  .mutation(async ({ ctx, input }) => {
    // Salvar em financial_data.despesasJson e mapaSalaJson
  }),

getExpenses: menteeProcedure
  .query(async ({ ctx }) => {
    // Retornar despesasJson e mapaSalaJson do financial_data
  }),
```

**Step 3: Procedures do mentor para ver analise**

```typescript
getExpenseAnalysis: adminProcedure
  .input(z.object({ menteeId: z.number() }))
  .query(async ({ input }) => {
    // Retornar despesas + calculos (totais por categoria, % faturamento, custos ocultos, taxa sala, ociosidade)
  }),
```

**Step 4: Commit**

```bash
git add server/db.ts server/routers.ts
git commit -m "feat: add expense tracking backend with granular categories and room map"
```

---

### Task 7: Frontend — componente ExpenseTool (mentorado)

**Files:**
- Create: `client/src/components/ExpenseTool.tsx`

**Step 1: Criar componente com accordion por categoria**

- Cada categoria e um accordion expansivel
- Dentro: uma linha por subcategoria com input de valor (R$)
- Salvamento automatico a cada alteracao (debounce 1s)
- IA sugere quando categoria zerada ou item critico ausente (usando hints de EXPENSE_CATEGORIES)
- Barra de progresso: "X de Y subcategorias preenchidas"
- Nao mostra nenhum total, analise ou comparacao

**Step 2: Aba Mapa de Sala**

- Selecao de dias da semana
- Input horas por turno (manha/tarde)
- Input horas ocupadas
- Nao mostra calculos (custo hora, ociosidade, etc.)

**Step 3: Commit**

```bash
git add client/src/components/ExpenseTool.tsx
git commit -m "feat: add ExpenseTool component for mentee expense tracking"
```

---

### Task 8: Frontend — componente ExpenseAnalysis (mentor)

**Files:**
- Create: `client/src/components/ExpenseAnalysis.tsx`

**Step 1: Criar componente com visao completa para o mentor**

- Tabela de despesas por categoria com totais e % do faturamento
- Cards: Custo Fixo Total, Custo/Hora Disponivel, Taxa de Sala, Custo Ociosidade, % Ocupacao
- Alertas: provisoes ausentes, depreciacao zerada, categorias criticas
- Benchmark CFM/SEBRAE lado a lado
- Botao "Gerar Analise com IA" para diagnostico narrativo
- Botao "Exportar Excel" e "Exportar PDF"

**Step 2: Commit**

```bash
git add client/src/components/ExpenseAnalysis.tsx
git commit -m "feat: add ExpenseAnalysis component for mentor with calculations and AI"
```

---

## Fase 3: iVMP Completo (Pilar 3, Parte C)

### Task 9: Definir constante IVMP_QUESTIONS

**Files:**
- Create: `shared/ivmp-questions.ts`

**Step 1: Criar arquivo com 53 perguntas organizadas em 7 dimensoes**

Cada pergunta: `{ id, dimensao, texto, instrucao, peso }`
Cada dimensao: `{ id, label, peso, perguntas[] }`

7 dimensoes com pesos: Profissional(15%), Equipe(12%), Infraestrutura(10%), Marketing(18%), Paciente(10%), Jornada(15%), Gestao(20%)

**Step 2: Commit**

```bash
git add shared/ivmp-questions.ts
git commit -m "feat: add 53 iVMP questions across 7 weighted dimensions"
```

---

### Task 10: Backend — procedures para iVMP expandido

**Files:**
- Modify: `server/db.ts`
- Modify: `server/routers.ts`

**Step 1: Usar tabela `ivmp_data` existente**

Ja tem `categoriesJson` (JSON) e `ivmpFinal` (decimal). Estender para suportar 53 respostas individuais.

**Step 2: Procedures mentorado**

```typescript
saveIvmpAnswers: menteeProcedure
  .input(z.object({
    answers: z.record(z.string(), z.number()), // { "prof_01": 8, "prof_02": 5, ... }
  }))
  .mutation(/* salvar em ivmp_data.categoriesJson */),

getIvmpProgress: menteeProcedure
  .query(/* retornar quais perguntas ja foram respondidas, sem scores */),
```

**Step 3: Procedures mentor**

```typescript
getIvmpAnalysis: adminProcedure
  .input(z.object({ menteeId: z.number() }))
  .query(/* retornar scores por dimensao, radar data, benchmark, top fortes/gaps */),

updateIvmpAnswer: adminProcedure
  .input(z.object({ menteeId: z.number(), questionId: z.string(), value: z.number() }))
  .mutation(/* atualizar resposta + recalcular score + retornar impacto */),
```

**Step 4: Commit**

```bash
git add server/db.ts server/routers.ts
git commit -m "feat: add iVMP backend with 53 questions, scores, and impact calculation"
```

---

### Task 11: Frontend — componente IvmpQuestionnaire (mentorado)

**Files:**
- Create: `client/src/components/IvmpQuestionnaire.tsx`

**Step 1: Criar questionario**

- Uma dimensao por vez (wizard-style)
- Cada pergunta: texto + instrucao + slider 0-10
- Barra de progresso por dimensao e geral
- Salvamento automatico
- Ao concluir: "Suas respostas foram enviadas. Seu mentor analisara os resultados."
- Nenhum score ou resultado visivel

**Step 2: Commit**

```bash
git add client/src/components/IvmpQuestionnaire.tsx
git commit -m "feat: add iVMP questionnaire component for mentee (53 questions, no results shown)"
```

---

### Task 12: Frontend — componente IvmpAnalysis (mentor)

**Files:**
- Create: `client/src/components/IvmpAnalysis.tsx`

**Step 1: Dashboard iVMP para o mentor**

- Grafico Radar (Recharts RadarChart) com 7 dimensoes + benchmark overlay
- Score geral ponderado (velocimetro ou gauge)
- Cards: Top 3 fortes (verde) + Top 3 gaps (vermelho)
- Tabela detalhada: cada pergunta com nota, flag se < 4
- Edicao inline de notas com feedback de impacto da IA
- Botoes: Gerar Analise IA, Exportar Excel, Exportar PDF

**Step 2: Commit**

```bash
git add client/src/components/IvmpAnalysis.tsx
git commit -m "feat: add iVMP analysis dashboard for mentor with radar chart and AI"
```

---

## Fase 4: Simulador de Cenarios (Pilar 3, Parte D)

### Task 13: Definir modelo de dados para precificacao

**Files:**
- Create: `shared/pricing-model.ts`

**Step 1: Tipos baseados nas planilhas do Carlos**

```typescript
export interface Service {
  id: string;
  nome: string;
  duracaoHoras: number;
  precoVenda: number;
  impostoPercent: number;
  taxaCartaoPercent: number;
  mod: number;           // Mao de obra direta
  matMed: number;        // Material/Medicamento
  taxaEquipamento: number;
  bonus: number;
}

export interface SimulationParams {
  metaLucroLiquido?: number;
  faturamentoBruto?: number;
  custoFixoTotal: number;
  custosVariaveisPercent: number;
  taxaSalaHora: number;
  horasDisponiveisMes: number;
  horasOcupadasMes: number;
  servicos: Service[];
  mixAtendimentos: Record<string, number>; // serviceId -> quantidade/mes
}

export interface SimulationResult {
  faturamentoBruto: number;
  custoFixoTotal: number;
  custosVariaveis: number;
  lucroLiquido: number;
  margemLiquida: number;
  custoHora: number;
  pontoEquilibrio: number;
  sobraPorMes: number;
  cargaHorariaNecessaria: number;
  porServico: Array<{
    servico: Service;
    quantidade: number;
    faturamento: number;
    lucroBruto: number;
    margemBruta: number;
    lucroOperacional: number;
    margemOperacional: number;
  }>;
}
```

**Step 2: Commit**

```bash
git add shared/pricing-model.ts
git commit -m "feat: add pricing model types based on real spreadsheet structure"
```

---

### Task 14: Backend — procedures para simulador

**Files:**
- Modify: `server/routers.ts`

**Step 1: Procedures do mentor (acesso total)**

```typescript
saveServices: adminProcedure     // Salvar tabela de servicos por mentorado
getServices: adminProcedure      // Buscar servicos
simulate: adminProcedure         // Receber params, retornar SimulationResult
simulateMeta: adminProcedure     // Receber meta lucro, retornar faturamento necessario + mix sugerido
```

**Step 2: Procedure do mentorado (read-only apos liberacao)**

```typescript
getSimulation: menteeProcedure   // Retornar dados base (nao editaveis) + permitir ajuste de params
```

**Step 3: Commit**

```bash
git add server/routers.ts
git commit -m "feat: add scenario simulator backend with full and read-only modes"
```

---

### Task 15: Frontend — componente ScenarioSimulator

**Files:**
- Create: `client/src/components/ScenarioSimulator.tsx`

**Step 1: Versao mentor (acesso total)**

- Tabela de servicos editavel (adicionar/remover/editar)
- Sliders e inputs para cada variavel
- Cards de resultado em tempo real
- Modo Meta: input meta lucro → calcula tudo
- Botoes: Exportar Excel, Exportar PDF

**Step 2: Versao mentorado (read-only apos liberacao)**

- Mesmos cards e graficos
- Dados base travados (cinza, nao editavel)
- Apenas sliders de simulacao (ex: "+10 consultas", "+15% no preco")

**Step 3: Commit**

```bash
git add client/src/components/ScenarioSimulator.tsx
git commit -m "feat: add scenario simulator component with mentor and mentee modes"
```

---

## Fase 5: PDF Premium

### Task 16: Criar servico de geracao de PDF premium

**Files:**
- Create: `server/pdfPremium.ts`

**Step 1: Criar gerador de PDF estilo apresentacao**

Usando PDFKit com:
- Paleta Navy (#1a2332) / Gold (#c9a84c) / White
- Capa com logo, nome, titulo, data
- Paginas com cards, tabelas coloridas, graficos (SVG → imagem)
- Textos narrativos em primeira pessoa do mentor
- Contra-capa com proximos passos

**Step 2: Templates por tipo de conteudo**

```typescript
function renderExpenseTable(doc, data)       // Tabela de despesas colorida
function renderRadarChart(doc, data)         // iVMP radar como imagem
function renderScenarioCards(doc, data)      // Cards de cenarios lado a lado
function renderActionPlan(doc, items)        // Checklist de plano de acao
function renderNarrative(doc, text)          // Texto narrativo com icones
```

**Step 3: Rota de geracao**

```typescript
// GET /api/pdf/premium/:menteeId/:pillarId/:partId
// GET /api/pdf/premium/:menteeId/cumulative
```

**Step 4: Commit**

```bash
git add server/pdfPremium.ts
git commit -m "feat: add premium PDF generator with presentation-style layout"
```

---

### Task 17: Frontend — preview e edicao de PDF

**Files:**
- Create: `client/src/components/PdfPreview.tsx`

**Step 1: Componente de preview + edicao**

- Mentor clica "Gerar Rascunho PDF"
- IA gera textos narrativos + sugestoes
- Mentor ve preview com campos editaveis (textos, plano de acao)
- Botao "Finalizar e Liberar" gera PDF final + libera parte

**Step 2: Commit**

```bash
git add client/src/components/PdfPreview.tsx
git commit -m "feat: add PDF preview component with inline editing for mentor"
```

---

## Fase 6: Export Excel

### Task 18: Criar servico de geracao de Excel

**Files:**
- Create: `server/excelGenerator.ts`

**Step 1: Gerador de Excel formatado**

Usando biblioteca `xlsx` (ja instalada):

```typescript
export function generateExpenseExcel(data): Buffer     // Despesas + Mapa de Sala
export function generateIvmpExcel(data): Buffer        // Respostas + Resumo
export function generatePricingExcel(data): Buffer     // Servicos + Cenarios
export function generateCumulativeExcel(data): Buffer  // Tudo junto
```

Cada funcao: cabecalhos coloridos, bordas, formulas, subtotais.

**Step 2: Rotas**

```typescript
// GET /api/excel/:menteeId/expenses
// GET /api/excel/:menteeId/ivmp
// GET /api/excel/:menteeId/pricing
// GET /api/excel/:menteeId/cumulative
```

**Step 3: Commit**

```bash
git add server/excelGenerator.ts
git commit -m "feat: add formatted Excel export for expenses, iVMP, pricing, and cumulative"
```

---

## Fase 7: Integracao no Portal

### Task 19: Atualizar MenteePortal para mostrar partes por pilar

**Files:**
- Modify: `client/src/pages/MenteePortal.tsx`

**Step 1: Substituir accordion de pilar unico por accordion de partes**

Cada pilar expande em suas partes. Cada parte mostra:
- Status (nao iniciada / em progresso / preenchida / resultado disponivel)
- Se nao liberada: formulario de preenchimento
- Se liberada: resultado formatado + botoes PDF e Excel

**Step 2: Commit**

```bash
git add client/src/pages/MenteePortal.tsx
git commit -m "feat: update MenteePortal to show parts per pillar with granular release"
```

---

### Task 20: Atualizar MenteeDetail para controle de partes

**Files:**
- Modify: `client/src/pages/MenteeDetail.tsx`

**Step 1: Adicionar controle de liberacao por parte**

Cada pilar mostra suas partes com toggles de liberacao individuais. Cada parte mostra:
- Status do preenchimento pelo mentorado
- Dados preenchidos (tabela, scores, etc.)
- Analise IA
- Botao "Gerar PDF" → preview → editar → liberar
- Botao "Exportar Excel"

**Step 2: Commit**

```bash
git add client/src/pages/MenteeDetail.tsx
git commit -m "feat: update MenteeDetail with per-part release controls and analysis"
```

---

## Fase 8: IA Dupla

### Task 21: IA do mentorado — guia de preenchimento

**Files:**
- Modify: `server/routers.ts` (procedure pillarAnswers.getAiHint)

**Step 1: Atualizar prompts da IA do mentorado**

Regras do prompt:
- NUNCA mostrar analise, resultado ou comparacao
- Apenas guiar a preencher mais informacao
- Sugerir itens esquecidos
- Ajudar a elaborar respostas
- Tom: "dica do sistema", nao assistente de IA

**Step 2: Commit**

```bash
git add server/routers.ts
git commit -m "feat: update mentee AI prompts to guide-only mode (no analysis)"
```

---

### Task 22: IA do mentor — assistente estrategico com impacto

**Files:**
- Modify: `server/routers.ts`

**Step 1: Procedure para calcular impacto de edicao**

```typescript
calculateEditImpact: adminProcedure
  .input(z.object({
    menteeId: z.number(),
    field: z.string(),       // ex: "ivmp.gestao_01"
    oldValue: z.number(),
    newValue: z.number(),
  }))
  .mutation(/* Recalcular scores e retornar diff */)
```

**Step 2: Procedure para gerar textos do PDF**

```typescript
generatePdfNarrative: adminProcedure
  .input(z.object({
    menteeId: z.number(),
    pillarId: z.number(),
    partId: z.string(),
  }))
  .mutation(/* Gerar texto narrativo em primeira pessoa do mentor */)
```

**Step 3: Commit**

```bash
git add server/routers.ts
git commit -m "feat: add mentor AI procedures for edit impact and PDF narrative generation"
```

---

## Ordem de Execucao Recomendada

| Fase | Tasks | Entrega |
|------|-------|---------|
| 1 | Tasks 1-4 | Sistema de partes funcionando no backend |
| 2 | Tasks 5-8 | Despesas fixas completas (mentorado + mentor) |
| 3 | Tasks 9-12 | iVMP 53 perguntas com radar e analise |
| 4 | Tasks 13-15 | Simulador de cenarios interativo |
| 5 | Tasks 16-17 | PDF premium com preview e edicao |
| 6 | Task 18 | Export Excel formatado |
| 7 | Tasks 19-20 | Integracao no portal (mentorado + mentor) |
| 8 | Tasks 21-22 | IA dupla (guia mentorado + assistente mentor) |

Cada fase entrega valor funcional independente. Fases 1-4 sao o core. Fases 5-8 sao polish e integracao.
