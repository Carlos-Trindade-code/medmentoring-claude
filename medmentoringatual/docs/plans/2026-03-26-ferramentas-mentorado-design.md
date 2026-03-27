# Design: Ferramentas de Diagnóstico no Portal do Mentorado

**Data:** 2026-03-26
**Aprovado por:** Carlos

## Contexto

O mentorado responde questionários com perguntas guiadas (custos, faturamento, serviços), mas os dados ficam em campos de texto isolados. As ferramentas de diagnóstico (Despesas, iVMP, Precificação) existem mas não aparecem no portal do mentorado. O mentor não vê os dados das ferramentas na sua visão.

## Regra fundamental

O mentorado NUNCA vê totais, análises, scores ou resultados. Apenas campos de entrada. O mentor vê tudo.

## Design

### Fluxo: Perguntas guiam → Ferramenta recebe

1. Mentorado responde as perguntas do pilar normalmente (orientação/checklist)
2. Abaixo do questionário, a ferramenta aparece pré-preenchida com os valores das respostas
3. Mentorado pode ajustar valores e adicionar itens que esqueceu
4. Ferramenta salva automaticamente (auto-save já existe)
5. Mentor vê os dados completos no MentorPillarView

### Pilar 3 — Financeiro

**Questionário (já existe):** perguntas sobre aluguel, pessoal, energia, água, internet, gasolina, etc.

**Ferramenta 1 — Tabela de Despesas:** aparece após o questionário, pré-preenchida com valores das respostas. Mentorado vê apenas campos de entrada (sem totais).

**Ferramenta 2 — iVMP:** aparece após despesas. Perguntas de maturidade por dimensão. Mentorado vê apenas as escalas (sem score final).

### Pilar 5 — Precificação

**Questionário (já existe):** perguntas sobre serviços, preços, tempo por procedimento.

**Ferramenta — Planilha de Precificação:** aparece após o questionário, pré-preenchida com serviços e preços das respostas. Mentorado vê campos editáveis (sem margens/análise até liberação).

### Mentor — Visualização

O MentorPillarView deve carregar e exibir os dados das ferramentas do mentorado:
- Pilar 3: chamar `mentor.getExpenseAnalysis` e `mentor.getIvmpAnalysis` (rotas já existem, não são usadas no frontend)
- Pilar 5: chamar dados de precificação do mentorado

### Mapeamento perguntas → campos da ferramenta

**Pilar 3 (Despesas):**
- p3_aluguel_valor → categoria "Aluguel"
- p3_custo_pessoal → categoria "Pessoal"
- p3_custo_energia → categoria "Energia"
- p3_custo_agua → categoria "Água"
- p3_custo_internet → categoria "Internet/Telefone"
- p3_custo_gasolina → categoria "Combustível/Deslocamento"
- p3_custo_materiais → categoria "Materiais"
- (outros campos conforme existam no questionário)

**Pilar 5 (Precificação):**
- Respostas da seção "precificacao_atual" → serviços na planilha
