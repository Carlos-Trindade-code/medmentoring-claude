/**
 * Seed data for Dr. Luis Gustavo — products, consultation protocols, exam suggestions
 * Run once via GET /api/seed/luis (authenticated as admin)
 */
import { Router } from "express";
import { sdk } from "./_core/sdk";
import { saveSimulationData, getSimulationData, upsertPillarFeedback, getPillarFeedback } from "./db";

export const seedLuisRouter = Router();

const LUIS_MENTEE_ID = 60001;

// Products for Dr. Luis
const PRODUCTS = [
  {
    id: "prod-avaliacao-integral",
    nome: "Consulta de Avaliacao Integral",
    duracaoHoras: 1,
    precoVenda: 1200,
    impostoPercent: 9,
    taxaCartaoPercent: 5,
    mod: 0,
    matMed: 0,
    bonusPercent: 0,
    taxaEquipamento: 0,
    paraQuem: "Paciente novo com doenca renal cronica ou suspeita, hipertensos, diabeticos com comprometimento renal",
    oQueInclui: "Anamnese detalhada (60min), avaliacao completa de exames, diagnostico de situacao, plano de saude por escrito impresso, orientacoes sobre sinais de alerta, contato para duvidas",
    formato: "presencial",
    logicaClinica: "Primeira consulta precisa ser completa — o paciente precisa ser ouvido e compreendido antes de qualquer conduta. Vai alem da queixa, trata o entorno.",
    alinhamentoP1: "Causa raiz acima do sintoma. Presenca real. O paciente sai seguro.",
  },
  {
    id: "prod-acompanhamento-trimestral",
    nome: "Acompanhamento Longitudinal (Trimestral)",
    duracaoHoras: 0.67,
    precoVenda: 2400,
    impostoPercent: 9,
    taxaCartaoPercent: 5,
    mod: 0,
    matMed: 0,
    bonusPercent: 0,
    taxaEquipamento: 0,
    frequencia: "trimestral",
    paraQuem: "Renal cronico estagios 2-4, pacientes com multiplas comorbidades que precisam de seguimento continuo",
    oQueInclui: "3 retornos agendados (40min cada) + acesso WhatsApp para duvidas pontuais entre consultas. R$ 800/consulta.",
    formato: "recorrente",
    logicaClinica: "DRC precisa de acompanhamento continuo. Sem recorrencia, o paciente so volta quando piora.",
    alinhamentoP1: "Longitudinalidade acima de volume. Mudar o desfecho exige presenca continua.",
  },
  {
    id: "prod-acompanhamento-semestral",
    nome: "Acompanhamento Longitudinal (Semestral)",
    duracaoHoras: 0.67,
    precoVenda: 4500,
    impostoPercent: 9,
    taxaCartaoPercent: 5,
    mod: 0,
    matMed: 0,
    bonusPercent: 0,
    taxaEquipamento: 0,
    frequencia: "semestral",
    paraQuem: "Renal cronico estagios 2-4, pacientes que se beneficiam de acompanhamento longo",
    oQueInclui: "6 retornos agendados (40min cada) + acesso WhatsApp. R$ 750/consulta — desconto de fidelidade.",
    formato: "recorrente",
    logicaClinica: "Pacientes complexos precisam de presenca constante. Modelo semestral garante continuidade.",
    alinhamentoP1: "Porto seguro. O paciente sabe que tem acompanhamento garantido.",
  },
  {
    id: "prod-checkup-renal",
    nome: "Check-up Renal Anual",
    duracaoHoras: 1.5,
    precoVenda: 1800,
    impostoPercent: 9,
    taxaCartaoPercent: 5,
    mod: 0,
    matMed: 0,
    bonusPercent: 0,
    taxaEquipamento: 0,
    paraQuem: "Pacientes estaveis (DRC 1-2), hipertensos, diabeticos sem doenca renal diagnosticada, historico familiar de DRC",
    oQueInclui: "Solicitacao de painel completo (creatinina, TFG, potassio, hemoglobina, albumina, fosforo, PTH, proteinuria) + consulta 60min + retorno 30min para resultados",
    formato: "presencial",
    logicaClinica: "Deteccao precoce muda prognostico. Estagio 2 tratado e diferente de estagio 4 descoberto tarde.",
    alinhamentoP1: "Resultado clinico acima de resultado financeiro. Prevencao e a melhor conduta.",
  },
  {
    id: "prod-acesso-consultas",
    nome: "Acesso Entre Consultas",
    duracaoHoras: 0,
    precoVenda: 0,
    impostoPercent: 0,
    taxaCartaoPercent: 0,
    mod: 0,
    matMed: 0,
    bonusPercent: 0,
    taxaEquipamento: 0,
    paraQuem: "Pacientes em acompanhamento longitudinal ativo",
    oQueInclui: "Canal WhatsApp para duvidas pontuais (ate 2 mensagens). Questoes complexas = agendar retorno. Incluso no Acompanhamento Longitudinal.",
    formato: "online",
    logicaClinica: "Paciente precisa se sentir seguro entre consultas. Acesso rapido reduz idas desnecessarias a emergencia.",
    alinhamentoP1: "Porto seguro. Presenca real — nao de conveniencia.",
  },
];

