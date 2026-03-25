# MedMentoring UX Overhaul Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transformar o MedMentoring em uma experiência premium e intuitiva para mentorados, com painel de controle claro e prático para o mentor.

**Architecture:** Refatorar componentes existentes (não criar app novo). Mentorado ganha wizard step-by-step com micro-etapas e visual premium. Mentor ganha dashboard com visão consolidada de respostas, auto-análise IA e checklist persistente. Exportações ganham dados completos.

**Tech Stack:** React 19 + TypeScript, Tailwind CSS 4, shadcn/ui (Radix), Framer Motion, TRPC 11, Drizzle ORM, MySQL, xlsx, PDFKit/Puppeteer

---

## FASE A: Mentorado — UX Premium

### Task 1: Componente StepWizard reutilizável

**Files:**
- Create: `client/src/components/StepWizard.tsx`

**Step 1: Criar o componente StepWizard**

O wizard gerencia navegação step-by-step com barra de progresso visual, animações suaves e micro-etapas.

```tsx
// client/src/components/StepWizard.tsx
import { useState, useCallback, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface WizardStep {
  id: string;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
}

interface Props {
  steps: WizardStep[];
  currentStep: number;
  onStepChange: (step: number) => void;
  completedSteps: Set<string>;
  children: ReactNode;
  onFinish?: () => void;
  canAdvance?: boolean;
}

export function StepWizard({
  steps, currentStep, onStepChange, completedSteps, children, onFinish, canAdvance = true,
}: Props) {
  const isFirst = currentStep === 0;
  const isLast = currentStep === steps.length - 1;
  const progress = steps.length > 0 ? Math.round(((completedSteps.size) / steps.length) * 100) : 0;

  return (
    <div className="flex flex-col h-full">
      {/* Progress bar */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-foreground">
            Etapa {currentStep + 1} de {steps.length}
          </span>
          <span className="text-sm font-semibold text-primary">{progress}%</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-primary to-secondary rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>

        {/* Step indicators — scrollable on mobile */}
        <div className="flex gap-1.5 mt-3 overflow-x-auto pb-1 scrollbar-hide">
          {steps.map((step, i) => {
            const done = completedSteps.has(step.id);
            const active = i === currentStep;
            return (
              <button
                key={step.id}
                onClick={() => (done || i <= currentStep) && onStepChange(i)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all",
                  active && "bg-primary text-primary-foreground shadow-sm",
                  done && !active && "bg-primary/10 text-primary cursor-pointer",
                  !done && !active && "bg-muted text-muted-foreground"
                )}
              >
                {done ? <Check className="w-3 h-3" /> : <span className="w-4 text-center">{i + 1}</span>}
                <span className="hidden sm:inline">{step.title}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step content with animation */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
          >
            {steps[currentStep] && (
              <div className="mb-6">
                <h2 className="text-xl font-display font-bold text-foreground">
                  {steps[currentStep].title}
                </h2>
                {steps[currentStep].subtitle && (
                  <p className="text-sm text-muted-foreground mt-1">{steps[currentStep].subtitle}</p>
                )}
              </div>
            )}
            {children}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-t border-border px-4 py-3 flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => onStepChange(currentStep - 1)}
          disabled={isFirst}
          className="gap-1.5"
        >
          <ChevronLeft className="w-4 h-4" /> Anterior
        </Button>

        {isLast ? (
          <Button onClick={onFinish} disabled={!canAdvance} className="gap-1.5 bg-secondary text-secondary-foreground hover:bg-secondary/90">
            Concluir <Check className="w-4 h-4" />
          </Button>
        ) : (
          <Button onClick={() => onStepChange(currentStep + 1)} disabled={!canAdvance} className="gap-1.5">
            Próximo <ChevronRight className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Commit**
```bash
git add client/src/components/StepWizard.tsx
git commit -m "feat: add StepWizard reusable component with progress bar and animations"
```

---

### Task 2: Refatorar MenteePillarQuestionnaire para usar StepWizard

**Files:**
- Modify: `client/src/components/MenteePillarQuestionnaire.tsx`

**Step 1: Substituir navegação por seções pelo StepWizard**

Manter toda a lógica de respostas/auto-save existente. Trocar apenas a navegação:

- Importar `StepWizard` e `WizardStep`
- Converter cada `Section` em um `WizardStep`
- Dentro de cada step, mostrar no máximo 5 perguntas por vez (se a seção tiver mais, criar sub-steps)
- Remover os botões Previous/Next antigos
- Manter `showGuide`, `answers`, `saving`, `lastSaved`, `completedSections` como estão

Mudanças específicas no render:
```tsx
// ANTES: lista de seções com botões
// DEPOIS: <StepWizard> wrapping o conteúdo da seção atual

