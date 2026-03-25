# ITCmentor — TODO

## Fase 1: Banco de Dados e Schema
- [x] Schema: tabela mentees (mentorados)
- [x] Schema: tabela pillar_releases (liberações granulares)
- [x] Schema: tabela checklist_items (status por item/mentorado)
- [x] Schema: tabela session_requests (solicitações de sessão)
- [x] Schema: tabela materials (materiais por módulo)
- [x] Schema: tabela mentor_notes (notas privadas)
- [x] Schema: tabela ivmp_scores (dados iVMP)
- [x] Schema: tabela financial_data (dados financeiros)
- [x] Schema: tabela onboarding_forms (formulários de prospecção)
- [x] Schema: tabela nps_responses (NPS por módulo)
- [x] Migração do banco de dados (pnpm db:push)

## Fase 2: Backend (tRPC)
- [x] Router: autenticação de mentorado por código único
- [x] Router: CRUD completo de mentorados
- [x] Router: controle de liberações granulares (7 pilares × 3 blocos)
- [x] Router: checklist por módulo (mentor controla, mentorado solicita)
- [x] Router: solicitações de sessão (criar, confirmar, recusar)
- [x] Router: materiais por módulo (upload S3 + CRUD)
- [x] Router: notas privadas do mentor
- [x] Router: dados iVMP por mentorado
- [x] Router: dados financeiros (despesas, precificação)
- [x] Router: formulário de onboarding
- [x] Router: NPS por módulo
- [x] Notificações automáticas (sessão solicitada, confirmada, recusada)

## Fase 3: Identidade Visual e Layout
- [x] Paleta de cores Navy/Gold/White (profissional médico)
- [x] Tipografia (Inter + Playfair Display para títulos)
- [x] CSS global com tokens de design OKLCH
- [x] Landing page com 6 dores, 7 pilares, jornada e CTA
- [x] Layout para painel do mentor
- [x] Layout para portal do mentorado

## Fase 4: Painel do Mentor
- [x] Dashboard: visão geral com stats (mentorados, sessões, horas)
- [x] Lista de mentorados com progresso e status
- [x] Cadastro de novo mentorado (perfil completo)
- [x] Detalhe do mentorado: abas (Progresso / Módulos / Sessões / Perfil)
- [x] Controle de liberações granulares por pilar
- [x] Gerenciamento de sessões (confirmar/recusar solicitações)
- [x] Notas privadas por módulo
- [x] Geração de PPTX integrada

## Fase 5: Portal do Mentorado
- [x] Login por código único (sem senha)
- [x] Home do mentorado: progresso geral e próximo passo
- [x] Módulos liberados com checklist e resumo
- [x] Materiais liberados por módulo
- [x] Solicitação de sessão (assunto + data + mensagem)
- [x] Histórico de solicitações com status
- [x] Checklist colaborativo (mentorado solicita conclusão)
- [x] NPS por módulo concluído

## Fase 6: Upload de Materiais e PPTX
- [x] Upload de arquivos (PDF, planilha, apresentação) via S3
- [x] Rota /api/upload com multer
- [x] Biblioteca de materiais por módulo
- [x] Geração de PPTX integrada (sem linha de comando)
- [x] Template PPTX: Capa + Visão Geral + Slides por Pilar

## Fase 7: Testes e Entrega
- [x] Testes vitest para auth.logout
- [x] TypeScript sem erros (0 erros)
- [x] Checkpoint final
- [x] Entrega ao usuário

## Melhoria: Fluxo de Primeiro Acesso do Mentor
- [x] Promoção automática do owner (OWNER_OPEN_ID) para admin no primeiro login
- [x] Página /mentor com redirecionamento inteligente (se não logado → login Manus, se não admin → mensagem clara)
- [x] Botão "Acessar como Mentor" na landing page com fluxo claro

## Renomeação e Importação Inteligente
- [x] Renomear plataforma de ITCmentor para MedMentoring (nome, logo, textos)
- [x] Backend: rota /api/import para upload de PDF/Excel com extração via LLM
- [x] Backend: procedure tRPC para salvar mentorado importado após confirmação
- [x] Frontend: página de importação com drag-and-drop de arquivos
- [x] Frontend: preview dos dados extraídos com campos editáveis
- [x] Frontend: confirmação campo a campo antes de salvar
- [x] Frontend: integrar botão "Importar Dados" no painel do mentor

## Guia Metodológico Ativo por Pilar

- [ ] Schema: tabelas pillar_diagnostics, ivmp_responses, financial_data, pricing_data
- [ ] Backend: routers para salvar/carregar dados de diagnóstico por pilar e mentorado
- [ ] Frontend: página PillarGuide com roteiro de investigação interativo
- [ ] Frontend: ferramenta iVMP interativa integrada ao banco (Pilar 3)
- [ ] Frontend: ferramenta de despesas fixas integrada ao banco (Pilar 3)
- [ ] Frontend: ferramenta de precificação integrada ao banco (Pilar 5)
- [ ] Frontend: catálogo de angústias + técnicas de PNL por pilar
- [ ] Frontend: roteiro da sessão de diagnóstico gratuita integrado
- [ ] Frontend: mapa de pilares prioritários baseado nas respostas do diagnóstico
- [ ] Frontend: onboarding guiado para o mentor (primeiros passos)

## Sprint 1 — Ferramentas Integradas

- [ ] Schema: tabela ivmp_assessments (respostas iVMP por mentorado)
- [ ] Schema: tabela financial_diagnostics (despesas fixas, mapa de sala)
- [ ] Schema: tabela pricing_data (precificação por serviço)
- [ ] Schema: tabela angustias_selecionadas (angústias identificadas por pilar)
- [ ] Backend: routers iVMP, diagnóstico financeiro, precificação, angústias
- [ ] Frontend: IvmpTool — questionário iVMP completo (7 categorias, 53 perguntas)
- [ ] Frontend: FinancialDiagnostic — despesas fixas + mapa de sala + custo/hora
- [ ] Frontend: PricingTool — calculadora com 3 cenários (Pilar 5)
- [ ] Frontend: SalesTool — treinador de objeções + scripts + gatilhos (Pilar 7)
- [ ] Frontend: SessionGuide — roteiro interativo de sessão de diagnóstico
- [ ] Frontend: QualificationQuiz — questionário de qualificação na landing page
- [ ] Frontend: Catálogo de angústias interativo por pilar
- [ ] Frontend: Dashboard de ROI com evolução do iVMP

