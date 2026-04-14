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
  Send, Lock, Unlock,
  User, AlertCircle, Loader2,
  Sparkles, TrendingUp, FileDown, Eye
} from "lucide-react";
import { Link } from "wouter";
import { PILLAR_SECTIONS, PILLAR_TITLES, PILLAR_ICONS } from "@/lib/pillar-questions";
import { NEW_TO_OLD_PILLAR } from "../../../shared/pillar-parts";
import { MentorAIChat } from "@/components/MentorAIChat";
import { PillarReportGenerator } from "@/components/PillarReportGenerator";
import { MenteeAnswersSummary } from "@/components/MenteeAnswersSummary";
import { ExpenseAnalysis } from "@/components/ExpenseAnalysis";
import { IvmpAnalysis } from "@/components/IvmpAnalysis";
import { ScenarioSimulator } from "@/components/ScenarioSimulator";
import { PricingEditor } from "@/components/PricingEditor";

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
export default function MentorPillarView() {
  const { menteeId, pillarId: pillarIdStr } = useParams<{ menteeId: string; pillarId: string }>();
  const menteeIdNum = parseInt(menteeId ?? "0");
  const pillarId = parseInt(pillarIdStr ?? "1");
  const dbPillarId = NEW_TO_OLD_PILLAR[pillarId] ?? pillarId;
  const { user, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();

  const [activeTab, setActiveTab] = useState<"dados" | "mentor">("dados");
  const [feedback, setFeedback] = useState("");
  const [planoAcao, setPlanoAcao] = useState("");
  const [pontosFortes, setPontosFortes] = useState<string[]>([""]);
  const [pontosMelhoria, setPontosMelhoria] = useState<string[]>([""]);
  const [savingFeedback, setSavingFeedback] = useState(false);
  const [lastFeedbackSaved, setLastFeedbackSaved] = useState<Date | null>(null);

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
    pillarId: dbPillarId,
  }, { retry: false });

  // Feedback existente
  const { data: existingFeedback, refetch: refetchFeedback } = trpc.pillarFeedback.getFeedback.useQuery({
    menteeId: menteeIdNum,
    pillarId: dbPillarId,
  });

  const saveFeedbackMutation = trpc.pillarFeedback.saveFeedback.useMutation();
  const releaseMutation = trpc.pillarFeedback.releaseConclusion.useMutation();
  const updateAnswerMutation = trpc.pillarAnswers.adminUpdateAnswer.useMutation({
    onSuccess: () => refetchAnswers(),
  });
  const generateConclusionsMutation = trpc.pillarTools.generatePillarConclusions.useMutation();
  const generatePlanMutation = trpc.pillarTools.generateActionPlan.useMutation();
  const saveConclusionsMutation = trpc.pillarTools.savePillarConclusions.useMutation();
  const { data: existingConclusions, refetch: refetchConclusions } = trpc.pillarTools.getPillarConclusions.useQuery({
    menteeId: menteeIdNum,
    pillarId: dbPillarId,
  });

  // Auto-summary IA ao abrir pilar
  const { data: autoSummary, isLoading: summaryLoading } = trpc.mentorAI.autoSummary.useQuery(
    { menteeId: Number(menteeId), pillarId: dbPillarId },
    { staleTime: 5 * 60 * 1000 }
  );

  // Inicializa conclusões existentes
  useEffect(() => {
    if (existingConclusions?.conclusoesJson) {
      const data = existingConclusions.conclusoesJson as Record<string, unknown>;
      setConclusionsData(data);
      const toText = (v: unknown): string => {
        if (v === null || v === undefined) return "";
        if (typeof v === "string") return v;
        if (typeof v === "number" || typeof v === "boolean") return String(v);
        if (Array.isArray(v)) return v.map(item => toText(item)).join("\n");
        if (typeof v === "object") {
          return Object.entries(v as Record<string, unknown>)
            .map(([k, vv]) => `${k}: ${toText(vv)}`)
            .join("\n");
        }
        return String(v);
      };
      const edited: Record<string, string> = {};
      for (const [key, val] of Object.entries(data)) {
        edited[key] = toText(val);
      }
      setEditedConclusions(edited);
    }
  }, [existingConclusions]);

  const handleGenerateConclusions = async () => {
    setGeneratingConclusions(true);
    try {
      const result = await generateConclusionsMutation.mutateAsync({ menteeId: menteeIdNum, pillarId: dbPillarId });
      setConclusionsData(result as Record<string, unknown>);
      const toTextGen = (v: unknown): string => {
        if (v === null || v === undefined) return "";
        if (typeof v === "string") return v;
        if (typeof v === "number" || typeof v === "boolean") return String(v);
        if (Array.isArray(v)) return v.map(item => toTextGen(item)).join("\n");
        if (typeof v === "object") {
          return Object.entries(v as Record<string, unknown>)
            .map(([k, vv]) => `${k}: ${toTextGen(vv)}`)
            .join("\n");
        }
        return String(v);
      };
      const edited: Record<string, string> = {};
      for (const [key, val] of Object.entries(result as Record<string, unknown>)) {
        edited[key] = toTextGen(val);
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
        pillarId: dbPillarId,
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
    }
  }, [existingFeedback]);

  const handleSaveFeedback = async () => {
    setSavingFeedback(true);
    try {
      await saveFeedbackMutation.mutateAsync({
        menteeId: menteeIdNum,
        pillarId: dbPillarId,
        feedback,
        planoAcao,
        pontosFortesJson: pontosFortes.filter(Boolean),
        pontosMelhoriaJson: pontosMelhoria.filter(Boolean),
      });
      toast.success("Feedback salvo com sucesso!");
      setLastFeedbackSaved(new Date());
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
      await releaseMutation.mutateAsync({ menteeId: menteeIdNum, pillarId: dbPillarId });
      toast.success(`Conclusão do Pilar ${pillarId} liberada para ${mentee?.nome}!`);
      refetchFeedback();
    } catch {
      toast.error("Erro ao liberar conclusão.");
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
              <a
                href={`/portal/pilar/${pillarId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 mt-1 justify-end"
              >
                <Eye className="w-3 h-3" /> Ver como mentorado
              </a>
            </div>
          </div>
        </div>

        {/* Pillar navigation */}
        <div className="flex items-center gap-2 mb-4">
          {pillarId > 1 && (
            <Link href={`/mentor/mentorado/${menteeIdNum}/pilar/${pillarId - 1}`}>
              <Button variant="ghost" size="sm" className="text-xs gap-1">
                ← Pilar {pillarId - 1}
              </Button>
            </Link>
          )}
          <span className="text-xs text-muted-foreground flex-1 text-center">Pilar {pillarId} de 6</span>
          {pillarId < 6 && (
            <Link href={`/mentor/mentorado/${menteeIdNum}/pilar/${pillarId + 1}`}>
              <Button variant="ghost" size="sm" className="text-xs gap-1">
                Pilar {pillarId + 1} →
              </Button>
            </Link>
          )}
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
              onClick={() => setActiveTab("mentor")}
              className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                activeTab === "mentor"
                  ? "text-violet-700 border-b-2 border-violet-600"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Mentor
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
              ) : !answers || (answers as any[]).length === 0 ? (
                <div className="text-center py-8 bg-muted/20 rounded-xl">
                  <User className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground font-medium">O mentorado ainda não respondeu este pilar.</p>
                  <p className="text-xs text-muted-foreground mt-1">Quando ele preencher, os dados aparecem aqui automaticamente.</p>
                </div>
              ) : (
                <MenteeAnswersSummary
                  sections={PILLAR_SECTIONS[dbPillarId] ?? []}
                  answers={(answers ?? []) as any}
                  editable={true}
                  onSave={async (sectionId, questionId, value) => {
                    const section = (PILLAR_SECTIONS[dbPillarId] ?? []).find((s: any) => s.perguntas?.some((p: any) => p.id === questionId));
                    const question = section?.perguntas?.find((p: any) => p.id === questionId);
                    await updateAnswerMutation.mutateAsync({
                      menteeId: menteeIdNum,
                      pillarId: dbPillarId,
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
            {dbPillarId === 3 && (
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

            {dbPillarId === 5 && (
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

        {activeTab === "mentor" && (
          <div className="space-y-6">
            {/* Chat IA */}
            <MentorAIChat
              menteeId={menteeIdNum}
              pillarId={dbPillarId}
              pillarTitle={title || `Pilar ${pillarId}`}
            />

            {/* Relatório do Pilar */}
            <div className="border-2 border-emerald-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-600" /> Relatório do Pilar
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
                    // Convert any value to readable text
                    const toText = (v: unknown): string => {
                      if (v === null || v === undefined) return "";
                      if (typeof v === "string") return v;
                      if (typeof v === "number" || typeof v === "boolean") return String(v);
                      if (Array.isArray(v)) return v.map(item => toText(item)).join("\n");
                      if (typeof v === "object") {
                        return Object.entries(v as Record<string, unknown>)
                          .map(([k, vv]) => `${k}: ${toText(vv)}`)
                          .join("\n");
                      }
                      return String(v);
                    };
                    const textValue = editedConclusions[key] ?? toText(val);
                    const lineCount = textValue.split("\n").length;
                    return (
                      <div key={key}>
                        <label className="text-xs font-semibold text-emerald-700 uppercase tracking-wide block mb-1.5">{label}</label>
                        <Textarea
                          value={textValue}
                          onChange={e => setEditedConclusions(prev => ({ ...prev, [key]: e.target.value }))}
                          rows={Math.max(3, lineCount + 1)}
                          className="text-sm border-emerald-200 bg-emerald-50/50"
                          placeholder={`Escreva ${label.toLowerCase()}...`}
                        />
                      </div>
                    );
                  })}
                </div>
              )}

              {!conclusionsData && !generatingConclusions && (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Sparkles className="w-8 h-8 text-emerald-300" />
                  </div>
                  <p className="text-sm font-medium text-foreground">Nenhum relatorio gerado ainda</p>
                  <p className="text-xs text-muted-foreground mt-1">Clique em "Gerar com IA" para criar o relatorio baseado nas respostas do mentorado.</p>
                </div>
              )}

              {/* Feedback inline */}
              <div className="mt-6 pt-4 border-t space-y-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Pontos Fortes</label>
                  <Textarea value={pontosFortes.join("\n")} onChange={e => setPontosFortes(e.target.value.split("\n"))} rows={3} className="text-sm" placeholder="Um por linha" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Melhorias</label>
                  <Textarea value={pontosMelhoria.join("\n")} onChange={e => setPontosMelhoria(e.target.value.split("\n"))} rows={3} className="text-sm" placeholder="Um por linha" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Feedback Geral</label>
                  <Textarea value={feedback} onChange={e => setFeedback(e.target.value)} rows={3} className="text-sm resize-none" placeholder="Feedback personalizado..." />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Plano de Ação</label>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        try {
                          toast.info("Gerando plano de ação...");
                          const result = await generatePlanMutation.mutateAsync({ menteeId: menteeIdNum, pillarId: dbPillarId });
                          setPlanoAcao(result.plano || "");
                          toast.success("Plano de ação gerado!");
                        } catch { toast.error("Erro ao gerar plano."); }
                      }}
                      disabled={generatePlanMutation.isPending}
                      className="text-xs text-violet-600 hover:text-violet-700 gap-1"
                    >
                      {generatePlanMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />} Gerar com IA
                    </Button>
                  </div>
                  <Textarea value={planoAcao} onChange={e => setPlanoAcao(e.target.value)} rows={3} className="text-sm resize-none" placeholder="Próximos passos..." />
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
                <Button variant="outline" onClick={handleSaveFeedback} disabled={savingFeedback} size="sm" className="gap-1.5">
                  {savingFeedback ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  Salvar
                </Button>
                {conclusionsData && (
                  <Button onClick={() => handleSaveConclusions(false)} disabled={savingConclusions} variant="outline" size="sm" className="gap-1.5">
                    Salvar Conclusões
                  </Button>
                )}
                {!existingFeedback?.conclusaoLiberada ? (
                  <Button onClick={handleRelease} disabled={savingFeedback} size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white">
                    <Unlock className="w-3.5 h-3.5" /> Liberar para Mentorado
                  </Button>
                ) : (
                  <span className="flex items-center gap-1.5 text-emerald-600 text-sm font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Liberado
                  </span>
                )}
                {!!existingConclusions?.conclusoesJson && (
                  <Button onClick={() => window.open(`/api/pdf/pilar-conclusoes/${menteeId}/${dbPillarId}`, "_blank")} variant="outline" size="sm" className="gap-1.5">
                    <FileDown className="w-3.5 h-3.5" /> PDF
                  </Button>
                )}
                {lastFeedbackSaved && (
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    Salvo as {lastFeedbackSaved.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                )}
              </div>
            </div>

            {/* Relatório Final Premium */}
            <div className="border rounded-xl p-4">
              <h3 className="font-semibold mb-4">Relatório Final</h3>
              <PillarReportGenerator
                menteeId={menteeIdNum}
                menteeName={mentee?.nome ?? "Mentorado"}
                pillarId={dbPillarId}
                pillarName={title ?? `Pilar ${pillarId}`}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