const wizardSteps: WizardStep[] = sections.map((s) => ({
  id: s.id,
  title: s.titulo,
  subtitle: s.descricao,
}));

return (
  <StepWizard
    steps={wizardSteps}
    currentStep={currentSectionIdx}
    onStepChange={setCurrentSectionIdx}
    completedSteps={completedSections}
    canAdvance={canProceed}
    onFinish={handleFinish}
  >
    {/* Renderiza perguntas da seção atual — código existente */}
    {renderSectionQuestions(sections[currentSectionIdx])}
  </StepWizard>
);
```

**Step 2: Adicionar indicador de campo obrigatório**

Em cada pergunta com `obrigatoria: true`, adicionar asterisco vermelho:
```tsx
<span className="text-destructive ml-1">*</span>
```

**Step 3: Adicionar timestamp de auto-save visível**

No sticky footer do wizard, mostrar:
```tsx
{lastSaved && (
  <span className="text-xs text-muted-foreground">
    Salvo {formatDistanceToNow(lastSaved, { locale: ptBR, addSuffix: true })}
  </span>
)}
```

**Step 4: Commit**
```bash
git add client/src/components/MenteePillarQuestionnaire.tsx
git commit -m "feat: refactor mentee questionnaire to use StepWizard with micro-steps"
```

---

### Task 3: Redesign do Portal do Mentorado — Cards Premium

**Files:**
- Modify: `client/src/pages/MenteePortal.tsx`

**Step 1: Redesenhar o PillarCard**

Substituir o accordion por cards grid com visual premium:

```tsx
function PillarCard({ pillar, menteeId }: { pillar: typeof PILLARS[0]; menteeId: number }) {
  const [, navigate] = useLocation();
  // ... keep existing data queries ...

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: pillar.id * 0.08 }}
      className={cn(
        "group relative bg-card rounded-2xl border overflow-hidden cursor-pointer",
        "hover:shadow-lg hover:-translate-y-1 transition-all duration-300",
        allDone ? "border-secondary/50" : "border-border"
      )}
      onClick={() => navigate(`/portal/pilar/${pillar.id}`)}
    >
      {/* Colored top bar */}
      <div className={cn("h-1.5", pillar.color)} />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{pillar.emoji}</span>
            <div>
              <h3 className="font-display font-bold text-foreground text-base">
                {pillar.title}
              </h3>
              <p className="text-xs text-muted-foreground">
                {completedCount}/{totalSections} seções
              </p>
            </div>
          </div>
          {allDone && feedbackData?.feedback && (
            <Badge className="bg-secondary/15 text-secondary border-secondary/30 text-xs gap-1">
              <Sparkles className="w-3 h-3" /> Feedback
            </Badge>
          )}
          {allDone && !feedbackData?.feedback && (
            <Badge variant="outline" className="text-xs text-muted-foreground gap-1">
              <Clock className="w-3 h-3" /> Aguardando
            </Badge>
          )}
        </div>

        {/* Progress ring */}
        <div className="flex items-center gap-4">
          <div className="relative w-14 h-14 flex-shrink-0">
            <svg className="w-14 h-14 -rotate-90" viewBox="0 0 36 36">
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none" stroke="currentColor" strokeWidth="3"
                className="text-muted/40"
              />
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none" strokeWidth="3" strokeLinecap="round"
                className={allDone ? "text-secondary" : "text-primary"}
                strokeDasharray={`${progressPct}, 100`}
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">
              {progressPct}%
            </span>
          </div>
          <div className="flex-1 text-sm text-muted-foreground">
            {!allDone && completedCount === 0 && "Comece agora"}
            {!allDone && completedCount > 0 && "Continue de onde parou"}
            {allDone && feedbackData?.feedback && "Veja o que seu mentor preparou"}
            {allDone && !feedbackData?.feedback && "Seu mentor está analisando"}
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
      </div>
    </motion.div>
  );
}
```

**Step 2: Layout grid responsivo**

Substituir o layout de accordion por grid:
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-4 max-w-4xl mx-auto">
  {PILLARS.map((p) => <PillarCard key={p.id} pillar={p} menteeId={menteeId} />)}
</div>
```

