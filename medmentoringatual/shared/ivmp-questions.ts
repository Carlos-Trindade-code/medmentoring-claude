export interface IvmpQuestion {
  id: string;
  texto: string;
  instrucao: string; // Help text explaining how to score 0-10
}

export interface IvmpDimension {
  id: string;
  label: string;
  descricao: string;
  peso: number; // Weight as decimal (0.15 = 15%)
  perguntas: IvmpQuestion[];
}

export const IVMP_DIMENSIONS: IvmpDimension[] = [
  {
    id: "profissional",
    label: "Competencia Profissional",
    descricao: "Como voce percebe sua capacidade tecnica, atualizacao e entrega clinica",
    peso: 0.15,
    perguntas: [
      { id: "prof_01", texto: "Mantenho-me atualizado com cursos, congressos e literatura cientifica na minha area", instrucao: "0 = nao faco nenhuma atualizacao / 10 = participo regularmente e aplico na pratica" },
      { id: "prof_02", texto: "Tenho uma subespecialidade ou area de foco bem definida", instrucao: "0 = atendo de tudo, sem foco / 10 = sou referencia em uma area especifica" },
      { id: "prof_03", texto: "Domino as tecnologias e tecnicas mais atuais da minha especialidade", instrucao: "0 = uso apenas tecnicas basicas / 10 = domino o que ha de mais moderno" },
      { id: "prof_04", texto: "Meus pacientes percebem claramente minha competencia tecnica durante a consulta", instrucao: "0 = nunca recebo esse feedback / 10 = pacientes frequentemente comentam" },
      { id: "prof_05", texto: "Consigo explicar diagnosticos e tratamentos de forma que o paciente entenda completamente", instrucao: "0 = pacientes saem confusos / 10 = saem com total clareza" },
      { id: "prof_06", texto: "Tenho protocolos de atendimento padronizados para os casos mais comuns", instrucao: "0 = cada consulta e diferente / 10 = tenho protocolos para tudo" },
      { id: "prof_07", texto: "Documento adequadamente todos os atendimentos e tratamentos", instrucao: "0 = documentacao precaria / 10 = prontuario completo e organizado" },
      { id: "prof_08", texto: "Busco feedback dos pacientes sobre a qualidade do meu atendimento", instrucao: "0 = nunca peco feedback / 10 = tenho sistema ativo de coleta de feedback" },
    ],
  },
  {
    id: "equipe",
    label: "Equipe e Atendimento",
    descricao: "Como sua equipe se comunica, acolhe e se relaciona com os pacientes",
    peso: 0.12,
    perguntas: [
      { id: "equi_01", texto: "Minha equipe recebe treinamento regular sobre atendimento ao paciente", instrucao: "0 = sem treinamento / 10 = treinamentos mensais com acompanhamento" },
      { id: "equi_02", texto: "A recepcao/secretaria e proativa, empatica e sabe lidar com diferentes perfis de pacientes", instrucao: "0 = atendimento mecanico / 10 = equipe acolhedora e resolutiva" },
      { id: "equi_03", texto: "Existe um script ou roteiro para o primeiro contato telefonico/WhatsApp com novos pacientes", instrucao: "0 = cada um responde como quer / 10 = roteiro padronizado e treinado" },
      { id: "equi_04", texto: "A equipe sabe explicar os servicos, valores e formas de pagamento com seguranca", instrucao: "0 = nao sabe informar / 10 = transmite confianca e clareza" },
      { id: "equi_05", texto: "O paciente recebe contato pos-consulta (lembrete de retorno, pesquisa de satisfacao)", instrucao: "0 = nenhum contato apos a consulta / 10 = follow-up sistematico" },
      { id: "equi_06", texto: "A equipe resolve problemas e reclamacoes sem precisar escalar para mim", instrucao: "0 = tudo depende de mim / 10 = equipe autonoma e resolutiva" },
      { id: "equi_07", texto: "Existe um processo claro de handoff entre recepcao, enfermagem e medico", instrucao: "0 = desorganizado / 10 = fluxo claro e sem falhas" },
    ],
  },
  {
    id: "infraestrutura",
    label: "Infraestrutura e Ambiente",
    descricao: "O espaco fisico, conforto, limpeza e tecnologia visiveis ao paciente",
    peso: 0.10,
    perguntas: [
      { id: "infra_01", texto: "O consultorio/clinica transmite profissionalismo e bem-estar ao paciente", instrucao: "0 = ambiente simples ou descuidado / 10 = ambiente premium e acolhedor" },
      { id: "infra_02", texto: "A sala de espera e confortavel, com entretenimento e informacao relevante", instrucao: "0 = desconfortavel e vazia / 10 = paciente se sente bem enquanto espera" },
      { id: "infra_03", texto: "O agendamento e facil (online, WhatsApp) e funciona sem atritos", instrucao: "0 = so por telefone em horario comercial / 10 = agendamento online 24h" },
      { id: "infra_04", texto: "A localizacao e acessivel (facil de chegar, estacionamento, transporte)", instrucao: "0 = dificil acesso / 10 = localizacao privilegiada e acessivel" },
      { id: "infra_05", texto: "Os equipamentos medicos sao modernos e visivelmente bem cuidados", instrucao: "0 = equipamentos antigos / 10 = tecnologia de ponta visivel ao paciente" },
      { id: "infra_06", texto: "A higiene e limpeza sao impecaveis em todos os ambientes", instrucao: "0 = limpeza basica / 10 = padrao hospitalar de excelencia" },
      { id: "infra_07", texto: "A identidade visual (logo, cores, uniformes) e profissional e consistente", instrucao: "0 = sem identidade visual / 10 = marca profissional em todos os pontos de contato" },
    ],
  },
  {
    id: "marketing",
    label: "Marketing e Visibilidade",
    descricao: "Presenca digital, reputacao online, conteudo e atracao de pacientes",
    peso: 0.18,
    perguntas: [
      { id: "mkt_01", texto: "Tenho um perfil profissional no Google Meu Negocio com avaliacoes positivas", instrucao: "0 = sem perfil / 10 = perfil otimizado com muitas avaliacoes 5 estrelas" },
      { id: "mkt_02", texto: "Publico conteudo educativo regularmente nas redes sociais (Instagram, YouTube, etc)", instrucao: "0 = nao publico nada / 10 = publico 3-5x por semana com estrategia" },
      { id: "mkt_03", texto: "Meu conteudo gera engajamento (comentarios, compartilhamentos, mensagens de pacientes)", instrucao: "0 = ninguem interage / 10 = engajamento alto e organico" },
      { id: "mkt_04", texto: "Tenho um site profissional que transmite credibilidade e facilita o contato", instrucao: "0 = sem site / 10 = site otimizado, bonito e funcional" },
      { id: "mkt_05", texto: "Pacientes novos me encontram facilmente pela internet (Google, Instagram, indicacao online)", instrucao: "0 = so recebo indicacoes boca a boca / 10 = fluxo constante de pacientes digitais" },
      { id: "mkt_06", texto: "Tenho depoimentos e provas sociais (avaliacoes, antes/depois, relatos) publicados", instrucao: "0 = nenhum depoimento / 10 = programa ativo de coleta e publicacao" },
      { id: "mkt_07", texto: "Invisto em trafego pago (Google Ads, Instagram Ads) de forma estrategica", instrucao: "0 = nao invisto / 10 = investimento mensal com ROI monitorado" },
      { id: "mkt_08", texto: "Tenho clareza sobre quem e meu paciente ideal e direciono toda comunicacao para ele", instrucao: "0 = comunico para todos / 10 = comunicacao focada no meu nicho" },
    ],
  },
  {
    id: "paciente",
    label: "Experiencia do Paciente",
    descricao: "Como o paciente se sente durante toda a jornada de cuidado",
    peso: 0.10,
    perguntas: [
      { id: "pac_01", texto: "O paciente se sente ouvido e acolhido durante a consulta", instrucao: "0 = consultas apressadas / 10 = paciente sente que foi genuinamente ouvido" },
      { id: "pac_02", texto: "O tempo de espera e respeitado (paciente nao espera mais de 15 min)", instrucao: "0 = atrasos frequentes / 10 = pontualidade consistente" },
      { id: "pac_03", texto: "O paciente recebe material educativo sobre seu tratamento (impresso ou digital)", instrucao: "0 = nao recebe nada / 10 = material personalizado e completo" },
      { id: "pac_04", texto: "Existe um ritual de encerramento da consulta (resumo, proximos passos, despedida calorosa)", instrucao: "0 = consulta termina abruptamente / 10 = encerramento estruturado e acolhedor" },
      { id: "pac_05", texto: "O paciente sabe exatamente quanto vai pagar e as opcoes de pagamento antes do tratamento", instrucao: "0 = surpresa na hora de pagar / 10 = total transparencia desde o inicio" },
      { id: "pac_06", texto: "Pacientes retornam e indicam outros pacientes espontaneamente", instrucao: "0 = raramente / 10 = maioria dos pacientes volta e indica" },
      { id: "pac_07", texto: "Existe um programa de fidelizacao ou beneficio para pacientes recorrentes", instrucao: "0 = nenhum / 10 = programa estruturado e valorizado pelos pacientes" },
    ],
  },
  {
    id: "jornada",
    label: "Jornada e Processos de Atendimento",
    descricao: "Clareza, organizacao e fluidez em cada etapa do contato com o paciente",
    peso: 0.15,
    perguntas: [
      { id: "jorn_01", texto: "Existe um fluxo claro desde o primeiro contato ate o pos-tratamento", instrucao: "0 = cada caso e diferente / 10 = jornada padronizada e documentada" },
      { id: "jorn_02", texto: "O paciente sabe quais serao os proximos passos apos cada consulta", instrucao: "0 = paciente sai sem saber o que fazer / 10 = proximos passos claros e documentados" },
      { id: "jorn_03", texto: "Tenho um script ou roteiro para apresentar o plano de tratamento", instrucao: "0 = improvisos / 10 = script treinado e natural" },
      { id: "jorn_04", texto: "Consigo apresentar o investimento (preco) com confianca e sem desconforto", instrucao: "0 = evito falar de preco / 10 = apresento com seguranca como parte natural" },
      { id: "jorn_05", texto: "Tenho um processo para lidar com objecoes dos pacientes (preco, tempo, medo)", instrucao: "0 = nao sei lidar / 10 = tenho respostas preparadas para cada objecao" },
      { id: "jorn_06", texto: "O retorno do paciente e agendado antes de ele sair do consultorio", instrucao: "0 = paciente vai embora sem retorno marcado / 10 = retorno sempre agendado na hora" },
      { id: "jorn_07", texto: "Tenho um sistema de lembretes automaticos (WhatsApp, SMS) para consultas e retornos", instrucao: "0 = sem lembretes / 10 = sistema automatico com confirmacao" },
      { id: "jorn_08", texto: "Monitoro indicadores de conversao (quantos pacientes iniciam tratamento vs quantos desistem)", instrucao: "0 = nao monitoro / 10 = dashboard com metricas atualizadas" },
    ],
  },
  {
    id: "gestao",
    label: "Gestao e Financeiro",
    descricao: "Controle financeiro, precificacao, indicadores e planejamento estrategico",
    peso: 0.20,
    perguntas: [
      { id: "gest_01", texto: "Sei exatamente qual e meu custo fixo mensal total", instrucao: "0 = nao faco ideia / 10 = tenho planilha atualizada mensalmente" },
      { id: "gest_02", texto: "Sei qual e o custo da minha hora clinica (custo fixo / horas trabalhadas)", instrucao: "0 = nunca calculei / 10 = sei de cor e atualizo regularmente" },
      { id: "gest_03", texto: "Minha precificacao e baseada em custos + margem desejada (nao apenas no que o mercado cobra)", instrucao: "0 = copio o preco dos outros / 10 = tenho engenharia de precos propria" },
      { id: "gest_04", texto: "Sei qual e minha margem de lucro real em cada servico que ofereco", instrucao: "0 = nao sei / 10 = calculo margem por procedimento" },
      { id: "gest_05", texto: "Tenho metas financeiras claras para cada mes e trimestre", instrucao: "0 = sem metas / 10 = metas definidas com plano de acao" },
      { id: "gest_06", texto: "Separo rigorosamente contas pessoais das contas da clinica", instrucao: "0 = tudo misturado / 10 = contas 100% separadas" },
      { id: "gest_07", texto: "Tenho um plano de negocios ou planejamento estrategico documentado", instrucao: "0 = nenhum / 10 = plano atualizado com revisoes periodicas" },
      { id: "gest_08", texto: "Acompanho indicadores-chave (faturamento, ticket medio, taxa de retorno, NPS) regularmente", instrucao: "0 = nao acompanho nada / 10 = dashboard com metricas semanais" },
    ],
  },
];

// Helper: total de perguntas
export const TOTAL_IVMP_QUESTIONS = IVMP_DIMENSIONS.reduce(
  (sum, dim) => sum + dim.perguntas.length, 0
);

// Helper: calcula score por dimensao e total
export function calculateIvmpScores(answers: Record<string, number>) {
  const dimensionScores: Record<string, { score: number; maxScore: number; percentage: number; answeredCount: number }> = {};
  let weightedTotal = 0;
  let totalWeight = 0;

  for (const dim of IVMP_DIMENSIONS) {
    let dimTotal = 0;
    let answeredCount = 0;
    for (const q of dim.perguntas) {
      if (answers[q.id] !== undefined) {
        dimTotal += answers[q.id];
        answeredCount++;
      }
    }
    const maxScore = dim.perguntas.length * 10;
    const percentage = maxScore > 0 ? (dimTotal / maxScore) * 100 : 0;
    dimensionScores[dim.id] = { score: dimTotal, maxScore, percentage, answeredCount };

    if (answeredCount > 0) {
      weightedTotal += percentage * dim.peso;
      totalWeight += dim.peso;
    }
  }

  const ivmpFinal = totalWeight > 0 ? weightedTotal / totalWeight : 0;
  return { dimensionScores, ivmpFinal };
}
