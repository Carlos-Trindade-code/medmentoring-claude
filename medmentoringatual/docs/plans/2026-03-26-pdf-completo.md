# PDF Completo por Pilar — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** O PDF de cada pilar deve conter TODAS as informações disponíveis: respostas do mentorado, dados das ferramentas (financeiro, iVMP, precificação), análises por parte, diagnóstico, conclusões do mentor, orientações da consultoria e plano de ação. Nenhuma menção a "IA".

**Architecture:** Modificar o pipeline de geração em 3 pontos: (1) `pillarReport.ts` buscar dados faltantes, (2) `reportGenerator.ts` adicionar seções novas no HTML, (3) `pdfPremium.ts` incluir seções novas no PDF.

**Tech Stack:** tRPC, Drizzle ORM, PDFKit, HTML template rendering

---

### Task 1: Buscar dados faltantes no backend (pillarReport.ts generate)

**Files:**
- Modify: `server/routers/pillarReport.ts` (procedure `generate`, ~line 172-349)
- Read: `server/db.ts` (funções getFinancialData, getIvmpData, getPillarFeedback)

**What to do:**
1. Importar `getFinancialData` e `getIvmpData` de `../db`
2. Na procedure `generate`, após as queries existentes (~line 189), adicionar:
   - `const financialData = await getFinancialData(input.menteeId);`
   - `const ivmpData = await getIvmpData(input.menteeId);`
3. Extrair campos de pillarFeedback que já é buscado mas não usado:
   - `feedback?.feedback` (texto do feedback)
   - `feedback?.pontosFortesJson`
   - `feedback?.pontosMelhoriaJson`
   - `feedback?.planoAcao`
4. Passar todos os novos dados para `generatePillarReportHtml()` via ReportData
5. Incluir respostas do mentorado (pillarAnswers) no ReportData — já são buscadas mas não passadas

**Commit:** "feat: fetch financial, iVMP, and mentor feedback data for PDF report"

---

### Task 2: Expandir ReportData interface (reportGenerator.ts)

**Files:**
- Modify: `server/reportGenerator.ts` (interface ReportData, ~line 112-135)

**What to do:**
1. Adicionar campos ao ReportData:
```typescript
// Respostas do mentorado
menteeAnswers?: Array<{
  secao: string;
  respostas: Array<{ id: string; pergunta: string; resposta: string | number | boolean | null; naoSabe?: boolean }>;
  status: string;
}>;
// Dados financeiros
financialData?: {
  expenses?: Record<string, number>;
  mapaSala?: Record<string, unknown>;
  pricing?: unknown;
} | null;
// iVMP
ivmpData?: {
  categories?: Record<string, number>;
  ivmpFinal?: number;
} | null;
// Feedback estruturado do mentor
mentorFeedback?: {
  feedbackText?: string;
  pontosFortesJson?: unknown;
  pontosMelhoriaJson?: unknown;
  planoAcao?: string;
} | null;
```

**Commit:** "feat: expand ReportData interface with mentee answers, financial, iVMP, and feedback"

---

### Task 3: Renderizar respostas do mentorado no HTML

**Files:**
- Modify: `server/reportGenerator.ts` (função generatePillarReportHtml)

**What to do:**
1. Após "Executive Summary" e antes de "AI Diagnosis", adicionar nova seção "Respostas do Mentorado"
2. Para cada seção de answers, renderizar as perguntas e respostas em formato de lista
3. Pular respostas vazias ou marcadas como "naoSabe"
4. Usar o mesmo estilo visual das outras seções (cards com header colorido)
5. Título da seção: "Suas Respostas" (sem mencionar que são "do mentorado" — o PDF é para o mentorado)

**Commit:** "feat: render mentee answers section in pillar PDF"

---

### Task 4: Renderizar dados financeiros e iVMP no HTML

**Files:**
- Modify: `server/reportGenerator.ts`

**What to do:**
1. Apenas para pilares relevantes (Pilar 3 = financeiro, qualquer pilar com iVMP):
2. Seção "Diagnóstico Financeiro" (se financialData.expenses existe):
   - Tabela de despesas por categoria com valores
   - Total de despesas fixas
   - Dados do mapa de sala (se existir)