// Consultation protocols
const PROTOCOL_INITIAL = [
  { id: 1, nome: "Acolhimento", objetivo: "Criar conexao e confianca nos primeiros minutos", duracaoMinutos: 5, frasesChave: "Me conta o que te trouxe aqui.\nFique a vontade, estou aqui para ouvir.\nAntes de qualquer coisa, quero te conhecer.", oQueNaoFazer: "Nao pular direto para o exame. Nao olhar o computador enquanto o paciente fala. Nao apressar." },
  { id: 2, nome: "Escuta Ativa", objetivo: "Ouvir a queixa completa sem interromper", duracaoMinutos: 10, frasesChave: "Entendi que...\nAlgo mais que voce gostaria de me contar?\nDesde quando isso te incomoda?", oQueNaoFazer: "Nao interromper. Nao comecar a diagnosticar antes de ouvir tudo. Nao presumir." },
  { id: 3, nome: "Avaliacao Narrada", objetivo: "Narrar o raciocinio em voz alta durante o exame fisico e revisao de exames", duracaoMinutos: 20, frasesChave: "Estou olhando seu rim porque...\nVou avaliar sua pressao para entender como esta o controle.\nEsse exame mostra que...\nIsso aqui e importante porque...", oQueNaoFazer: "Nao ficar em silencio durante o exame. O paciente precisa entender o que voce esta fazendo e por que." },
  { id: 4, nome: "Diagnostico de Situacao", objetivo: "Apresentar a conclusao de forma acessivel, sem jargao", duracaoMinutos: 10, frasesChave: "Seu rim esta nesta faixa, que significa...\nIsso quer dizer que precisamos...\nA boa noticia e que...\nO que mais me preocupa agora e...", oQueNaoFazer: "Nao usar jargao medico sem explicar. Nao minimizar nem dramatizar. Desenhar se necessario." },
  { id: 5, nome: "Plano de Saude", objetivo: "Apresentar e entregar o plano de cuidado por escrito, impresso", duracaoMinutos: 10, frasesChave: "Aqui esta o seu plano por escrito.\nVamos revisar juntos cada ponto.\nSe tiver duvida em casa, esta tudo aqui.\nEsses sao os sinais de alerta para voce prestar atencao.", oQueNaoFazer: "Nao dar o plano apenas verbalmente. Sempre entregar impresso. Nao sair sem que o paciente entenda cada item." },
  { id: 6, nome: "Decisao sobre Seguimento", objetivo: "Recomendar acompanhamento como conduta clinica, nao como venda", duracaoMinutos: 5, frasesChave: "Pela sua condicao, o ideal e nos vermos a cada 3 meses.\nIsso e uma conduta clinica — seu rim precisa de acompanhamento.\nVou te explicar como funciona o acompanhamento.\nVoce vai ter acesso direto a mim para duvidas entre as consultas.", oQueNaoFazer: "Nao apresentar como produto ou pacote comercial. E conduta clinica. Nao pressionar." },
];

const PROTOCOL_RETORNO = [
  { id: 1, nome: "Reconexao", objetivo: "Retomar vinculo com o paciente, perguntar como esta", duracaoMinutos: 3, frasesChave: "Como voce esta desde a ultima vez?\nConseguiu seguir o plano?\nAlguma coisa te preocupou nesse periodo?", oQueNaoFazer: "Nao pular direto para os exames. Reconectar antes. Mostrar que lembra do paciente." },
  { id: 2, nome: "Revisao de Resultados", objetivo: "Comparar exames anteriores vs atuais, mostrar evolucao visual", duracaoMinutos: 10, frasesChave: "Olha como seu exame evoluiu desde a ultima vez...\nAqui melhorou, o que mostra que o tratamento esta funcionando.\nAqui precisamos ajustar.\nJa estamos juntos ha X meses e a evolucao e...", oQueNaoFazer: "Nao mostrar numeros sem explicar o significado. Usar comparativo visual (antes vs agora). Nao ser tecnico demais." },
  { id: 3, nome: "Avaliacao Atual", objetivo: "Exame direcionado nos pontos que mudaram + novos sintomas", duracaoMinutos: 12, frasesChave: "Tem algo novo que gostaria de me contar?\nVou verificar especificamente...\nIsso mudou desde a ultima vez.", oQueNaoFazer: "Nao repetir exame completo se nao necessario. Foco no que mudou. Otimizar o tempo." },
  { id: 4, nome: "Atualizacao do Plano", objetivo: "Ajustar medicacoes, metas e entregar novo plano impresso atualizado", duracaoMinutos: 10, frasesChave: "Vamos ajustar seu plano com base nos resultados de hoje.\nAqui esta a versao atualizada.\nAs mudancas foram...", oQueNaoFazer: "Nao manter plano anterior sem revisar. Sempre atualizar e reimprimir. O paciente leva o novo plano." },
  { id: 5, nome: "Proximos Passos", objetivo: "Definir seguimento, proximo retorno e reforcar longitudinalidade", duracaoMinutos: 5, frasesChave: "Nos proximos 3 meses, quero que voce...\nNosso proximo encontro sera em...\nSe tiver qualquer duvida, pode me chamar.\nJa estamos juntos ha Y meses e voce esta no caminho certo.", oQueNaoFazer: "Nao encerrar sem definir proximo retorno. Reforcar que o acompanhamento e continuo e faz parte da conduta." },
];