## Bug: Despesas Fixas
- [x] Corrigir bug: valores das linhas se alteram conjuntamente (estado compartilhado por referência)
- [x] Expandir catálogo com custos esquecidos: transporte, deslocamento, combustível, pedágio, estágio entre cidades
- [x] Garantir que sugestões proativas apareçam em todas as categorias (não só na primeira)

## Melhorias: Despesas Fixas e Precificação

- [x] Tabela de despesas fixas: linhas dinâmicas (adicionar/remover categorias)
- [x] Tabela de despesas fixas: sugestões proativas de custos esquecidos por categoria
- [x] Tabela de despesas fixas: alertas quando categoria importante está zerada
- [x] Tabela de precificação: custo variável por procedimento (como na planilha original)
- [x] Tabela de precificação: perguntas guiadas ao mentor para chegar no custo variável
- [x] Tabela de precificação: cálculo de "dinheiro invisível" (onde está saindo sem ver)
- [x] Tabela de precificação: resumo diagnóstico com linguagem para o mentorado
- [x] Análise proativa com benchmarks reais (CFM, SEBRAE, AMB 2023-2024)
- [x] Plano de redução de custos com perguntas diagnósticas para a sessão
- [x] Custo de ociosidade calculado automaticamente

## Bug: Redirecionamento no Mobile (Mentor)
- [x] Corrigir: no celular, ao acessar como mentor a página fica redirecionando continuamente (causa: OAuth callback sempre redirecionava para "/" sem considerar a página de origem)

## Bug: Login do Mentorado
- [x] Corrigir: código de acesso não redireciona para o portal do mentorado após login (causa: cookie-parser ausente no Express)

## Sprint 2 — Salas de Trabalho por Pilar

### Pilar 1 — Identidade e Propósito
- [x] Frontend: exercício interativo do Ikigai (4 círculos com perguntas guiadas para profissionais de saúde)
- [x] Frontend: exercício guiado de Missão (perguntas que levam o mentorado a construir a própria frase)
- [x] Frontend: exercício guiado de Visão (horizonte de 5 anos com âncoras práticas)
- [x] Frontend: exercício guiado de Valores (seleção + priorização + significado pessoal)
- [x] Frontend: roteiro guiado do mentor (perguntas estratégicas + catálogo de angústias + técnicas PNL)
- [x] Frontend: mentorado vê apenas resultados finais (sem anotações do mentor)
- [x] Backend: salvar respostas do Ikigai, Missão, Visão e Valores por mentorado
- [x] Schema: tabela pillar1_exercises (respostas dos exercícios do Pilar 1 — usando pillar_diagnostics existente)

### Pilar 4 — Gestão e Processos
- [x] Frontend: mapeamento visual de processos (fluxograma interativo drag-and-drop)
- [x] Frontend: organograma da equipe (cargos, funções, responsabilidades)
- [x] Frontend: checklist de eficiência operacional (processos críticos da clínica)
- [x] Frontend: roteiro guiado do mentor para Pilar 4
- [x] Backend: salvar mapeamento de processos e organograma por mentorado
- [x] Schema: tabela pillar4_processes (processos mapeados — usando pillar_diagnostics existente)

### Pilar 6 — Marketing Digital
- [x] Frontend: ferramentas digitais recomendadas (Canva, CapCut, ChatGPT, etc.) com guia de uso
- [x] Frontend: gerador de prompt personalizado pela IA com base em todos os dados da jornada
- [x] Frontend: estrutura de conteúdo semanal adaptada para a especialidade do mentorado
- [x] Frontend: sugestão de Reels e carrosséis com conteúdo completo gerado por IA
- [x] Frontend: roteiro guiado do mentor para Pilar 6
- [x] Backend: procedure para gerar prompt personalizado via LLM com dados do mentorado
- [x] Schema: tabela pillar6_marketing (prompt gerado + plano de conteúdo — usando pillar_diagnostics existente)

## Sprint 3 — Questionário Autônomo por Fases + Pasta de Documentos

### Backend — Schema e Procedures
- [x] Schema: tabela `mentee_questionnaire` (fases, respostas JSON, status, timestamps)
- [x] Schema: tabela `mentee_documents` (documentos gerados, tipo, conteúdo, data)
- [x] Backend: procedure `questionnaire.savePhaseAnswers` — salva respostas de cada fase
- [x] Backend: procedure `questionnaire.getProgress` — retorna progresso do mentorado
- [x] Backend: procedure `questionnaire.generateSummary` — gera resumo via LLM para o mentor
- [x] Backend: procedure `documents.list` — lista todos os documentos do mentorado
- [x] Backend: procedure `documents.generateMarketingPrompt` — consolida todos os docs e gera prompt de marketing

### Portal do Mentorado — Questionário por Fases
- [x] Fase 1: Identidade e Propósito (quem sou, por que sou médico, valores)
- [x] Fase 2: Perfil Profissional (especialidade, diferencial, público ideal)
- [x] Fase 3: Situação Atual (clínica, equipe, faturamento, dores)
- [x] Fase 4: Sonhos e Objetivos (onde quer chegar, estilo de vida desejado)
- [x] Fase 5: Presença Digital (redes sociais, conteúdo atual, tom de voz)
- [x] Fase 6: Persona do Paciente Ideal (quem atende, quem quer atender)
- [x] UI: barra de progresso entre fases, salvamento automático, retomada de onde parou
- [x] UI: tela de conclusão com mensagem de parabéns e notificação ao mentor

