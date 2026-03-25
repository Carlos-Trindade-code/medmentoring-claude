/**
 * IvmpAnalysis — Visao do mentor sobre o iVMP do mentorado
 *
 * Mostra TODOS os dados: score final, radar chart, fortes/gaps, tabela com edicao inline.
 * Este componente e exclusivo do mentor — o mentorado nao ve esta analise.
 *
 * Secoes:
 *  1. Score Overview — gauge com iVMP final, cor por faixa
 *  2. Radar Chart + Top Fortes/Gaps lado a lado
 *  3. Tabela detalhada (53 perguntas) agrupada por dimensao (accordion)
 *  4. Botoes de exportacao
 */
import { useState, useCallback, useMemo } from "react";
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
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Download,
  FileSpreadsheet,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Loader2,
  Target,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  IVMP_DIMENSIONS,
  TOTAL_IVMP_QUESTIONS,
} from "../../../shared/ivmp-questions";

// ============================================================
// TIPOS
// ============================================================
interface IvmpAnalysisProps {
  menteeId: number;
}

interface DimensionScore {
  score: number;
  maxScore: number;
  percentage: number;
  answeredCount: number;
}

interface RadarDataPoint {
  dimension: string;
  score: number;
  benchmark: number;
}

interface ForteOrGap {
  dimension: string;
  dimensionId: string;
  score: number;
  peso: number;
  benchmark: number;
}

interface Alerta {
  questionId: string;
  texto: string;
  dimension: string;
  score: number;
}

// ============================================================
// FORMATACAO
// ============================================================
function formatScore(value: number): string {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

function formatPercent(value: number): string {
  return `${formatScore(value)}%`;
}

// ============================================================
// SCORE GAUGE SUB-COMPONENT
// ============================================================
function ScoreGauge({ score }: { score: number }) {
  const clampedScore = Math.max(0, Math.min(100, score));
  // Arc from 180 to 0 degrees (left to right semicircle)
  const angle = Math.PI - (clampedScore / 100) * Math.PI;
  const radius = 80;
  const cx = 100;
  const cy = 95;
  const x = cx + radius * Math.cos(angle);
  const y = cy - radius * Math.sin(angle);
  const largeArc = clampedScore > 50 ? 1 : 0;

  // Color by score range
  let color: string;
  let bgColor: string;
  let label: string;
  if (score >= 70) {
    color = "#16a34a";
    bgColor = "#dcfce7";
    label = "Excelente";
  } else if (score >= 50) {
    color = "#ca8a04";
    bgColor = "#fef9c3";
    label = "Em Desenvolvimento";
  } else {
    color = "#dc2626";
    bgColor = "#fee2e2";
    label = "Necessita Atencao";
  }

  // Background arc (full semicircle, gray)
  const bgArcX = cx + radius * Math.cos(0);
  const bgArcY = cy - radius * Math.sin(0);

  return (
    <div className="flex flex-col items-center">
      <svg width="200" height="120" viewBox="0 0 200 120">
        {/* Background arc */}
        <path
          d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 1 1 ${bgArcX} ${bgArcY}`}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="12"
          strokeLinecap="round"
        />
        {/* Score arc */}
        {clampedScore > 0 && (
          <path
            d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 ${largeArc} 1 ${x} ${y}`}
            fill="none"
            stroke={color}
            strokeWidth="12"
            strokeLinecap="round"
          />
        )}
        {/* Score text */}
        <text
          x={cx}
          y={cy - 15}
          textAnchor="middle"
          className="text-3xl font-bold"
          fill={color}
          fontSize="32"
          fontWeight="700"
        >
          {formatScore(clampedScore)}%
        </text>
        {/* Label */}
        <text
          x={cx}
          y={cy + 8}
          textAnchor="middle"
          fill="#6b7280"
          fontSize="11"
        >
          iVMP Final
        </text>
      </svg>
      <Badge
        className="mt-1 text-xs"
        style={{ backgroundColor: bgColor, color, border: `1px solid ${color}30` }}
      >
        {label}
      </Badge>
    </div>
  );
}