// Suggestions for value-added devices
const SUGGESTIONS = {
  sugestoes_valor_agregado: [
    {
      nome: "Painel Visual de Exames (Semaforo)",
      descricao: "Template visual onde o paciente ve seus exames em formato de semaforo (verde/amarelo/vermelho). Comparativo entre consultas.",
      custo: "R$ 0 — ja implementado no sistema",
      impacto: "Alto — entregavel concreto, paciente entende sem jargao",
      prioridade: 1,
      status: "Pronto para uso",
    },
    {
      nome: "Bioimpedancia (InBody ou similar)",
      descricao: "Mede composicao corporal (massa magra, gordura, agua corporal). Para nefro: mostra edema oculto, sarcopenia, retencao hidrica objetivamente.",
      custo: "R$ 8.000-25.000 (InBody 270 ou similar)",
      impacto: "Muito alto — poucos clinicos fazem, mostra evolucao objetiva entre consultas",
      prioridade: 2,
      cobranca: "Incluir na consulta (justifica R$ 1.200) ou cobrar a parte (R$ 150-200)",
    },
    {
      nome: "Ultrassom Point-of-Care (POCUS)",
      descricao: "US portatil na consulta (Butterfly iQ). Ve tamanho dos rins, hidratacao, derrame pleural em tempo real.",
      custo: "R$ 12.000-25.000 + curso de POCUS (~40h)",
      impacto: "Altissimo — 'O Dr. fez o ultrassom na hora'. Resolutividade maxima.",
      prioridade: 3,
      alinhamentoP1: "Resolutividade — resolve ali, sem mandar para outro exame",
    },
    {
      nome: "MAPA/MRPA (Monitorizacao da Pressao)",
      descricao: "Aparelho que mede pressao 24h. Hipertensao e causa e consequencia de DRC.",
      custo: "R$ 3.000-8.000 por aparelho",
      impacto: "Moderado — diagnostico mais preciso, menos encaminhamento para cardiologista",
      prioridade: 4,
      cobranca: "Emprestar ao paciente por 24h, cobrar pelo exame (R$ 200-350)",
    },
  ],
};

seedLuisRouter.get("/api/seed/luis", async (req, res) => {
  try {
    // Authenticate as admin
    let user: any = null;
    try {
      user = await sdk.authenticateRequest(req);
    } catch { user = null; }
    if (!user || user.role !== "admin") {
      res.status(403).json({ error: "Acesso negado — somente mentor" });
      return;
    }

    const menteeId = LUIS_MENTEE_ID;
    const results: string[] = [];

    // 1. Save products to simulation data
    const existingSim = await getSimulationData(menteeId);
    await saveSimulationData(menteeId, {
      servicos: PRODUCTS,
      mixAtendimentos: {
        "prod-avaliacao-integral": 34,
        "prod-acompanhamento-trimestral": 5,
        "prod-acompanhamento-semestral": 3,
        "prod-checkup-renal": 4,
        "prod-acesso-consultas": 0,
        ...(existingSim?.mixAtendimentos || {}),
      },
      params: existingSim?.params || {
        custoFixoTotal: 19592,
        custosVariaveisPercent: 14,
        taxaSalaHora: 130,
        horasDisponiveisMes: 160,
        horasOcupadasMes: 34,
        faturamentoMensal: 40800,
      },
    });
    results.push("Produtos salvos (5 servicos)");

    // 2. Save consultation protocols (pillar 7 = dbPillarId for Pilar 6 Vendas)
    const existingFeedback7 = await getPillarFeedback(menteeId, 7);
    const existingToolData7 = (existingFeedback7?.toolDataJson as Record<string, unknown>) || {};
    await upsertPillarFeedback(menteeId, 7, {
      toolDataJson: {
        ...existingToolData7,
        consultationProtocol: {
          initial: PROTOCOL_INITIAL,
          retorno: PROTOCOL_RETORNO,
        },
      },
    });
    results.push("Protocolos de consulta salvos (inicial + retorno)");

    // 3. Save suggestions (pillar 3 = Diagnóstico)
    const existingFeedback3 = await getPillarFeedback(menteeId, 3);
    const existingToolData3 = (existingFeedback3?.toolDataJson as Record<string, unknown>) || {};
    await upsertPillarFeedback(menteeId, 3, {
      toolDataJson: {
        ...existingToolData3,
        ...SUGGESTIONS,
      },
    });
    results.push("Sugestoes de valor agregado salvas");

    res.json({ success: true, menteeId, results });
  } catch (err: any) {
    console.error("Erro no seed:", err);
    res.status(500).json({ error: err.message || "Erro ao popular dados" });
  }
});