### Painel do Mentor — Pasta de Documentos
- [x] Tela "Documentos do Mentorado" com todos os resumos gerados
- [x] Visualização do resumo completo de cada fase
- [x] Botão "Gerar Prompt de Marketing" que consolida tudo via IA
- [x] Export do prompt gerado para copiar/usar no ChatGPT

## Sprint 4 — Salas de Trabalho Pilares 2, 3, 5 e 7 (Momentos WOW)

### Pilar 2 — Posicionamento
- [x] Frontend: roteiro de 4 perguntas com técnicas de PNL
- [x] Frontend: Teste do Diferencial (IA avalia se é genérico ou único)
- [x] Frontend: Construtor de frase de posicionamento
- [x] Frontend: checklist de conclusão do pilar
- [x] Backend: procedure `pillar.evaluateDifferential` (LLM avalia diferencial)

### Pilar 3 — Diagnóstico do Negócio
- [x] Frontend: roteiro de 4 perguntas com PNL + frase de impacto
- [x] Frontend: iVMP integrado à sala de trabalho
- [x] Frontend: diagnóstico financeiro integrado (despesas + custo/hora)
- [x] Frontend: checklist de conclusão do pilar

### Pilar 5 — Precificação & Financeiro
- [x] Frontend: roteiro de 3 perguntas com PNL
- [x] Frontend: calculadora de "dinheiro invisível" (quanto perde por mês)
- [x] Frontend: tabela de precificação por procedimento
- [x] Frontend: checklist de conclusão do pilar

### Pilar 7 — Vendas & Comunicação
- [x] Frontend: roteiro de 3 perguntas com PNL
- [x] Frontend: simulador de objeções com resposta ética gerada por IA
- [x] Frontend: script de apresentação de tratamento personalizado
- [x] Frontend: checklist de conclusão do pilar
- [x] Backend: procedure `pillar.generateObjectionResponse` (LLM gera resposta a objeção)

### Integração Geral
- [x] Integrar todas as 7 salas de trabalho no MenteeDetail (grid completo)
- [x] Registrar rotas no App.tsx (pilar1 a pilar7)

## Sprint 5 — Reestruturação Completa da Plataforma

### Schema e Backend
- [x] Schema: tabela `pillar_answers` (respostas do mentorado por pilar, campo JSON por seção)
- [x] Schema: tabela `pillar_feedback` (feedback do mentor por pilar)
- [x] Schema: tabela `pillar_conclusion_releases` (controle de liberação de conclusão por pilar)
- [x] Backend: procedure `pillarAnswers.save` — salva respostas do mentorado por pilar
- [x] Backend: procedure `pillarAnswers.getByPillar` — retorna respostas de um pilar para o mentor
- [x] Backend: procedure `pillarFeedback.save` — salva feedback do mentor por pilar
- [x] Backend: procedure `pillarConclusion.release` — mentor libera conclusão do pilar
- [x] Backend: procedure `pillarConclusion.isReleased` — mentorado verifica se pode ver conclusão

### Portal do Mentorado — Questionários por Pilar
- [x] Pilar 1: perguntas guiadas sobre identidade, propósito, valores, missão, visão
- [x] Pilar 2: perguntas sobre especialidade, diferencial, público ideal, concorrência
- [x] Pilar 3: perguntas completas de custos (aluguel, água, luz, telefone, internet, salários, impostos, deslocamento, gasolina, pedágio, hora extra, cartão de crédito, etc.)
- [x] Pilar 3: perguntas sobre faturamento, número de consultas, procedimentos, sazonalidade
- [x] Pilar 4: perguntas sobre equipe, processos, gargalos, ferramentas usadas
- [x] Pilar 5: perguntas sobre precificação atual, como define preços, comparação com mercado
- [x] Pilar 6: perguntas sobre presença digital, redes sociais, frequência de posts, tom de voz
- [x] Pilar 7: perguntas sobre como apresenta tratamentos, objeções mais comuns, taxa de conversão
- [x] Todas as perguntas com opção "Não sei" e guia de orientação contextual
- [x] Linguagem simples, sem termos técnicos, com exemplos práticos
- [x] Salvamento automático a cada resposta
- [x] Conclusão bloqueada até mentor liberar

### Painel do Mentor — Reestruturação por Pilar
- [x] Cada pilar abre em página dedicada com: roteiro PNL + ferramentas + respostas do mentorado
- [x] Respostas do mentorado populam automaticamente as tabelas (iVMP, financeiro, precificação)
- [x] Campo de feedback do mentor por pilar
- [x] Botão "Liberar conclusão para o mentorado"
- [x] Indicador de progresso: quantas perguntas o mentorado respondeu
- [x] Notificação quando mentorado conclui um pilar

## Bug Fix: Redirecionamento OAuth no Mobile (iOS Safari)
- [x] Implementar salvamento do returnPath no localStorage (funciona no iOS Safari onde SameSite=None falha)
- [x] Criar AuthRedirectHandler no App.tsx que lê localStorage após login e redireciona para a página de origem
- [x] Manter compatibilidade com o mecanismo server-side (state do OAuth) como fallback
- [x] 21 testes passando, 0 erros TypeScript

## Bug Fix Definitivo: Loop OAuth no Safari Mobile
- [x] Não sobrescrever returnPath salvo se já existir valor mais específico que "/"
- [x] AuthRedirectHandler: redirecionar imediatamente se pathname é "/" e há returnPath salvo (sem esperar me)
- [x] Mover localStorage.setItem de useMemo para useEffect com try/catch em useAuth
- [x] Adicionar log de debug no callback OAuth para diagnóstico
- [x] Usar SameSite=Lax em vez de SameSite=None para melhor compatibilidade com Safari

