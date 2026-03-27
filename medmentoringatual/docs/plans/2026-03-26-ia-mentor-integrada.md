# IA do Mentor Integrada ao Relatório — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** O chat de IA do mentor vira o hub central: mentor conversa, marca conclusões, e essas conclusões alimentam o relatório final automaticamente. O mentorado nunca vê menção a IA.

**Architecture:** (1) Adicionar botão "Marcar como conclusão" em cada mensagem do assistente no chat, (2) salvar conclusões marcadas em tabela dedicada, (3) incluir conclusões do chat no PDF como "Orientações da Consultoria", (4) enriquecer o contexto do LLM com dados financeiros/iVMP/conclusões existentes.

**Tech Stack:** React 19, tRPC 11, Drizzle ORM, Tailwind, PDFKit

---

### Task 1: Schema — tabela chat_conclusions

**Files:**
- Modify: `drizzle/schema.ts`

Adicionar tabela `chat_conclusions`:
```typescript
export const chatConclusions = mysqlTable("chat_conclusions", {
  id: int("id").autoincrement().primaryKey(),
  menteeId: int("mentee_id").notNull().references(() => mentees.id, { onDelete: "cascade" }),
  pillarId: int("pillar_id").notNull(),
  chatMessageId: int("chat_message_id").references(() => mentorAiChat.id, { onDelete: "set null" }),
  content: text("content").notNull(),
  titulo: varchar("titulo", { length: 300 }),
  categoria: varchar("categoria", { length: 100 }), // "orientacao", "diagnostico", "plano_acao", "insight"
  includedInReport: boolean("included_in_report").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});
```

**Commit:** "feat: add chat_conclusions schema for mentor AI conclusions"

---

### Task 2: Backend — CRUD procedures para chat_conclusions

**Files:**
- Modify: `server/db.ts` (funções de banco)
- Modify: `server/routers.ts` (procedures tRPC)

Funções no db.ts:
- `getChatConclusions(menteeId, pillarId)` — lista conclusões
- `addChatConclusion(menteeId, pillarId, chatMessageId, content, titulo?, categoria?)` — cria
- `updateChatConclusion(id, content, titulo?, categoria?)` — edita
- `deleteChatConclusion(id)` — remove
- `toggleConclusionInReport(id, included: boolean)` — inclui/exclui do relatório

Procedures no routers.ts (adminProcedure):
- `mentorAI.getChatConclusions`
- `mentorAI.addChatConclusion`
- `mentorAI.updateChatConclusion`
- `mentorAI.deleteChatConclusion`
- `mentorAI.toggleConclusionInReport`

**Commit:** "feat: CRUD procedures for chat conclusions"

---

### Task 3: Frontend — Botão "Marcar como conclusão" nas mensagens do assistente

**Files:**
- Modify: `client/src/components/MentorAIChat.tsx`

Em cada mensagem do assistente (role === "assistant"), adicionar botão no rodapé:
- Ícone de bookmark/star + "Usar como orientação"
- Ao clicar: abre mini-modal inline com:
  - Título da conclusão (opcional, pré-preenchido com primeiro parágrafo)
  - Categoria: dropdown (Orientação, Diagnóstico, Plano de Ação, Insight)
  - Botão "Salvar" que chama addChatConclusion
- Após salvar: indicador visual "Marcada como orientação" na mensagem (badge verde)

Também adicionar query para carregar conclusões existentes e marcar mensagens que já foram salvas.

**Commit:** "feat: mark assistant messages as conclusions in MentorAIChat"

---

### Task 4: Frontend — Aba "Orientações" no MentorAIChat

**Files:**
- Modify: `client/src/components/MentorAIChat.tsx`

Adicionar terceira aba: "Chat | Checklist | Orientações"

Na aba Orientações:
- Lista todas as conclusões marcadas (getChatConclusions)
- Cada conclusão mostra: título, conteúdo (truncado), categoria (badge colorido), checkbox "Incluir no relatório"
- Botão editar (inline) e remover
- Indicador: "X orientações incluídas no relatório"
- Drag-and-drop para reordenar (opcional, pode ser feito depois)

**Commit:** "feat: add Orientações tab to MentorAIChat with conclusions management"

---

### Task 5: Integrar conclusões do chat no PDF

**Files:**
- Modify: `server/routers/pillarReport.ts` (procedure generate)
- Modify: `server/reportGenerator.ts` (HTML)
- Modify: `server/pdfPremium.ts` (PDFKit)

No generate:
1. Buscar `getChatConclusions(menteeId, pillarId)` filtrando `includedInReport = true`
2. Passar para ReportData como `chatConclusions`

No reportGenerator.ts:
1. Adicionar campo `chatConclusions` ao ReportData
2. Renderizar seção "Orientações da Consultoria" antes de "Conclusões do Mentor"
3. Cada conclusão: título em bold, conteúdo, badge de categoria

No pdfPremium.ts:
1. Adicionar seção "Orientações da Consultoria" no PDF

**Commit:** "feat: include chat conclusions as 'Orientações da Consultoria' in PDF report"

---

### Task 6: Enriquecer contexto do LLM no chat

**Files:**
- Modify: `server/routers.ts` (procedure mentorAI.sendMessage)

O LLM atualmente só recebe respostas do mentorado. Adicionar ao contexto:
1. Dados financeiros (despesas, iVMP) se existirem
2. Conclusões do mentor (pillar_conclusions) se existirem
3. Feedback estruturado (pillar_feedback) se existir
4. Conclusões do chat já marcadas (chatConclusions)

Atualizar o system prompt para instruir a IA a:
- Não mencionar que é IA
- Falar como "assessor" ou "consultor" do mentor
- Ser específico com números e dados quando disponíveis

**Commit:** "feat: enrich LLM context with financial, conclusions, and feedback data"

---

### Task 7: Verificar build e testes

1. `pnpm db:push` (se necessário para nova tabela)
2. `npx tsc --noEmit`
3. `pnpm build`
4. `pnpm test`
