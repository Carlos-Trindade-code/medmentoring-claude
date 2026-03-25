export interface ExpenseSubcategory {
  id: string;
  label: string;
  hint?: string;
}

export interface ExpenseCategory {
  id: string;
  label: string;
  icon: string;
  subcategories: ExpenseSubcategory[];
  zeroHint?: string;
}

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  {
    id: "espaco",
    label: "Espaco e Infraestrutura",
    icon: "Building2",
    zeroHint: "Voce nao tem nenhum custo com espaco? Mesmo consultorio proprio tem custo de oportunidade — quanto receberia se alugasse esse espaco?",
    subcategories: [
      { id: "aluguel", label: "Aluguel", hint: "Se o espaco e proprio, considere o custo de oportunidade — quanto receberia se alugasse." },
      { id: "condominio", label: "Condominio" },
      { id: "iptu", label: "IPTU" },
      { id: "energia", label: "Energia Eletrica" },
      { id: "agua", label: "Agua e Esgoto" },
      { id: "internet", label: "Telefone e Internet" },
      { id: "manutencao_predial", label: "Manutencao Predial", hint: "Inclui pequenos reparos, pintura, encanamento, eletrica." },
      { id: "limpeza", label: "Limpeza" },
      { id: "seguranca", label: "Seguranca e Alarme" },
    ],
  },
  {
    id: "pessoal",
    label: "Pessoal e Folha de Pagamento",
    icon: "Users",
    zeroHint: "Voce trabalha completamente sozinho? Sem secretaria, recepcionista ou assistente?",
    subcategories: [
      { id: "salarios", label: "Salarios de Funcionarios" },
      { id: "pro_labore", label: "Pro-labore (sua retirada)", hint: "Mesmo que voce nao faca retirada formal, e importante saber quanto deveria ser." },
      { id: "encargos", label: "Encargos Trabalhistas (INSS, FGTS)", hint: "Se tem funcionarios CLT, os encargos costumam representar 30-40% sobre o salario." },
      { id: "vt", label: "Vale Transporte" },
      { id: "vr", label: "Vale Refeicao / Alimentacao" },
      { id: "secretarias", label: "Secretarias / Recepcionistas" },
      { id: "provisao_13_ferias", label: "Provisao 13o Salario e Ferias", hint: "Provisionar 13o e ferias evita surpresas no fim do ano. Equivale a ~2.5 meses extras de folha por ano." },
      { id: "provisao_rescisoes", label: "Provisao para Rescisoes", hint: "Uma reserva mensal para eventuais desligamentos protege seu caixa." },
      { id: "rh", label: "Servicos de RH / DP" },
    ],
  },
  {
    id: "equipamentos",
    label: "Equipamentos e Tecnologia Medica",
    icon: "Cpu",
    zeroHint: "Voce nao tem custos com equipamentos? Considere depreciacao, manutencao e calibracao.",
    subcategories: [
      { id: "leasing", label: "Leasing / Financiamento de Equipamentos" },
      { id: "manutencao_aparelhos", label: "Manutencao de Aparelhos Medicos" },
      { id: "depreciacao", label: "Depreciacao de Equipamentos", hint: "Um equipamento de R$100.000 tem aproximadamente R$1.600/mes de depreciacao em 5 anos. Voce tem equipamentos proprios?" },
      { id: "calibracao", label: "Calibracao e Certificacao" },
      { id: "manutencao_computadores", label: "Manutencao de Computadores e TI" },
    ],
  },
  {
    id: "administrativo",
    label: "Administrativo e Sistemas",
    icon: "FileText",
    subcategories: [
      { id: "material_escritorio", label: "Material de Escritorio" },
      { id: "material_limpeza", label: "Material de Limpeza e Higiene" },
      { id: "software_gestao", label: "Software de Gestao / Prontuario Eletronico", hint: "Inclua todos os softwares que paga mensalmente: agenda, prontuario, financeiro." },
      { id: "agendamento_online", label: "Plataforma de Agendamento Online" },
      { id: "backup", label: "Backup e Seguranca de Dados" },
      { id: "contabilidade", label: "Contabilidade" },
      { id: "consultoria_juridica", label: "Consultoria Juridica" },
    ],
  },
  {
    id: "marketing",
    label: "Marketing e Comunicacao",
    icon: "Megaphone",
    zeroHint: "Voce nao investe nada em marketing? Mesmo o basico (Google Meu Negocio, Instagram) tem custos indiretos.",
    subcategories: [
      { id: "trafego_pago", label: "Trafego Pago (Google Ads, Instagram, Facebook)" },
      { id: "criador_conteudo", label: "Criador de Conteudo / Social Media" },
      { id: "fotografo", label: "Fotografo / Videomaker" },
      { id: "site", label: "Site / Dominio / Hospedagem" },
      { id: "agencia", label: "Agencia de Marketing", hint: "Se contrata agencia, inclua o valor mensal completo." },
    ],
  },
  {
    id: "deslocamento",
    label: "Deslocamento e Transporte",
    icon: "Car",
    zeroHint: "Voce nao tem custo de deslocamento? Medicos que atendem em mais de um local costumam esquecer esse custo.",
    subcategories: [
      { id: "combustivel", label: "Combustivel" },
      { id: "pedagio", label: "Pedagio" },
      { id: "estacionamento", label: "Estacionamento" },
      { id: "transporte_unidades", label: "Transporte entre Unidades", hint: "Se voce atende em mais de um local, o custo de deslocamento entre eles e um custo fixo real." },
      { id: "manutencao_veiculo", label: "Manutencao do Veiculo (uso profissional)" },
    ],
  },
  {
    id: "formacao",
    label: "Formacao e Desenvolvimento",
    icon: "GraduationCap",
    zeroHint: "Voce nao investe em formacao continuada? Cursos, congressos e assinaturas cientificas sao custos reais do exercicio profissional.",
    subcategories: [
      { id: "cursos", label: "Cursos e Especializacoes" },
      { id: "congressos", label: "Congressos e Eventos" },
      { id: "assinaturas", label: "Assinaturas Cientificas e Plataformas" },
      { id: "livros", label: "Livros e Materiais Didaticos" },
    ],
  },
  {
    id: "seguros_taxas",
    label: "Seguros, Taxas e Conselhos",
    icon: "Shield",
    subcategories: [
      { id: "seguro_consultorio", label: "Seguro do Consultorio / Clinica" },
      { id: "seguro_profissional", label: "Seguro de Responsabilidade Profissional", hint: "Voce tem seguro de responsabilidade civil profissional? E altamente recomendado." },
      { id: "crm", label: "Anuidade CRM" },
      { id: "associacoes", label: "Sociedades Medicas e Associacoes" },
      { id: "alvara", label: "Alvara de Funcionamento e Vigilancia Sanitaria" },
    ],
  },
  {
    id: "outros",
    label: "Outros Custos",
    icon: "MoreHorizontal",
    subcategories: [
      { id: "cafe_copa", label: "Cafe / Copa / Agua para Pacientes" },
      { id: "lavanderia", label: "Lavanderia (jalecos, lencois)" },
      { id: "coleta_lixo", label: "Coleta de Lixo Hospitalar", hint: "Se gera residuos biologicos, a coleta especializada e obrigatoria e tem custo." },
      { id: "uniformes", label: "Uniformes da Equipe" },
      { id: "brindes", label: "Brindes e Materiais para Pacientes" },
      { id: "assinaturas_gerais", label: "Assinaturas Diversas (Spotify, Netflix sala de espera)" },
    ],
  },
];

// Helper: total de subcategorias
export const TOTAL_EXPENSE_ITEMS = EXPENSE_CATEGORIES.reduce(
  (sum, cat) => sum + cat.subcategories.length, 0
);
