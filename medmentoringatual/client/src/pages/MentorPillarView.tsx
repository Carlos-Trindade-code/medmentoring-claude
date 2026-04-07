/**
 * MentorPillarView — Painel do mentor para um pilar específico
 *
 * Acessado via /mentor/mentorado/:menteeId/pilar/:pillarId
 *
 * Contém em uma única tela (sanfona):
 * 1. Roteiro de condução (perguntas PNL, técnicas, frases de impacto)
 * 2. Respostas do mentorado (preenchidas autonomamente)
 * 3. Ferramentas interativas do pilar (calculadoras, construtores, etc.)
 * 4. Feedback do mentor + liberação da conclusão
 */
import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ChevronLeft, CheckCircle2,
  MessageSquare, Send, Lock, Unlock,
  User, AlertCircle, Loader2, Eye,
  Sparkles, RefreshCw, TrendingUp, FileDown
} from "lucide-react";
import { Link } from "wouter";
import { PILLAR_SECTIONS, PILLAR_TITLES, PILLAR_ICONS } from "@/lib/pillar-questions";
import { MentorAIChat } from "@/components/MentorAIChat";
import { PillarReportGenerator } from "@/components/PillarReportGenerator";
import { MenteeAnswersSummary } from "@/components/MenteeAnswersSummary";
import { ExpenseAnalysis } from "@/components/ExpenseAnalysis";
import { IvmpAnalysis } from "@/components/IvmpAnalysis";
import { ScenarioSimulator } from "@/components/ScenarioSimulator";
import { PricingEditor } from "@/components/PricingEditor";

// ============================================================
// TIPOS DE IA
// ============================================================
type AiDiagnosisLacuna = {
  lacuna: string;
  impacto: string;
  urgencia: "alta" | "media" | "baixa";
};

type AiDiagnosisRecomendacao = {
  acao: string;
  prazo: "imediato" | "curto_prazo" | "medio_prazo";
  resultado_esperado: string;
};

type AiDiagnosisResult = {
  resumo: string;
  pontos_fortes: string[];
  lacunas_criticas: AiDiagnosisLacuna[];
  recomendacoes: AiDiagnosisRecomendacao[];
  frase_chave: string;
  nivel_maturidade: string;
};


// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
export default function MentorPillarView() {
  const { menteeId, pillarId: pillarIdStr } = useParams<{ menteeId: string; pillarId: string }>();
  const menteeIdNum = parseInt(menteeId ?? "0");
  const pillarId = parseInt(pillarIdStr ?? "1");
  const { user, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();

  const [activeTab, setActiveTab] = useState<"dados" | "insights" | "relatorio">("dados");
  const [feedback, setFeedback] = useState("");
  const [planoAcao, setPlanoAcao] = useState("");
  const [pontosFortes, setPontosFortes] = useState<string[]>([""]);
  const [pontosMelhoria, setPontosMelhoria] = useState<string[]>([""]);
  const [savingFeedback, setSavingFeedback] = useState(false);

  const [generatingDiagnosis, setGeneratingDiagnosis] = useState(false);
  const [aiDiagnosisResult, setAiDiagnosisResult] = useState<AiDiagnosisResult | null>(null);
  const [savingDiagnosis, setSavingDiagnosis] = useState(false);
  const [generatingFeedbackDraft, setGeneratingFeedbackDraft] = useState(false);
  const [feedbackDraftGenerated, setFeedbackDraftGenerated] = useState(false);
  const [generatingConclusions, setGeneratingConclusions] = useState(false);
  const [conclusionsData, setConclusionsData] = useState<Record<string, unknown> | null>(null);
  const [editedConclusions, setEditedConclusions] = useState<Record<string, string>>({});
  const [savingConclusions, setSavingConclusions] = useState(false);

  const title = PILLAR_TITLES[pillarId];
  const icon = PILLAR_ICONS[pillarId];

  // Dados do mentorado
  const { data: mentee } = trpc.mentor.getMentee.useQuery({ id: menteeIdNum });

  // Respostas do mentorado
  const { data: answers, isLoading: loadingAnswers, refetch: refetchAnswers } = trpc.pillarFeedback.getAnswers.useQuery({
    menteeId: menteeIdNum,
    pillarId,
  }, { retry: false });

  // Feedback existente
  const { data: existingFeedback, refetch: refetchFeedback } = trpc.pillarFeedback.getFeedback.useQuery({
    menteeId: menteeIdNum,
    pillarId,
  });

  const saveFeedbackMutation = trpc.pillarFeedback.saveFeedback.useMutation();
  const releaseMutation = trpc.pillarFeedback.releaseConclusion.useMutation();
  const generateDiagnosisMutation = trpc.pillarTools.generatePillarDiagnosis.useMutation();
  const saveDiagnosisMutation = trpc.pillarTools.saveDiagnosis.useMutation();
  const updateAnswerMutation = trpc.pillarAnswers.adminUpdateAnswer.useMutation({
    onSuccess: () => refetchAnswers(),
  });
  const generateFeedbackDraftMutation = trpc.pillarTools.generateFeedbackDraft.useMutation();
  const generateConclusionsMutation = trpc.pillarTools.generatePillarConclusions.useMutation();
  const saveConclusionsMutation = trpc.pillarTools.savePillarConclusions.useMutation();
  const { data: existingConclusions, refetch: refetchConclusions } = trpc.pillarTools.getPillarConclusions.useQuery({
    menteeId: menteeIdNum,
    pillarId,
  });

  // Auto-summary IA ao abrir pilar
  const { data: autoSummary, isLoading: summaryLoading } = trpc.mentorAI.autoSummary.useQuery(
    { menteeId: Number(menteeId), pillarId: Number(pillarId) },
    { staleTime: 5 * 60 * 1000 }
  );

  // Inicializa conclusões existentes
  useEffect(() => {
    if (existingConclusions?.conclusoesJson) {
      const data = existingConclusions.conclusoesJson as Record<string, unknown>;
      setConclusionsData(data);
      const edited: Record<string, string> = {};
      for (const [key, val] of Object.entries(data)) {
        if (typeof val === "string") edited[key] = val;
        else if (Array.isArray(val)) edited[key] = val.join("\n");
      }
      setEditedConclusions(edited);
    }
  }, [existingConclusions]);

  const handleGenerateConclusions = async () => {
    setGeneratingConclusions(true);
    try {
      const result = await generateConclusionsMutation.mutateAsync({ menteeId: menteeIdNum, pillarId });
      setConclusionsData(result as Record<string, unknown>);
      const edited: Record<string, string> = {};
      for (const [key, val] of Object.entries(result as Record<string, unknown>)) {
        if (typeof val === "string") edited[key] = val;
        else if (Array.isArray(val)) edited[key] = (val as string[]).join("\n");
      }
      setEditedConclusions(edited);
      toast.success("Conclusões geradas! Revise e ajuste antes de liberar.");
      refetchConclusions();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      toast.error(msg || "Erro ao gerar conclusões. Tente novamente.");
    } finally {
      setGeneratingConclusions(false);
    }
  };

  const handleSaveConclusions = async (liberar = false) => {
    setSavingConclusions(true);
    try {
      // Reconstrói o JSON com os valores editados
      const conclusoesJson: Record<string, unknown> = {};
      if (conclusionsData) {
        for (const [key, val] of Object.entries(conclusionsData)) {
          if (key in editedConclusions) {
            if (Array.isArray(val)) {
              conclusoesJson[key] = editedConclusions[key].split("\n").filter(Boolean);
            } else {
              conclusoesJson[key] = editedConclusions[key];
            }
          } else {
            conclusoesJson[key] = val;
          }
        }
      }
      await saveConclusionsMutation.mutateAsync({
        menteeId: menteeIdNum,
        pillarId,
        conclusoesJson,
        liberarParaMentorado: liberar,
      });
      toast.success(liberar ? "Conclusões liberadas para o mentorado!" : "Conclusões salvas com sucesso!");
      refetchConclusions();
    } catch {
      toast.error("Erro ao salvar conclusões.");
    } finally {
      setSavingConclusions(false);
    }
  };

  // Inicializa feedback existente quando dados chegam do servidor
  useEffect(() => {
    if (existingFeedback) {
      setFeedback(existingFeedback.feedback ?? "");
      setPlanoAcao(existingFeedback.planoAcao ?? "");
      if (existingFeedback.pontosFortesJson) setPontosFortes(existingFeedback.pontosFortesJson as string[]);
      if (existingFeedback.pontosMelhoriaJson) setPontosMelhoria(existingFeedback.pontosMelhoriaJson as string[]);
      // Carrega resultados de IA salvos anteriormente
      if (existingFeedback.aiDiagnosis) setAiDiagnosisResult(existingFeedback.aiDiagnosis as AiDiagnosisResult);
    }
  }, [existingFeedback]);

  const handleGenerateDiagnosis = async () => {
    setGeneratingDiagnosis(true);
    try {
      const result = await generateDiagnosisMutation.mutateAsync({ menteeId: menteeIdNum, pillarId });
      setAiDiagnosisResult(result as AiDiagnosisResult);
      toast.success("Diagnóstico gerado com sucesso!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao gerar diagnóstico.";
      toast.error(msg);
    } finally {
      setGeneratingDiagnosis(false);
    }
  };

  const handleSaveDiagnosis = async () => {
    if (!aiDiagnosisResult) return;
    setSavingDiagnosis(true);
    try {
      await saveDiagnosisMutation.mutateAsync({
        menteeId: menteeIdNum,
        pillarId,
        diagnosis: aiDiagnosisResult,
      });
      toast.success("Diagnóstico salvo com sucesso!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao salvar diagnóstico.";
      toast.error(msg);
    } finally {
      setSavingDiagnosis(false);
    }
  };

  const handleSaveFeedback = async () => {
    setSavingFeedback(true);
    try {
      await saveFeedbackMutation.mutateAsync({
        menteeId: menteeIdNum,
        pillarId,
        feedback,
        planoAcao,
        pontosFortesJson: pontosFortes.filter(Boolean),
        pontosMelhoriaJson: pontosMelhoria.filter(Boolean),
      });
      toast.success("Feedback salvo com sucesso!");
      refetchFeedback();
    } catch {
      toast.error("Erro ao salvar feedback.");
    } finally {
      setSavingFeedback(false);
    }
  };

  const handleRelease = async () => {
    // Salva o feedback primeiro
    await handleSaveFeedback();
    try {
      await releaseMutation.mutateAsync({ menteeId: menteeIdNum, pillarId });
      toast.success(`Conclusão do Pilar ${pillarId} liberada para ${mentee?.nome}!`);
      refetchFeedback();
    } catch {
      toast.error("Erro ao liberar conclusão.");
    }
  };

  const handleGenerateFeedbackDraft = async () => {
    setGeneratingFeedbackDraft(true);
    try {
      const draft = await generateFeedbackDraftMutation.mutateAsync({
        menteeId: menteeIdNum,
        pillarId,
      });
      // Preenche os campos com o rascunho gerado (sem sobrescrever se já houver conteúdo)
      if (draft.pontos_fortes?.length) setPontosFortes(draft.pontos_fortes);
      if (draft.pontos_melhoria?.length) setPontosMelhoria(draft.pontos_melhoria);
      if (draft.feedback_geral) setFeedback(draft.feedback_geral);
      if (draft.plano_acao) setPlanoAcao(draft.plano_acao);
      setFeedbackDraftGenerated(true);
      toast.success("Rascunho gerado! Revise e ajuste antes de liberar ao mentorado.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("ainda não respondeu")) {
        toast.error("O mentorado ainda não respondeu este pilar.");
      } else {
        toast.error("Erro ao gerar rascunho. Tente novamente.");
      }
    } finally {
      setGeneratingFeedbackDraft(false);
    }
  };


  // Auth guard: se sessão expirou, mostrar botão de login
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto" />
          <h2 className="text-lg font-semibold text-foreground">Sessão expirada</h2>
          <p className="text-sm text-muted-foreground">Faça login novamente para acessar o painel do mentor.</p>
          <Button onClick={() => navigate("/mentor")} className="mt-2">Ir para o painel</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href={`/mentor/mentorado/${menteeIdNum}`}>
            <Button variant="ghost" size="sm" className="mb-4 gap-2">
              <ChevronLeft className="w-4 h-4" /> Voltar ao mentorado
            </Button>
          </Link>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{icon}</span>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Pilar {pillarId}</p>
                <h1 className="text-2xl font-bold text-foreground">{title}</h1>
                {mentee && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                    <User className="w-3 h-3" /> {mentee.nome}
                  </p>
                )}
              </div>
            </div>
            <div className="text-right">
              {existingFeedback?.conclusaoLiberada ? (
                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                  <Unlock className="w-3 h-3 mr-1" /> Conclusão liberada
                </Badge>
              ) : (
                <Badge variant="secondary">
                  <Lock className="w-3 h-3 mr-1" /> Aguardando liberação
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Auto-summary IA */}
        {summaryLoading && (
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-6 animate-pulse">
            <div className="h-4 bg-primary/10 rounded w-1/3 mb-2" />
            <div className="h-3 bg-primary/10 rounded w-full mb-1" />
            <div className="h-3 bg-primary/10 rounded w-2/3" />
          </div>
        )}
        {autoSummary?.summary && (
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-primary">Resumo IA</span>
              {autoSummary.cached && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Cache</span>
              )}
            </div>
            <div className="text-sm text-foreground whitespace-pre-line leading-relaxed">{autoSummary.summary}</div>
          </div>
        )}

        {/* Tab bar: 3 tabs */}
        <div className="border-b mb-6">
          <div className="flex">
            <button
              onClick={() => setActiveTab("dados")}
              className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                activeTab === "dados"
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Dados
            </button>
            <button
              onClick={() => setActiveTab("insights")}
              className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                activeTab === "insights"
                  ? "text-violet-700 border-b-2 border-violet-600"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Insights
            </button>
            <button
              onClick={() => setActiveTab("relatorio")}
              className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                activeTab === "relatorio"
                  ? "text-emerald-700 border-b-2 border-emerald-600"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Relatório
            </button>
          </div>
        </div>

        {/* ========== ABA DADOS ========== */}
        {activeTab === "dados" && (
          <div className="space-y-8">
            {/* Respostas do mentorado — todas seções, editáveis */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <User className="w-4 h-4 text-emerald-600" /> Respostas do Mentorado
              </h3>
              {loadingAnswers ? (
                <div className="py-8 flex justify-center">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <MenteeAnswersSummary
                  sections={PILLAR_SECTIONS[pillarId] ?? []}
                  answers={(answers ?? []) as any}
                  editable={true}
                  onSave={async (sectionId, questionId, value) => {
                    const section = (PILLAR_SECTIONS[pillarId] ?? []).find((s: any) => s.perguntas?.some((p: any) => p.id === questionId));
                    const question = section?.perguntas?.find((p: any) => p.id === questionId);
                    await updateAnswerMutation.mutateAsync({
                      menteeId: menteeIdNum,
                      pillarId,
                      secao: sectionId,
                      questionId,
                      pergunta: question?.pergunta ?? "",
                      resposta: value,
                    });
                  }}
                />
              )}
            </div>

            {/* Ferramentas — conforme pilar */}
            {pillarId === 3 && (
              <>
                <hr className="border-dashed" />
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-teal-600" /> Despesas
                  </h3>
                  <ExpenseAnalysis menteeId={menteeIdNum} />
                </div>

                <hr className="border-dashed" />
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-teal-600" /> iVMP — Maturidade Profissional
                  </h3>
                  <IvmpAnalysis menteeId={menteeIdNum} />
                </div>

                <hr className="border-dashed" />
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-teal-600" /> Simulador de Cenários
                  </h3>
                  <ScenarioSimulator menteeId={menteeIdNum} mode="mentor" />
                </div>
              </>
            )}

            {pillarId === 5 && (
              <>
                <hr className="border-dashed" />
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-teal-600" /> Precificação
                  </h3>
                  <PricingEditor menteeId={menteeIdNum} />
                </div>
              </>
            )}
          </div>
        )}

        {/* ========== ABA INSIGHTS ========== */}
        {activeTab === "insights" && (
          <div className="space-y-6">
            {/* Diagnóstico IA */}
            <div className="border rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-violet-600" /> Diagnóstico do Pilar
                </h3>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleGenerateDiagnosis}
                  disabled={generatingDiagnosis}
                  className="gap-2 border-violet-300 text-violet-700 hover:bg-violet-50"
                >
                  {generatingDiagnosis ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                  {aiDiagnosisResult ? "Regerar" : "Analisar com IA"}
                </Button>
              </div>

              {generatingDiagnosis && (
                <div className="py-8 flex flex-col items-center gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
                  <p className="text-sm text-muted-foreground">Analisando respostas...</p>
                </div>
              )}

              {!generatingDiagnosis && !aiDiagnosisResult && (
                <div className="py-6 text-center">
                  <Sparkles className="w-8 h-8 text-violet-300 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Clique em "Analisar com IA" para gerar o diagnóstico.</p>
                </div>
              )}

              {!generatingDiagnosis && aiDiagnosisResult && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-violet-700 uppercase tracking-wide block mb-1.5">Frase-chave</label>
                    <Textarea
                      value={aiDiagnosisResult.frase_chave}
                      onChange={e => setAiDiagnosisResult(prev => prev ? { ...prev, frase_chave: e.target.value } : prev)}
                      rows={2}
                      className="text-sm border-violet-200 bg-violet-50/50"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-violet-700 uppercase tracking-wide block mb-1.5">Resumo</label>
                    <Textarea
                      value={aiDiagnosisResult.resumo}
                      onChange={e => setAiDiagnosisResult(prev => prev ? { ...prev, resumo: e.target.value } : prev)}
                      rows={4}
                      className="text-sm border-violet-200 bg-violet-50/50"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-emerald-700 uppercase tracking-wide block mb-1.5">Pontos Fortes</label>
                    <Textarea
                      value={aiDiagnosisResult.pontos_fortes.join("\n")}
                      onChange={e => setAiDiagnosisResult(prev => prev ? { ...prev, pontos_fortes: e.target.value.split("\n") } : prev)}
                      rows={3}
                      className="text-sm border-emerald-200 bg-emerald-50/50"
                      placeholder="Um por linha"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-amber-700 uppercase tracking-wide block mb-1.5">Lacunas</label>
                    <Textarea
                      value={aiDiagnosisResult.lacunas_criticas.map(l => `${l.lacuna} — ${l.impacto}`).join("\n")}
                      onChange={e => {
                        const lines = e.target.value.split("\n");
                        setAiDiagnosisResult(prev => prev ? {
                          ...prev,
                          lacunas_criticas: lines.map(line => {
                            const [lacuna, impacto] = line.split(" — ");
                            return { lacuna: lacuna || line, impacto: impacto || "", urgencia: "media" as const };
                          })
                        } : prev);
                      }}
                      rows={3}
                      className="text-sm border-amber-200 bg-amber-50/50"
                      placeholder="Lacuna — Impacto (um por linha)"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-blue-700 uppercase tracking-wide block mb-1.5">Recomendações</label>
                    <Textarea
                      value={aiDiagnosisResult.recomendacoes.map(r => r.acao).join("\n")}
                      onChange={e => {
                        const lines = e.target.value.split("\n");
                        setAiDiagnosisResult(prev => prev ? {
                          ...prev,
                          recomendacoes: lines.map(line => ({ acao: line, prazo: "curto_prazo" as const, resultado_esperado: "" }))
                        } : prev);
                      }}
                      rows={3}
                      className="text-sm border-blue-200 bg-blue-50/50"
                      placeholder="Uma recomendação por linha"
                    />
                  </div>
                  <Button onClick={handleSaveDiagnosis} disabled={savingDiagnosis} size="sm" className="gap-1.5 bg-violet-600 hover:bg-violet-700 text-white">
                    {savingDiagnosis ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    Salvar Diagnóstico
                  </Button>
                </div>
              )}
            </div>

            {/* Chat IA */}
            <div>
              <MentorAIChat
                menteeId={menteeIdNum}
                pillarId={pillarId}
                pillarTitle={title || `Pilar ${pillarId}`}
              />
            </div>
          </div>
        )}

        {/* ========== ABA RELATÓRIO ========== */}
        {activeTab === "relatorio" && (
          <div className="space-y-6">
            {/* Conclusões */}
            <div className="border-2 border-emerald-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-600" /> Conclusões do Pilar
                  {existingConclusions?.liberadoParaMentorado && (
                    <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs">Liberado</Badge>
                  )}
                </h3>
                <Button
                  onClick={handleGenerateConclusions}
                  disabled={generatingConclusions}
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                >
                  {generatingConclusions ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Gerando...</>
                  ) : (
                    <><Sparkles className="w-3.5 h-3.5" /> {conclusionsData ? "Regerar" : "Gerar com IA"}</>
                  )}
                </Button>
              </div>

              {conclusionsData && (
                <div className="space-y-4">
                  {Object.entries(conclusionsData).map(([key, val]) => {
                    const label = key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
                    const isArray = Array.isArray(val);
                    const isRecomendacao = key === "recomendacao_mentor";
                    return (
                      <div key={key}>
                        <label className={`text-xs font-semibold uppercase tracking-wide flex items-center gap-1 mb-1.5 ${isRecomendacao ? "text-violet-700" : "text-emerald-700"}`}>
                          {isRecomendacao ? <Eye className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                          {label}
                        </label>
                        <Textarea
                          value={editedConclusions[key] ?? (isArray ? (val as string[]).join("\n") : String(val ?? ""))}
                          onChange={e => setEditedConclusions(prev => ({ ...prev, [key]: e.target.value }))}
                          rows={isArray ? Math.max(3, (val as string[]).length + 1) : 3}
                          className={`text-sm ${isRecomendacao ? "border-violet-200 bg-violet-50/50" : "border-emerald-200 bg-emerald-50/50"}`}
                          placeholder={isArray ? "Um item por linha" : `Escreva ${label.toLowerCase()}...`}
                        />
                      </div>
                    );
                  })}
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button onClick={() => handleSaveConclusions(false)} disabled={savingConclusions} variant="outline" size="sm" className="gap-1.5">
                      {savingConclusions ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                      Salvar Rascunho
                    </Button>
                    <Button onClick={() => handleSaveConclusions(true)} disabled={savingConclusions} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5">
                      {savingConclusions ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      Salvar e Liberar
                    </Button>
                    {!!existingConclusions?.conclusoesJson && (
                      <Button onClick={() => window.open(`/api/pdf/pilar-conclusoes/${menteeId}/${pillarId}`, "_blank")} variant="outline" size="sm" className="gap-1.5">
                        <FileDown className="w-3.5 h-3.5" /> PDF
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {!conclusionsData && (
                <p className="text-sm text-muted-foreground text-center py-4">Clique em "Gerar com IA" para criar as conclusões.</p>
              )}
            </div>

            {/* Feedback */}
            <div className="border rounded-xl p-4">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-orange-600" /> Feedback
              </h3>

              <div className="bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-200 rounded-xl p-3 mb-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xs text-violet-700">A IA gera um rascunho. Você revisa e ajusta.</p>
                  <Button onClick={handleGenerateFeedbackDraft} disabled={generatingFeedbackDraft} size="sm" className="bg-violet-600 hover:bg-violet-700 text-white gap-1.5 shrink-0">
                    {generatingFeedbackDraft ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Gerando...</> : <><Sparkles className="w-3.5 h-3.5" /> {feedbackDraftGenerated ? "Regerar" : "Gerar Rascunho"}</>}
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-emerald-700 uppercase tracking-wide block mb-1.5">Pontos Fortes</label>
                  <Textarea value={pontosFortes.join("\n")} onChange={e => setPontosFortes(e.target.value.split("\n"))} rows={3} className="text-sm" placeholder="Um por linha" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-amber-700 uppercase tracking-wide block mb-1.5">Pontos de Melhoria</label>
                  <Textarea value={pontosMelhoria.join("\n")} onChange={e => setPontosMelhoria(e.target.value.split("\n"))} rows={3} className="text-sm" placeholder="Um por linha" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Feedback Geral</label>
                  <Textarea value={feedback} onChange={e => setFeedback(e.target.value)} rows={4} className="text-sm resize-none" placeholder="Feedback personalizado..." />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Plano de Ação</label>
                  <Textarea value={planoAcao} onChange={e => setPlanoAcao(e.target.value)} rows={4} className="text-sm resize-none" placeholder="Próximos passos..." />
                </div>
                <div className="flex gap-3 pt-2">
                  <Button variant="outline" onClick={handleSaveFeedback} disabled={savingFeedback} className="gap-2">
                    {savingFeedback ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Salvar
                  </Button>
                  {!existingFeedback?.conclusaoLiberada ? (
                    <Button onClick={handleRelease} disabled={savingFeedback} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                      <Unlock className="w-4 h-4" /> Liberar
                    </Button>
                  ) : (
                    <div className="flex items-center gap-2 text-emerald-600 text-sm font-medium">
                      <CheckCircle2 className="w-4 h-4" /> Liberado
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Relatório Final */}
            <div className="border rounded-xl p-4">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-600" /> Relatório Final
              </h3>
              <PillarReportGenerator
                menteeId={menteeIdNum}
                menteeName={mentee?.nome ?? "Mentorado"}
                pillarId={pillarId}
                pillarName={title ?? `Pilar ${pillarId}`}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

