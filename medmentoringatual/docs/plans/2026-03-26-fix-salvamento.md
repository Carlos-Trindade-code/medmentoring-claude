# Fix Salvamento de Respostas do Mentorado — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Garantir que respostas do mentorado nunca se percam e que o botão de salvar seja impossível de não ver.

**Architecture:** Adicionar auto-save com debounce ao MenteePillarQuestionnaire (o único componente sem auto-save), tornar o botão de salvar sticky no rodapé e grande, e adicionar indicador persistente de "Salvo às HH:MM" em todos os componentes.

**Tech Stack:** React 19, tRPC 11, Tailwind CSS, Shadcn/ui, Sonner (toasts)

---

### Task 1: Auto-save com debounce no MenteePillarQuestionnaire

**Files:**
- Modify: `client/src/components/MenteePillarQuestionnaire.tsx`

**Step 1: Adicionar refs e estado para debounce**

No topo do componente (após os estados existentes ~linha 50), adicionar:

```tsx
const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
const isInitialLoad = useRef(true);
```

**Step 2: Criar função triggerAutoSave**

Após a função `saveSection` (~linha 244), adicionar:

```tsx
const triggerAutoSave = useCallback(() => {
  if (debounceRef.current) clearTimeout(debounceRef.current);
  debounceRef.current = setTimeout(async () => {
    if (!currentSection) return;
    const sectionAnswers = answers[currentSection.id];
    if (!sectionAnswers || Object.keys(sectionAnswers).length === 0) return;

    try {
      await saveMutation.mutateAsync({
        pillarId,
        secao: currentSection.id,
        respostas: currentSection.questions.map((q) => ({
          id: q.id,
          pergunta: q.label,
          resposta: sectionAnswers[q.id] ?? null,
          naoSabe: false,
        })),
        status: completedSections.has(currentSection.id) ? "concluida" : "em_progresso",
      });
      setLastSaved(new Date());
      setIsDirty(false);
    } catch {
      // Silently fail on auto-save — user can still save manually
    }
  }, 2000);
}, [currentSection, answers, pillarId, completedSections, saveMutation]);
```

**Step 3: Disparar auto-save quando answers mudam**

Adicionar useEffect logo após triggerAutoSave:

```tsx
useEffect(() => {
  if (isInitialLoad.current) {
    isInitialLoad.current = false;
    return;
  }
  if (isDirty) {
    triggerAutoSave();
  }
  return () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  };
}, [answers, isDirty]);
```

**Step 4: Resetar isInitialLoad quando seção muda**

No handler de mudança de seção, adicionar:

```tsx
// Quando muda de seção, a próxima mudança em answers é carga inicial
isInitialLoad.current = true;
```

**Step 5: Verificar que funciona**

Run: `cd /Users/carlostrindade/medmentoring-claude/medmentoringatual && npx tsc --noEmit 2>&1 | head -20`
Expected: 0 erros TypeScript

**Step 6: Commit**

```bash
git add client/src/components/MenteePillarQuestionnaire.tsx
git commit -m "feat: add auto-save with 2s debounce to MenteePillarQuestionnaire"
```

---

### Task 2: Botão de salvar sticky no rodapé (grande e visível)

**Files:**
- Modify: `client/src/components/MenteePillarQuestionnaire.tsx`

**Step 1: Remover botão de salvar atual do header da seção**

Localizar o botão "Salvar" / "Atualizar" (~linhas 390-399) e removê-lo.

**Step 2: Adicionar barra sticky no rodapé do componente**

No final do JSX do componente (antes do `</div>` final), adicionar:

```tsx
{/* Barra fixa de salvamento */}
<div className="sticky bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-gray-200 px-4 py-3 flex items-center justify-between gap-3 z-10 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
  <div className="flex items-center gap-2 text-sm text-gray-500">
    {saving && (
      <>
        <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
        <span>Salvando...</span>
      </>
    )}
    {!saving && lastSaved && (
      <>
        <CheckCircle2 className="w-4 h-4 text-green-500" />
        <span>Salvo às {lastSaved.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
      </>
    )}
    {!saving && !lastSaved && isDirty && (
      <>
        <AlertCircle className="w-4 h-4 text-amber-500" />
        <span>Alterações não salvas</span>
      </>
    )}
  </div>
  <Button
    onClick={handleSaveProgress}
    disabled={saving || !isDirty}
    className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-2 h-10 text-sm shadow-md"
  >
    {saving ? (
      <Loader2 className="w-4 h-4 animate-spin mr-2" />
    ) : (
      <Save className="w-4 h-4 mr-2" />
    )}
    {completedSections.has(currentSection?.id ?? "") ? "Atualizar respostas" : "Salvar respostas"}
  </Button>
</div>
```

