/**
 * PillarReportGenerator — Gerador de relatório final premium por pilar
 * Usado no painel do mentor: gerar com IA → editar → pré-visualizar → liberar
 */
import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Sparkles,
  Eye,
  Edit3,
  Send,
  Download,
  CheckCircle,
  Loader2,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface PillarReportGeneratorProps {
  menteeId: number;
  menteeName: string;
  pillarId: number;
  pillarName: string;
}

const PRIORITY_COLORS = {
  alta: "bg-red-100 text-red-700 border-red-200",
  média: "bg-yellow-100 text-yellow-700 border-yellow-200",
  baixa: "bg-green-100 text-green-700 border-green-200",
};

interface ActionItem {
  action: string;
  deadline: string;
  expectedResult: string;
  priority: "alta" | "média" | "baixa";
}

export function PillarReportGenerator({
  menteeId,
  menteeName,
  pillarId,
  pillarName,
}: PillarReportGeneratorProps) {
  const [activeTab, setActiveTab] = useState<"generate" | "edit" | "preview">("generate");
  const [showPreview, setShowPreview] = useState(false);

  // Local edit state
  const [editTitle, setEditTitle] = useState("");
  const [editSubtitle, setEditSubtitle] = useState("");
  const [editSummary, setEditSummary] = useState("");
  const [editStrengths, setEditStrengths] = useState<string[]>([]);
  const [editAttention, setEditAttention] = useState<string[]>([]);
  const [editActionPlan, setEditActionPlan] = useState<ActionItem[]>([]);
  const [editConclusions, setEditConclusions] = useState("");
  const [htmlPreview, setHtmlPreview] = useState<string | null>(null);

  // Fetch existing report
  const { data: report, refetch } = trpc.pillarReport.get.useQuery({ menteeId, pillarId });

  // Helper to safely parse JSON text fields
  const safeJsonParse = <T,>(val: string | null | undefined, fallback: T): T => {
    if (!val) return fallback;
    if (Array.isArray(val) || typeof val === "object") return val as unknown as T;
    try { return JSON.parse(val) as T; } catch { return fallback; }
  };

  // Populate edit state when report loads
  useEffect(() => {
    if (report) {
      setEditTitle(report.title ?? "");
      setEditSubtitle(report.subtitle ?? "");
      setEditSummary(report.executiveSummary ?? "");
      setEditStrengths(safeJsonParse<string[]>(report.strengthsJson, []));
      setEditAttention(safeJsonParse<string[]>(report.attentionJson, []));
      setEditActionPlan(safeJsonParse<ActionItem[]>(report.actionPlanJson, []));
      setEditConclusions(report.conclusionsText ?? "");
      setHtmlPreview(report.htmlContent ?? null);
    }
  }, [report?.id]);

  // Generate with AI
  const generateMutation = trpc.pillarReport.generate.useMutation({
    onSuccess: (data) => {
      toast.success("Relatório gerado com sucesso!", { description: data.title });
      setHtmlPreview(data.htmlPreview ?? null);
      refetch();
      setActiveTab("edit");
    },
    onError: (err) => {
      toast.error("Erro ao gerar relatório", { description: err.message });
    },
  });

  // Save edits
  const saveMutation = trpc.pillarReport.save.useMutation({
    onSuccess: (data) => {
      toast.success("Relatório salvo!");
      setHtmlPreview(data.htmlContent ?? null);
      refetch();
    },
    onError: (err) => {
      toast.error("Erro ao salvar", { description: err.message });
    },
  });

  // Release to mentee
  const releaseMutation = trpc.pillarReport.release.useMutation({
    onSuccess: () => {
      toast.success("Relatório liberado!", { description: `${menteeName} já pode acessar o relatório do Pilar ${pillarId}.` });
      refetch();
    },
    onError: (err) => {
      toast.error("Erro ao liberar", { description: err.message });
    },
  });

  const handleSave = () => {
    saveMutation.mutate({
      menteeId,
      pillarId,
      title: editTitle,
      subtitle: editSubtitle,
      executiveSummary: editSummary,
      strengthsJson: JSON.stringify(editStrengths),
      attentionJson: JSON.stringify(editAttention),
      actionPlanJson: JSON.stringify(editActionPlan),
      conclusionsText: editConclusions,
    });
  };

  const generatePdfMutation = trpc.pillarReport.generatePdf.useMutation({
    onSuccess: (data) => {
      // Converte base64 para Blob e faz download
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

  const handleDownloadPdf = () => {
    if (!htmlPreview) {
      toast.error("Relatório não encontrado", { description: "Gere o relatório primeiro antes de baixar o PDF." });
      return;
    }
    generatePdfMutation.mutate({ menteeId, pillarId });
  };

  const isDownloadingPdf = generatePdfMutation.isPending;

  const isReleased = report?.status === "released";
  const hasReport = !!report;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Relatório Final — Pilar {pillarId}</h3>
          <p className="text-sm text-muted-foreground">{pillarName} · {menteeName}</p>
        </div>
        <div className="flex items-center gap-2">
          {isReleased && (
            <Badge className="bg-green-100 text-green-700 border-green-200">
              <CheckCircle className="w-3 h-3 mr-1" />
              Liberado
            </Badge>
          )}
          {hasReport && !isReleased && (
            <Badge variant="outline" className="text-yellow-600 border-yellow-300">
              Rascunho
            </Badge>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="generate">
            <Sparkles className="w-4 h-4 mr-2" />
            Gerar com IA
          </TabsTrigger>
          <TabsTrigger value="edit" disabled={!hasReport}>
            <Edit3 className="w-4 h-4 mr-2" />
            Editar
          </TabsTrigger>
          <TabsTrigger value="preview" disabled={!hasReport}>
            <Eye className="w-4 h-4 mr-2" />
            Pré-visualizar
          </TabsTrigger>
        </TabsList>

        {/* ── GERAR ── */}
        <TabsContent value="generate" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Gerar Relatório com Inteligência Artificial</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                A IA vai consolidar automaticamente <strong>todas</strong> as informações do pilar:
              </p>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
                <li>Todas as respostas do mentorado neste pilar</li>
                <li><strong>Diagnóstico de IA</strong> (gerado na seção acima)</li>
                <li><strong>Análises por Parte</strong> (A, B, C, D — geradas e salvas acima)</li>
                <li><strong>Conclusões do Pilar</strong> (geradas e salvas acima)</li>
                <li>Histórico do chat de orientação com IA</li>
                <li>Sugestões e checklist registrados</li>
              </ul>
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                <strong>💡 Dica:</strong> Para um relatório mais completo, gere e salve primeiro o Diagnóstico de IA, as Análises por Parte e as Conclusões do Pilar antes de gerar o relatório final.
              </div>
              {hasReport && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-700">
                  ⚠️ Já existe um relatório para este pilar. Gerar novamente irá substituí-lo.
                </div>
              )}
              <Button
                onClick={() => generateMutation.mutate({ menteeId, pillarId })}
                disabled={generateMutation.isPending}
                className="w-full"
              >
                {generateMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Gerando relatório...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Gerar Relatório com IA
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── EDITAR ── */}
        <TabsContent value="edit" className="space-y-4 mt-4">
          {/* Título e Subtítulo */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Título e Subtítulo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Título Principal</label>
                <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Título impactante do relatório" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Subtítulo / Foco</label>
                <Input value={editSubtitle} onChange={(e) => setEditSubtitle(e.target.value)} placeholder="Foco principal deste pilar para o médico" />
              </div>
            </CardContent>
          </Card>

          {/* Sumário Executivo */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Sumário Executivo</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={editSummary}
                onChange={(e) => setEditSummary(e.target.value)}
                placeholder="Parágrafo resumindo o diagnóstico e o caminho..."
                rows={4}
              />
            </CardContent>
          </Card>

          {/* Pontos Fortes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center justify-between">
                Pontos Fortes
                <Button variant="ghost" size="sm" onClick={() => setEditStrengths([...editStrengths, ""])}>
                  <Plus className="w-4 h-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {editStrengths.map((s, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    value={s}
                    onChange={(e) => {
                      const updated = [...editStrengths];
                      updated[i] = e.target.value;
                      setEditStrengths(updated);
                    }}
                    placeholder={`Ponto forte ${i + 1}`}
                  />
                  <Button variant="ghost" size="sm" onClick={() => setEditStrengths(editStrengths.filter((_, j) => j !== i))}>
                    <Trash2 className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </div>
              ))}
              {editStrengths.length === 0 && (
                <p className="text-sm text-muted-foreground italic">Nenhum ponto forte. Clique em + para adicionar.</p>
              )}
            </CardContent>
          </Card>

          {/* Pontos de Atenção */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center justify-between">
                Pontos de Atenção
                <Button variant="ghost" size="sm" onClick={() => setEditAttention([...editAttention, ""])}>
                  <Plus className="w-4 h-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {editAttention.map((a, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    value={a}
                    onChange={(e) => {
                      const updated = [...editAttention];
                      updated[i] = e.target.value;
                      setEditAttention(updated);
                    }}
                    placeholder={`Ponto de atenção ${i + 1}`}
                  />
                  <Button variant="ghost" size="sm" onClick={() => setEditAttention(editAttention.filter((_, j) => j !== i))}>
                    <Trash2 className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </div>
              ))}
              {editAttention.length === 0 && (
                <p className="text-sm text-muted-foreground italic">Nenhum ponto de atenção. Clique em + para adicionar.</p>
              )}
            </CardContent>
          </Card>

          {/* Plano de Ação */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center justify-between">
                Plano de Ação
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setEditActionPlan([
                      ...editActionPlan,
                      { action: "", deadline: "30 dias", expectedResult: "", priority: "média" },
                    ])
                  }
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {editActionPlan.map((item, i) => (
                <div key={i} className="border rounded-lg p-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-muted-foreground">Ação {i + 1}</span>
                    <Button variant="ghost" size="sm" onClick={() => setEditActionPlan(editActionPlan.filter((_, j) => j !== i))}>
                      <Trash2 className="w-3 h-3 text-muted-foreground" />
                    </Button>
                  </div>
                  <Input
                    value={item.action}
                    onChange={(e) => {
                      const updated = [...editActionPlan];
                      updated[i] = { ...updated[i], action: e.target.value };
                      setEditActionPlan(updated);
                    }}
                    placeholder="O que fazer..."
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <Input
                      value={item.deadline}
                      onChange={(e) => {
                        const updated = [...editActionPlan];
                        updated[i] = { ...updated[i], deadline: e.target.value };
                        setEditActionPlan(updated);
                      }}
                      placeholder="Prazo (ex: 30 dias)"
                    />
                    <select
                      value={item.priority}
                      onChange={(e) => {
                        const updated = [...editActionPlan];
                        updated[i] = { ...updated[i], priority: e.target.value as ActionItem["priority"] };
                        setEditActionPlan(updated);
                      }}
                      className="border rounded-md px-2 text-sm bg-background"
                    >
                      <option value="alta">Alta</option>
                      <option value="média">Média</option>
                      <option value="baixa">Baixa</option>
                    </select>
                    <Input
                      value={item.expectedResult}
                      onChange={(e) => {
                        const updated = [...editActionPlan];
                        updated[i] = { ...updated[i], expectedResult: e.target.value };
                        setEditActionPlan(updated);
                      }}
                      placeholder="Resultado esperado"
                    />
                  </div>
                </div>
              ))}
              {editActionPlan.length === 0 && (
                <p className="text-sm text-muted-foreground italic">Nenhuma ação. Clique em + para adicionar.</p>
              )}
            </CardContent>
          </Card>

          {/* Conclusões do Mentor */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Mensagem Final do Mentor</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={editConclusions}
                onChange={(e) => setEditConclusions(e.target.value)}
                placeholder="Escreva uma mensagem motivadora e prática para o mentorado..."
                rows={6}
              />
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-3">
            <Button onClick={handleSave} disabled={saveMutation.isPending} className="flex-1">
              {saveMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</>
              ) : (
                <><Edit3 className="w-4 h-4 mr-2" />Salvar Edições</>
              )}
            </Button>
            <Button variant="outline" onClick={() => setActiveTab("preview")} disabled={!hasReport}>
              <Eye className="w-4 h-4 mr-2" />
              Pré-visualizar
            </Button>
          </div>
        </TabsContent>

        {/* ── PRÉ-VISUALIZAÇÃO ── */}
        <TabsContent value="preview" className="space-y-4 mt-4">
          {htmlPreview ? (
            <>
              {/* Action buttons */}
              <div className="flex gap-3 flex-wrap">
                <Button variant="outline" onClick={handleDownloadPdf} disabled={isDownloadingPdf}>
                  {isDownloadingPdf ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Gerando PDF...</>
                  ) : (
                    <><Download className="w-4 h-4 mr-2" />Baixar PDF</>
                  )}
                </Button>
                {!isReleased && (
                  <Button
                    onClick={() => releaseMutation.mutate({ menteeId, pillarId })}
                    disabled={releaseMutation.isPending}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    {releaseMutation.isPending ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Liberando...</>
                    ) : (
                      <><Send className="w-4 h-4 mr-2" />Liberar para {menteeName}</>
                    )}
                  </Button>
                )}
                {isReleased && (
                  <Badge className="bg-green-100 text-green-700 border-green-200 px-4 py-2">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Relatório liberado para o mentorado
                  </Badge>
                )}
              </div>

              {/* HTML Preview in iframe */}
              <div className="border rounded-xl overflow-hidden shadow-lg">
                <div className="bg-muted px-4 py-2 flex items-center gap-2 border-b">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                  </div>
                  <span className="text-xs text-muted-foreground ml-2">Pré-visualização do Relatório</span>
                </div>
                <iframe
                  srcDoc={htmlPreview}
                  className="w-full"
                  style={{ height: "800px", border: "none" }}
                  title="Pré-visualização do Relatório"
                />
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Eye className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>Gere o relatório primeiro para pré-visualizar.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
