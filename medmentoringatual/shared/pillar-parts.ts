export interface PillarPart {
  id: string;
  label: string;
  description: string;
  type: "questionnaire" | "tool" | "simulator";
}

// Maps new pillar IDs (1-6) to old DB pillar IDs (1-7)
// Old pillar 4 (Gestao) absorbed into pillar 3, old 5→4, old 6→5, old 7→6
export const NEW_TO_OLD_PILLAR: Record<number, number> = {
  1: 1, 2: 2, 3: 3, 4: 5, 5: 6, 6: 7
};

export const PILLAR_PARTS: Record<number, PillarPart[]> = {
  1: [
    { id: "a", label: "Autoconhecimento e Valores", description: "Quem voce e e o que te move", type: "questionnaire" },
    { id: "b", label: "Ikigai Profissional", description: "Seu proposito e motivacao", type: "questionnaire" },
    { id: "c", label: "Missao, Visao e Proposito", description: "Declaracoes que guiam sua pratica", type: "questionnaire" },
    { id: "d", label: "Publico e Posicionamento", description: "Quem voce atende e como se posiciona", type: "questionnaire" },
  ],
  2: [
    { id: "a", label: "Diferencial e Proposta de Valor", description: "O que te torna unico", type: "questionnaire" },
    { id: "b", label: "Produtos e Servicos", description: "Cardapio de servicos e subprodutos", type: "questionnaire" },
  ],
  3: [
    { id: "a", label: "Estrutura e Custos", description: "Organizacao da clinica e custos reais", type: "questionnaire" },
    { id: "b", label: "Despesas Fixas", description: "Mapeamento detalhado de custos", type: "tool" },
    { id: "c", label: "iVMP", description: "Indice de Valor Medico Percebido", type: "tool" },
    { id: "d", label: "Precificacao Atual", description: "Como voce define precos hoje", type: "questionnaire" },
  ],
  4: [
    { id: "a", label: "Simulador de Cenarios", description: "Projecoes financeiras e metas", type: "simulator" },
    { id: "b", label: "Engenharia de Precos", description: "Tabela de servicos com margens", type: "tool" },
    { id: "c", label: "Plano de Acao", description: "Prioridades baseadas no diagnostico", type: "questionnaire" },
  ],
  5: [
    { id: "a", label: "Presenca Digital", description: "Redes sociais, site, avaliacao online", type: "questionnaire" },
    { id: "b", label: "Estrategia de Conteudo", description: "Tom de voz, frequencia, formatos", type: "questionnaire" },
    { id: "c", label: "Prompt de Comunicacao", description: "IA para marketing personalizado", type: "questionnaire" },
  ],
  6: [
    { id: "a", label: "Protocolo de Consulta", description: "Da recepcao ao pos-consulta", type: "questionnaire" },
    { id: "b", label: "Tecnicas de Apresentacao", description: "Apresentar tratamentos com valor", type: "questionnaire" },
    { id: "c", label: "Objecoes e Follow-up", description: "Tratamento de objecoes", type: "questionnaire" },
  ],
};
