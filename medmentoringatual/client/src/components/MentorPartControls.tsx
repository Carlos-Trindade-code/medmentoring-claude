/**
 * MentorPartControls — Per-part release controls for mentor's pillar view.
 *
 * Shows each part of a pillar with:
 *  - Toggle switch to release/unreleased the part
 *  - Status badge with release date
 *  - Expandable analysis tools (ExpenseAnalysis, IvmpAnalysis, ScenarioSimulator)
 *  - Export buttons (PDF / Excel)
 */
import { lazy, Suspense, useState } from "react";
import { trpc } from "@/lib/trpc";
import { PILLAR_PARTS } from "../../../shared/pillar-parts";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  ChevronDown,
  ChevronUp,
  Download,
  FileSpreadsheet,
  Loader2,
  Lock,
  Unlock,
  RefreshCw,
} from "lucide-react";

// Lazy-load heavy analysis components
const ExpenseAnalysis = lazy(() =>
  import("@/components/ExpenseAnalysis").then((m) => ({ default: m.ExpenseAnalysis }))
);
const IvmpAnalysis = lazy(() =>
  import("@/components/IvmpAnalysis").then((m) => ({ default: m.IvmpAnalysis }))
);
const ScenarioSimulator = lazy(() =>
  import("@/components/ScenarioSimulator").then((m) => ({ default: m.ScenarioSimulator }))
);

interface MentorPartControlsProps {
  menteeId: number;
  pillarId: number;
}

function AnalysisLoader() {
  return (
    <div className="flex items-center justify-center py-8">
      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      <span className="ml-2 text-sm text-muted-foreground">Carregando...</span>
    </div>
  );
}