## Feature: IA no Final do Pilar 1
- [x] Backend: procedure `pillar1.suggestSpecializations` — lê respostas do Pilar 1 + especialidade e sugere áreas de atuação via LLM
- [x] Backend: procedure `pillar1.generatePillarRoadmap` — analisa respostas de todos os pilares e gera roteiro estratégico de priorização
- [x] Frontend: seção "Análise de IA" no MentorPillarView do Pilar 1 com duas abas: Especializações Sugeridas e Roteiro Estratégico
- [x] Frontend: botão "Gerar Análise" que chama ambas as procedures e exibe resultados formatados
- [x] Frontend: resultados salvos no banco para não precisar regerar a cada acesso

## Feature: Diagnóstico de IA por Pilar (somente mentor)
- [x] Backend: procedure `pillarTools.generatePillarDiagnosis` com prompts específicos para cada um dos 7 pilares
- [x] Schema: campo `aiDiagnosis` (JSON) + `aiDiagnosisGeneratedAt` na tabela pillar_feedback
- [x] Frontend: seção "Diagnóstico de IA" em MentorPillarView (todos os pilares), acessível apenas pelo mentor
- [x] Frontend: resultados salvos no banco para não precisar regerar a cada acesso

## Feature: Portal do Mentorado — Questionários Visíveis e IA de Apoio
- [x] MenteePortal: todos os pilares acessíveis para responder sem depender de liberação
- [x] MenteePortal: perguntas em sanfona diretamente no portal (sem abrir nova página)
- [x] MenteePillarQuestionnaire: botão "Pedir ajuda da IA" por pergunta com dica contextual
- [x] Backend: procedure menteeProcedure `pillarAnswers.getAiHint` para dica por pergunta
- [x] MenteePortal: ao concluir todas as seções do pilar, notifica mentor e mostra estado "Aguardando feedback"
- [x] MenteePortal: quando mentor libera feedback, exibe retorno no mesmo card do pilar

## Feature: Ferramentas Interativas Liberadas para o Mentorado
- [x] Mapear todas as ferramentas bloqueadas por liberação (Ikigai, IVMP, etc.)
- [x] MenteePillarPage: remover verificação de release para exibir ferramentas interativas
- [x] MenteePillarQuestionnaire: remover bloqueio de seções por release do mentor
- [x] Ferramentas do Pilar 1 (Ikigai, Missão, Visão, Valores): adicionadas como seções do questionário do mentorado
- [x] Ferramentas dos demais pilares: acessíveis sem liberação (todos os pilares já liberados)
- [x] Mentor recebe resultados das ferramentas automaticamente ao concluir (via pillarAnswers.save)

## Feature: Alternância Mentor/Mentorado para o Owner
- [x] Backend: procedure `mentor.simulateMentee` — seta cookie de sessão do mentorado para o admin
- [x] Backend: procedure `mentor.stopSimulation` — limpa cookie de sessão do mentorado
- [x] Frontend: botão "Simular Portal do Mentorado" na sidebar do painel do mentor
- [x] Frontend: dialog de seleção de mentorado para simular
- [x] Frontend: botão "Sair da simulação" no header do portal do mentorado

## Bug: Instabilidade de Navegação
- [x] Corrigir redirect render-phase em MenteePortal (mover navigate para useEffect)
- [ ] Investigar loops de redirect e re-renders excessivos
- [ ] Corrigir queries instáveis (referências não memoizadas)

## Feature: Sincronização Respostas Mentorado → Sala de Trabalho do Mentor
- [x] Mapear correspondência entre chaves de pillar_answers e campos das Salas de Trabalho
- [x] Backend: procedure `pillarFeedback.getAnswers` já existe — usada para pré-preenchimento
- [x] Frontend: Pilar 1 — pré-preencher Ikigai, Missão, Visão, Valores com respostas do mentorado
- [x] Frontend: Pilar 2 — pré-preencher diferencial, público ideal e resultado esperado
- [x] Frontend: Pilar 3 — pré-preencher calculadora com aluguel, pessoal e outros custos
- [x] Frontend: Pilar 4 — pré-preencher gargalos com maior gargalo e dependência do médico
- [x] Frontend: Pilar 5 — pré-preencher calculadora com preço atual e consultas/mês
- [x] Frontend: Pilar 6 — pré-preencher presença digital, bloqueios e tom de voz
- [x] Frontend: Pilar 7 — pré-preencher objeções, tratamento e notas de sessão
- [x] Regra: não sobrescrever dados já salvos pelo mentor

## Feature: IA Geradora de Rascunho de Feedback por Pilar

- [x] Backend: procedure `pillarTools.generateFeedbackDraft` — lê todas as respostas do mentorado no pilar e gera rascunho estruturado de feedback via LLM
- [x] Frontend: botão "Gerar Rascunho com IA" no card Assistente de Feedback da seção de Feedback
- [x] Frontend: rascunho preenche automaticamente Pontos Fortes, Pontos de Melhoria, Feedback Geral e Plano de Ação
- [x] Frontend: indicador visual "Rascunho gerado pela IA — revise e edite livremente antes de liberar"
- [x] Frontend: botão "Regerar Rascunho" após primeira geração
- [x] Prompts específicos por pilar: cada pilar tem contexto diferente (identidade, financeiro, posicionamento, etc.)
- [x] Rascunho inclui: pontos fortes, pontos de melhoria, feedback geral e plano de ação numerado

## Bug Fix: Looping ao clicar em Voltar no Pilar 1
- [x] Identificar causa do looping de navegação ao clicar em Voltar no MentorPillarView
- [x] Corrigir o redirect loop após navegar de volta (AuthRedirectHandler simplificado)

## Feature: Fluxo Completo Todos os 7 Pilares (Perguntas + Conclusões + PDF)
- [x] Bug: corrigir looping ao clicar em Voltar (AuthRedirectHandler simplificado)

### Pilar 1 — Identidade e Propósito
- [x] Enriquecer perguntas: aprofundar Ikigai (momentos de flow, reconhecimento externo, impacto)
- [x] Enriquecer perguntas: aprofundar Missão (transformação concreta, diferencial, quem ajuda)
- [x] Enriquecer perguntas: aprofundar Visão (cenário 2030, reconhecimento desejado, legado)
- [x] Enriquecer perguntas: aprofundar Valores (situações de conflito, inegociáveis)
- [x] Mentor: seção Conclusões com IA — gerar Missão, Visão, Ikigai síntese e Valores
- [x] PDF Pilar 1: Missão, Visão, Ikigai (4 dimensões + síntese), Valores inegociáveis