3. Seção "Índice de Maturidade (iVMP)" (se ivmpData existe):
   - Score final em destaque
   - Categorias com scores individuais
4. Seção "Análise de Precificação" (se financialData.pricing existe, Pilar 5):
   - Tabela de serviços com preços, margens
5. Todos os termos sem menção a "IA" — usar "Diagnóstico", "Análise", "Avaliação"

**Commit:** "feat: render financial data, iVMP scores, and pricing in pillar PDF"

---

### Task 5: Renderizar feedback estruturado do mentor no HTML

**Files:**
- Modify: `server/reportGenerator.ts`

**What to do:**
1. Antes da seção "Conclusões do Mentor", adicionar "Feedback do Mentor":
   - Pontos fortes (de pontosFortesJson) — lista com bullets verdes
   - Pontos de melhoria (de pontosMelhoriaJson) — lista com bullets âmbar
   - Plano de ação (de planoAcao) — texto formatado
   - Feedback geral (de feedbackText) — texto narrativo
2. Se o campo não existir, pular (não renderizar seção vazia)

**Commit:** "feat: render structured mentor feedback in pillar PDF"

---

### Task 6: Incluir novas seções no PDF (pdfPremium.ts)

**Files:**
- Modify: `server/pdfPremium.ts` (função generateReportPdf, ~line 364-459)

**What to do:**
1. O PDF é gerado via PDFKit — adicionar seções correspondentes às novas seções HTML
2. Ordem final do PDF:
   1. Capa
   2. Resumo Executivo
   3. **Suas Respostas** (NOVO)
   4. **Diagnóstico Financeiro** (NOVO, se aplicável)
   5. **Índice de Maturidade** (NOVO, se aplicável)
   6. Diagnóstico Personalizado (já existe)
   7. Análises por Parte (já existe)
   8. **Feedback do Mentor** (NOVO)
   9. Pontos Fortes (já existe)
   10. Pontos de Atenção (já existe)
   11. Plano de Ação (já existe)
   12. Conclusões do Mentor (já existe)
   13. Orientações Finais (já existe)
   14. Checklist de Compromissos (já existe)
   15. Assinatura
3. Garantir que o termo "IA" não aparece em nenhum lugar

**Commit:** "feat: include all new sections in PDFKit PDF generation"

---

### Task 7: Passar dados do backend para o frontend (pillarReport.ts)

**Files:**
- Modify: `server/routers/pillarReport.ts` (procedure `generate` e `save`)

**What to do:**
1. Na procedure `generate`: montar ReportData com todos os novos campos antes de chamar generatePillarReportHtml
2. Na procedure `save`: ao regenerar HTML, incluir os mesmos dados
3. Na procedure `generatePdf`: garantir que os novos dados são passados para generateReportPdf

**Commit:** "feat: wire all data sources through report generation pipeline"

---

### Task 8: Remover qualquer menção a "IA" no HTML/PDF

**Files:**
- Modify: `server/reportGenerator.ts`
- Modify: `server/pdfPremium.ts`
- Modify: `server/pdfGenerator.ts`

**What to do:**
1. Buscar todas as ocorrências de "IA", "Inteligência Artificial", "AI", "gerado por IA", "Diagnóstico de IA"
2. Substituir por termos neutros:
   - "Diagnóstico de IA" → "Diagnóstico Personalizado"
   - "Análise de IA" → "Análise Especializada"
   - "Gerado por IA" → remover
   - "AI Diagnosis" → "Diagnosis"
3. Verificar que nenhum output do LLM menciona "IA" (ajustar prompts se necessário)

**Commit:** "fix: remove all AI mentions from PDF reports — use 'Diagnóstico Personalizado' etc."

---

### Task 9: Verificar build e testes

**Steps:**
1. `npx tsc --noEmit` — 0 erros
2. `pnpm build` — build OK
3. `pnpm test` — testes passam

**Commit (se necessário):** "chore: verify build after PDF improvements"