**Step 3: Header do portal com saudação**

```tsx
<div className="px-4 pt-6 pb-4 max-w-4xl mx-auto">
  <h1 className="text-2xl font-display font-bold text-foreground">
    Olá, {menteeData?.nome?.split(" ")[0]} 👋
  </h1>
  <p className="text-muted-foreground mt-1">
    Seu progresso geral: <span className="font-semibold text-primary">{overallProgress}%</span>
  </p>

  {/* Overall progress bar */}
  <div className="h-2.5 bg-muted rounded-full overflow-hidden mt-3">
    <motion.div
      className="h-full bg-gradient-to-r from-primary via-primary to-secondary rounded-full"
      initial={{ width: 0 }}
      animate={{ width: `${overallProgress}%` }}
    />
  </div>
</div>
```

**Step 4: Commit**
```bash
git add client/src/pages/MenteePortal.tsx
git commit -m "feat: redesign mentee portal with premium cards and progress rings"
```

---

### Task 4: Tela de boas-vindas e onboarding do mentorado

**Files:**
- Modify: `client/src/pages/MenteePortal.tsx`

**Step 1: Welcome screen para primeiro acesso**

Quando o mentorado nunca preencheu nada, mostrar uma tela de boas-vindas antes do grid de pilares:

```tsx
function WelcomeScreen({ onStart }: { onStart: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-lg mx-auto text-center px-6 py-16"
    >
      <div className="w-20 h-20 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
        <Sparkles className="w-10 h-10 text-primary" />
      </div>
      <h1 className="text-3xl font-display font-bold text-foreground mb-3">
        Bem-vindo ao MedMentoring
      </h1>
      <p className="text-muted-foreground mb-8 leading-relaxed">
        Sua jornada de transformação profissional começa agora. Vamos trabalhar juntos em
        <strong> 7 pilares</strong> que vão estruturar sua carreira médica.
      </p>
      <div className="space-y-3 text-left mb-8">
        {[
          { icon: "📝", text: "Responda as perguntas no seu ritmo" },
          { icon: "💾", text: "Tudo é salvo automaticamente" },
          { icon: "🎯", text: "Seu mentor analisa e devolve insights exclusivos" },
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-3 bg-muted/50 rounded-xl px-4 py-3">
            <span className="text-xl">{item.icon}</span>
            <span className="text-sm text-foreground">{item.text}</span>
          </div>
        ))}
      </div>
      <Button onClick={onStart} size="lg" className="w-full gap-2">
        Começar Jornada <ChevronRight className="w-4 h-4" />
      </Button>
    </motion.div>
  );
}
```

**Step 2: Commit**
```bash
git add client/src/pages/MenteePortal.tsx
git commit -m "feat: add welcome onboarding screen for first-time mentees"
```

---

### Task 5: Melhorias visuais nos formulários de ferramentas

**Files:**
- Modify: `client/src/components/ExpenseTool.tsx`
- Modify: `client/src/components/IvmpQuestionnaire.tsx`

**Step 1: ExpenseTool — Progresso por categoria + collapse inteligente**

Adicionar barra de progresso no topo do ExpenseTool mostrando categorias preenchidas vs total.
Destacar visualmente categorias já preenchidas (check verde) vs pendentes.

No topo do componente, antes dos accordions:
```tsx
<div className="flex items-center gap-3 mb-4 px-4 py-3 bg-muted/50 rounded-xl">
  <span className="text-sm font-medium text-foreground">
    {filledCategories}/{totalCategories} categorias preenchidas
  </span>
  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
    <div
      className="h-full bg-primary rounded-full transition-all"
      style={{ width: `${(filledCategories / totalCategories) * 100}%` }}
    />
  </div>
</div>
```

**Step 2: IvmpQuestionnaire — Feedback visual no slider**

Adicionar labels semânticos abaixo do slider (0 = "Nunca", 5 = "Às vezes", 10 = "Sempre"):
```tsx
<div className="flex justify-between text-xs text-muted-foreground mt-1">
  <span>Nunca</span>
  <span>Às vezes</span>
  <span>Sempre</span>
</div>
```