export default function MentorPartControls({ menteeId, pillarId }: MentorPartControlsProps) {
  const parts = PILLAR_PARTS[pillarId];
  const [expandedPart, setExpandedPart] = useState<string | null>(null);
  const generatePdfMutation = trpc.pillarReport.generatePdf.useMutation({
    onSuccess: (data) => {
      const byteCharacters = atob(data.base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = data.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("PDF baixado com sucesso!");
    },
    onError: (err) => {
      toast.error("Erro ao gerar PDF", { description: err.message });
    },
  });

  const downloadingPdf = generatePdfMutation.isPending;

  const releases = trpc.mentor.getPartReleases.useQuery({ menteeId, pillarId });
  const updateRelease = trpc.mentor.updatePartRelease.useMutation({
    onSuccess: () => {
      releases.refetch();
      toast.success("Liberacao atualizada!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (!parts || parts.length === 0) return null;

  const releasesData = releases.data ?? [];

  function getRelease(partId: string) {
    return releasesData.find((r: any) => r.partId === partId);
  }

  function formatDate(d: string | Date | null | undefined) {
    if (!d) return null;
    const date = new Date(d);
    return date.toLocaleDateString("pt-BR");
  }

  function toggleExpand(partId: string) {
    setExpandedPart((prev) => (prev === partId ? null : partId));
  }

  /**
   * Renders the inline analysis tool for special parts.
   * Pilar 3 Part B = ExpenseAnalysis
   * Pilar 3 Part C = IvmpAnalysis
   * Pilar 3 Part D = ScenarioSimulator (mentor mode)
   */
  function renderAnalysisTool(partId: string) {
    if (pillarId === 3 && partId === "b") {
      return (
        <Suspense fallback={<AnalysisLoader />}>
          <ExpenseAnalysis menteeId={menteeId} />
        </Suspense>
      );
    }
    if (pillarId === 3 && partId === "c") {
      return (
        <Suspense fallback={<AnalysisLoader />}>
          <IvmpAnalysis menteeId={menteeId} />
        </Suspense>
      );
    }
    if (pillarId === 3 && partId === "d") {
      return (
        <Suspense fallback={<AnalysisLoader />}>
          <ScenarioSimulator menteeId={menteeId} mode="mentor" />
        </Suspense>
      );
    }
    // For other parts, show a summary placeholder
    return (
      <div className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-4">
        Resumo das respostas do mentorado para esta parte estara disponivel em breve.
      </div>
    );
  }

  return (
    <div className="mt-4">
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
        Controle por Parte
      </h4>
      <div className="space-y-2">
        {parts.map((part) => {
          const release = getRelease(part.id);
          const isReleased = !!release?.released;
          const releasedAt = release?.releasedAt;
          const isExpanded = expandedPart === part.id;

          return (
            <div
              key={part.id}
              className="border border-border rounded-lg overflow-hidden bg-white"
            >
              {/* Part header */}
              <div className="flex items-center gap-3 p-3">
                {/* Toggle + Botões de ação */}
                <div className="flex items-center gap-2">
                  <Switch
                    checked={isReleased}
                    onCheckedChange={(checked) => {
                      updateRelease.mutate({
                        menteeId,
                        pillarId,
                        partId: part.id,
                        partLabel: part.label,
                        released: checked,
                      });
                    }}
                    disabled={updateRelease.isPending}
                  />
                  {isReleased && (
                    <button
                      title="Solicitar revisão — desliga a liberação para o mentorado refazer"
                      className="text-xs text-amber-600 hover:text-amber-800 flex items-center gap-1 border border-amber-200 bg-amber-50 rounded px-2 py-1 hover:bg-amber-100 transition-colors"
                      disabled={updateRelease.isPending}
                      onClick={() => {
                        updateRelease.mutate({
                          menteeId,
                          pillarId,
                          partId: part.id,
                          partLabel: part.label,
                          released: false,
                        });
                        toast.info("Liberação removida", { description: "O mentorado poderá refazer esta parte." });
                      }}
                    >
                      <RefreshCw className="w-3 h-3" />
                      Solicitar revisão
                    </button>
                  )}
                  {!isReleased && (
                    <button
                      title="Liberar esta parte para o mentorado"
                      className="text-xs text-emerald-600 hover:text-emerald-800 flex items-center gap-1 border border-emerald-200 bg-emerald-50 rounded px-2 py-1 hover:bg-emerald-100 transition-colors"
                      disabled={updateRelease.isPending}
                      onClick={() => {
                        updateRelease.mutate({
                          menteeId,
                          pillarId,
                          partId: part.id,
                          partLabel: part.label,
                          released: true,
                        });
                      }}
                    >
                      <Unlock className="w-3 h-3" />
                      Liberar
                    </button>
                  )}
                </div>

                {/* Info */}
                <button
                  className="flex-1 text-left min-w-0"
                  onClick={() => toggleExpand(part.id)}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">
                      Parte {part.id.toUpperCase()} — {part.label}
                    </span>
                    <Badge variant="outline" className="text-[10px] capitalize">
                      {part.type === "questionnaire" ? "Questionario" : part.type === "tool" ? "Ferramenta" : "Simulador"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{part.description}</p>
                </button>

                {/* Status badge */}
                <div className="flex items-center gap-2 shrink-0">
                  {isReleased ? (
                    <Badge className="bg-green-100 text-green-800 text-[10px]">
                      Liberada{releasedAt ? ` em ${formatDate(releasedAt)}` : ""}
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px]">
                      Nao liberada
                    </Badge>
                  )}

                  {/* Expand button */}
                  <button
                    onClick={() => toggleExpand(part.id)}
                    className="text-muted-foreground hover:text-foreground p-1"
                  >
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Expanded content */}
              {isExpanded && (
                <div className="border-t border-border p-4 space-y-4">
                  {/* Export buttons */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={downloadingPdf}
                      onClick={() => generatePdfMutation.mutate({ menteeId, pillarId })}

                    >
                      {downloadingPdf ? (
                        <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Gerando PDF...</>
                      ) : (
                        <><Download className="w-3.5 h-3.5 mr-1.5" />Baixar PDF do Relatório</>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        toast.info("Em breve", {
                          description: "Exportacao para Excel sera disponibilizada em breve.",
                        })
                      }
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5" />
                      Exportar Excel
                    </Button>
                  </div>

                  {/* Analysis tool or summary */}
                  {renderAnalysisTool(part.id)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
