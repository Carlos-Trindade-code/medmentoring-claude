/**
 * SimulationSummary — Resumo read-only do simulador de cenarios para o mentor
 *
 * Mostra KPIs projetados e mix de atendimentos.
 * Exclusivo do mentor.
 */
import { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  DollarSign,
  TrendingUp,
  Clock,
  Target,
  Loader2,
  Calculator,
} from "lucide-react";
import { calculateSimulation } from "../../../shared/pricing-model";

interface SimulationSummaryProps {
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

export function SimulationSummary({ menteeId }: SimulationSummaryProps) {
  const { data: simData, isLoading: simLoading } = trpc.mentor.getSimulationData.useQuery({ menteeId });
  const { data: expenseData, isLoading: expLoading } = trpc.mentor.getExpenseAnalysis.useQuery({ menteeId });

  const isLoading = simLoading || expLoading;

  const simulation = useMemo(() => {
    if (!simData?.servicos || simData.servicos.length === 0) return null;

    const custoFixoTotal = expenseData?.grandTotal ?? 0;
    const taxaSalaHora = expenseData?.metrics?.taxaSala ?? 0;
    const horasDisponiveis = expenseData?.metrics?.horasDisponiveis ?? 160;

    return calculateSimulation({
      custoFixoTotal,
      custosVariaveisPercent: 20,
      taxaSalaHora,
      horasDisponiveisMes: horasDisponiveis || 160,
      horasOcupadasMes: expenseData?.mapaSala?.horasOcupadas ?? 80,
      faturamentoMensal: simData.params?.faturamentoMensal ?? 0,
      servicos: simData.servicos,
      mixAtendimentos: simData.mixAtendimentos ?? {},
    });
  }, [simData, expenseData]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Carregando simulacao...</span>
      </div>
    );
  }

  if (!simulation || !simData?.servicos) {
    return (
      <Card>
        <CardContent className="py-6 text-center">
          <Calculator className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            Simulador ainda nao foi configurado pelo mentorado.
          </p>
        </CardContent>
      </Card>
    );
  }

  const custoFixo = expenseData?.grandTotal ?? 0;
  const horasDisp = expenseData?.metrics?.horasDisponiveis ?? 0;
  const margemVariant = simulation.margemLiquida > 30 ? "success" : simulation.margemLiquida > 15 ? "neutral" : "danger";
  const horasVariant = simulation.cargaHorariaNecessaria > horasDisp && horasDisp > 0 ? "danger" : "success";

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard
          title="Faturamento Projetado"
          value={formatBRL(simulation.faturamentoBrutoTotal)}
          icon={<DollarSign className="w-4 h-4" />}
          variant="neutral"
        />
        <KPICard
          title="Lucro Liquido"
          value={formatBRL(simulation.lucroLiquido)}
          icon={<TrendingUp className="w-4 h-4" />}
          variant={margemVariant}
        />
        <KPICard
          title="Margem Liquida"
          value={formatPercent(simulation.margemLiquida)}
          icon={<Target className="w-4 h-4" />}
          variant={margemVariant}
        />
        <KPICard
          title="Carga Horaria"
          value={`${simulation.cargaHorariaNecessaria.toFixed(0)}h / ${horasDisp.toFixed(0)}h`}
          icon={<Clock className="w-4 h-4" />}
          variant={horasVariant}
        />
      </div>

      {/* Mix de Atendimentos */}
      {simulation.porServico.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Mix de Atendimentos</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Servico</TableHead>
                  <TableHead className="text-right">Qtd/Mes</TableHead>
                  <TableHead className="text-right">Faturamento</TableHead>
                  <TableHead className="text-right">Horas</TableHead>
                  <TableHead className="text-right">Margem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {simulation.porServico.map((svc) => (
                  <TableRow key={svc.serviceId}>
                    <TableCell className="font-medium">{svc.nome}</TableCell>
                    <TableCell className="text-right">{svc.quantidade}</TableCell>
                    <TableCell className="text-right">{formatBRL(svc.faturamentoBruto)}</TableCell>
                    <TableCell className="text-right">{svc.horasNecessarias.toFixed(0)}h</TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant="secondary"
                        className={
                          svc.margemOperacional > 30
                            ? "bg-emerald-100 text-emerald-800"
                            : svc.margemOperacional > 10
                              ? "bg-amber-100 text-amber-800"
                              : "bg-red-100 text-red-800"
                        }
                      >
                        {formatPercent(svc.margemOperacional)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Summary line */}
      <div className="text-xs text-muted-foreground text-center">
        Custo fixo total: {formatBRL(custoFixo)} | Ponto de equilibrio: {formatBRL(simulation.pontoEquilibrio)}
      </div>
    </div>
  );
}

function KPICard({
  title,
  value,
  icon,
  variant = "neutral",
}: {
  title: string;
  value: string;
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
    <Card className={`py-3 ${variantStyles[variant]}`}>
      <CardContent className="px-3 py-0">
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-muted-foreground">{icon}</span>
          <span className="text-xs text-muted-foreground font-medium truncate">{title}</span>
        </div>
        <p className={`text-base font-bold ${valueColor[variant]} truncate`}>{value}</p>
      </CardContent>
    </Card>
  );
}