Adicionar progresso por dimensão:
```tsx
<span className="text-xs text-muted-foreground">
  Dimensão {currentDimension + 1} de 7
</span>
```

**Step 3: Commit**
```bash
git add client/src/components/ExpenseTool.tsx client/src/components/IvmpQuestionnaire.tsx
git commit -m "feat: add progress indicators to expense tool and IVMP questionnaire"
```

---

### Task 6: Mobile-first polish

**Files:**
- Modify: `client/src/index.css`
- Modify: `client/src/components/PricingTableMentee.tsx`

**Step 1: Adicionar utilitários CSS para mobile**

```css
/* Scrollbar hide utility */
.scrollbar-hide::-webkit-scrollbar { display: none; }
.scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }

/* Safe area for mobile bottom nav */
.pb-safe { padding-bottom: env(safe-area-inset-bottom, 0); }
```

**Step 2: PricingTableMentee — Layout responsivo**

Trocar table horizontal por cards empilhados em mobile:
```tsx
{/* Mobile: card stack */}
<div className="block md:hidden space-y-3">
  {services.map((svc) => (
    <div key={svc.id} className="bg-card border rounded-xl p-4 space-y-2">
      <div className="font-semibold text-foreground">{svc.nome}</div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div><span className="text-muted-foreground">Preço:</span> R$ {svc.preco}</div>
        <div><span className="text-muted-foreground">Duração:</span> {svc.duracao}h</div>
        <div><span className="text-muted-foreground">Margem:</span> {svc.margem}%</div>
        <div><span className="text-muted-foreground">Lucro:</span> R$ {svc.lucro}</div>
      </div>
    </div>
  ))}
</div>
{/* Desktop: table */}
<div className="hidden md:block">
  {/* existing table code */}
</div>
```

**Step 3: Commit**
```bash
git add client/src/index.css client/src/components/PricingTableMentee.tsx
git commit -m "feat: mobile-first polish for pricing table and CSS utilities"
```

---

## FASE B: Mentor — Painel de Controle

### Task 7: Dashboard do mentor — Visão consolidada de respostas

**Files:**
- Modify: `client/src/pages/MentorPillarView.tsx`
- Create: `client/src/components/MenteeAnswersSummary.tsx`

**Step 1: Criar MenteeAnswersSummary — resumo tabular de respostas**

Componente que exibe todas as respostas do mentorado para um pilar em formato de tabela limpa, pronta para copiar/exportar:

```tsx
// client/src/components/MenteeAnswersSummary.tsx
import type { Answer } from "@/components/MenteePillarQuestionnaire";
import { Badge } from "@/components/ui/badge";
import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface Props {
  sections: { id: string; titulo: string; perguntas: { id: string; pergunta: string }[] }[];
  answers: { secao: string; respostas: Answer[] }[];
}

export function MenteeAnswersSummary({ sections, answers }: Props) {
  const [copied, setCopied] = useState(false);

  const answerMap = new Map<string, Answer>();
  answers.forEach((a) => a.respostas.forEach((r) => answerMap.set(r.id, r)));

  const filledCount = [...answerMap.values()].filter(
    (a) => a.resposta !== null && a.resposta !== "" && !a.naoSabe
  ).length;
  const totalCount = sections.reduce((s, sec) => s + sec.perguntas.length, 0);

  function copyAll() {
    const text = sections
      .map((sec) => {
        const qas = sec.perguntas
          .map((q) => {
            const a = answerMap.get(q.id);
            const val = a?.naoSabe ? "(Não sabe)" : a?.resposta ?? "(Não respondido)";
            return `${q.pergunta}\n→ ${val}`;
          })
          .join("\n\n");
        return `=== ${sec.titulo} ===\n\n${qas}`;
      })
      .join("\n\n\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Respostas copiadas!");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {filledCount}/{totalCount} respondidas
          </Badge>
        </div>
        <button
          onClick={copyAll}
          className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? "Copiado!" : "Copiar tudo"}
        </button>
      </div>

      <div className="space-y-6">
        {sections.map((sec) => (
          <div key={sec.id}>
            <h4 className="text-sm font-semibold text-foreground border-b border-border pb-2 mb-3">
              {sec.titulo}
            </h4>
            <div className="space-y-3">
              {sec.perguntas.map((q) => {
                const a = answerMap.get(q.id);
                const hasAnswer = a && a.resposta !== null && a.resposta !== "" && !a.naoSabe;
                return (
                  <div key={q.id} className="grid grid-cols-1 md:grid-cols-[1fr,1.5fr] gap-1 md:gap-4">
                    <p className="text-xs text-muted-foreground">{q.pergunta}</p>
                    <p className={`text-sm ${hasAnswer ? "text-foreground" : "text-muted-foreground italic"}`}>
                      {a?.naoSabe ? "Não sabe" : hasAnswer ? String(a.resposta) : "—"}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Step 2: Integrar no MentorPillarView**

Substituir a seção de "Respostas do Mentorado" no accordion por `<MenteeAnswersSummary>`, que mostra as respostas em formato tabular ao invés de accordion nested.

No `MentorPillarView.tsx`, na seção de respostas:
```tsx
import { MenteeAnswersSummary } from "@/components/MenteeAnswersSummary";