### Pilar 2 — Posicionamento
- [x] Enriquecer perguntas: diferencial percebido pelo paciente, concorrência, nicho ideal
- [x] Enriquecer perguntas: proposta de valor única, o que o paciente conta para amigos
- [x] Mentor: seção Conclusões com IA — gerar Proposta de Valor e Posicionamento de Nicho
- [x] PDF Pilar 2: Proposta de valor, nicho definido, diferencial competitivo

### Pilar 3 — Financeiro
- [x] Enriquecer perguntas: custos fixos detalhados, faturamento atual, metas financeiras
- [x] Enriquecer perguntas: vazamentos financeiros percebidos, relação com dinheiro
- [x] Mentor: seção Conclusões com IA — diagnóstico financeiro, ponto de equilíbrio, metas
- [x] PDF Pilar 3: diagnóstico financeiro, indicadores-chave, plano de ação financeiro

### Pilar 4 — Processos e Gestão
- [x] Enriquecer perguntas: rotina semanal detalhada, gargalos operacionais, equipe
- [x] Enriquecer perguntas: dependência do médico, processos que poderiam ser delegados
- [x] Mentor: seção Conclusões com IA — mapa de processos, o que delegar, prioridades
- [x] PDF Pilar 4: mapa de processos, plano de delegação, próximos passos operacionais

### Pilar 5 — Precificação
- [x] Enriquecer perguntas: como define preços hoje, crenças sobre cobrar, comparação com mercado
- [x] Enriquecer perguntas: serviços mais valorizados, o que poderia cobrar mais
- [x] Mentor: seção Conclusões com IA — tabela de preços recomendada, estratégia de reajuste
- [x] PDF Pilar 5: diagnóstico de precificação, tabela recomendada, argumentos de valor

### Pilar 6 — Marketing e Comunicação
- [x] Enriquecer perguntas: canais atuais, frequência, o que funciona, o que trava
- [x] Enriquecer perguntas: tom de voz ideal, conteúdos que o paciente mais valoriza
- [x] Mentor: seção Conclusões com IA — estratégia de conteúdo, calendário editorial
- [x] PDF Pilar 6: estratégia de marketing, tom de voz, plano de conteúdo 30 dias

### Pilar 7 — Vendas e Conversão
- [x] Enriquecer perguntas: processo de agendamento, objeções comuns, taxa de retorno
- [x] Enriquecer perguntas: como apresenta o tratamento, o que trava a decisão do paciente
- [x] Mentor: seção Conclusões com IA — script de apresentação, tratamento de objeções
- [x] PDF Pilar 7: script de vendas éticas, tratamento de objeções, plano de follow-up

### Infraestrutura Comum
- [x] Backend: procedure `pillarTools.generatePillarConclusions` com prompts específicos por pilar
- [x] Schema: tabela `pillar_conclusions` para salvar conclusões editáveis por pilar
- [x] Frontend: seção "Conclusões" no MentorPillarView (todos os pilares) — somente mentor
- [x] Frontend: botão "Gerar Conclusões com IA" + campos editáveis por conclusão
- [x] Frontend: botão "Baixar PDF" que exporta conclusões em documento formatado
- [x] PDF: cabeçalho com nome do mentorado, data, pilar; rodapé com assinatura do mentor

## Reestruturação: Portal Mentorado + IA Contínua do Mentor

### Portal do Mentorado
- [ ] Remover seções de construção (missao_construtor, visao_construtor, ikigai_construtor) do questionário do mentorado
- [ ] Progresso detalhado: mostrar exatamente quais perguntas faltam (ex: "Carlos, faltam 3 perguntas no Pilar 1")
- [ ] Bloquear edição de respostas após módulo liberado pelo mentor (somente leitura)
- [ ] Bloquear acesso a perguntas não respondidas após liberação (não permite voltar)
- [ ] Indicador visual por seção: "Completo ✓" / "X perguntas pendentes"

### Painel do Mentor — Chat de IA Contínuo por Pilar
- [ ] Schema: tabela `mentor_ai_chat` (mensagens do chat por pilar e mentorado)
- [ ] Schema: tabela `mentor_suggestions` (sugestões geradas pela IA, com status de checklist)
- [ ] Backend: procedure `mentorAI.sendMessage` — envia mensagem ao chat de IA do pilar
- [ ] Backend: procedure `mentorAI.getHistory` — retorna histórico do chat por pilar
- [ ] Backend: procedure `mentorAI.saveSuggestion` — salva sugestão gerada pela IA no checklist
- [ ] Frontend: componente `MentorAIChat` — chat contínuo no painel do mentor por pilar
- [ ] Frontend: IA orientada pelas respostas do mentorado + conclusões já geradas
- [ ] Frontend: após gerar conclusões, IA sugere automaticamente próximos passos
- [ ] Frontend: checklist de sugestões acumuladas por pilar (mentor pode marcar como feito)
- [ ] Frontend: checklist consolidado de todos os pilares no painel principal do mentorado

## Sprint 6 — Fluxo Mentor-IA + Progresso Detalhado

