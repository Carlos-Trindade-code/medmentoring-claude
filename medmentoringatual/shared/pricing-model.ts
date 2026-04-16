export interface Service {
  id: string;
  nome: string;
  duracaoHoras: number;
  precoVenda: number;
  impostoPercent: number;     // Default 12.5%
  taxaCartaoPercent: number;  // Default 5%
  mod: number;                // Mao de obra direta (R$)
  matMed: number;             // Material/Medicamento (R$)
  bonusPercent: number;       // Comissao/bonus (%)
  taxaEquipamento: number;    // Depreciacao equipamento por uso (R$)
  frequencia?: "mensal" | "trimestral" | "semestral"; // Frequencia de cobrança para pacotes
}

export interface SimulationParams {
  custoFixoTotal: number;
  custosVariaveisPercent: number; // impostos + cartao combined default
  taxaSalaHora: number;
  horasDisponiveisMes: number;
  horasOcupadasMes: number;
  faturamentoMensal: number;
  servicos: Service[];
  mixAtendimentos: Record<string, number>; // serviceId -> quantidade/mes
}

export interface ServiceResult {
  serviceId: string;
  nome: string;
  quantidade: number;
  faturamentoBruto: number;
  imposto: number;
  taxaCartao: number;
  mod: number;
  matMed: number;
  bonus: number;
  taxaEquipamento: number;
  lucroBruto: number;
  margemBruta: number;
  taxaSala: number;
  lucroOperacional: number;
  margemOperacional: number;
  horasNecessarias: number;
}

export interface SimulationResult {
  faturamentoBrutoTotal: number;
  custoFixoTotal: number;
  custosVariaveisTotal: number;
  lucroLiquido: number;
  margemLiquida: number;
  custoHora: number;
  pontoEquilibrio: number;
  sobraPorMes: number;
  cargaHorariaNecessaria: number;
  horasDisponiveis: number;
  porServico: ServiceResult[];
}

const FREQ_MONTHS: Record<string, number> = { mensal: 1, trimestral: 3, semestral: 6 };

// Calculate simulation from params
export function calculateSimulation(params: SimulationParams): SimulationResult {
  const porServico: ServiceResult[] = [];
  let faturamentoBrutoTotal = 0;
  let custosVariaveisTotal = 0;
  let cargaHorariaNecessaria = 0;

  for (const servico of params.servicos) {
    const qty = params.mixAtendimentos[servico.id] || 0;
    if (qty === 0) continue;

    // Para pacotes recorrentes: qty = nº de pacotes ativos, precoVenda = preço total do pacote
    // Receita mensal = (precoVenda / meses) * qty
    const freqMonths = FREQ_MONTHS[servico.frequencia || "mensal"] || 1;
    const faturamento = (servico.precoVenda / freqMonths) * qty;
    const imposto = faturamento * (servico.impostoPercent / 100);
    const taxaCartao = faturamento * (servico.taxaCartaoPercent / 100);
    const mod = servico.mod * qty;
    const matMed = servico.matMed * qty;
    const bonus = faturamento * (servico.bonusPercent / 100);
    const taxaEquip = servico.taxaEquipamento * qty;
    const lucroBruto = faturamento - imposto - taxaCartao - mod - matMed - bonus - taxaEquip;
    const margemBruta = faturamento > 0 ? (lucroBruto / faturamento) * 100 : 0;
    // Horas e taxa de sala também ajustadas pela frequência
    const horasPorOcorrencia = servico.duracaoHoras * qty;
    const horas = horasPorOcorrencia / freqMonths;
    const taxaSala = params.taxaSalaHora * horas;
    const lucroOp = lucroBruto - taxaSala;
    const margemOp = faturamento > 0 ? (lucroOp / faturamento) * 100 : 0;

    porServico.push({
      serviceId: servico.id,
      nome: servico.nome,
      quantidade: qty,
      faturamentoBruto: faturamento,
      imposto, taxaCartao, mod, matMed, bonus, taxaEquipamento: taxaEquip,
      lucroBruto, margemBruta, taxaSala, lucroOperacional: lucroOp, margemOperacional: margemOp,
      horasNecessarias: horas,
    });

    faturamentoBrutoTotal += faturamento;
    custosVariaveisTotal += imposto + taxaCartao + mod + matMed + bonus + taxaEquip;
    cargaHorariaNecessaria += horas;
  }

  // Lucro líquido inclui taxa de sala por serviço
  const taxaSalaTotal = porServico.reduce((s, r) => s + r.taxaSala, 0);
  const lucroLiquido = faturamentoBrutoTotal - custosVariaveisTotal - taxaSalaTotal - params.custoFixoTotal;
  const margemLiquida = faturamentoBrutoTotal > 0 ? (lucroLiquido / faturamentoBrutoTotal) * 100 : 0;
  const custoHora = params.horasDisponiveisMes > 0 ? params.custoFixoTotal / params.horasDisponiveisMes : 0;
  const avgCustosVariaveisPercent = faturamentoBrutoTotal > 0 ? (custosVariaveisTotal / faturamentoBrutoTotal) : 0.20;
  const pontoEquilibrio = avgCustosVariaveisPercent < 1 ? params.custoFixoTotal / (1 - avgCustosVariaveisPercent) : 0;
  const sobraPorMes = lucroLiquido;

  return {
    faturamentoBrutoTotal, custoFixoTotal: params.custoFixoTotal,
    custosVariaveisTotal, lucroLiquido, margemLiquida, custoHora,
    pontoEquilibrio, sobraPorMes, cargaHorariaNecessaria,
    horasDisponiveis: params.horasDisponiveisMes,
    porServico,
  };
}

// Calculate target: given a profit target, what revenue is needed?
export function calculateTarget(custoFixo: number, custosVariaveisPercent: number, metaLucro: number) {
  const faturamentoNecessario = (metaLucro + custoFixo) / (1 - custosVariaveisPercent / 100);
  return { faturamentoNecessario };
}
