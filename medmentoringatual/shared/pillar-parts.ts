export interface PillarPart {
  id: string;
  label: string;
  description: string;
  type: "questionnaire" | "tool" | "simulator";
}

export const PILLAR_PARTS: Record<number, PillarPart[]> = {
  1: [
    { id: "a", label: "Autoconhecimento e Valores", description: "Quem voce e e o que te move", type: "questionnaire" },
    { id: "b", label: "Ikigai Profissional", description: "Interseccao entre paixao, habilidade, necessidade e remuneracao", type: "questionnaire" },
    { id: "c", label: "Missao, Visao e Proposito", description: "Declaracoes que guiam sua pratica", type: "questionnaire" },
  ],
  2: [
    { id: "a", label: "Publico e Nicho", description: "Quem voce atende e quer atender", type: "questionnaire" },
    { id: "b", label: "Diferencial Competitivo", description: "O que te torna unico no mercado", type: "questionnaire" },
    { id: "c", label: "Proposta de Valor e Tagline", description: "Como comunicar seu valor em uma frase", type: "questionnaire" },
  ],
  3: [
    { id: "a", label: "Diagnostico de Estrutura e Espaco", description: "Como sua clinica esta organizada", type: "questionnaire" },
    { id: "b", label: "Despesas Fixas Completas", description: "Mapeamento detalhado de todos os custos", type: "tool" },
    { id: "c", label: "iVMP — 53 Perguntas", description: "Indice de Valor Medico Percebido", type: "tool" },
    { id: "d", label: "Simulador de Cenarios", description: "Projecoes financeiras e metas", type: "simulator" },
  ],
  4: [
    { id: "a", label: "Rotina e Gargalos", description: "Como funciona o dia a dia da clinica", type: "questionnaire" },
    { id: "b", label: "Equipe e Delegacao", description: "Quem faz o que e o que poderia delegar", type: "questionnaire" },
    { id: "c", label: "Mapa de Processos", description: "Fluxos e procedimentos operacionais", type: "questionnaire" },
  ],
  5: [
    { id: "a", label: "Precificacao Atual e Crencas", description: "Como voce define precos hoje", type: "questionnaire" },
    { id: "b", label: "Engenharia de Precos", description: "Tabela de servicos com custos e margens", type: "tool" },
    { id: "c", label: "Dinheiro Invisivel", description: "Onde voce perde dinheiro sem perceber", type: "questionnaire" },
  ],
  6: [
    { id: "a", label: "Presenca Digital Atual", description: "Redes sociais, site, avaliacao online", type: "questionnaire" },
    { id: "b", label: "Estrategia de Conteudo", description: "Tom de voz, frequencia, formatos", type: "questionnaire" },
    { id: "c", label: "Plano de 30 Dias", description: "Calendario editorial personalizado", type: "questionnaire" },
  ],
  7: [
    { id: "a", label: "Processo de Atendimento", description: "Da recepcao ao pos-consulta", type: "questionnaire" },
    { id: "b", label: "Script da Consulta de Alto Valor", description: "6 fases da consulta estruturada", type: "questionnaire" },
    { id: "c", label: "Objecoes e Follow-up", description: "Tratamento de objecoes e acompanhamento", type: "questionnaire" },
  ],
};