- [x] Pilar 1: remover seções de construção de Missão/Visão do portal do mentorado (missao_construtor, visao_construtor)
- [x] Pilar 1: atualizar ikigai_proposta para ser pergunta reflexiva (não pede frase final)
- [x] Pilar 1: renomear seção "Missão e Visão" para "Propósito e Visão de Futuro"
- [x] Portal do mentorado: aba Progresso com detalhamento por pilar (quais seções faltam)
- [x] Portal do mentorado: indicador visual de seções em andamento vs pendentes vs concluídas
- [x] Portal do mentorado: percentual geral e por pilar com barra de progresso
- [x] Backend: procedure pillarAnswers.getAllAnswers para mentorado buscar todas as respostas
- [x] Schema: tabela mentor_ai_chat (histórico do chat de IA por pilar)
- [x] Schema: tabela mentor_suggestions (checklist de sugestões geradas pela IA)
- [x] Backend: mentorAI.getChatHistory, sendMessage, clearChat (chat contínuo por pilar)
- [x] Backend: mentorAI.getSuggestions, addSuggestion, toggleSuggestion, deleteSuggestion
- [x] Frontend: componente MentorAIChat com chat conversacional e checklist de sugestões
- [x] Frontend: MentorAIChat integrado ao MentorPillarView (entre Conclusões e Feedback)
- [x] Frontend: bloqueio de edição de respostas após seção concluída (não pode editar)
- [x] Frontend: botão "Salvar progresso" oculto em seções já concluídas
- [x] Frontend: mensagem de bloqueio visível ao mentorado ("Seção concluída — não é possível editar")

## Sprint 7 — Ferramentas nos Pilares + Planilha de Precificação Premium

- [ ] Corrigir PillarPartsView para exibir ExpenseTool, IvmpQuestionnaire e ScenarioSimulator no portal do mentorado
- [ ] Criar questionário de serviços no Pilar 5 (mentorado lista serviços: nome, tempo, preço, materiais, equipamentos)
- [ ] Criar PricingTable (Pilar 5): planilha baseada na planilha enviada, percentuais dinâmicos das respostas
- [ ] Percentuais configuráveis pelo mentor (imposto, cartão, MOD, comissão, rateio médico/clínica)
- [ ] Custo/hora da sala calculado automaticamente a partir das despesas fixas do Pilar 3
- [ ] Visualização premium da planilha para o mentorado após liberação (semáforo de margem, destaques)
- [ ] IA assistente na planilha de precificação (modo mentorado): responde perguntas sobre como atingir objetivos
- [ ] Simulações interativas na planilha (mentorado altera campos e vê impacto em tempo real)

## Bug: IA só sugere custos na primeira categoria do Diagnóstico Financeiro
- [ ] Corrigir ExpenseTool: IA deve analisar e sugerir em todas as categorias de despesas, não só na primeira
- [ ] IA proativa em todos os pilares: sugestões contextuais em cada seção do questionário do mentorado

## Sprint 7 — Planilha de Precificação Pilar 5 + IA Proativa

- [x] Corrigir bug: IA sugere custos em todas as categorias do Diagnóstico Financeiro (não só na primeira)
- [x] IA proativa em todos os pilares e seções — sugestões contextuais de dados esquecidos
- [x] PillarPartsView: ferramentas visíveis para o mentorado nos pilares corretos
- [x] Pilar 5 Parte B: PricingTableMentee com planilha completa baseada na planilha XLSX
- [x] Percentuais dinâmicos (imposto, cartão, MOD, bônus, rateio) configuráveis por serviço
- [x] Pré-preenchimento automático com dados das respostas do mentorado (Pilar 3 + Pilar 5)
- [x] Modo simulação após liberação do mentor — mentorado edita preços e qtd/mês em tempo real
- [x] IA assistente de precificação integrada à planilha (modo liberado)
- [x] Semáforo de margem (verde/amarelo/vermelho) na tabela
- [x] Novos endpoints: saveMyServices, getPricingTableData, getPricingAiAdvice
- [x] Cálculos: Imposto, Taxa Cartão, MOD, Mat/Med, Bônus, Taxa Equip, Lucro Bruto, Margem Bruta, Taxa Sala, Lucro Operacional, Margem Operacional, Honorário Médico

## Sprint 8 — Relatório Final Premium por Pilar (PDF)

- [x] Schema: tabela `pillar_reports` (relatório gerado por pilar/mentorado, status, HTML, PDF URL)
- [x] Backend: procedure `generatePillarReport` — consolida respostas + IA + mentor e gera HTML premium
- [x] Backend: procedure `savePillarReport` — salva edições do mentor no relatório
- [x] Backend: procedure `releasePillarReport` — libera relatório para o mentorado + salva PDF no S3
- [x] Backend: procedure `sendReportByEmail` — envia PDF por e-mail para o mentorado
- [x] Backend: procedure `getMyPillarReport` — mentorado busca seu relatório liberado
- [x] Frontend (mentor): tela "Relatório Final" por pilar com botão "Gerar com IA"
- [x] Frontend (mentor): pré-visualização do relatório com editor de seções (título, texto, plano de ação)
- [x] Frontend (mentor): botão "Liberar para Mentorado" + botão "Enviar por E-mail"
- [x] Frontend (mentorado): seção "Meus Relatórios" com download de PDF por pilar
- [x] Temas visuais por pilar: cores, ícones e imagens distintas para cada um dos 7 pilares
- [x] PDF premium: capa com foto/avatar do médico, nome, data, logo MedMentoring
- [x] PDF premium: seções com ícones, tabelas formatadas, plano de ação com timeline visual

## Banner de Alertas de Pendências (Portal do Mentorado)
- [x] Backend: procedure portal.getPendencies — consolida seções incompletas, ferramentas não preenchidas, perguntas em branco por pilar
- [x] Frontend: componente IncompleteBanner — exibe alertas no topo do portal com link direto para o item pendente
- [x] Frontend: banner distingue entre pilar liberado (urgente preencher) e pilar não liberado (informativo)
- [x] Frontend: dismiss temporário do banner (some por 24h ao clicar em "Ok, entendi")

## Bug Crítico: Salvamento de Respostas (Mentorado)
- [x] MenteePillarQuestionnaire: verificar se saveAnswer é chamado corretamente e adicionar botão "Salvar" visível por seção
- [x] MenteePillarQuestionnaire: implementar auto-save ao digitar (debounce 1.5s) para evitar perda de dados ao atualizar
- [x] ExpenseTool: verificar se saveExpenses persiste no banco e adicionar indicador visual de salvamento + botão "Salvar agora"
- [x] IvmpQuestionnaire: verificar se saveIvmp persiste no banco e adicionar indicador visual de salvamento + botão "Salvar progresso"
- [x] PricingTableMentee: verificar se saveServices persiste no banco e adicionar indicador visual de salvamento
- [x] Todos os componentes: exibir indicador "✓ Salvo às HH:MM" após cada salvamento bem-sucedido

