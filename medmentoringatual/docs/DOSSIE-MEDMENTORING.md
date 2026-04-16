# DOSSIÊ COMPLETO — MedMentoring

**URL:** medmentoring.com.br  
**Repositório:** github.com/Carlos-Trindade-code/medmentoring-claude  
**Infraestrutura:** Railway (hosting) + Cloudflare (DNS) + MySQL + Google OAuth + Claude API (Anthropic)  
**Stack:** React 19 + Node.js + Express + tRPC + Drizzle ORM + Tailwind CSS

---

## O QUE É

Plataforma de mentoria digital exclusiva para médicos. Guia o profissional por 6 pilares estruturados para transformar sua prática clínica em um negócio sustentável e lucrativo. O mentor (Carlos Trindade) usa IA (Claude) para analisar dados e gerar relatórios personalizados. O mentorado nunca sabe que IA é utilizada — tudo parece feito pelo mentor.

---

## FLUXO PRINCIPAL

Mentorado preenche questionário → Mentor analisa com IA → Mentor edita/personaliza → Libera para mentorado → Próximo pilar

Cada pilar segue esse ciclo. Total: 6 ciclos = mentoria completa (~3,5 horas de preenchimento pelo mentorado).

---

## OS 6 PILARES

### Pilar 1 — Mapa Estratégico 🎯

**Objetivo:** Entender quem o médico é e aonde quer chegar. Criar uma bússola de decisões — o "oráculo" que ele consulta quando se sentir perdido.

**ID no banco:** 1

**Questionário (27 perguntas, 6 seções, ~30min):**
- Quem sou eu (5 perguntas): identidade, anos de medicina, motivação, conquistas, diferenciais
- Seus valores (3 perguntas): valores centrais e como se manifestam
- Propósito e visão de futuro (5 perguntas): pacientes-alvo, problemas resolvidos, visão 5 anos, legado
- Ikigai profissional (5 perguntas): o que ama, no que é bom, o que o mundo precisa, pelo que pode ser pago
- Valores inegociáveis (3 perguntas): catálogo de valores, conflitos de valores
- Reflexão de aprofundamento (6 perguntas): momentos de flow, reconhecimento, impacto, transformação do paciente

**Ferramentas:** Nenhuma (só questionário)

**Entregável:** Relatório de identidade profissional (PDF)

---

### Pilar 2 — Produto Profissional 💡

**Objetivo:** A partir do Pilar 1, definir como exercer a profissão alinhado com valores, identificar subprodutos (tutoria, aulas, mentoria de outros médicos), criar cardápio de serviços.

**ID no banco:** 2

**Questionário (20 perguntas, 4 seções, ~25min):**
- Especialidade e atuação (6 perguntas): especialidade, sub-especialidade, procedimentos principais, localização
- Paciente ideal (5 perguntas): perfil do paciente, dores, sonhos, poder aquisitivo
- Diferencial competitivo (4 perguntas): por que pacientes escolhem ele, diferenciais técnicos, comparação com concorrência
- Proposta de valor (5 perguntas): depoimentos, nicho dos sonhos, resultados garantidos, gaps de mercado

**Ferramentas:** Nenhuma

**Entregável:** Portfólio de serviços + proposta de valor

---

### Pilar 3 — Diagnóstico 📊

**Objetivo:** Revelar a realidade financeira: custos reais, custos ocultos, iVMP (quanto o médico pode cobrar baseado nos atributos atuais), precificação atual. Orienta sobre abrir consultório, tamanho, região.

**ID no banco:** 3

**Questionário (45 perguntas, 6 seções, ~45min):**
- Clínica e estrutura (7 perguntas): tipo de consultório, aluguel, equipamentos, equipe
- Custos fixos mensais (10 perguntas): folha, contabilidade, utilidades, materiais, software, marketing, seguros
- Custos de deslocamento (8 perguntas): combustível, pedágios, estacionamento, manutenção veicular
- Faturamento e produção (11 perguntas): agenda, volume, preços, formas de pagamento, regime tributário
- Capacidade e ociosidade (5 perguntas): capacidade máxima, taxa de ocupação, motivos de ociosidade
- Reflexão financeira (4 perguntas): mentalidade sobre dinheiro, vazamentos financeiros, metas