// Dentro do accordion de respostas:
<MenteeAnswersSummary
  sections={PILLAR_SECTIONS[Number(pillarId)] ?? []}
  answers={answersData ?? []}
/>
```

**Step 3: Commit**
```bash
git add client/src/components/MenteeAnswersSummary.tsx client/src/pages/MentorPillarView.tsx
git commit -m "feat: add tabular answer summary for mentor with copy-all"
```

---

### Task 8: Auto-análise IA ao abrir pilar

**Files:**
- Modify: `client/src/pages/MentorPillarView.tsx`
- Modify: `server/routers.ts` (mentorAI routes)

**Step 1: Criar rota TRPC para auto-summary**

No `server/routers.ts`, dentro do `mentorAiRouter`, adicionar:
```ts
autoSummary: adminProcedure
  .input(z.object({ menteeId: z.number(), pillarId: z.number() }))
  .query(async ({ input, ctx }) => {
    // Check if we already have a cached summary (less than 24h old)
    const [existing] = await ctx.db
      .select()
      .from(mentorAiChat)
      .where(
        and(
          eq(mentorAiChat.menteeId, input.menteeId),
          eq(mentorAiChat.pillarId, input.pillarId),
          eq(mentorAiChat.role, "system"),
        )
      )
      .orderBy(desc(mentorAiChat.createdAt))
      .limit(1);

    if (existing && existing.createdAt > new Date(Date.now() - 24 * 60 * 60 * 1000)) {
      return { summary: existing.content, cached: true };
    }

    // Get mentee answers for this pillar
    const answers = await ctx.db
      .select()
      .from(pillarAnswers)
      .where(
        and(
          eq(pillarAnswers.menteeId, input.menteeId),
          eq(pillarAnswers.pillarId, input.pillarId),
        )
      );

    if (answers.length === 0) {
      return { summary: null, cached: false };
    }

    // Generate summary via LLM
    const prompt = `Analise brevemente as respostas deste mentorado no Pilar ${input.pillarId}. Dê um resumo de 3-5 pontos: principais forças, gaps, e o que o mentor deve focar. Seja direto.\n\nRespostas:\n${JSON.stringify(answers.map(a => a.respostas))}`;

    const result = await generateLLMResponse(prompt);

    // Cache the result
    await ctx.db.insert(mentorAiChat).values({
      menteeId: input.menteeId,
      pillarId: input.pillarId,
      role: "system",
      content: result,
    });

    return { summary: result, cached: false };
  }),
```

**Step 2: Mostrar auto-summary no topo do MentorPillarView**

Antes dos accordions, exibir card com resumo automático:
```tsx
const { data: autoSummary, isLoading: summaryLoading } = trpc.mentorAI.autoSummary.useQuery(
  { menteeId: Number(menteeId), pillarId: Number(pillarId) },
  { staleTime: 5 * 60 * 1000 }
);