## Bug: Simulador de Cenários apaga dados após uso (relato Luís Gustavo)
- [x] Investigar PricingTableMentee: causa raiz identificada — `quantidadeMes` não era enviada ao backend (campo ausente no schema do `saveMyServices`)
- [x] Corrigir backend: `saveMyServices` agora aceita `quantidadeMes` e persiste no `mixAtendimentos`
- [x] Verificado via teste de API: `mixAtendimentos` salvo e recuperado corretamente após reiniciar página

## Feature: Botão "Resetar simulação" na planilha de precificação
- [x] Adicionar estado `originalServices` que guarda os dados carregados do banco ao montar o componente
- [x] Implementar botão "Resetar simulação" com confirmação inline antes de reverter
- [x] Ao resetar: restaurar `services` para `originalServices` e exibir toast de confirmação
- [x] Botão só fica ativo quando há alterações em relação ao estado original (evitar clique acidental)
- [x] Indicador "Alterações não salvas" em âmbar quando há mudanças pendentes
- [x] Snapshot atualizado após cada salvamento bem-sucedido

## Feature: Reformulação do fluxo de pilares (todos os 7 pilares)
- [x] Portal do mentorado: partes A/B/C são visíveis como sequência de perguntas (não como itens clicáveis separados)
- [ ] Portal do mentorado: mostrar seção "Resultados do Pilar" (partes geradas pela IA) apenas quando o mentor liberar
- [x] Painel do mentor: gerador IA por parte (A/B/C) com botão "Gerar com IA" e editor de conteúdo (PillarPartAnalysis)
- [x] Painel do mentor: conteúdo gerado por parte salvo no banco (tabela pillar_part_content)
- [x] PillarReportGenerator: inclui conteúdo das partes como seções ricas no documento final
- [x] MentorPillarView: nova seção sanfona "Análises por Parte — IA" com PillarPartAnalysis para cada parte
- [x] Relatório final: cada parte vira uma seção do documento com título, conteúdo gerado pela IA e guia de uso
- [x] Pilar 3: ExpenseTool e iVMP como ferramentas de coleta, resultado integrado ao documento via pillarPartContent
- [x] Pilar 5: PricingTableMentee como ferramenta interativa, resultado integrado ao documento via pillarPartContent

## Feature: Documento Final Premium por Pilar (fluxo completo)
- [x] Componente PillarPartAnalysis: gerador IA por parte com textarea editável, botão "Salvar análise", status (rascunho/pronto)
- [x] Backend: pillarPartContent router com procedures generate, save, getAll
- [x] MentorPillarView: seção sanfona "Análises por Parte — IA" com PillarPartAnalysis para cada parte
- [x] PillarReportGenerator: reúne TODAS as análises salvas (status=ready) + conclusão final no PDF premium
- [x] reportGenerator.ts: seção "Resultados por Parte" inserida antes da conclusão do mentor
- [ ] Portal do mentorado: partes A/B/C visíveis apenas após liberação do PDF pelo mentor
- [x] PDF premium: cada parte vira uma seção com título, análise gerada pela IA (editada pelo mentor)
- [x] PDF premium: conclusão final fica no final do documento como síntese executiva

