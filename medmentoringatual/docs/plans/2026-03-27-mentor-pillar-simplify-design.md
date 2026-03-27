# Design: Simplificar MentorPillarView — 10 seções → 4 seções

**Data:** 2026-03-27
**Aprovado por:** Carlos

## Problema

MentorPillarView tem 10 seções accordion, confuso e redundante. Mentor usa fluxo: Ver respostas → IA → Editar conclusões → Liberar PDF.

## Solução: 4 seções que seguem o fluxo natural

### Seção 1: Roteiro de Condução
- Mantém igual (perguntas PNL, técnicas, checklist)

### Seção 2: Dados do Mentorado
Funde: Respostas + Ferramentas Interativas + Dados Financeiros/iVMP/Precificação.

Sub-abas internas:
- **Respostas** — MenteeAnswersSummary (respostas do questionário)
- **Ferramentas** — PillarTools (calculadoras) + ExpenseAnalysis + IvmpAnalysis + SimulationSummary + PricingAnalysis (conforme pilar)

Tudo que o mentorado preencheu numa seção só.

### Seção 3: Assistente IA
Funde: Chat IA + Diagnóstico de IA + Análises por Parte + Análise de IA (P1).

Sub-abas internas:
- **Chat** — MentorAIChat (conversa contínua)
- **Diagnóstico** — Diagnóstico geral do pilar (gerar/regerar)
- **Análises** — PillarPartAnalysis (análise por parte A/B/C)
- **Estratégia** (só P1) — Especializações + Roteiro estratégico

### Seção 4: Conclusões e Entrega
Funde: Conclusões do Pilar + Feedback e Liberação.

Fluxo linear:
1. Gerar conclusões com IA (ou escrever manualmente)
2. Editar campos (diagnóstico, pontos fortes, melhorias, plano de ação)
3. Feedback textual (campo livre)
4. Botões: Salvar Rascunho | Liberar para Mentorado | Baixar PDF

## Regras
- Sem menção a "IA" nos títulos visíveis (usar "Assistente" ou "Análise")
- Abas internas em cada seção — não accordions aninhados
- Manter todas as funcionalidades — apenas reorganizar