**Ferramentas:**

1. **ExpenseTool** — 60+ itens de despesas em 8 categorias:
   - Espaço e Infraestrutura (9 itens): aluguel, condomínio, IPTU, energia, água, internet, limpeza, segurança
   - Pessoal e Folha (9 itens): salários, pró-labore, encargos, VT/VR, provisão 13º/férias, provisão rescisões
   - Equipamentos e Tecnologia (5 itens): leasing, manutenção, depreciação, calibração, TI
   - Administrativo (7 itens): papelaria, software, contabilidade, consultoria jurídica
   - Marketing (5 itens): tráfego pago, criadores de conteúdo, fotógrafo, site, agência
   - Deslocamento (5 itens): combustível, pedágio, estacionamento, transporte entre unidades
   - Formação (4 itens): cursos, congressos, assinaturas científicas, livros
   - Seguros e Taxas (5 itens): seguro do consultório, seguro profissional, CRM, associações

2. **iVMP (Índice de Valor Médico Percebido)** — 53 perguntas, escala 0-10, 7 dimensões ponderadas:
   - Competência Profissional (15% peso, 8 perguntas)
   - Equipe e Atendimento (12% peso, 7 perguntas)
   - Infraestrutura e Ambiente (10% peso, 7 perguntas)
   - Marketing e Visibilidade (18% peso, 8 perguntas)
   - Experiência do Paciente (10% peso, 7 perguntas)
   - Jornada e Processos (15% peso, 8 perguntas)
   - Gestão e Financeiro (20% peso, 8 perguntas)

**O que o mentor vê (exclusivo):**
- ExpenseAnalysis: KPIs (custo fixo total, custo/hora, taxa de sala, custo ociosidade, % ocupação), tabela de despesas por categoria, gráfico de barras, 10+ alertas de custos ocultos com impacto estimado, botão "Revelar Impacto Total"
- IvmpAnalysis: score final 0-100 com gauge, radar chart 7 dimensões, top 3 fortes e gaps, tabela com edição inline de notas
- O mentorado NUNCA vê resultados de análise — só preenche

**Entregável:** Relatório financeiro completo + mapa iVMP (PDF)

---

### Pilar 4 — Estratégia 🗺️

**Objetivo:** A partir do diagnóstico, traçar precificação ideal, simulação de cenários, prioridades do iVMP, plano de ação. Orienta onde/quando abrir consultório.

**ID no banco:** 5 (mapeado do antigo Pilar 5)

**Questionário (15 perguntas, 3 seções, ~35min):**
- Equipe e gestão (5 perguntas): liderança, frequência de reuniões, documentação de processos
- Processos de atendimento (5 perguntas): canais de aquisição, sistemas de agendamento, taxas de cancelamento
- Reflexão operacional (5 perguntas): horas não-clínicas, tarefas administrativas, redesign ideal

**Ferramentas:**
- ScenarioSimulator (modo mentor): projeções financeiras, edição de parâmetros, comparação de cenários, metas
- PricingEditor: tabela de serviços editável com margens, impostos, taxa cartão, MOD, lucro por serviço

**Entregável:** Plano estratégico + tabela de preços ideal (PDF)

---

### Pilar 5 — Comunicação 📱

**Objetivo:** Colher recomendações dos pilares anteriores e criar um prompt de IA de comunicação assertiva, extremamente completo, para o médico divulgar seu produto/serviço alinhado com algoritmos das redes.

**ID no banco:** 6 (mapeado do antigo Pilar 6)

**Questionário (15 perguntas, 3 seções, ~25min):**
- Presença digital atual (7 perguntas): Instagram, seguidores, frequência, site, Google Meu Negócio, avaliações
- Comunicação e tom de voz (3 perguntas): estilo, desafios de marketing, conteúdo dos sonhos
- Reflexão de marketing (5 perguntas): conteúdos que funcionaram, aquisição via redes, histórias poderosas, tom emocional

**Ferramentas:** Gerador de prompt master de comunicação via chat IA

**Entregável:** Prompt master de comunicação + calendário editorial

