# Ferramentas de Diagnóstico no Portal do Mentorado — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ferramentas (Despesas, iVMP, Precificação) pré-preenchidas com dados do questionário no portal do mentorado + mentor vê os dados no seu painel.

**Architecture:** (1) Pré-preencher ExpenseTool com respostas do Pilar 3, (2) Garantir PricingTableMentee funcional no Pilar 5, (3) Mentor visualiza dados via rotas já existentes no MentorPillarView.

**Tech Stack:** React 19, tRPC 11, Tailwind CSS

---

### Task 1: ExpenseTool pré-preenchido com respostas do questionário

**Files:**
- Modify: `client/src/components/ExpenseTool.tsx`
- Modify: `client/src/components/PillarPartsView.tsx`

O ExpenseTool já carrega dados salvos via `portal.getMyExpenses`. Precisamos:
1. Passar as respostas do questionário como prop `initialFromQuestionnaire`
2. No PillarPartsView, buscar respostas do Pilar 3 e mapear para categorias do ExpenseTool
3. No ExpenseTool, ao montar: se não tem dados salvos, pré-preencher com dados do questionário

Mapeamento:
- p3_aluguel_valor → espaco.aluguel
- p3_custo_pessoal → pessoal.salarios
- p3_custo_energia → espaco.energia
- p3_custo_agua → espaco.agua
- p3_custo_internet → espaco.internet
- p3_custo_materiais → equipamentos.manutencao_aparelhos
- p3_custo_limpeza → espaco.limpeza
- p3_custo_software → administrativo.software_gestao
- p3_custo_marketing → marketing.trafego_pago
- p3_custo_seguros → seguros_taxas.seguro_profissional
- p3_custo_associacoes → seguros_taxas.crm
- p3_custo_gasolina → deslocamento.combustivel
- p3_custo_pedagio → deslocamento.pedagio
- p3_custo_estacionamento → deslocamento.estacionamento
- p3_custo_manutencao_carro → deslocamento.manutencao_veiculo
- p3_custo_contador → administrativo.contabilidade

**Commit:** "feat: pre-fill ExpenseTool with mentee questionnaire answers"

---

### Task 2: PricingTableMentee funcional no Pilar 5

**Files:**
- Modify: `client/src/components/PillarPartsView.tsx`

O PillarPartsView para Pilar 5 Part B mostra placeholder. Substituir por PricingTableMentee real.
Passar respostas do Pilar 5 (p5_procedimentos_lista, p3_taxa_cartao, p5_material_por_consulta) como dados iniciais.

**Commit:** "feat: render PricingTableMentee in Pilar 5 Part B with questionnaire pre-fill"

---

### Task 3: Mentor vê dados das ferramentas no MentorPillarView

**Files:**
- Modify: `client/src/pages/MentorPillarView.tsx`

As rotas `mentor.getExpenseAnalysis` e `mentor.getIvmpAnalysis` já existem no backend mas não são chamadas no frontend. Adicionar:

1. Para Pilar 3: chamar `getExpenseAnalysis` e `getIvmpAnalysis` e exibir resumo dos dados
2. Para Pilar 5: chamar dados de precificação e exibir resumo

Exibir como cards de resumo na seção do pilar (não precisa ser a ferramenta completa — apenas os dados tabulados).

**Commit:** "feat: show mentee diagnostic tool data in MentorPillarView"

---

### Task 4: Verificar build e testes

1. `npx tsc --noEmit`
2. `pnpm build`
3. `pnpm test`
