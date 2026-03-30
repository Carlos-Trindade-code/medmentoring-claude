/**
 * ExpenseAnalysis — Visao do mentor sobre as despesas do mentorado
 *
 * Mostra TODOS os calculos, totais, alertas e insights.
 * Este componente e exclusivo do mentor — o mentorado nao ve nenhuma analise.
 *
 * Secoes:
 *  1. KPI Cards — custo fixo total, custo/hora, taxa de sala, custo ociosidade, % ocupacao
 *  2. Tabela de despesas agrupada por categoria + grafico de barras horizontais
 *  3. Alertas e custos ocultos identificados
 */
import { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Download,
  FileSpreadsheet,
  AlertTriangle,
  TrendingDown,
  DollarSign,
  Clock,
  Building2,
  Percent,
  Loader2,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from "recharts";
import {
  EXPENSE_CATEGORIES,
} from "../../../shared/expense-categories";
import type { ExpenseCategory } from "../../../shared/expense-categories";

// ============================================================
// TIPOS
// ============================================================
interface ExpenseAnalysisProps {
  menteeId: number;
}

interface MapaSala {
  diasSemana: string[];
  turnoManha: number;
  turnoTarde: number;
  semanasMes: number;
  horasOcupadas: number;
  faturamentoMensal: number;
}

interface CategorySummary {
  id: string;
  label: string;
  total: number;
  percentOfTotal: number;
  percentOfRevenue: number | null;
  subcategories: {
    id: string;
    label: string;
    value: number;
    percentOfTotal: number;
    percentOfRevenue: number | null;
    hasHint: boolean;
  }[];
}

interface KPIs {
  custoFixoTotal: number;
  horasDisponiveis: number;
  custoHoraDisponivel: number;
  taxaDeSala: number;
  custoOciosidade: number;
  percentOcupacao: number;
  faturamentoMensal: number;
}

interface HiddenCostAlert {
  icon: React.ReactNode;
  title: string;
  description: string;
  estimatedImpact: number | null;
}

// ============================================================
// FORMATACAO
// ============================================================
function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

function formatBRLShort(value: number): string {
  if (value >= 1000) {
    return `R$ ${(value / 1000).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}k`;
  }
  return formatBRL(value);
}

function formatPercent(value: number): string {
  return `${value.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
export function ExpenseAnalysis({ menteeId }: ExpenseAnalysisProps) {
  const { data: analysisData, isLoading } = trpc.mentor.getExpenseAnalysis.useQuery({ menteeId });

  // Extrair dados da query
  const expenses: Record<string, number> = (analysisData?.expenses as Record<string, number>) ?? {};
  const mapaSala: MapaSala | null = (analysisData?.mapaSala as MapaSala) ?? null;

  // ============================================================
  // CALCULOS — KPIs
  // ============================================================
  const kpis = useMemo<KPIs>(() => {
    // Total de custos fixos
    const custoFixoTotal = Object.values(expenses).reduce((sum, v) => sum + (v || 0), 0);

    // Horas disponiveis no mes
    const diasPorSemana = mapaSala?.diasSemana?.length ?? 0;
    const horasPorDia = (mapaSala?.turnoManha ?? 0) + (mapaSala?.turnoTarde ?? 0);
    const semanasMes = mapaSala?.semanasMes ?? 4;
    const horasDisponiveis = diasPorSemana * horasPorDia * semanasMes;

    // Horas ocupadas
    const horasOcupadas = mapaSala?.horasOcupadas ?? 0;

    // Custo por hora disponivel
    const custoHoraDisponivel = horasDisponiveis > 0 ? custoFixoTotal / horasDisponiveis : 0;

    // Taxa de sala (custo por hora ocupada)
    const taxaDeSala = horasOcupadas > 0 ? custoFixoTotal / horasOcupadas : 0;

    // Percentual de ocupacao
    const percentOcupacao = horasDisponiveis > 0 ? (horasOcupadas / horasDisponiveis) * 100 : 0;

    // Custo de ociosidade
    const horasOciosas = Math.max(0, horasDisponiveis - horasOcupadas);
    const custoOciosidade = horasOciosas * custoHoraDisponivel;

    const faturamentoMensal = mapaSala?.faturamentoMensal ?? 0;

    return {
      custoFixoTotal,
      horasDisponiveis,
      custoHoraDisponivel,
      taxaDeSala,
      custoOciosidade,
      percentOcupacao,
      faturamentoMensal,
    };
  }, [expenses, mapaSala]);

  // ============================================================
  // CALCULOS — TABELA POR CATEGORIA
  // ============================================================
  const categorySummaries = useMemo<CategorySummary[]>(() => {
    const total = kpis.custoFixoTotal;
    const faturamento = kpis.faturamentoMensal;

    const summaries: CategorySummary[] = EXPENSE_CATEGORIES.map((cat: ExpenseCategory) => {
      const subs = cat.subcategories.map((sub) => {
        const value = expenses[`${cat.id}.${sub.id}`] ?? 0;
        return {
          id: sub.id,
          label: sub.label,
          value,
          percentOfTotal: total > 0 ? (value / total) * 100 : 0,
          percentOfRevenue: faturamento > 0 ? (value / faturamento) * 100 : null,
          hasHint: !!sub.hint,
        };
      });

      const catTotal = subs.reduce((sum, s) => sum + s.value, 0);

      return {
        id: cat.id,
        label: cat.label,
        total: catTotal,
        percentOfTotal: total > 0 ? (catTotal / total) * 100 : 0,
        percentOfRevenue: faturamento > 0 ? (catTotal / faturamento) * 100 : null,
        subcategories: subs,
      };
    });

    // Ordena por total (maior primeiro)
    summaries.sort((a, b) => b.total - a.total);
    return summaries;
  }, [expenses, kpis]);

  // ============================================================
  // CALCULOS — ALERTAS DE CUSTOS OCULTOS
  // ============================================================
  const alerts = useMemo<HiddenCostAlert[]>(() => {
    const result: HiddenCostAlert[] = [];

    // 1. Provisao 13o e ferias ausente
    const provisao13Ferias = expenses["pessoal.provisao_13_ferias"] ?? 0;
    const folhaTotal =
      (expenses["pessoal.salarios"] ?? 0) +
      (expenses["pessoal.secretarias"] ?? 0) +
      (expenses["pessoal.pro_labore"] ?? 0);

    if (provisao13Ferias === 0 && folhaTotal > 0) {
      // Provisao recomendada: ~2.5/12 da folha mensal
      const impacto = Math.round((folhaTotal * 2.5) / 12);
      result.push({
        icon: <AlertTriangle className="w-4 h-4 text-amber-600" />,
        title: "Provisao 13o e Ferias ausente",
        description: `Com base na folha de ${formatBRL(folhaTotal)}, a provisao mensal deveria ser de aproximadamente ${formatBRL(impacto)}/mes (2,5 meses extras de folha por ano).`,
        estimatedImpact: impacto,
      });
    }

    // 2. Provisao rescisoes ausente
    const provisaoRescisoes = expenses["pessoal.provisao_rescisoes"] ?? 0;
    if (provisaoRescisoes === 0 && folhaTotal > 0) {
      result.push({
        icon: <AlertTriangle className="w-4 h-4 text-amber-600" />,
        title: "Provisao para Rescisoes ausente",
        description: "Nao ha reserva mensal para eventuais desligamentos. Isso pode impactar o caixa em caso de rescisao.",
        estimatedImpact: null,
      });
    }

    // 3. Encargos trabalhistas ausentes
    const encargos = expenses["pessoal.encargos"] ?? 0;
    const salarioBase = (expenses["pessoal.salarios"] ?? 0) + (expenses["pessoal.secretarias"] ?? 0);
    if (encargos === 0 && salarioBase > 0) {
      const impactoEncargos = Math.round(salarioBase * 0.35);
      result.push({
        icon: <AlertTriangle className="w-4 h-4 text-amber-600" />,
        title: "Encargos trabalhistas ausentes",
        description: `Com folha de ${formatBRL(salarioBase)}, os encargos (INSS, FGTS, etc.) representam 30-40% do valor. Custo estimado: ${formatBRL(impactoEncargos)}/mes.`,
        estimatedImpact: impactoEncargos,
      });
    }

    // 4. Seguro profissional ausente
    const seguroProfissional = expenses["seguros_taxas.seguro_profissional"] ?? 0;
    if (seguroProfissional === 0) {
      result.push({
        icon: <AlertTriangle className="w-4 h-4 text-amber-600" />,
        title: "Seguro profissional ausente",
        description: "Mentorado nao tem seguro de responsabilidade civil profissional. Custo medio: R$ 200 a R$ 500/mes. Risco alto sem protecao.",
        estimatedImpact: 350,
      });
    }

    // 5. Contabilidade ausente
    const contabilidade = expenses["administrativo.contabilidade"] ?? 0;
    if (contabilidade === 0) {
      result.push({
        icon: <AlertTriangle className="w-4 h-4 text-amber-600" />,
        title: "Custo contabil ausente",
        description: "Todo medico PJ precisa de contador. Custo medio: R$ 500 a R$ 1.500/mes dependendo da complexidade.",
        estimatedImpact: 800,
      });
    }

    // 6. Software de gestao ausente
    const software = expenses["administrativo.software_gestao"] ?? 0;
    if (software === 0) {
      result.push({
        icon: <AlertTriangle className="w-4 h-4 text-amber-500" />,
        title: "Sem custo com software de gestao",
        description: "Agenda, prontuario eletronico, sistema financeiro — geralmente R$ 200 a R$ 800/mes. Mesmo ferramentas gratuitas tem custo de tempo.",
        estimatedImpact: 400,
      });
    }

    // 7. Formacao e educacao continuada ausente
    const formacaoTotal =
      (expenses["formacao.cursos"] ?? 0) +
      (expenses["formacao.congressos"] ?? 0) +
      (expenses["formacao.assinaturas"] ?? 0);
    if (formacaoTotal === 0) {
      result.push({
        icon: <AlertTriangle className="w-4 h-4 text-amber-500" />,
        title: "Sem investimento em educacao continuada",
        description: "Congressos, cursos de atualizacao e assinaturas cientificas sao custos reais. Media: R$ 500 a R$ 2.000/mes quando diluido ao longo do ano.",
        estimatedImpact: 1000,
      });
    }

    // 8. Custo de oportunidade do espaco proprio
    const aluguel = expenses["espaco.aluguel"] ?? 0;
    const temEspaco = kpis.horasDisponiveis > 0;
    if (aluguel === 0 && temEspaco) {
      result.push({
        icon: <DollarSign className="w-4 h-4 text-amber-600" />,
        title: "Custo de oportunidade do espaco",
        description: "Aluguel zerado indica espaco proprio. Mas ha custo de oportunidade: quanto voce receberia se alugasse esse espaco? Esse valor e um custo real do negocio.",
        estimatedImpact: null,
      });
    }

    // 9. Custo de ociosidade
    if (kpis.custoOciosidade > 0 && kpis.horasDisponiveis > 0) {
      const horasOciosas = Math.max(0, kpis.horasDisponiveis - (mapaSala?.horasOcupadas ?? 0));
      result.push({
        icon: <Clock className="w-4 h-4 text-amber-600" />,
        title: "Custo de ociosidade",
        description: `${horasOciosas} horas ociosas x ${formatBRL(kpis.custoHoraDisponivel)}/hora = ${formatBRL(kpis.custoOciosidade)}/mes. O consultorio esta operando a ${formatPercent(kpis.percentOcupacao)} da capacidade.`,
        estimatedImpact: kpis.custoOciosidade,
      });
    }

    // 5. Categorias com zeroHint que estao zeradas
    EXPENSE_CATEGORIES.forEach((cat) => {
      if (!cat.zeroHint) return;
      const catTotal = cat.subcategories.reduce(
        (sum, sub) => sum + (expenses[`${cat.id}.${sub.id}`] ?? 0),
        0
      );
      if (catTotal === 0) {
        result.push({
          icon: <AlertTriangle className="w-4 h-4 text-amber-500" />,
          title: `Categoria "${cat.label}" com valor zero`,
          description: cat.zeroHint,
          estimatedImpact: null,
        });
      }
    });

    return result;
  }, [expenses, kpis, mapaSala]);

  // ============================================================
  // DADOS DO GRAFICO
  // ============================================================
  const chartData = useMemo(() => {
    return categorySummaries
      .filter((cat) => cat.total > 0)
      .map((cat) => ({
        name: cat.label.length > 25 ? cat.label.substring(0, 22) + "..." : cat.label,
        value: cat.total,
        fullName: cat.label,
      }));
  }, [categorySummaries]);

  // ============================================================
  // LOADING STATE
  // ============================================================
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Carregando analise...</span>
      </div>
    );
  }

  const hasData = kpis.custoFixoTotal > 0;
  const hasFaturamento = kpis.faturamentoMensal > 0;

  if (!hasData) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <DollarSign className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            O mentorado ainda nao preencheu dados de despesas.
          </p>
        </CardContent>
      </Card>
    );
  }

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="space-y-6">
      {/* Header com botoes de exportacao */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Analise de Despesas</h2>
          <p className="text-sm text-muted-foreground">
            Visao completa dos custos fixos e indicadores do mentorado
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => toast.info("Em breve", { description: "Exportacao para Excel sera disponibilizada em breve." })}
          >
            <FileSpreadsheet className="w-4 h-4 mr-1.5" />
            Exportar Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => toast.info("Em breve", { description: "Exportacao para PDF sera disponibilizada em breve." })}
          >
            <Download className="w-4 h-4 mr-1.5" />
            Exportar PDF
          </Button>
        </div>
      </div>

      {/* ============================== */}
      {/* SECAO 1: KPI CARDS             */}
      {/* ============================== */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <KPICard
          title="Custo Fixo Total"
          value={formatBRL(kpis.custoFixoTotal)}
          subtitle={`${Object.values(expenses).filter((v) => v > 0).length} itens preenchidos`}
          icon={<DollarSign className="w-4 h-4" />}
          variant="neutral"
        />
        <KPICard
          title="Custo/Hora Disponivel"
          value={kpis.horasDisponiveis > 0 ? `${formatBRL(kpis.custoHoraDisponivel)}/h` : "N/D"}
          subtitle={`${kpis.horasDisponiveis}h disponiveis/mes`}
          icon={<Clock className="w-4 h-4" />}
          variant="neutral"
        />
        <KPICard
          title="Taxa de Sala"
          value={mapaSala?.horasOcupadas ? `${formatBRL(kpis.taxaDeSala)}/h` : "N/D"}
          subtitle="Custo por hora ocupada"
          icon={<Building2 className="w-4 h-4" />}
          variant="neutral"
        />
        <KPICard
          title="Custo Ociosidade"
          value={formatBRL(kpis.custoOciosidade)}
          subtitle={`${Math.max(0, kpis.horasDisponiveis - (mapaSala?.horasOcupadas ?? 0))}h ociosas/mes`}
          icon={<TrendingDown className="w-4 h-4" />}
          variant={kpis.custoOciosidade > 0 ? "danger" : "success"}
        />
        <KPICard
          title="% Ocupacao"
          value={kpis.horasDisponiveis > 0 ? formatPercent(kpis.percentOcupacao) : "N/D"}
          subtitle={`${mapaSala?.horasOcupadas ?? 0}h de ${kpis.horasDisponiveis}h`}
          icon={<Percent className="w-4 h-4" />}
          variant={kpis.percentOcupacao >= 50 ? "success" : kpis.percentOcupacao > 0 ? "danger" : "neutral"}
        />
      </div>

      {/* ============================== */}
      {/* SECAO 2: TABELA + GRAFICO      */}
      {/* ============================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tabela de despesas */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Despesas por Categoria</CardTitle>
            <CardDescription>
              Detalhamento de todas as categorias e subcategorias
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Categoria / Subcategoria</TableHead>
                  <TableHead className="text-right">Valor (R$)</TableHead>
                  <TableHead className="text-right">% do Total</TableHead>
                  {hasFaturamento && (
                    <TableHead className="text-right">% Faturamento</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {categorySummaries.map((cat, catIdx) => (
                  <>
                    {/* Linha de categoria (subtotal) */}
                    <TableRow key={cat.id} className="bg-muted/50 font-semibold">
                      <TableCell className="font-semibold text-foreground">
                        {cat.label}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-foreground">
                        {formatBRL(cat.total)}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-foreground">
                        {formatPercent(cat.percentOfTotal)}
                      </TableCell>
                      {hasFaturamento && (
                        <TableCell className="text-right font-semibold text-foreground">
                          {cat.percentOfRevenue !== null ? formatPercent(cat.percentOfRevenue) : "-"}
                        </TableCell>
                      )}
                    </TableRow>
                    {/* Subcategorias */}
                    {cat.subcategories.map((sub, subIdx) => (
                      <TableRow
                        key={`${cat.id}-${sub.id}`}
                        className={subIdx % 2 === 0 ? "" : "bg-muted/20"}
                      >
                        <TableCell className="pl-6 text-muted-foreground">
                          <span className="flex items-center gap-1.5">
                            {sub.value === 0 && sub.hasHint && (
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            )}
                            {sub.label}
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {sub.value > 0 ? formatBRL(sub.value) : "-"}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {sub.value > 0 ? formatPercent(sub.percentOfTotal) : "-"}
                        </TableCell>
                        {hasFaturamento && (
                          <TableCell className="text-right text-muted-foreground">
                            {sub.value > 0 && sub.percentOfRevenue !== null
                              ? formatPercent(sub.percentOfRevenue)
                              : "-"}
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell className="font-bold text-foreground">Total Geral</TableCell>
                  <TableCell className="text-right font-bold text-foreground">
                    {formatBRL(kpis.custoFixoTotal)}
                  </TableCell>
                  <TableCell className="text-right font-bold text-foreground">100,0%</TableCell>
                  {hasFaturamento && (
                    <TableCell className="text-right font-bold text-foreground">
                      {formatPercent((kpis.custoFixoTotal / kpis.faturamentoMensal) * 100)}
                    </TableCell>
                  )}
                </TableRow>
              </TableFooter>
            </Table>
          </CardContent>
        </Card>

        {/* Grafico de barras horizontais */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribuicao por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={Math.max(300, chartData.length * 45)}>
                <BarChart
                  data={chartData}
                  layout="vertical"
                  margin={{ top: 0, right: 60, left: 10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis
                    type="number"
                    tickFormatter={(v: number) => formatBRLShort(v)}
                    fontSize={11}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={140}
                    fontSize={11}
                    tick={{ fill: "var(--color-muted-foreground)" }}
                  />
                  <Tooltip
                    formatter={(value: number) => [formatBRL(value), "Valor"]}
                    labelFormatter={(label: string) => {
                      const item = chartData.find((d) => d.name === label);
                      return item?.fullName ?? label;
                    }}
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid var(--color-border)",
                      backgroundColor: "var(--color-card)",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {chartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill="#1e3a5f" />
                    ))}
                    <LabelList
                      dataKey="value"
                      position="right"
                      formatter={(v: number) => formatBRLShort(v)}
                      style={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhuma despesa registrada.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ============================== */}
      {/* SECAO 3: ALERTAS               */}
      {/* ============================== */}
      {alerts.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/30">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              Custos Ocultos Identificados ({alerts.length})
            </CardTitle>
            <CardDescription>
              Arsenal do mentor: custos que o mentorado provavelmente esqueceu. Use para criar o momento WOW.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alerts.map((alert, idx) => (
                <div
                  key={idx}
                  className="flex gap-3 p-3 bg-white/80 rounded-lg border border-amber-100"
                >
                  <div className="mt-0.5 shrink-0">{alert.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-foreground">
                        {alert.title}
                      </span>
                      {alert.estimatedImpact !== null && (
                        <Badge variant="secondary" className="bg-amber-100 text-amber-800 text-xs">
                          Impacto: {formatBRL(alert.estimatedImpact)}/mes
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      {alert.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Resumo de impacto total */}
            {(() => {
              const totalImpacto = alerts.reduce((sum, a) => sum + (a.estimatedImpact ?? 0), 0);
              return totalImpacto > 0 ? (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-red-800">Impacto total estimado dos custos ocultos</p>
                      <p className="text-xs text-red-600 mt-0.5">Valor que o mentorado pode estar deixando de contabilizar por mes</p>
                    </div>
                    <p className="text-xl font-bold text-red-700">{formatBRL(totalImpacto)}/mes</p>
                  </div>
                  <p className="text-xs text-red-500 mt-2">
                    Isso representa {kpis.custoFixoTotal > 0 ? formatPercent((totalImpacto / kpis.custoFixoTotal) * 100) : "—"} sobre o custo fixo declarado de {formatBRL(kpis.custoFixoTotal)}
                  </p>
                </div>
              ) : null;
            })()}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============================================================
// KPI CARD SUB-COMPONENT
// ============================================================
function KPICard({
  title,
  value,
  subtitle,
  icon,
  variant = "neutral",
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  variant?: "neutral" | "success" | "danger";
}) {
  const variantStyles = {
    neutral: "border-border",
    success: "border-emerald-200 bg-emerald-50/30",
    danger: "border-red-200 bg-red-50/30",
  };

  const valueColor = {
    neutral: "text-foreground",
    success: "text-emerald-700",
    danger: "text-red-700",
  };

  return (
    <Card className={`py-4 ${variantStyles[variant]}`}>
      <CardContent className="px-4 py-0">
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-muted-foreground">{icon}</span>
          <span className="text-xs text-muted-foreground font-medium truncate">
            {title}
          </span>
        </div>
        <p className={`text-lg font-bold ${valueColor[variant]} truncate`}>
          {value}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">
          {subtitle}
        </p>
      </CardContent>
    </Card>
  );
}
