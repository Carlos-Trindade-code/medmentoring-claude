export interface PillarPart {
  id: string;
  label: string;
  description: string;
  type: "questionnaire" | "tool" | "simulator";
}

// Maps new pillar IDs (1-6) to old DB pillar IDs (1-7)
export const NEW_TO_OLD_PILLAR: Record<number, number> = {
  1: 1, 2: 2, 3: 3, 4: 5, 5: 6, 6: 7
};

export const PILLAR_PARTS: Record<number, PillarPart[]> = {
  1: [
    { id: "a", label: "Autoconhecimento e Valores", description: "Quem você é e o que te move", type: "questionnaire" },
    { id: "b", label: "Ikigai Profissional", description: "Seu propósito e motivação", type: "questionnaire" },
    { id: "c", label: "Missão, Visão e Propósito", description: "Declarações que guiam sua prática", type: "questionnaire" },
    { id: "d", label: "Público e Posicionamento", description: "Quem você atende e como se posiciona", type: "questionnaire" },
  ],
  2: [
    { id: "a", label: "Diferencial e Proposta de Valor", description: "O que te torna único", type: "questionnaire" },
    { id: "b", label: "Produtos e Serviços", description: "Cardápio de serviços e subprodutos", type: "questionnaire" },
  ],
  3: [
    { id: "a", label: "Estrutura e Custos", description: "Organização da clínica e custos reais", type: "questionnaire" },
    { id: "b", label: "Despesas Fixas", description: "Mapeamento detalhado de custos", type: "tool" },
    { id: "c", label: "iVMP", description: "Índice de Valor Médico Percebido", type: "tool" },
    { id: "d", label: "Precificação Atual", description: "Como você define preços hoje", type: "questionnaire" },
  ],
  4: [
    { id: "a", label: "Simulador de Cenários", description: "Projeções financeiras e metas", type: "simulator" },
    { id: "b", label: "Engenharia de Preços", description: "Tabela de serviços com margens", type: "tool" },
    { id: "c", label: "Plano de Ação", description: "Prioridades baseadas no diagnóstico", type: "questionnaire" },
  ],
  5: [
    { id: "a", label: "Presença Digital", description: "Redes sociais, site, avaliação online", type: "questionnaire" },
    { id: "b", label: "Estratégia de Conteúdo", description: "Tom de voz, frequência, formatos", type: "questionnaire" },
    { id: "c", label: "Prompt de Comunicação", description: "IA para marketing personalizado", type: "questionnaire" },
  ],
  6: [
    { id: "a", label: "Protocolo de Consulta", description: "Da recepção ao pós-consulta", type: "questionnaire" },
    { id: "b", label: "Técnicas de Apresentação", description: "Apresentar tratamentos com valor", type: "questionnaire" },
    { id: "c", label: "Objeções e Follow-up", description: "Tratamento de objeções", type: "questionnaire" },
  ],
};