// No render, logo após o header:
{autoSummary?.summary && (
  <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-6">
    <div className="flex items-center gap-2 mb-2">
      <Sparkles className="w-4 h-4 text-primary" />
      <span className="text-sm font-semibold text-primary">Resumo IA</span>
      {autoSummary.cached && <Badge variant="outline" className="text-xs">Cache</Badge>}
    </div>
    <div className="text-sm text-foreground whitespace-pre-line">{autoSummary.summary}</div>
  </div>
)}
```

**Step 3: Commit**
```bash
git add server/routers.ts client/src/pages/MentorPillarView.tsx
git commit -m "feat: auto AI summary when mentor opens pillar view"
```

---

### Task 9: Checklist persistente do mentor

**Files:**
- Modify: `client/src/pages/Pillar1WorkRoom.tsx` (e Pillar2-7)
- Modify: `server/routers.ts`

**Step 1: Verificar se já existe tabela de checklist no banco**

A tabela `checklist_items` já existe no schema com campos: `id, menteeId, pillarId, item, status, createdAt, updatedAt`. Já existe a rota `mentor.getChecklist` e `mentor.updateChecklistItem`.

**Step 2: Nos WorkRooms, trocar checklist local por chamada ao banco**

Em cada `PillarXWorkRoom.tsx`, localizar o checklist que usa `useState` local e substituir por:

```tsx
// Buscar checklist persistente
const { data: checklistData } = trpc.mentor.getChecklist.useQuery({ menteeId: Number(menteeId) });
const updateItem = trpc.mentor.updateChecklistItem.useMutation({
  onSuccess: () => utils.mentor.getChecklist.invalidate({ menteeId: Number(menteeId) }),
});

// Filtrar itens deste pilar
const pillarChecklist = (checklistData ?? []).filter((c) => c.pillarId === PILLAR_ID);

// Render:
<div className="space-y-2">
  {PILLAR_CHECKLIST_ITEMS.map((item, i) => {
    const saved = pillarChecklist.find((c) => c.item === item);
    const isCompleted = saved?.status === "completed";
    return (
      <label key={i} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer">
        <input
          type="checkbox"
          checked={isCompleted}
          onChange={() => updateItem.mutate({
            menteeId: Number(menteeId),
            pillarId: PILLAR_ID,
            item,
            status: isCompleted ? "pending" : "completed",
          })}
          className="mt-0.5 h-4 w-4 rounded border-border text-primary"
        />
        <span className={cn("text-sm", isCompleted && "line-through text-muted-foreground")}>
          {item}
        </span>
      </label>
    );
  })}
</div>
```

**Step 3: Aplicar em todos os 7 WorkRooms**

Repetir o padrão acima em `Pillar1WorkRoom.tsx` até `Pillar7WorkRoom.tsx`, usando o `PILLAR_ID` correto (1-7).

**Step 4: Commit**
```bash
git add client/src/pages/Pillar1WorkRoom.tsx client/src/pages/Pillar2WorkRoom.tsx \
  client/src/pages/Pillar3WorkRoom.tsx client/src/pages/Pillar4WorkRoom.tsx \
  client/src/pages/Pillar5WorkRoom.tsx client/src/pages/Pillar6WorkRoom.tsx \
  client/src/pages/Pillar7WorkRoom.tsx
git commit -m "feat: persist mentor checklist items to database across all pillar work rooms"
```

---

### Task 10: MentorDashboard — Indicadores rápidos por mentorado

**Files:**
- Modify: `client/src/pages/MentorDashboard.tsx`

**Step 1: Adicionar badges de alerta no MenteeCard**

Mostrar no card de cada mentorado: quantos pilares têm respostas pendentes de análise, se há sessão pendente.

```tsx
// Dentro de MenteeCard, após o progress bar:
const pendingAnalysis = (releases.data ?? []).filter((r) => {
  // Pilar foi preenchido pelo mentorado mas mentor não liberou feedback ainda
  return !r.resumoReleased;
}).length;

// No render:
{pendingAnalysis > 0 && (
  <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-xs gap-1">
    <AlertCircle className="w-3 h-3" /> {pendingAnalysis} para analisar
  </Badge>
)}
```

**Step 2: Commit**
```bash
git add client/src/pages/MentorDashboard.tsx
git commit -m "feat: add pending analysis badges to mentor dashboard mentee cards"
```

---

## FASE C: Exportação & Relatórios

### Task 11: Excel completo com análise do mentor

**Files:**
- Modify: `server/excelGenerator.ts`
- Modify: `server/excelRouter.ts`

**Step 1: Adicionar aba "Análise do Mentor" ao Excel de despesas**

No `excelGenerator.ts`, após as abas existentes de "Despesas Fixas" e "Mapa de Sala", adicionar:

```ts
// Nova aba: Análise
const analysisSheet = workbook.addWorksheet("Análise do Mentor");
analysisSheet.columns = [
  { header: "Campo", key: "campo", width: 30 },
  { header: "Valor", key: "valor", width: 50 },
];