## Bug: Respostas do mentorado não aparecem para o mentor
- [x] MentorPillarView: adicionar verificação de autenticação (useAuth) e redirecionar para login se sessão expirou
- [x] MentorPillarView: mostrar mensagem clara de "Sessão expirada" em vez de "Mentorado não respondeu" quando 401
- [x] MentorPillarView: adicionar tratamento de erro na query getAnswers para distinguir 401 de "sem respostas"
- [ ] MenteeDetail: mesma correção de auth check
- [ ] Todas as páginas /mentor/*: garantir que usam DashboardLayout ou têm verificação de auth própria

## Bug: Deploy travando (bundle muito grande)
- [x] Configurar manualChunks no vite.config.ts para dividir bundle de 2,12 MB em chunks menores
- [x] Verificar que o build final não tem nenhum chunk acima de 500 KB (maior: 396 KB)
- [x] Criar checkpoint e publicar versão corrigida

## Bug: Auth check ausente em páginas do mentor
- [x] MenteeDetail: useAuth + redirect para /mentor se sessão expirou
- [x] NewMentee: useAuth + redirect para /mentor se sessão expirou
- [x] Pillar1-7WorkRoom: useAuth + redirect para /mentor se sessão expirou

## Bug: Importação duplicada de getPillarPartContent em routers.ts
- [x] Remover importação duplicada que causava erro TS2300
- [x] Confirmar 0 erros TypeScript reais (npx tsc --noEmit)

## Sprint 11 — Controle de liberação e UX de segurança

- [x] PillarPartsView: quando parte liberada (part_releases.released=true), exibe análise da IA em vez do questionário
- [x] Backend: pillarPartContent.getMyReleased — procedure para mentorado buscar partes com status=released
- [x] MenteePillarQuestionnaire: aviso beforeunload quando há respostas não salvas (isDirty)
- [x] ExpenseTool: já tem auto-save com debounce (não precisa de beforeunload)
- [ ] Portal do mentorado: banner de alerta para questionários pendentes
- [ ] Portal do mentorado: mostrar card "Aguardando liberação do mentor" quando resumoReleased = false (PDF ainda não liberado)

## Sprint 12 — Card de status no portal do mentorado
- [x] PillarPartsView: quando parte concluída mas não liberada, exibir card "Análise em preparação"
- [x] Card mostra: ícone de relógio âmbar, título, mensagem explicativa e barra de progresso animada
- [x] Badge "Aguardando mentor" no cabeçalho da parte (visível sem abrir)
- [x] Borda âmbar na parte aguardando (vs borda verde quando liberada)

## Sprint 13 — Banner de pendências e status de PDF
- [x] MenteePortal: IncompleteBanner já implementado com getPendencies (questionários em andamento, ferramentas incompletas, urgentes)
- [x] MenteePortal: card "Relatório em preparação" na aba Relatório quando PDF ainda não foi liberado
- [x] Card mostra: ícone de relógio âmbar, mensagem contextual (concluído vs em andamento), barra de progresso e badge de status
- [x] Backend: getPendencies procedure já verifica seções em andamento, ferramentas incompletas e partes urgentes

## Bug: Salvamento de análises de IA não funciona (PillarPartAnalysis)
- [x] Causa raiz: PillarPartAnalysis não estava integrado no MentorPillarView (seção não existia)
- [x] Causa raiz: schema Drizzle usava camelCase como nome de coluna (menteeId) mas banco tem snake_case (mentee_id)
- [x] Causa raiz: campos destaques/proximosPassos eram text no banco mas código não fazia JSON.stringify/parse
- [x] Correção: seção "Análises por Parte — IA" adicionada ao MentorPillarView
- [x] Correção: schema pillar_part_content corrigido para snake_case (mentee_id, pillar_id, etc.)
- [x] Correção: db.ts upsertPillarPartContent faz JSON.stringify; getPillarPartContent faz JSON.parse
- [x] Testado em browser: geração ✅, salvamento ✅, status "Pronto" ✅, contador "1/3 prontas" ✅

## Bug: Gerador de relatório final premium não funciona (PillarReportGenerator)
- [x] Causa raiz: schema pillarReports usava camelCase como nome de coluna mas banco tem snake_case
- [x] Correção: schema pillarReports corrigido para snake_case (mentee_id, pillar_id, etc.)
- [x] Correção: PillarReportGenerator usa safeJsonParse para strengthsJson/attentionJson/actionPlanJson
- [x] Testado em browser: geração de relatório premium ✅, edição de campos ✅

## Sprint 15 — Bugs e Relatório Premium Completo
- [x] Bug: mentorado bloqueado de acessar questionário quando análise está "em preparação" — corrigido: quando isReleased=true mas sem análise disponível, mostra questionário com banner informativo azul
- [x] Feature: relatório final premium inclui TODAS as informações: Diagnóstico IA, Análises por Parte, Conclusões do Mentor, Chat de Orientação, Checklist
- [x] Feature: descrição do gerador de relatório atualizada com dica de preencher dados antes de gerar

## Sprint 16 — Download PDF do Relatório Final Premium
- [x] Backend: endpoint /api/report/pdf/:menteeId/:pillarId que converte HTML do relatório em PDF real usando Puppeteer
- [x] Frontend: botão "Baixar PDF" no PillarReportGenerator (painel do mentor) com estado de loading
- [x] Frontend: botão "Baixar PDF" no MenteePortal (portal do mentorado) com estado de loading

## Sprint 17 — Ferramentas de Diagnóstico, Bloqueio de Questionário, Assinatura e Remoção de "IA"
- [x] Mover "Ferramentas de Diagnóstico" — esclarecido: as ferramentas (iVMP, Financeiro, Vendas, Precificação) já estão dentro dos pilares (partes B, C, D do Pilar 3 etc.) via PillarPartsView
- [x] Corrigir: mentorado não vê mais cadeado quando análise em preparação — adicionado allowReview=true no MenteePillarQuestionnaire
- [x] Remover o termo "IA" de todos os documentos/relatórios visíveis ao mentorado — substituído por "Orientação", "Assistente de Precificação", "Diagnóstico Personalizado"
- [x] Adicionar assinatura do Dr. Carlos Trindade Castro (CRM-MG 45568 | RQE 24768/39342) no rodapé de todos os relatórios PDF gerados

## Sprint 18 — Correção do salvamento de respostas do mentorado
- [x] Bug: erro ao salvar respostas — investigado: tabela pillar_answers OK (43 registros), erro era na simulação com menteeId=60001 (não afeta mentorado real)
- [x] UX: botão "Salvar respostas" agora é verde/outline com ícone de check, muito mais visível
- [x] Bug PDF: adicionado credentials: 'include' no fetch para enviar cookie de sessão corretamente
- [x] Fix schema: Drizzle atualizado para usar mediumtext para htmlContent (consistente com banco)

## Sprint 19 — Correção do erro de geração de PDF
- [x] Bug: erro persistente ao gerar PDF — corrigido: convertido de endpoint HTTP Express (com problema de autenticação) para procedure tRPC protectedProcedure que usa o mesmo sistema de auth que já funciona

## Sprint 20 — Correção do Chrome/Puppeteer em produção
- [x] Bug: Puppeteer não encontra Chrome em produção — corrigido: usa /usr/bin/chromium-browser do sistema (disponivel em todos os ambientes) com fallback para o Chrome do cache do Puppeteer

## Sprint 21 — PDF via frontend (sem Puppeteer)
- [x] Bug: substituir Puppeteer por geração de PDF no frontend via window.print() com iframe isolado

## Sprint 21 — Correções de bugs críticos
- [x] Bug: totalExpenses.toFixed is not a function — corrigido: todos os Object.values(expenses) agora usam Number(b) antes de somar
- [x] Bug: PDF via frontend — substituido Puppeteer por window.print() em iframe oculto (sem dependência de Chrome no servidor)

## Sprint 22 — Fix: Botão de salvar respostas do mentorado

- [x] Fix: botão "Salvar respostas" não aparecia para mentorado Luis — seções concluídas ficavam com isSectionLocked=true bloqueando edição
- [x] Fix: allowReview=true adicionado em todos os pontos de uso do MenteePillarQuestionnaire (PillarPartsView, MenteePillarPage)
- [x] Fix: botão de salvar agora sempre visível, mostra "Atualizar respostas" quando seção já foi concluída
- [x] Fix: status "concluida" preservado ao re-salvar (não regride para "em_progresso")