// ============================================================
// STATUS ICON SUB-COMPONENT
// ============================================================
function ScoreStatusIcon({ nota }: { nota: number }) {
  if (nota >= 7) {
    return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
  }
  if (nota >= 4) {
    return <AlertCircle className="w-4 h-4 text-amber-500" />;
  }
  return <AlertTriangle className="w-4 h-4 text-red-500" />;
}

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
export function IvmpAnalysis({ menteeId }: IvmpAnalysisProps) {
  const utils = trpc.useUtils();
  const { data: analysisData, isLoading } = trpc.mentor.getIvmpAnalysis.useQuery({ menteeId });
  const updateAnswer = trpc.mentor.updateIvmpAnswer.useMutation({
    onSuccess: () => {
      utils.mentor.getIvmpAnalysis.invalidate({ menteeId });
    },
  });

  // Local editing state: { questionId: editingValue }
  const [editingValues, setEditingValues] = useState<Record<string, string>>({});

  // Extract data
  const answers: Record<string, number> = (analysisData?.answers as Record<string, number>) ?? {};
  const ivmpFinal: number = (analysisData?.ivmpFinal as number) ?? 0;
  const dimensionScores: Record<string, DimensionScore> =
    (analysisData?.dimensionScores as Record<string, DimensionScore>) ?? {};
  const radarData: RadarDataPoint[] = (analysisData?.radarData as RadarDataPoint[]) ?? [];
  const top3Fortes: ForteOrGap[] = (analysisData?.top3Fortes as ForteOrGap[]) ?? [];
  const top3Gaps: ForteOrGap[] = (analysisData?.top3Gaps as ForteOrGap[]) ?? [];
  const alertas: Alerta[] = (analysisData?.alertas as Alerta[]) ?? [];

  const answeredCount = useMemo(
    () => Object.keys(answers).length,
    [answers],
  );

  const dimensionsWithScores = useMemo(
    () =>
      IVMP_DIMENSIONS.map((dim) => ({
        ...dim,
        dimScore: dimensionScores[dim.id],
      })),
    [dimensionScores],
  );

  // Handle inline score editing
  const handleScoreEdit = useCallback(
    (questionId: string, value: string) => {
      setEditingValues((prev) => ({ ...prev, [questionId]: value }));
    },
    [],
  );

  const handleScoreBlur = useCallback(
    (questionId: string) => {
      const rawValue = editingValues[questionId];
      if (rawValue === undefined) return;

      const parsed = parseFloat(rawValue.replace(",", "."));
      if (isNaN(parsed) || parsed < 0 || parsed > 10) {
        toast.error("Nota invalida", {
          description: "Insira um valor entre 0 e 10.",
        });
        setEditingValues((prev) => {
          const next = { ...prev };
          delete next[questionId];
          return next;
        });
        return;
      }

      const nota = Math.round(parsed * 10) / 10;
      const oldIvmp = ivmpFinal;

      updateAnswer.mutate(
        { menteeId, questionId, value: nota },
        {
          onSuccess: (result: any) => {
            const newIvmp = result?.ivmpFinal ?? null;
            if (newIvmp !== null) {
              toast.success("Nota atualizada", {
                description: `iVMP alterado de ${formatScore(oldIvmp)}% para ${formatScore(newIvmp)}%`,
              });
            } else {
              toast.success("Nota atualizada");
            }
          },
          onError: () => {
            toast.error("Erro ao salvar", {
              description: "Nao foi possivel atualizar a nota. Tente novamente.",
            });
          },
        },
      );

      setEditingValues((prev) => {
        const next = { ...prev };
        delete next[questionId];
        return next;
      });
    },
    [editingValues, menteeId, ivmpFinal, updateAnswer],
  );

  const handleScoreKeyDown = useCallback(
    (questionId: string, e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        handleScoreBlur(questionId);
      }
      if (e.key === "Escape") {
        setEditingValues((prev) => {
          const next = { ...prev };
          delete next[questionId];
          return next;
        });
      }
    },
    [handleScoreBlur],
  );

  // ============================================================
  // LOADING STATE
  // ============================================================
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Carregando analise iVMP...</span>
      </div>
    );
  }

  if (answeredCount === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Target className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            O mentorado ainda nao preencheu o questionario iVMP.
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
      {/* Header com titulo */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Analise iVMP</h2>
          <p className="text-sm text-muted-foreground">
            Indice de Valor Medico Percebido — visao completa do mentorado
          </p>
        </div>
      </div>

      {/* ============================== */}
      {/* SECAO 1: SCORE OVERVIEW        */}
      {/* ============================== */}
      <Card className="border-[#1a2332]/10">
        <CardContent className="py-6">
          <div className="flex flex-col items-center">
            <ScoreGauge score={ivmpFinal} />
            <p className="text-sm font-medium text-[#1a2332] mt-3">
              Indice de Valor Medico Percebido
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {answeredCount} perguntas respondidas &bull; {IVMP_DIMENSIONS.length} dimensoes avaliadas
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ============================== */}
      {/* SECAO 2: RADAR + FORTES/GAPS   */}
      {/* ============================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Radar Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Mapa por Dimensao</CardTitle>
            <CardDescription>
              Comparativo entre o mentorado e o benchmark de referencia
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 11 }} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Radar
                  name="Mentorado"
                  dataKey="score"
                  stroke="#1a2332"
                  fill="#1a2332"
                  fillOpacity={0.3}
                />
                <Radar
                  name="Benchmark"
                  dataKey="benchmark"
                  stroke="#c9a84c"
                  fill="#c9a84c"
                  fillOpacity={0.1}
                  strokeDasharray="5 5"
                />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Fortes + Gaps */}
        <div className="space-y-4">
          {/* Pontos Fortes */}
          <Card className="border-emerald-200 bg-emerald-50/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                Pontos Fortes
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {top3Fortes.map((item, idx) => (
                  <div
                    key={item.dimensionId}
                    className="flex items-center justify-between gap-2 p-2 bg-white/80 rounded-lg border border-emerald-100"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-bold text-emerald-700 shrink-0">
                        #{idx + 1}
                      </span>
                      <span className="text-sm text-foreground truncate">
                        {item.dimension}
                      </span>
                    </div>
                    <Badge className="bg-emerald-100 text-emerald-800 text-xs shrink-0">
                      {formatPercent(item.score)}
                    </Badge>
                  </div>
                ))}
                {top3Fortes.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    Dados insuficientes
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Oportunidades de Melhoria */}
          <Card className="border-amber-200 bg-amber-50/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-amber-600" />
                Oportunidades de Melhoria
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {top3Gaps.map((item, idx) => (
                  <div
                    key={item.dimensionId}
                    className="flex items-center justify-between gap-2 p-2 bg-white/80 rounded-lg border border-amber-100"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-bold text-amber-700 shrink-0">
                        #{idx + 1}
                      </span>
                      <span className="text-sm text-foreground truncate">
                        {item.dimension}
                      </span>
                    </div>
                    <Badge className="bg-amber-100 text-amber-800 text-xs shrink-0">
                      {formatPercent(item.score)}
                    </Badge>
                  </div>
                ))}
                {top3Gaps.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    Dados insuficientes
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ============================== */}
      {/* SECAO 3: TABELA DETALHADA      */}
      {/* ============================== */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Detalhamento por Pergunta</CardTitle>
          <CardDescription>
            Todas as {TOTAL_IVMP_QUESTIONS} perguntas agrupadas por dimensao — clique para expandir e editar notas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" className="w-full">
            {dimensionsWithScores.map((dim) => {
              const dimScore = dim.dimScore;
              const percentage = dimScore?.percentage ?? 0;
              const pesoPercent = Math.round(dim.peso * 100);

              let scoreBadgeClass = "bg-gray-100 text-gray-700";
              if (dimScore && dimScore.answeredCount > 0) {
                if (percentage >= 70) {
                  scoreBadgeClass = "bg-emerald-100 text-emerald-800";
                } else if (percentage >= 50) {
                  scoreBadgeClass = "bg-amber-100 text-amber-800";
                } else {
                  scoreBadgeClass = "bg-red-100 text-red-800";
                }
              }

              return (
                <AccordionItem key={dim.id} value={dim.id}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-3 flex-1 min-w-0 pr-2">
                      <span className="text-sm font-semibold text-foreground truncate">
                        {dim.label}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge className={`text-xs ${scoreBadgeClass}`}>
                          {dimScore && dimScore.answeredCount > 0
                            ? formatPercent(percentage)
                            : "N/D"}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          Peso: {pesoPercent}%
                        </Badge>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[60%]">Pergunta</TableHead>
                          <TableHead className="text-center w-[80px]">Nota</TableHead>
                          <TableHead className="text-center w-[80px]">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dim.perguntas.map((q, qIdx) => {
                          const nota = answers[q.id];
                          const hasAnswer = nota !== undefined;
                          const editValue = editingValues[q.id];
                          const isEditing = editValue !== undefined;
                          const displayNota = hasAnswer ? nota : null;

                          return (
                            <TableRow
                              key={q.id}
                              className={qIdx % 2 === 0 ? "" : "bg-muted/20"}
                            >
                              <TableCell className="text-sm text-muted-foreground">
                                <span className="flex items-start gap-2">
                                  <span className="text-xs text-muted-foreground/60 font-mono shrink-0 mt-0.5">
                                    {qIdx + 1}.
                                  </span>
                                  {q.texto}
                                </span>
                              </TableCell>
                              <TableCell className="text-center">
                                <Input
                                  type="text"
                                  inputMode="decimal"
                                  className="w-16 h-8 text-center text-sm mx-auto"
                                  value={
                                    isEditing
                                      ? editValue
                                      : hasAnswer
                                        ? nota.toLocaleString("pt-BR")
                                        : ""
                                  }
                                  placeholder="-"
                                  onChange={(e) =>
                                    handleScoreEdit(q.id, e.target.value)
                                  }
                                  onBlur={() => handleScoreBlur(q.id)}
                                  onKeyDown={(e) => handleScoreKeyDown(q.id, e)}
                                />
                              </TableCell>
                              <TableCell className="text-center">
                                {hasAnswer ? (
                                  <div className="flex items-center justify-center gap-1.5">
                                    <ScoreStatusIcon nota={nota} />
                                    {nota < 4 && (
                                      <Badge className="bg-red-100 text-red-700 text-xs">
                                        Alerta
                                      </Badge>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-xs text-muted-foreground">-</span>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </CardContent>
      </Card>

      {/* ============================== */}
      {/* SECAO 3.5: ALERTAS             */}
      {/* ============================== */}
      {alertas.length > 0 && (
        <Card className="border-red-200 bg-red-50/30">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              Alertas ({alertas.length})
            </CardTitle>
            <CardDescription>
              Perguntas com nota inferior a 4 que exigem atencao prioritaria
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alertas.map((alerta) => (
                <div
                  key={alerta.questionId}
                  className="flex gap-3 p-3 bg-white/80 rounded-lg border border-red-100"
                >
                  <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-xs text-red-700 border-red-200">
                        {alerta.dimension}
                      </Badge>
                      <Badge className="bg-red-100 text-red-800 text-xs">
                        Nota: {alerta.score.toLocaleString("pt-BR")}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {alerta.texto}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ============================== */}
      {/* SECAO 4: ACOES                 */}
      {/* ============================== */}
      <div className="flex items-center justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            toast.info("Em breve", {
              description: "Exportacao para Excel sera disponibilizada em breve.",
            })
          }
        >
          <FileSpreadsheet className="w-4 h-4 mr-1.5" />
          Exportar Excel
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            toast.info("Em breve", {
              description: "Exportacao para PDF sera disponibilizada em breve.",
            })
          }
        >
          <Download className="w-4 h-4 mr-1.5" />
          Exportar PDF
        </Button>
      </div>
    </div>
  );
}
