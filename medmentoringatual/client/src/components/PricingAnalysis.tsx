/**
 * PricingAnalysis — Visao do mentor sobre a tabela de servicos do mentorado
 *
 * Mostra servicos cadastrados, margens, lucros e alertas.
 * Exclusivo do mentor — mentorado nao ve esta analise.
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
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  DollarSign,
  TrendingUp,
  Target,
  Loader2,
  BarChart3,
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

interface PricingAnalysisProps {
  menteeId: number;
}

function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

function formatPercent(value: number): string {
  return `${value.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

export function PricingAnalysis({ menteeId }: PricingAnalysisProps) {
  const { data, isLoading } = trpc.mentor.getPricingAnalysis.useQuery({ menteeId });

  const alerts = useMemo(() => {
    if (!data) return [];
    const result: { title: string; description: string; variant: "warning" | "danger" }[] = [];
    const sim = data.simulation;

    // Low margin services
    for (const svc of sim.porServico) {
      if (svc.margemBruta < 20) {
        result.push({
          title: `Margem baixa: ${svc.nome}`,
          description: `Margem bruta de ${formatPercent(svc.margemBruta)} — abaixo de 20%. Revisar custos diretos ou aumentar preco.`,
          variant: svc.margemBruta < 10 ? "danger" : "warning",
        });
      }
    }

    // Overloaded hours
    if (sim.cargaHorariaNecessaria > data.horasDisponiveis && data.horasDisponiveis > 0) {
      result.push({
        title: "Carga horaria excede capacidade",
        description: `Mix atual exige ${sim.cargaHorariaNecessaria.toFixed(0)}h/mes mas so ha ${data.horasDisponiveis.toFixed(0)}h disponiveis.`,
        variant: "danger",
      });
    }

    // Negative profit
    if (sim.lucroLiquido < 0) {
      result.push({
        title: "Operacao no prejuizo",
        description: `Lucro liquido projetado: ${formatBRL(sim.lucroLiquido)}. Faturamento nao cobre custos fixos + variaveis.`,
        variant: "danger",
      });
    }

    return result;
  }, [data]);

  // Chart data: margin per service
  const chartData = useMemo(() => {
    if (!data) return [];
    return data.simulation.porServico.map((svc) => ({
      name: svc.nome.length > 20 ? svc.nome.substring(0, 17) + "..." : svc.nome,
      fullName: svc.nome,
      margemBruta: Number(svc.margemBruta.toFixed(1)),
      margemOp: Number(svc.margemOperacional.toFixed(1)),
    }));
  }, [data]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Carregando analise de precificacao...</span>
      </div>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <DollarSign className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            O mentorado ainda nao preencheu a tabela de servicos.
          </p>
        </CardContent>
      </Card>
    );
  }

  const sim = data.simulation;
  const margemVariant = sim.margemLiquida > 30 ? "success" : sim.margemLiquida > 15 ? "neutral" : "danger";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Analise de Precificacao</h2>
        <p className="text-sm text-muted-foreground">
          Servicos cadastrados pelo mentorado com margens e projecoes
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard
          title="Faturamento Bruto"
          value={formatBRL(sim.faturamentoBrutoTotal)}
          subtitle={`${sim.porServico.length} servico(s) ativo(s)`}
          icon={<DollarSign className="w-4 h-4" />}
          variant="neutral"
        />
        <KPICard
          title="Margem Liquida"
          value={formatPercent(sim.margemLiquida)}
          subtitle={`Lucro: ${formatBRL(sim.lucroLiquido)}`}
          icon={<TrendingUp className="w-4 h-4" />}
          variant={margemVariant}
        />
        <KPICard
          title="Custo/Hora"
          value={data.horasDisponiveis > 0 ? `${formatBRL(sim.custoHora)}/h` : "N/D"}
          subtitle={`${data.horasDisponiveis.toFixed(0)}h disponiveis`}
          icon={<BarChart3 className="w-4 h-4" />}
          variant="neutral"
        />
        <KPICard
          title="Ponto de Equilibrio"
          value={formatBRL(sim.pontoEquilibrio)}
          subtitle={sim.faturamentoBrutoTotal >= sim.pontoEquilibrio ? "Acima do PE" : "Abaixo do PE"}
          icon={<Target className="w-4 h-4" />}
          variant={sim.faturamentoBrutoTotal >= sim.pontoEquilibrio ? "success" : "danger"}
        />
      </div>

      {/* Services Table + Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Tabela de Servicos</CardTitle>
            <CardDescription>
              Detalhamento de cada servico com custos e margens
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Servico</TableHead>
                  <TableHead className="text-right">Preco</TableHead>
                  <TableHead className="text-right">Qtd/Mes</TableHead>
                  <TableHead className="text-right">Faturamento</TableHead>
                  <TableHead className="text-right">Custos</TableHead>
                  <TableHead className="text-right">Lucro Bruto</TableHead>
                  <TableHead className="text-right">Margem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sim.porServico.map((svc, idx) => (
                  <TableRow key={svc.serviceId} className={idx % 2 === 0 ? "" : "bg-muted/20"}>
                    <TableCell className="font-medium">{svc.nome}</TableCell>
                    <TableCell className="text-right">{formatBRL(svc.faturamentoBruto / (svc.quantidade || 1))}</TableCell>
                    <TableCell className="text-right">{svc.quantidade}</TableCell>
                    <TableCell className="text-right">{formatBRL(svc.faturamentoBruto)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatBRL(svc.imposto + svc.taxaCartao + svc.mod + svc.matMed + svc.bonus + svc.taxaEquipamento)}
                    </TableCell>
                    <TableCell className="text-right">{formatBRL(svc.lucroBruto)}</TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant="secondary"
                        className={
                          svc.margemBruta > 40
                            ? "bg-emerald-100 text-emerald-800"
                            : svc.margemBruta > 20
                              ? "bg-amber-100 text-amber-800"
                              : "bg-red-100 text-red-800"
                        }
                      >
                        {formatPercent(svc.margemBruta)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell className="font-bold" colSpan={3}>Total</TableCell>
                  <TableCell className="text-right font-bold">{formatBRL(sim.faturamentoBrutoTotal)}</TableCell>
                  <TableCell className="text-right font-bold text-muted-foreground">
                    {formatBRL(sim.custosVariaveisTotal)}
                  </TableCell>
                  <TableCell className="text-right font-bold">
                    {formatBRL(sim.faturamentoBrutoTotal - sim.custosVariaveisTotal)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="secondary" className="font-bold">
                      {sim.faturamentoBrutoTotal > 0
                        ? formatPercent(((sim.faturamentoBrutoTotal - sim.custosVariaveisTotal) / sim.faturamentoBrutoTotal) * 100)
                        : "0%"}
                    </Badge>
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </CardContent>
        </Card>

        {/* Margin chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Margem por Servico</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 50)}>
                <BarChart
                  data={chartData}
                  layout="vertical"
                  margin={{ top: 0, right: 50, left: 10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} fontSize={11} />
                  <YAxis type="category" dataKey="name" width={120} fontSize={11} tick={{ fill: "var(--color-muted-foreground)" }} />
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      `${value.toFixed(1)}%`,
                      name === "margemBruta" ? "Margem Bruta" : "Margem Operacional",
                    ]}
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid var(--color-border)",
                      backgroundColor: "var(--color-card)",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="margemBruta" name="margemBruta" radius={[0, 4, 4, 0]}>
                    {chartData.map((item, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={item.margemBruta > 40 ? "#059669" : item.margemBruta > 20 ? "#d97706" : "#dc2626"}
                      />
                    ))}
                    <LabelList
                      dataKey="margemBruta"
                      position="right"
                      formatter={(v: number) => `${v}%`}
                      style={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhum servico com quantidade definida.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/30">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              Pontos de Atencao
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alerts.map((alert, idx) => (
                <div
                  key={idx}
                  className={`flex gap-3 p-3 rounded-lg border ${
                    alert.variant === "danger"
                      ? "bg-red-50/80 border-red-200"
                      : "bg-white/80 border-amber-100"
                  }`}
                >
                  <AlertTriangle
                    className={`w-4 h-4 mt-0.5 shrink-0 ${
                      alert.variant === "danger" ? "text-red-600" : "text-amber-600"
                    }`}
                  />
                  <div>
                    <span className="text-sm font-medium text-foreground">{alert.title}</span>
                    <p className="text-xs text-muted-foreground mt-1">{alert.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

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
          <span className="text-xs text-muted-foreground font-medium truncate">{title}</span>
        </div>
        <p className={`text-lg font-bold ${valueColor[variant]} truncate`}>{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">{subtitle}</p>
      </CardContent>
    </Card>
  );
}
