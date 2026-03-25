import * as XLSX from "xlsx";
import { EXPENSE_CATEGORIES } from "../shared/expense-categories";
import { IVMP_DIMENSIONS, calculateIvmpScores } from "../shared/ivmp-questions";

// ============================================================
// EXPENSE EXCEL
// ============================================================
export function generateExpenseExcel(
  expenses: Record<string, number>,
  mapaSala: any,
  faturamentoMensal?: number,
  mentorNotes?: string | null
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

  // Sheet 3: Análise (KPIs + Notas do Mentor)
  {
    const analiseRows: any[][] = [
      ["ANALISE DE DESPESAS", ""],
      ["", ""],
      ["INDICADORES-CHAVE", ""],
    ];

    // KPI: % do faturamento
    if (faturamentoMensal && faturamentoMensal > 0) {
      const pctFat = ((grandTotal / faturamentoMensal) * 100).toFixed(1);
      analiseRows.push(["Despesas / Faturamento", `${pctFat}%`]);
      analiseRows.push(["Faturamento Mensal", `R$ ${faturamentoMensal.toFixed(2)}`]);
      analiseRows.push(["Total Despesas Fixas", `R$ ${grandTotal.toFixed(2)}`]);
      const resultado = faturamentoMensal - grandTotal;
      analiseRows.push(["Resultado (Fat - Desp Fixas)", `R$ ${resultado.toFixed(2)}`]);
    } else {
      analiseRows.push(["Total Despesas Fixas", `R$ ${grandTotal.toFixed(2)}`]);
      analiseRows.push(["Faturamento Mensal", "Nao informado"]);
    }

    // KPI: Mapa de Sala
    if (mapaSala) {
      const diasSemana = mapaSala.diasSemana?.length || 0;
      const horasPorDia = (mapaSala.turnoManha || 0) + (mapaSala.turnoTarde || 0);
      const semanas = mapaSala.semanasMes || 4;
      const horasDisponiveis = diasSemana * horasPorDia * semanas;
      const horasOcupadas = mapaSala.horasOcupadas || 0;
      const ocupacao = horasDisponiveis > 0 ? (horasOcupadas / horasDisponiveis) * 100 : 0;
      const custoHoraDisp = horasDisponiveis > 0 ? grandTotal / horasDisponiveis : 0;
      const ociosidade = (horasDisponiveis - horasOcupadas) * custoHoraDisp;

      analiseRows.push(["", ""]);
      analiseRows.push(["% Ocupacao da Sala", `${ocupacao.toFixed(1)}%`]);
      analiseRows.push(["Custo Ociosidade/Mes", `R$ ${ociosidade.toFixed(2)}`]);
      analiseRows.push(["Custo/Hora Disponivel", `R$ ${custoHoraDisp.toFixed(2)}`]);
    }

    // Top 3 categories by spending
    const catTotals = EXPENSE_CATEGORIES.map((cat) => {
      let total = 0;
      for (const sub of cat.subcategories) {
        total += expenses[`${cat.id}.${sub.id}`] || 0;
      }
      return { label: cat.label, total };
    }).sort((a, b) => b.total - a.total);

    analiseRows.push(["", ""]);
    analiseRows.push(["TOP 3 CATEGORIAS", ""]);
    for (let i = 0; i < Math.min(3, catTotals.length); i++) {
      const c = catTotals[i];
      if (c.total > 0) {
        const pct = grandTotal > 0 ? ((c.total / grandTotal) * 100).toFixed(1) : "0";
        analiseRows.push([`${i + 1}. ${c.label}`, `R$ ${c.total.toFixed(2)} (${pct}%)`]);
      }
    }

    // Mentor notes
    if (mentorNotes) {
      analiseRows.push(["", ""]);
      analiseRows.push(["NOTAS DO MENTOR", ""]);
      analiseRows.push([mentorNotes, ""]);
    }

    const wsAnalise = XLSX.utils.aoa_to_sheet(analiseRows);
    wsAnalise["!cols"] = [{ wch: 35 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, wsAnalise, "Analise");
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

// ============================================================
// PILLAR COMPLETE EXCEL — Exportação completa de um pilar
// ============================================================
export interface PillarCompleteData {
  pillarId: number;
  pillarName: string;
  answers: Array<{
    secao: string;
    respostas: any; // JSON array of { id, pergunta, resposta, naoSabe }
    status: string;
  }>;
  feedback: {
    feedback?: string | null;
    planoAcao?: string | null;
    pontosFortesJson?: any;
    pontosMelhoriaJson?: any;
  } | null;
  suggestions: Array<{
    texto: string;
    categoria?: string | null;
    concluida: boolean;
  }>;
  mentorNote: string | null;
}

export function generatePillarCompleteExcel(data: PillarCompleteData): Buffer {
  const wb = XLSX.utils.book_new();
  const pillarTitle = data.pillarName.replace(/-/g, " ");

  // ── Sheet 1: Respostas ──
  const respostasRows: any[][] = [
    [`PILAR ${data.pillarId} — ${pillarTitle.toUpperCase()}`, "", ""],
    ["Secao", "Pergunta", "Resposta"],
  ];

  for (const answer of data.answers) {
    const secaoLabel = answer.secao.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    const respostas = Array.isArray(answer.respostas) ? answer.respostas : [];

    if (respostas.length === 0) {
      respostasRows.push([secaoLabel, "(sem respostas)", ""]);
      continue;
    }

    for (const r of respostas) {
      const pergunta = r.pergunta || r.id || "-";
      let resposta: string;
      if (r.naoSabe) {
        resposta = "Nao sabe";
      } else if (r.resposta === null || r.resposta === undefined || r.resposta === "") {
        resposta = "-";
      } else if (typeof r.resposta === "boolean") {
        resposta = r.resposta ? "Sim" : "Nao";
      } else if (Array.isArray(r.resposta)) {
        resposta = r.resposta.join(", ");
      } else {
        resposta = String(r.resposta);
      }
      respostasRows.push([secaoLabel, pergunta, resposta]);
    }
  }

  const ws1 = XLSX.utils.aoa_to_sheet(respostasRows);
  ws1["!cols"] = [{ wch: 30 }, { wch: 60 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, ws1, "Respostas");

  // ── Sheet 2: Análise ──
  const analiseRows: any[][] = [
    [`ANALISE — PILAR ${data.pillarId}`, ""],
    ["", ""],
  ];

  // Feedback
  analiseRows.push(["FEEDBACK DO MENTOR", ""]);
  analiseRows.push([data.feedback?.feedback || "(nenhum feedback registrado)", ""]);
  analiseRows.push(["", ""]);

  // Pontos Fortes
  analiseRows.push(["PONTOS FORTES", ""]);
  const pontosFortes = parsePontosJson(data.feedback?.pontosFortesJson);
  if (pontosFortes.length > 0) {
    for (const pf of pontosFortes) {
      analiseRows.push([`• ${pf}`, ""]);
    }
  } else {
    analiseRows.push(["(nenhum ponto forte registrado)", ""]);
  }
  analiseRows.push(["", ""]);

  // Pontos de Melhoria
  analiseRows.push(["PONTOS DE MELHORIA", ""]);
  const pontosMelhoria = parsePontosJson(data.feedback?.pontosMelhoriaJson);
  if (pontosMelhoria.length > 0) {
    for (const pm of pontosMelhoria) {
      analiseRows.push([`• ${pm}`, ""]);
    }
  } else {
    analiseRows.push(["(nenhum ponto de melhoria registrado)", ""]);
  }
  analiseRows.push(["", ""]);

  // Plano de Ação
  analiseRows.push(["PLANO DE ACAO", ""]);
  analiseRows.push([data.feedback?.planoAcao || "(nenhum plano de acao registrado)", ""]);

  const ws2 = XLSX.utils.aoa_to_sheet(analiseRows);
  ws2["!cols"] = [{ wch: 80 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, ws2, "Analise");

  // ── Sheet 3: Notas do Mentor ──
  const notasRows: any[][] = [
    [`NOTAS DO MENTOR — PILAR ${data.pillarId}`, "", ""],
    ["", "", ""],
  ];

  // Mentor notes (free text)
  notasRows.push(["ANOTACOES LIVRES", "", ""]);
  notasRows.push([data.mentorNote || "(sem anotacoes)", "", ""]);
  notasRows.push(["", "", ""]);

  // Suggestions (checklist)
  notasRows.push(["SUGESTOES / CHECKLIST", "Categoria", "Status"]);
  if (data.suggestions.length > 0) {
    for (const s of data.suggestions) {
      notasRows.push([
        s.texto,
        s.categoria || "-",
        s.concluida ? "Concluida" : "Pendente",
      ]);
    }
  } else {
    notasRows.push(["(nenhuma sugestao registrada)", "-", "-"]);
  }

  const ws3 = XLSX.utils.aoa_to_sheet(notasRows);
  ws3["!cols"] = [{ wch: 60 }, { wch: 20 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, ws3, "Notas do Mentor");

  return Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
}

/** Parse pontosFortesJson / pontosMelhoriaJson into a string array */
function parsePontosJson(val: any): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val.map((v) => (typeof v === "string" ? v : JSON.stringify(v)));
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed.map((v: any) => (typeof v === "string" ? v : JSON.stringify(v)));
    } catch {
      return [val];
    }
  }
  return [];
}