// KPIs
const kpis = [
  { campo: "Custo Total Fixo", valor: `R$ ${totalFixedCost.toFixed(2)}` },
  { campo: "Custo por Hora Disponível", valor: `R$ ${costPerHour.toFixed(2)}` },
  { campo: "Taxa de Ocupação", valor: `${occupancyRate.toFixed(1)}%` },
  { campo: "Custo de Ociosidade", valor: `R$ ${idleCost.toFixed(2)}` },
  { campo: "Ponto de Equilíbrio", valor: `R$ ${breakevenRevenue.toFixed(2)}/mês` },
];
kpis.forEach((row) => analysisSheet.addRow(row));

// Mentor notes (if provided)
if (mentorNotes) {
  analysisSheet.addRow({});
  analysisSheet.addRow({ campo: "Observações do Mentor", valor: mentorNotes });
}

// AI suggestions (if provided)
if (suggestions?.length) {
  analysisSheet.addRow({});
  analysisSheet.addRow({ campo: "Sugestões IA", valor: "" });
  suggestions.forEach((s, i) => {
    analysisSheet.addRow({ campo: `  ${i + 1}.`, valor: s.texto });
  });
}
```

**Step 2: Criar rota de export completo por pilar**

No `excelRouter.ts`, adicionar rota que exporta tudo de um pilar:
```ts
exportPillarComplete: adminProcedure
  .input(z.object({ menteeId: z.number(), pillarId: z.number() }))
  .mutation(async ({ input, ctx }) => {
    // Fetch all data for this pillar
    const answers = await getAnswers(ctx.db, input.menteeId, input.pillarId);
    const feedback = await getFeedback(ctx.db, input.menteeId, input.pillarId);
    const suggestions = await getSuggestions(ctx.db, input.menteeId, input.pillarId);
    const mentorNote = await getMentorNote(ctx.db, input.menteeId, input.pillarId);

    const workbook = new ExcelJS.Workbook();

    // Aba 1: Respostas do Mentorado
    const answersSheet = workbook.addWorksheet("Respostas");
    answersSheet.columns = [
      { header: "Seção", key: "secao", width: 20 },
      { header: "Pergunta", key: "pergunta", width: 40 },
      { header: "Resposta", key: "resposta", width: 50 },
    ];
    answers.forEach((section) => {
      section.respostas.forEach((r) => {
        answersSheet.addRow({
          secao: section.secao,
          pergunta: r.pergunta,
          resposta: r.naoSabe ? "(Não sabe)" : String(r.resposta ?? ""),
        });
      });
    });

    // Aba 2: Análise & Feedback
    const analysisSheet = workbook.addWorksheet("Análise");
    if (feedback) {
      analysisSheet.addRow(["Feedback", feedback.feedback]);
      analysisSheet.addRow(["Pontos Fortes", (feedback.pontosFortes || []).join("; ")]);
      analysisSheet.addRow(["Pontos de Melhoria", (feedback.pontosMelhoria || []).join("; ")]);
      analysisSheet.addRow(["Plano de Ação", feedback.planoAcao]);
    }

    // Aba 3: Sugestões e Notas
    const notesSheet = workbook.addWorksheet("Notas do Mentor");
    if (mentorNote) {
      notesSheet.addRow(["Anotações", mentorNote.content]);
    }
    suggestions?.forEach((s, i) => {
      notesSheet.addRow([`Sugestão ${i + 1}`, s.texto, s.concluida ? "Concluída" : "Pendente"]);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return {
      base64: Buffer.from(buffer).toString("base64"),
      fileName: `pilar-${input.pillarId}-completo.xlsx`,
    };
  }),
```

**Step 3: Commit**
```bash
git add server/excelGenerator.ts server/excelRouter.ts
git commit -m "feat: complete Excel export with mentor analysis, feedback, and suggestions"
```

---

### Task 12: PDF com branding do mentor

**Files:**
- Modify: `server/reportGenerator.ts`
- Modify: `server/pdfGenerator.ts`

**Step 1: Atualizar template HTML do relatório**

No `reportGenerator.ts`, atualizar o template para incluir branding premium:

```ts
function generateReportHtml(data: ReportData): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Playfair+Display:wght@700&display=swap');

        body {
          font-family: 'Inter', sans-serif;
          color: #1a1a2e;
          padding: 40px;
          line-height: 1.6;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 3px solid #1a1a2e;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }

        .header h1 {
          font-family: 'Playfair Display', serif;
          font-size: 28px;
          color: #1a1a2e;
          margin: 0;
        }

        .header .logo {
          font-size: 14px;
          color: #b8860b;
          font-weight: 600;
          letter-spacing: 2px;
        }

        .subtitle {
          color: #b8860b;
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 4px;
        }

        h2 {
          font-family: 'Playfair Display', serif;
          font-size: 20px;
          color: #1a1a2e;
          border-left: 4px solid #b8860b;
          padding-left: 12px;
          margin-top: 30px;
        }

        .highlight-box {
          background: #f8f6f0;
          border-radius: 8px;
          padding: 16px;
          margin: 12px 0;
        }

        .strength-item {
          padding: 8px 0;
          border-bottom: 1px solid #eee;
        }

        .action-item {
          background: #1a1a2e;
          color: white;
          padding: 12px 16px;
          border-radius: 6px;
          margin: 8px 0;
        }

        .action-item .priority {
          display: inline-block;
          background: #b8860b;
          color: white;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
        }

        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 2px solid #eee;
          text-align: center;
          color: #999;
          font-size: 11px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <h1>${data.title}</h1>
          <p class="subtitle">${data.subtitle || ''}</p>
        </div>
        <div class="logo">ITC MENTOR</div>
      </div>

      <h2>Resumo Executivo</h2>
      <div class="highlight-box">
        <p>${data.executiveSummary}</p>
      </div>

      <h2>Pontos Fortes</h2>
      ${(data.strengths || []).map(s => `<div class="strength-item">✓ ${s}</div>`).join('')}

      <h2>Pontos de Atenção</h2>
      ${(data.attentionPoints || []).map(a => `<div class="strength-item">⚠ ${a}</div>`).join('')}

      <h2>Plano de Ação</h2>
      ${(data.actionPlan || []).map(a => `
        <div class="action-item">
          <span class="priority">${a.priority}</span>
          <strong>${a.action}</strong>
          <br><small>Prazo: ${a.deadline} | Resultado: ${a.expectedResult}</small>
        </div>
      `).join('')}

      <h2>Conclusões</h2>
      <p>${data.conclusions}</p>

      <div class="footer">
        Relatório gerado por ITC MedMentoring &bull; Confidencial
      </div>
    </body>
    </html>
  `;
}
```

**Step 2: Commit**
```bash
git add server/reportGenerator.ts server/pdfGenerator.ts
git commit -m "feat: premium branded PDF report with ITC Mentor styling"
```

---

## Resumo de Tasks

| # | Fase | Descrição | Arquivos |
|---|------|-----------|----------|
| 1 | A | StepWizard component | Create: StepWizard.tsx |
| 2 | A | Refatorar questionnaire p/ StepWizard | Modify: MenteePillarQuestionnaire.tsx |
| 3 | A | Redesign portal cards premium | Modify: MenteePortal.tsx |
| 4 | A | Welcome screen onboarding | Modify: MenteePortal.tsx |
| 5 | A | Progress em ExpenseTool + IVMP | Modify: ExpenseTool.tsx, IvmpQuestionnaire.tsx |
| 6 | A | Mobile-first polish | Modify: index.css, PricingTableMentee.tsx |
| 7 | B | Answer summary tabular + copy | Create: MenteeAnswersSummary.tsx, Modify: MentorPillarView.tsx |
| 8 | B | Auto-análise IA ao abrir pilar | Modify: MentorPillarView.tsx, server/routers.ts |
| 9 | B | Checklist persistente | Modify: Pillar1-7WorkRoom.tsx |
| 10 | B | Dashboard badges de alerta | Modify: MentorDashboard.tsx |
| 11 | C | Excel completo com análise | Modify: excelGenerator.ts, excelRouter.ts |
| 12 | C | PDF branded premium | Modify: reportGenerator.ts, pdfGenerator.ts |