**Step 3: Importar ícones necessários**

Verificar que `Save` e `AlertCircle` estão importados de `lucide-react`.

**Step 4: Verificar TypeScript**

Run: `cd /Users/carlostrindade/medmentoring-claude/medmentoringatual && npx tsc --noEmit 2>&1 | head -20`
Expected: 0 erros

**Step 5: Commit**

```bash
git add client/src/components/MenteePillarQuestionnaire.tsx
git commit -m "feat: sticky save bar at bottom with prominent green button and status indicator"
```

---

### Task 3: Auto-save na PricingTableMentee

**Files:**
- Modify: `client/src/components/PricingTableMentee.tsx`

**Step 1: Adicionar refs para debounce**

```tsx
const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
const isInitialLoad = useRef(true);
```

**Step 2: Criar triggerAutoSave**

```tsx
const triggerAutoSave = useCallback(() => {
  if (debounceRef.current) clearTimeout(debounceRef.current);
  debounceRef.current = setTimeout(async () => {
    if (services.length === 0) return;
    try {
      await saveServicesMutation.mutateAsync({ servicos: services });
      setLastSaved(new Date());
      setOriginalServices(JSON.parse(JSON.stringify(services)));
    } catch {
      // Silent fail — manual save still available
    }
  }, 2000);
}, [services, saveServicesMutation]);
```

**Step 3: Disparar auto-save**

```tsx
useEffect(() => {
  if (isInitialLoad.current) {
    isInitialLoad.current = false;
    return;
  }
  triggerAutoSave();
  return () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  };
}, [services]);
```

**Step 4: Verificar TypeScript**

Run: `cd /Users/carlostrindade/medmentoring-claude/medmentoringatual && npx tsc --noEmit 2>&1 | head -20`

**Step 5: Commit**

```bash
git add client/src/components/PricingTableMentee.tsx
git commit -m "feat: add auto-save with 2s debounce to PricingTableMentee"
```

---

### Task 4: Indicador "Salvo às HH:MM" persistente no topo de cada componente

**Files:**
- Modify: `client/src/components/MenteePillarQuestionnaire.tsx`
- Modify: `client/src/components/ExpenseTool.tsx`
- Modify: `client/src/components/IvmpQuestionnaire.tsx`
- Modify: `client/src/components/PricingTableMentee.tsx`

**Step 1: Padronizar o indicador de salvamento**

Em cada componente, garantir que exista no topo (visível sem scroll) um indicador:

```tsx
{lastSaved && (
  <div className="flex items-center gap-1.5 text-xs text-green-600 bg-green-50 px-2.5 py-1 rounded-full border border-green-200">
    <CheckCircle2 className="w-3.5 h-3.5" />
    Salvo às {lastSaved.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
  </div>
)}
```

**Step 2: Verificar TypeScript**

Run: `cd /Users/carlostrindade/medmentoring-claude/medmentoringatual && npx tsc --noEmit 2>&1 | head -20`

**Step 3: Commit**

```bash
git add client/src/components/MenteePillarQuestionnaire.tsx client/src/components/ExpenseTool.tsx client/src/components/IvmpQuestionnaire.tsx client/src/components/PricingTableMentee.tsx
git commit -m "feat: consistent save indicator across all mentee tools"
```

---

### Task 5: Testar fluxo completo e verificar build

**Step 1: TypeScript check**

Run: `cd /Users/carlostrindade/medmentoring-claude/medmentoringatual && npx tsc --noEmit`
Expected: 0 erros

**Step 2: Build de produção**

Run: `cd /Users/carlostrindade/medmentoring-claude/medmentoringatual && pnpm build`
Expected: Build sem erros, chunks dentro do limite

**Step 3: Testes existentes**

Run: `cd /Users/carlostrindade/medmentoring-claude/medmentoringatual && pnpm test`
Expected: Todos os testes passam

**Step 4: Commit final se necessário**

```bash
git commit -m "chore: verify build and tests pass after save improvements"
```
