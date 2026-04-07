# Simplificar Interface Mentor + Mentorado

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Simplificar radicalmente a interface do mentor (3 abas: Dados/Insights/Relatório) e do mentorado (página limpa sem IA, tabelas editáveis simples).

**Architecture:** Reescrever o JSX do MentorPillarView substituindo abas por parte (A/B/C/D/Entrega) por 3 abas fixas (Dados/Insights/Relatório). Cada aba é uma página vertical simples. Mentorado mantém PillarPartsView mas sem análises.

**Tech Stack:** React 19, tRPC 11, Tailwind CSS, Shadcn/ui

---

### Task 1: Reescrever MentorPillarView — Aba "Dados"

**Files:**
- Modify: `client/src/pages/MentorPillarView.tsx`

Substituir o tab bar atual (abas A/B/C/D/Entrega) por 3 abas fixas:
- `dados` — Respostas editáveis + ferramentas editáveis (tudo do mentorado)
- `insights` — Análise IA + custos ocultos + chat
- `relatorio` — Gerar/editar/liberar relatório

**Aba Dados mostra (vertical, sem sub-abas):**
1. Respostas do questionário (MenteeAnswersSummary com editable=true) — TODAS as seções do pilar, não filtradas por parte
2. Ferramentas (conforme pilar):
   - Pilar 3: ExpenseAnalysis (editável inline) + IvmpAnalysis (editável inline) + ScenarioSimulator (modo mentor)
   - Pilar 5: PricingEditor (editável)
   - Outros pilares: só respostas

State: `const [activeTab, setActiveTab] = useState<"dados" | "insights" | "relatorio">("dados");`

Remove: `activePartTab`, `PART_SECTION_MAP`, `PILLAR_PARTS`, `currentPartSections`, roteiro de condução collapsible.

**Commit:** `refactor: simplify MentorPillarView to 3 tabs (Dados/Insights/Relatório)`

---

### Task 2: Reescrever MentorPillarView — Aba "Insights"

**Files:**
- Modify: `client/src/pages/MentorPillarView.tsx`

**Aba Insights mostra:**
1. Botão "Analisar pilar com IA" (usa handleGenerateDiagnosis)
2. Resultado do diagnóstico (editável) — frase-chave, resumo, nível, pontos fortes, lacunas, recomendações
3. Custos ocultos (ExpenseAnalysis alerts section) — só para Pilar 3
4. Chat IA (MentorAIChat) — colapsável

Remove: PillarPartAnalysis (análise por parte), Especializações P1, Roteiro estratégico P1 (podem ser gerados via chat IA se necessário).

**Commit:** `refactor: simplify Insights tab - 1 diagnosis + chat IA`

---

### Task 3: Reescrever MentorPillarView — Aba "Relatório"

**Files:**
- Modify: `client/src/pages/MentorPillarView.tsx`

**Aba Relatório mostra:**
1. Botão "Gerar relatório com IA" (handleGenerateConclusions)
2. Campos editáveis das conclusões
3. Feedback (pontos fortes, melhorias, plano de ação)
4. Botões: Salvar | Liberar para mentorado | Baixar PDF

Consolida: conclusões + feedback + PillarReportGenerator em um fluxo linear.

**Commit:** `refactor: simplify Relatório tab - conclusions + feedback + PDF`

---

### Task 4: Limpar código morto e imports

**Files:**
- Modify: `client/src/pages/MentorPillarView.tsx`

Remove:
- Import de PillarPartAnalysis (não usado mais)
- Import de PILLAR_PARTS, PART_SECTION_MAP
- State variables não usadas (activePartTab, roteiroOpen, etc.)
- Funções de especializações e roteiro (P1)
- PillarTools sub-component se não for mais usado

**Commit:** `refactor: remove dead code from MentorPillarView`

---

### Task 5: Verificação

**Run:** `npx tsc --noEmit` — zero erros

**Teste manual:**
1. Mentor abre Pilar 3 → aba Dados: vê respostas editáveis + despesas + iVMP + simulador
2. Mentor abre aba Insights → gera diagnóstico, vê custos ocultos, usa chat
3. Mentor abre aba Relatório → gera, edita, libera PDF
4. Mentorado abre Pilar 3 → vê partes com perguntas + tabelas simples (sem análises IA)
