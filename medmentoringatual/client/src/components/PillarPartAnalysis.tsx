/**
 * PillarPartAnalysis — Gerador de análise por IA para cada parte de um pilar
 * Usado no painel do mentor: gerar com IA → editar → salvar → incluir no PDF
 */
import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Sparkles,
  Save,
  Edit3,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Clock,
  Loader2,
  Plus,
  Trash2,
  Lightbulb,
  ArrowRight,
} from "lucide-react";
import { PILLAR_PARTS } from "../../../shared/pillar-parts";

interface PillarPartAnalysisProps {
  menteeId: number;
  pillarId: number;
}

interface PartContent {
  id?: number;
  partId: string;
  partLabel: string;
  titulo?: string | null;
  conteudo?: string | null;
  guiaUso?: string | null;
  destaques?: string | null;
  proximosPassos?: string | null;
  status?: string;
  generatedByAi?: boolean;
}

export function PillarPartAnalysis({ menteeId, pillarId }: PillarPartAnalysisProps) {
  const parts = PILLAR_PARTS[pillarId] ?? [];
  const [expandedPart, setExpandedPart] = useState<string | null>(null);
  const [editState, setEditState] = useState<Record<string, {
    titulo: string;
    conteudo: string;
    guiaUso: string;
    destaques: string[];
    proximosPassos: string[];
  }>>({});
  const [lastSaved, setLastSaved] = useState<Record<string, Date>>({});
  const [generatingPart, setGeneratingPart] = useState<string | null>(null);
  const [savingPart, setSavingPart] = useState<string | null>(null);

  // Fetch all part analyses for this pillar
  const { data: partContents, refetch } = trpc.pillarPartContent.getAll.useQuery(
    { menteeId, pillarId },
    { refetchOnWindowFocus: false }
  );

  // Helper to safely parse array fields (may be array or JSON string from DB)
  const parseArrayField = (val: any): string[] => {
    if (!val) return [];
    if (Array.isArray(val)) return val as string[];
    if (typeof val === "string") {
      try { return JSON.parse(val); } catch { return []; }
    }
    return [];
  };

  // Initialize edit state when data loads
  useEffect(() => {
    if (!partContents) return;
    const newEditState: typeof editState = {};
    for (const pc of partContents as PartContent[]) {
      newEditState[pc.partId] = {
        titulo: pc.titulo ?? "",
        conteudo: pc.conteudo ?? "",
        guiaUso: pc.guiaUso ?? "",
        destaques: parseArrayField(pc.destaques),
        proximosPassos: parseArrayField(pc.proximosPassos),
      };
    }
    setEditState(newEditState);
  }, [partContents]);

  const generateMutation = trpc.pillarPartContent.generate.useMutation({
    onSuccess: (data, variables) => {
      toast.success(`Análise gerada!`, { description: data.titulo });
      setGeneratingPart(null);
      refetch();
      setExpandedPart(variables.partId);
    },
    onError: (err) => {
      toast.error("Erro ao gerar análise", { description: err.message });
      setGeneratingPart(null);
    },
  });

  const saveMutation = trpc.pillarPartContent.save.useMutation({
    onSuccess: (_, variables) => {
      toast.success("Análise salva!");
      setSavingPart(null);
      setLastSaved((prev) => ({ ...prev, [variables.partId]: new Date() }));
      refetch();
    },
    onError: (err) => {
      toast.error("Erro ao salvar", { description: err.message });
      setSavingPart(null);
    },
  });

  const handleGenerate = (partId: string, partLabel: string) => {
    setGeneratingPart(partId);
    generateMutation.mutate({ menteeId, pillarId, partId, partLabel });
  };

  const handleSave = (partId: string, partLabel: string) => {
    const state = editState[partId];
    if (!state) return;
    setSavingPart(partId);
    saveMutation.mutate({
      menteeId,
      pillarId,
      partId,
      partLabel,
      titulo: state.titulo,
      conteudo: state.conteudo,
      guiaUso: state.guiaUso,
      destaques: state.destaques,
      proximosPassos: state.proximosPassos,
      status: "ready",
    });
  };

  const updateEdit = (partId: string, field: string, value: any) => {
    setEditState((prev) => ({
      ...prev,
      [partId]: { ...(prev[partId] ?? { titulo: "", conteudo: "", guiaUso: "", destaques: [], proximosPassos: [] }), [field]: value },
    }));
  };

  const getPartContent = (partId: string): PartContent | undefined => {
    return (partContents as PartContent[] | undefined)?.find((pc) => pc.partId === partId);
  };

  const getStatusBadge = (partId: string) => {
    const pc = getPartContent(partId);
    if (!pc) return <Badge variant="outline" className="text-xs text-muted-foreground">Não gerado</Badge>;
    if (pc.status === "ready" || pc.status === "released")
      return <Badge className="text-xs bg-green-100 text-green-700 border-green-200"><CheckCircle2 className="w-3 h-3 mr-1" />Pronto</Badge>;
    return <Badge variant="outline" className="text-xs text-yellow-600 border-yellow-300"><Clock className="w-3 h-3 mr-1" />Rascunho</Badge>;
  };

  if (parts.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-primary" />
        <h3 className="text-base font-semibold">Análises por Parte — Geradas com IA</h3>
        <Badge variant="outline" className="text-xs ml-auto">
          {(partContents as PartContent[] | undefined)?.filter((pc) => pc.status === "ready" || pc.status === "released").length ?? 0}/{parts.length} prontas
        </Badge>
      </div>

      {parts.map((part) => {
        const isExpanded = expandedPart === part.id;
        const isGenerating = generatingPart === part.id;
        const isSaving = savingPart === part.id;
        const pc = getPartContent(part.id);
        const state = editState[part.id];
        const hasContent = !!pc?.conteudo;
        const savedAt = lastSaved[part.id];

        return (
          <Card key={part.id} className={`transition-all ${isExpanded ? "ring-1 ring-primary/20" : ""}`}>
            {/* Header */}
            <CardHeader
              className="py-3 px-4 cursor-pointer hover:bg-muted/30 transition-colors"
              onClick={() => setExpandedPart(isExpanded ? null : part.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary uppercase">
                    {part.id}
                  </div>
                  <div>
                    <CardTitle className="text-sm font-medium">{part.label}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">{part.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(part.id)}
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </div>
              </div>
            </CardHeader>

            {/* Expanded content */}
            {isExpanded && (
              <CardContent className="pt-0 pb-4 px-4 space-y-4">
                {/* Generate button */}
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleGenerate(part.id, part.label)}
                    disabled={isGenerating}
                    variant={hasContent ? "outline" : "default"}
                    className="gap-2"
                  >
                    {isGenerating ? (
                      <><Loader2 className="w-3.5 h-3.5 animate-spin" />Gerando análise...</>
                    ) : (
                      <><Sparkles className="w-3.5 h-3.5" />{hasContent ? "Regenerar com IA" : "Gerar análise com IA"}</>
                    )}
                  </Button>
                  {hasContent && (
                    <Button
                      size="sm"
                      onClick={() => handleSave(part.id, part.label)}
                      disabled={isSaving || !state}
                      className="gap-2"
                    >
                      {isSaving ? (
                        <><Loader2 className="w-3.5 h-3.5 animate-spin" />Salvando...</>
                      ) : (
                        <><Save className="w-3.5 h-3.5" />Salvar análise</>
                      )}
                    </Button>
                  )}
                  {savedAt && (
                    <span className="text-xs text-green-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Salvo às {savedAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  )}
                </div>

                {isGenerating && (
                  <div className="flex items-center gap-3 p-4 bg-primary/5 rounded-lg border border-primary/10">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    <div>
                      <p className="text-sm font-medium">Gerando análise personalizada...</p>
                      <p className="text-xs text-muted-foreground">A IA está analisando as respostas do mentorado. Isso pode levar 15-30 segundos.</p>
                    </div>
                  </div>
                )}

                {/* Edit fields — only show if content exists */}
                {hasContent && state && !isGenerating && (
                  <div className="space-y-4">
                    {/* Título */}
                    <div>
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block flex items-center gap-1">
                        <Edit3 className="w-3 h-3" /> Título da Análise
                      </label>
                      <Input
                        value={state.titulo}
                        onChange={(e) => updateEdit(part.id, "titulo", e.target.value)}
                        placeholder="Título impactante para esta análise"
                        className="text-sm font-medium"
                      />
                    </div>

                    {/* Conteúdo principal */}
                    <div>
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block">
                        Análise Principal
                      </label>
                      <Textarea
                        value={state.conteudo}
                        onChange={(e) => updateEdit(part.id, "conteudo", e.target.value)}
                        placeholder="Texto principal da análise..."
                        rows={8}
                        className="text-sm leading-relaxed"
                      />
                    </div>

                    {/* Guia de uso */}
                    <div>
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block flex items-center gap-1">
                        <Lightbulb className="w-3 h-3" /> Guia de Uso
                      </label>
                      <Textarea
                        value={state.guiaUso}
                        onChange={(e) => updateEdit(part.id, "guiaUso", e.target.value)}
                        placeholder="Como o mentorado deve usar este resultado no dia a dia..."
                        rows={3}
                        className="text-sm"
                      />
                    </div>

                    {/* Destaques */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                          <Sparkles className="w-3 h-3" /> Destaques / Insights-chave
                        </label>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs"
                          onClick={() => updateEdit(part.id, "destaques", [...(state.destaques ?? []), ""])}
                        >
                          <Plus className="w-3 h-3 mr-1" /> Adicionar
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {(state.destaques ?? []).map((d, i) => (
                          <div key={i} className="flex gap-2">
                            <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0 mt-1.5">
                              {i + 1}
                            </div>
                            <Input
                              value={d}
                              onChange={(e) => {
                                const updated = [...(state.destaques ?? [])];
                                updated[i] = e.target.value;
                                updateEdit(part.id, "destaques", updated);
                              }}
                              placeholder={`Insight ${i + 1}`}
                              className="text-sm"
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 flex-shrink-0"
                              onClick={() => updateEdit(part.id, "destaques", (state.destaques ?? []).filter((_, j) => j !== i))}
                            >
                              <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                            </Button>
                          </div>
                        ))}
                        {(state.destaques ?? []).length === 0 && (
                          <p className="text-xs text-muted-foreground italic">Nenhum destaque. Clique em Adicionar.</p>
                        )}
                      </div>
                    </div>

                    {/* Próximos passos */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                          <ArrowRight className="w-3 h-3" /> Próximos Passos
                        </label>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs"
                          onClick={() => updateEdit(part.id, "proximosPassos", [...(state.proximosPassos ?? []), ""])}
                        >
                          <Plus className="w-3 h-3 mr-1" /> Adicionar
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {(state.proximosPassos ?? []).map((p, i) => (
                          <div key={i} className="flex gap-2">
                            <ArrowRight className="w-4 h-4 text-primary flex-shrink-0 mt-2" />
                            <Input
                              value={p}
                              onChange={(e) => {
                                const updated = [...(state.proximosPassos ?? [])];
                                updated[i] = e.target.value;
                                updateEdit(part.id, "proximosPassos", updated);
                              }}
                              placeholder={`Passo ${i + 1}`}
                              className="text-sm"
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 flex-shrink-0"
                              onClick={() => updateEdit(part.id, "proximosPassos", (state.proximosPassos ?? []).filter((_, j) => j !== i))}
                            >
                              <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                            </Button>
                          </div>
                        ))}
                        {(state.proximosPassos ?? []).length === 0 && (
                          <p className="text-xs text-muted-foreground italic">Nenhum próximo passo. Clique em Adicionar.</p>
                        )}
                      </div>
                    </div>

                    {/* Save button at bottom */}
                    <div className="flex items-center gap-2 pt-2 border-t">
                      <Button
                        onClick={() => handleSave(part.id, part.label)}
                        disabled={isSaving}
                        className="gap-2"
                      >
                        {isSaving ? (
                          <><Loader2 className="w-4 h-4 animate-spin" />Salvando...</>
                        ) : (
                          <><Save className="w-4 h-4" />Salvar análise</>
                        )}
                      </Button>
                      {savedAt && (
                        <span className="text-xs text-green-600 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Salvo às {savedAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Empty state — no content yet */}
                {!hasContent && !isGenerating && (
                  <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                    <Sparkles className="w-8 h-8 mx-auto mb-3 opacity-30" />
                    <p className="text-sm font-medium">Análise ainda não gerada</p>
                    <p className="text-xs mt-1">Clique em "Gerar análise com IA" para criar o conteúdo desta parte automaticamente com base nas respostas do mentorado.</p>
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}
