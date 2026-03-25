import * as XLSX from "xlsx";
import { EXPENSE_CATEGORIES } from "../shared/expense-categories";
import { IVMP_DIMENSIONS, calculateIvmpScores } from "../shared/ivmp-questions";

// ============================================================
// EXPENSE EXCEL
// ============================================================
export function generateExpenseExcel(
  expenses: Record<string, number>,
  mapaSala: any,
  faturamentoMensal?: number
): Buffer {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Despesas Fixas
  const rows: any[][] = [
    ["DESPESAS FIXAS MENSAIS", "", "", ""],
    ["Categoria", "Subcategoria", "Valor (R$)", "% do Total"],
  ];

  let grandTotal = 0;
  for (const cat of EXPENSE_CATEGORIES) {
    let catTotal = 0;
    for (const sub of cat.subcategories) {
      const val = expenses[`${cat.id}.${sub.id}`] || 0;
      catTotal += val;
    }
    grandTotal += catTotal;
  }

  for (const cat of EXPENSE_CATEGORIES) {
    let catTotal = 0;
    for (const sub of cat.subcategories) {
      const val = expenses[`${cat.id}.${sub.id}`] || 0;
      catTotal += val;
    }
    // Category row (bold)
    rows.push([cat.label, "", catTotal, grandTotal > 0 ? `${((catTotal / grandTotal) * 100).toFixed(1)}%` : "0%"]);
    // Subcategory rows
    for (const sub of cat.subcategories) {
      const val = expenses[`${cat.id}.${sub.id}`] || 0;
      rows.push(["", sub.label, val, grandTotal > 0 ? `${((val / grandTotal) * 100).toFixed(1)}%` : "0%"]);
    }
  }
  rows.push(["TOTAL GERAL", "", grandTotal, "100%"]);
  if (faturamentoMensal && faturamentoMensal > 0) {
    rows.push(["% do Faturamento", "", `${((grandTotal / faturamentoMensal) * 100).toFixed(1)}%`, ""]);
  }

  const ws1 = XLSX.utils.aoa_to_sheet(rows);
  // Set column widths
  ws1["!cols"] = [{ wch: 35 }, { wch: 40 }, { wch: 15 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, ws1, "Despesas Fixas");

  // Sheet 2: Mapa de Sala
  if (mapaSala) {
    const diasSemana = mapaSala.diasSemana?.length || 0;
    const horasPorDia = (mapaSala.turnoManha || 0) + (mapaSala.turnoTarde || 0);
    const semanas = mapaSala.semanasMes || 4;
    const horasDisponiveis = diasSemana * horasPorDia * semanas;
    const horasOcupadas = mapaSala.horasOcupadas || 0;
    const custoHoraDisp = horasDisponiveis > 0 ? grandTotal / horasDisponiveis : 0;
    const taxaSala = horasOcupadas > 0 ? grandTotal / horasOcupadas : 0;
    const ociosidade = (horasDisponiveis - horasOcupadas) * custoHoraDisp;
    const ocupacao = horasDisponiveis > 0 ? (horasOcupadas / horasDisponiveis) * 100 : 0;

    const mapRows = [
      ["MAPA DE SALA", ""],
      ["Dias por semana", diasSemana],
      ["Horas turno manha", mapaSala.turnoManha || 0],
      ["Horas turno tarde", mapaSala.turnoTarde || 0],
      ["Semanas por mes", semanas],
      ["Horas disponiveis/mes", horasDisponiveis],
      ["Horas ocupadas/mes", horasOcupadas],
      ["% Ocupacao", `${ocupacao.toFixed(1)}%`],
      ["", ""],
      ["INDICADORES", ""],
      ["Custo/Hora Disponivel", `R$ ${custoHoraDisp.toFixed(2)}`],
      ["Taxa de Sala/Hora", `R$ ${taxaSala.toFixed(2)}`],
      ["Custo Ociosidade/Mes", `R$ ${ociosidade.toFixed(2)}`],
    ];
    const ws2 = XLSX.utils.aoa_to_sheet(mapRows);
    ws2["!cols"] = [{ wch: 25 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, ws2, "Mapa de Sala");
  }

  return Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
}

// ============================================================
// iVMP EXCEL
// ============================================================
export function generateIvmpExcel(answers: Record<string, number>): Buffer {
  const wb = XLSX.utils.book_new();
  const scores = calculateIvmpScores(answers);

  // Sheet 1: All answers
  const rows: any[][] = [
    ["iVMP - RESPOSTAS COMPLETAS", "", ""],
    ["Dimensao", "Pergunta", "Nota (0-10)"],
  ];
  for (const dim of IVMP_DIMENSIONS) {
    for (const q of dim.perguntas) {
      rows.push([dim.label, q.texto, answers[q.id] ?? "-"]);
    }
  }
  const ws1 = XLSX.utils.aoa_to_sheet(rows);
  ws1["!cols"] = [{ wch: 30 }, { wch: 70 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, ws1, "Respostas");

  // Sheet 2: Summary by dimension
  const summaryRows: any[][] = [
    ["iVMP - RESUMO POR DIMENSAO", "", "", ""],
    ["Dimensao", "Peso", "Score (%)", "Status"],
  ];
  for (const dim of IVMP_DIMENSIONS) {
    const ds = scores.dimensionScores[dim.id];
    const pct = ds?.percentage || 0;
    const status = pct >= 70 ? "Forte" : pct >= 50 ? "Atencao" : "Critico";
    summaryRows.push([dim.label, `${(dim.peso * 100).toFixed(0)}%`, `${pct.toFixed(1)}%`, status]);
  }
  summaryRows.push(["", "", "", ""]);
  summaryRows.push(["iVMP FINAL", "", `${scores.ivmpFinal.toFixed(1)}%`, ""]);
  const ws2 = XLSX.utils.aoa_to_sheet(summaryRows);
  ws2["!cols"] = [{ wch: 30 }, { wch: 10 }, { wch: 12 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, ws2, "Resumo");

  return Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
}

// ============================================================
// PRICING / SIMULATION EXCEL
// ============================================================
export function generatePricingExcel(
  servicos: any[],
  mixAtendimentos: Record<string, number>,
  simulationResult: any
): Buffer {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Services
  const rows: any[][] = [
    ["TABELA DE PRECIFICACAO", "", "", "", "", "", "", "", "", "", "", ""],
    ["Servico", "Duracao(h)", "Preco(R$)", "Imposto%", "Cartao%", "MOD(R$)", "Mat/Med(R$)", "Bonus%", "Equip(R$)", "Qtd/Mes", "Lucro Bruto(R$)", "Margem%"],
  ];
  for (const s of servicos) {
    const qty = mixAtendimentos[s.id] || 0;
    const faturamento = s.precoVenda * qty;
    const imposto = faturamento * (s.impostoPercent / 100);
    const taxaCartao = faturamento * (s.taxaCartaoPercent / 100);
    const mod = s.mod * qty;
    const matMed = s.matMed * qty;
    const bonus = faturamento * (s.bonusPercent / 100);
    const equip = s.taxaEquipamento * qty;
    const lucro = faturamento - imposto - taxaCartao - mod - matMed - bonus - equip;
    const margem = faturamento > 0 ? (lucro / faturamento) * 100 : 0;
    rows.push([s.nome, s.duracaoHoras, s.precoVenda, s.impostoPercent, s.taxaCartaoPercent, s.mod, s.matMed, s.bonusPercent, s.taxaEquipamento, qty, lucro.toFixed(2), `${margem.toFixed(1)}%`]);
  }
  const ws1 = XLSX.utils.aoa_to_sheet(rows);
  ws1["!cols"] = [{ wch: 30 }, { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 8 }, { wch: 10 }, { wch: 10 }, { wch: 15 }, { wch: 10 }];
  XLSX.utils.book_append_sheet(wb, ws1, "Precificacao");

  // Sheet 2: Simulation Results
  if (simulationResult) {
    const simRows: any[][] = [
      ["SIMULACAO DE CENARIOS", ""],
      ["Faturamento Bruto", `R$ ${simulationResult.faturamentoBrutoTotal?.toFixed(2) || "0"}`],
      ["Custos Variaveis", `R$ ${simulationResult.custosVariaveisTotal?.toFixed(2) || "0"}`],
      ["Custo Fixo", `R$ ${simulationResult.custoFixoTotal?.toFixed(2) || "0"}`],
      ["Lucro Liquido", `R$ ${simulationResult.lucroLiquido?.toFixed(2) || "0"}`],
      ["Margem Liquida", `${simulationResult.margemLiquida?.toFixed(1) || "0"}%`],
      ["Custo/Hora", `R$ ${simulationResult.custoHora?.toFixed(2) || "0"}`],
      ["Ponto de Equilibrio", `R$ ${simulationResult.pontoEquilibrio?.toFixed(2) || "0"}`],
      ["Carga Horaria Necessaria", `${simulationResult.cargaHorariaNecessaria?.toFixed(1) || "0"} h/mes`],
      ["Horas Disponiveis", `${simulationResult.horasDisponiveis || "0"} h/mes`],
    ];
    const ws2 = XLSX.utils.aoa_to_sheet(simRows);
    ws2["!cols"] = [{ wch: 25 }, { wch: 25 }];
    XLSX.utils.book_append_sheet(wb, ws2, "Cenarios");
  }

  return Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
}