---

### Pilar 6 — Vendas 🤝

**Objetivo:** Baseado no perfil do médico e técnicas de vendas, criar protocolo de consulta, métricas de tempo, produtos agregados. Ensinar a vender com foco no paciente. Usar manual do Pilar 1 + materiais de venda para montar aula em PPTX.

**ID no banco:** 7 (mapeado do antigo Pilar 7)

**Questionário (12 perguntas, 3 seções, ~30min):**
- Como apresenta tratamentos (3 perguntas): abordagem, explicação de valor, taxa de aceitação
- Objeções comuns (4 perguntas): catálogo de objeções, resposta a objeções de preço, fatores de perda
- Reflexão de conversão (5 perguntas): fluxo ideal de consulta, perfis de conversão, momento de decisão, follow-up

**Ferramentas:** Gerador de PPTX para aula de vendas

**Entregável:** Protocolo de consulta + playbook de vendas + aula PPTX

---

## NÚMEROS TOTAIS

| Métrica | Valor |
|---------|-------|
| Total de pilares | 6 |
| Total de perguntas (questionários) | 147 |
| Total de perguntas iVMP | 53 |
| Itens de despesas | 60+ |
| Categorias de custos | 8 |
| Dimensões iVMP | 7 |
| Tempo total estimado (mentorado) | ~3,5 horas |

---

## EXPERIÊNCIA DO MENTORADO

1. Recebe código de acesso do mentor (ex: BRUNO2657)
2. Acessa medmentoring.com.br/acesso → digita código
3. Portal mostra 6 pilares com progresso, tempo estimado, status
4. Card "Seu Mentor — Carlos Trindade" no topo
5. Card "Próximo Passo" guiando para o próximo pilar
6. Auto-save em todas as respostas
7. Pode deixar perguntas em branco e voltar depois
8. Quando mentor libera: card 🏆 "Pilar Concluído!" + mensagem pessoal do mentor
9. Na precificação: vê apenas nome do serviço, preço e materiais (campos avançados ficam só com mentor)
10. Resultados de iVMP e análises financeiras NUNCA são visíveis para o mentorado
11. Borda colorida nos cards: verde = completo, azul = em andamento, cinza = não iniciado

---

## EXPERIÊNCIA DO MENTOR

1. Login com Google OAuth em medmentoring.com.br/mentor
2. Dashboard com: mentorados ativos, sessões, horas, leads (com badge de novos)
3. Aba Leads: nome, email, telefone, dor principal + botões WhatsApp e Email com mensagem pré-preenchida
4. Cada mentorado → perfil com dados + 6 pilares
5. Cada pilar → 2 abas:
   - **Dados**: respostas do mentorado (todas editáveis) + ferramentas de análise (ExpenseAnalysis, IvmpAnalysis, ScenarioSimulator, PricingEditor conforme pilar)
   - **Mentor**: chat com IA Claude + relatório editável (conclusões, feedback, pontos fortes, melhorias, plano de ação) + botões Salvar/Liberar/PDF
6. Navegação entre pilares: ← Pilar 2 | Pilar 3 de 6 | Pilar 4 →
7. "Ver como mentorado" — link para preview do que o mentorado vê
8. Gerador de plano de ação com IA (botão "Gerar com IA" no campo de plano)
9. Custos ocultos com 10+ alertas automáticos e botão "Revelar Impacto Total"
10. Timestamp "Salvo às HH:MM" ao salvar feedback

---

## ALERTAS DE CUSTOS OCULTOS (PILAR 3 — MENTOR)

O sistema detecta automaticamente custos que o mentorado esqueceu:

1. Provisão 13º/férias ausente (calcula ~2,5/12 da folha)
2. Provisão rescisões ausente
3. Encargos trabalhistas (30-40% da folha)
4. Seguro profissional = 0 (~R$350/mês)
5. Contabilidade = 0 (~R$800/mês)
6. Software de gestão = 0 (~R$400/mês)
7. Educação continuada = 0 (~R$1.000/mês)
8. Custo de oportunidade do espaço próprio
9. Custo de ociosidade (horas ociosas × custo/hora)
10. Categorias zeradas com alerta contextual

