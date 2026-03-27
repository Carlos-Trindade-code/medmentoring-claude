# Design: PricingAnalysis + SimulationSummary para Mentor

**Data:** 2026-03-27
**Aprovado por:** Carlos (Opção A)

## Problema

Mentorado preenche tabela de serviços (Pilar 5B) e simulador de cenários (Pilar 3D), mas mentor não vê esses dados. Mentor só vê 2 métricas estáticas do questionário no Pilar 5 e nada do simulador.

## Solução: Dois componentes novos

### PricingAnalysis (Pilar 5)

Componente exclusivo do mentor, padrão idêntico ao ExpenseAnalysis/IvmpAnalysis.

Seções:
1. KPI Cards: faturamento total, margem média, honorário médico médio, ticket médio
2. Tabela de serviços: nome, preço, impostos, custos, lucro bruto, margem
3. Alerta se nenhum serviço cadastrado

Backend: nova query `mentor.getPricingAnalysis(menteeId)` que reutiliza `getSimulationData`.

### SimulationSummary (Pilar 3)

Resumo read-only do simulador, integrado à seção de ferramentas diagnósticas.

Seções:
1. KPI Cards: faturamento projetado, custo fixo total, lucro líquido, margem
2. Mix de atendimentos: serviços x quantidade/mês
3. Alerta se simulador não preenchido

Backend: reutiliza `mentor.getSimulationData` já existente.

### Integração no MentorPillarView

- `PricingAnalysis` substitui o bloco estático do Pilar 5 (linhas 1660-1676)
- `SimulationSummary` adicionado após IvmpAnalysis na seção diagnosticTools do Pilar 3

## Padrões a seguir

- Mesmo estilo visual: Card + shadcn/ui Table + KPI cards + Badge
- Props: `menteeId: number`
- Query pattern: `trpc.mentor.getXxx.useQuery({ menteeId })`
- Loading state com Loader2
- Empty state com alerta amarelo