Botão "Revelar Impacto Total": mostra soma de todos custos ocultos + percentual sobre custo declarado. Só aparece quando mentor clica — controle do momento WOW.

---

## MAPEAMENTO DE IDs (NOVO → BANCO)

O banco de dados usa IDs antigos (1-7). O frontend mapeia para os novos 6 pilares:

| Pilar novo | ID no banco | Nome antigo |
|-----------|------------|-------------|
| 1 Mapa Estratégico | 1 | Identidade |
| 2 Produto Profissional | 2 | Posicionamento |
| 3 Diagnóstico | 3 | Diagnóstico do Negócio |
| 4 Estratégia | 5 | Precificação |
| 5 Comunicação | 6 | Marketing |
| 6 Vendas | 7 | Vendas |

Pilar 4 antigo (Gestão) foi absorvido pelo Pilar 3 novo.

---

## REGRAS FUNDAMENTAIS

1. O mentorado NUNCA sabe que IA é utilizada. Nenhuma menção a "IA", "inteligência artificial" ou "gerado automaticamente" em qualquer tela, PDF ou documento visível ao mentorado.
2. Resultados de análise (scores, gráficos, custos ocultos) são exclusivos do mentor.
3. O mentor é quem revela insights como "momento WOW" durante as sessões.
4. Cada pilar segue sequência: preencher → analisar → personalizar → liberar.
5. Auto-save em tudo — nenhum dado se perde.
6. Todos os conteúdos gerados por IA têm botão de salvar.

---

## INFRAESTRUTURA TÉCNICA

| Componente | Tecnologia |
|-----------|------------|
| Hosting | Railway |
| CDN/DNS | Cloudflare |
| Banco de dados | MySQL (Railway) |
| Autenticação | Google OAuth 2.0 |
| IA/LLM | Claude Sonnet (Anthropic API) |
| Frontend | React 19 + Vite + Tailwind CSS |
| Backend | Node.js + Express + tRPC |
| ORM | Drizzle |
| Gráficos | Recharts |
| PDF | PDFKit |
| Apresentações | PptxGenJs |
| UI Components | Radix UI + Shadcn/ui |

---

## ARQUIVOS PRINCIPAIS DO CÓDIGO

- `shared/pillar-parts.ts` — definição dos 6 pilares e mapeamento NEW_TO_OLD_PILLAR
- `client/src/lib/pillars.ts` — cards dos pilares (títulos, cores, checklists)
- `client/src/lib/pillar-questions.ts` — PILLAR_SECTIONS com todas as perguntas (indexadas por ID antigo 1-7)
- `client/src/pages/MentorPillarView.tsx` — visão do mentor (2 abas: Dados + Mentor)
- `client/src/pages/MenteePortal.tsx` — portal do mentorado
- `client/src/pages/MenteePillarPage.tsx` — página do pilar para mentorado
- `client/src/pages/MenteeDetail.tsx` — perfil do mentorado (visão mentor)
- `client/src/pages/Home.tsx` — landing page
- `client/src/components/ExpenseAnalysis.tsx` — análise de despesas com custos ocultos
- `client/src/components/IvmpAnalysis.tsx` — análise iVMP com radar chart
- `client/src/components/PricingEditor.tsx` — editor de precificação
- `client/src/components/ScenarioSimulator.tsx` — simulador de cenários
- `client/src/components/MentorAIChat.tsx` — chat com Claude
- `client/src/components/PillarReportGenerator.tsx` — gerador de relatório PDF
- `client/src/components/MenteeAnswersSummary.tsx` — respostas editáveis do mentorado
- `server/_core/llm.ts` — integração com Claude API (Anthropic)
- `server/_core/sdk.ts` — Google OAuth
- `server/_core/oauth.ts` — fluxo de callback OAuth
- `server/_core/env.ts` — variáveis de ambiente
- `server/routers.ts` — todas as APIs tRPC
- `server/db.ts` — funções de banco de dados
- `server/exportRouter.ts` — exportação/importação de dados
- `drizzle/schema.ts` — schema do banco de dados
- `Dockerfile` — build para Railway
