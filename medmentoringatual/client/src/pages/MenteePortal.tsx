import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  CheckCircle, Calendar, Clock, FileText,
  Download, ExternalLink, ChevronDown, ChevronUp, LogOut, Star,
  TrendingUp, MessageSquare, Send, ChevronRight, Sparkles,
  Lock, AlertCircle, EyeOff, CheckCircle2, Circle, AlertTriangle
} from "lucide-react";
import { PILLARS } from "@/lib/pillars";
import { PillarPartsView } from "@/components/PillarPartsView";
import { PILLAR_SECTIONS, PILLAR_TITLES } from "@/lib/pillar-questions";
import { IncompleteBanner } from "@/components/IncompleteBanner";
import { Loader2 } from "lucide-react";

// ============================================================
// DOWNLOAD PDF BUTTON — baixa o relatório final premium como PDF real
// ============================================================
function DownloadPdfButton({ pillarId }: { menteeId: number; pillarId: number }) {
  const generatePdf = trpc.portal.generatePdf.useMutation({
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

  return (
    <button
      onClick={() => generatePdf.mutate({ pillarId })}
      disabled={generatePdf.isPending}
      className="flex items-center gap-1.5 text-xs text-primary border border-primary/30 rounded-lg px-3 py-1.5 hover:bg-primary/5 transition-colors disabled:opacity-60"
    >
      {generatePdf.isPending ? (
        <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Gerando PDF...</>
      ) : (
        <><Download className="w-3.5 h-3.5" /> Baixar PDF</>
      )}
    </button>
  );
}

// ============================================================
// PILLAR CARD — Sanfona com questionário embutido
// ============================================================
function PillarCard({ pillar, menteeId }: { pillar: typeof PILLARS[0]; menteeId: number }) {
  const [open, setOpen] = useState(false);
  const [sessionForm, setSessionForm] = useState({ assunto: "", dataPreferida: "", mensagem: "" });
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [activeView, setActiveView] = useState<"questionnaire" | "materials" | "session" | "report">("questionnaire");
  const { data: pillarReport } = trpc.pillarReport.getMy.useQuery({ menteeId, pillarId: pillar.id });

  const myDataQuery = trpc.portal.myData.useQuery();
  const releases = myDataQuery.data?.releases || [];
  const materials = (myDataQuery.data?.materials || []).filter((m: any) => m.pillarId === pillar.id);

  const { data: conclusionData } = trpc.pillarAnswers.isConclusionReleased.useQuery({ pillarId: pillar.id });
  const { data: feedbackData } = trpc.pillarAnswers.getFeedback.useQuery({ pillarId: pillar.id });
  const { data: savedAnswers } = trpc.pillarAnswers.getByPillar.useQuery({ pillarId: pillar.id });
  const { data: partReleasesData } = trpc.portal.getMyPartReleases.useQuery();

  const requestSession = trpc.portal.requestSession.useMutation({
    onSuccess: () => {
      toast.success("Sessão solicitada! Seu mentor responderá em breve.");
      setShowSessionForm(false);
      setSessionForm({ assunto: "", dataPreferida: "", mensagem: "" });
    },
    onError: (e) => toast.error(e.message),
  });

  const sections = PILLAR_SECTIONS[pillar.id] ?? [];
  const release = (releases as any[]).find((r: any) => r.pillarId === pillar.id);
  const hasMaterials = (materials as any[]).length > 0 && release?.materiaisReleased;

  // Progresso do questionário
  const completedSections = new Set<string>(
    (savedAnswers ?? []).filter((r: any) => r.status === "concluida").map((r: any) => r.secao)
  );
  const totalSections = sections.length;
  const completedCount = sections.filter(s => completedSections.has(s.id)).length;
  const progressPct = totalSections > 0 ? Math.round((completedCount / totalSections) * 100) : 0;
  const allDone = completedCount === totalSections && totalSections > 0;

  // Estado do pilar
  const isFeedbackReleased = conclusionData?.released && feedbackData;
  const isAwaitingFeedback = allDone && !isFeedbackReleased;

  const statusBadge = isFeedbackReleased
    ? { label: "Feedback disponível", color: "bg-emerald-100 text-emerald-700 border-emerald-200" }
    : isAwaitingFeedback
    ? { label: "Aguardando mentor", color: "bg-amber-100 text-amber-700 border-amber-200" }
    : completedCount > 0
    ? { label: `${completedCount}/${totalSections} seções`, color: "bg-blue-100 text-blue-700 border-blue-200" }
    : { label: "Não iniciado", color: "bg-muted text-muted-foreground border-border" };

  return (
    <div id={`pillar-card-${pillar.id}`} className={`bg-card rounded-xl border overflow-hidden transition-shadow ${open ? "shadow-md border-primary/30" : "border-border"}`}>
      {/* Header do card — clicável para abrir/fechar */}
      <button
        className="w-full flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors text-left"
        onClick={() => setOpen(!open)}
      >
        <div className={`w-10 h-10 rounded-xl ${pillar.color} flex items-center justify-center flex-shrink-0`}>
          <span className="text-white text-lg">{pillar.emoji}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-foreground text-sm">Pilar {pillar.id} — {pillar.title}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${statusBadge.color}`}>
              {statusBadge.label}
            </span>
          </div>
          {totalSections > 0 && (
            <div className="flex items-center gap-2 mt-1.5">
              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden max-w-[120px]">
                <div
                  className={`h-full rounded-full transition-all ${isFeedbackReleased ? "bg-emerald-500" : "bg-primary"}`}
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground">{progressPct}%</span>
            </div>
          )}
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
      </button>

      {/* Conteúdo expandido */}
      {open && (
        <div className="border-t border-border">
          {/* Sub-navegação */}
          <div className="flex border-b bg-muted/20">
            <button
              onClick={() => setActiveView("questionnaire")}
              className={`flex-1 py-2.5 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
                activeView === "questionnaire" ? "text-primary border-b-2 border-primary bg-white" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" /> Questionário
            </button>
            {hasMaterials && (
              <button
                onClick={() => setActiveView("materials")}
                className={`flex-1 py-2.5 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
                  activeView === "materials" ? "text-primary border-b-2 border-primary bg-white" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <FileText className="w-3.5 h-3.5" /> Materiais
              </button>
            )}
            <button
              onClick={() => setActiveView("session")}
              className={`flex-1 py-2.5 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
                activeView === "session" ? "text-primary border-b-2 border-primary bg-white" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Calendar className="w-3.5 h-3.5" /> Sessão
            </button>
            {pillarReport && (
              <button
                onClick={() => setActiveView("report")}
                className={`flex-1 py-2.5 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
                  activeView === "report" ? "text-primary border-b-2 border-primary bg-white" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <FileText className="w-3.5 h-3.5" /> Relatório
              </button>
            )}
          </div>

          <div className="p-4">
            {/* ── QUESTIONÁRIO ── */}
            {activeView === "questionnaire" && (
              <>
                {/* Feedback do mentor liberado */}
                {isFeedbackReleased && feedbackData && (
                  <div className="mb-4 bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-emerald-600" />
                      <h3 className="font-bold text-emerald-800 text-sm">Feedback do seu mentor</h3>
                    </div>
                    {feedbackData.feedback && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Análise</p>
                        <p className="text-sm text-foreground whitespace-pre-wrap">{feedbackData.feedback}</p>
                      </div>
                    )}
                    {feedbackData.planoAcao && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Plano de Ação</p>
                        <p className="text-sm text-foreground whitespace-pre-wrap">{feedbackData.planoAcao}</p>
                      </div>
                    )}
                    {Array.isArray(feedbackData.pontosFortesJson) && feedbackData.pontosFortesJson.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-1 flex items-center gap-1">
                          <Star className="w-3 h-3" /> Pontos Fortes
                        </p>
                        <ul className="space-y-1">
                          {(feedbackData.pontosFortesJson as string[]).map((p, i) => (
                            <li key={i} className="text-sm text-foreground flex items-start gap-2">
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />{p}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {Array.isArray(feedbackData.pontosMelhoriaJson) && feedbackData.pontosMelhoriaJson.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> Pontos de Melhoria
                        </p>
                        <ul className="space-y-1">
                          {(feedbackData.pontosMelhoriaJson as string[]).map((p, i) => (
                            <li key={i} className="text-sm text-foreground flex items-start gap-2">
                              <ChevronRight className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />{p}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div className="pt-2 border-t border-emerald-200">
                      <p className="text-xs text-emerald-600 font-medium">Você ainda pode revisar e complementar suas respostas abaixo.</p>
                    </div>
                  </div>
                )}

                {/* Aguardando feedback */}
                {isAwaitingFeedback && !isFeedbackReleased && (
                  <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                    <Lock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-amber-800 text-sm">Questionário concluído!</p>
                      <p className="text-xs text-amber-700 mt-0.5">
                        Seu mentor está avaliando suas respostas. Em breve você receberá o feedback personalizado.
                      </p>
                    </div>
                  </div>
                )}

                {/* Partes do pilar */}
                <PillarPartsView
                  pillarId={pillar.id}
                  menteeId={menteeId}
                  partReleases={(partReleasesData as any[]) || []}
                  onComplete={() => {
                    myDataQuery.refetch();
                  }}
                />
              </>
            )}

            {/* ── MATERIAIS ── */}
            {activeView === "materials" && (
              <div className="space-y-2">
                {(materials as any[]).map((mat: any) => (
                  <a
                    key={mat.id}
                    href={mat.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      {mat.tipo === "pdf" ? <FileText className="w-4 h-4 text-primary" /> :
                       mat.tipo === "video" ? <ExternalLink className="w-4 h-4 text-primary" /> :
                       <Download className="w-4 h-4 text-primary" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{mat.titulo}</p>
                      <p className="text-xs text-muted-foreground capitalize">{mat.tipo}</p>
                    </div>
                    <ExternalLink className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  </a>
                ))}
              </div>
            )}

            {/* ── RELATÓRIO FINAL ── */}
            {activeView === "report" && (
              <div className="space-y-4">
                {pillarReport ? (
                  <>
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-foreground">{pillarReport.title}</h3>
                        {pillarReport.subtitle && <p className="text-sm text-muted-foreground">{pillarReport.subtitle}</p>}
                      </div>
                      <DownloadPdfButton menteeId={menteeId} pillarId={pillar.id} />
                    </div>
                    <div className="border rounded-xl overflow-hidden shadow-sm">
                      <iframe
                        srcDoc={pillarReport.htmlContent ?? ""}
                        className="w-full"
                        style={{ height: "600px", border: "none" }}
                        title={`Relatório Pilar ${pillar.id}`}
                      />
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-5 py-10 px-4 text-center">
                    {/* Ícone animado */}
                    <div className="relative">
                      <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center">
                        <Clock className="w-10 h-10 text-amber-500" />
                      </div>
                      <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                        <FileText className="w-3 h-3 text-white" />
                      </div>
                    </div>
                    {/* Texto principal */}
                    <div className="space-y-1.5 max-w-xs">
                      <h4 className="font-bold text-foreground text-base">
                        Relatório em preparação
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {allDone
                          ? "Suas respostas foram recebidas. Seu mentor está preparando o relatório personalizado deste pilar."
                          : "Complete os questionários deste pilar para que seu mentor possa gerar o relatório."}
                      </p>
                    </div>
                    {/* Barra de progresso */}
                    <div className="w-full max-w-xs space-y-1.5">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Progresso do questionário</span>
                        <span>{progressPct}%</span>
                      </div>
                      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            allDone ? "bg-amber-400 animate-pulse" : "bg-primary"
                          }`}
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>
                    {/* Status badge */}
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium border ${
                      allDone
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : "bg-muted text-muted-foreground border-border"
                    }`}>
                      {allDone ? (
                        <><Clock className="w-3.5 h-3.5" /> Aguardando liberação do mentor</>
                      ) : (
                        <><Circle className="w-3.5 h-3.5" /> {completedCount} de {totalSections} seções concluídas</>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
            {/* ── SOLICITAR SESSÃO ── */}
            {activeView === "session" && (
              <div>
                {!showSessionForm ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setShowSessionForm(true)}
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    Solicitar sessão sobre este pilar
                  </Button>
                ) : (
                  <div className="space-y-3 bg-muted/30 rounded-xl p-4">
                    <input
                      placeholder="Assunto da sessão *"
                      value={sessionForm.assunto}
                      onChange={(e) => setSessionForm((p) => ({ ...p, assunto: e.target.value }))}
                      className="w-full border border-border rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-white"
                    />
                    <input
                      type="date"
                      value={sessionForm.dataPreferida}
                      onChange={(e) => setSessionForm((p) => ({ ...p, dataPreferida: e.target.value }))}
                      className="w-full border border-border rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-white"
                    />
                    <textarea
                      placeholder="Mensagem para o mentor (opcional)"
                      value={sessionForm.mensagem}
                      onChange={(e) => setSessionForm((p) => ({ ...p, mensagem: e.target.value }))}
                      className="w-full border border-border rounded-lg p-2.5 text-sm resize-none h-16 focus:outline-none focus:ring-2 focus:ring-ring bg-white"
                    />
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => setShowSessionForm(false)}>
                        Cancelar
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1"
                        disabled={!sessionForm.assunto || requestSession.isPending}
                        onClick={() => requestSession.mutate({
                          pillarId: pillar.id,
                          assunto: sessionForm.assunto,
                          dataPreferida: sessionForm.dataPreferida || undefined,
                          mensagem: sessionForm.mensagem || undefined,
                        })}
                      >
                        <Send className="w-3.5 h-3.5 mr-1" />
                        {requestSession.isPending ? "Enviando..." : "Solicitar"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// PROGRESS TAB — Progresso detalhado por pilar
// ============================================================
function ProgressTab({ menteeId: _menteeId }: { menteeId: number }) {
  const { data: allAnswers, isLoading } = trpc.pillarAnswers.getAllAnswers.useQuery();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // Calcula progresso por pilar
  const pillarProgress = PILLARS.map((pillar) => {
    const sections = PILLAR_SECTIONS[pillar.id] ?? [];
    const pillarAnswerRows = (allAnswers ?? []).filter((r: any) => r.pillarId === pillar.id);
    const completedSectionIds = new Set(
      pillarAnswerRows.filter((r: any) => r.status === "concluida").map((r: any) => r.secao)
    );
    const inProgressSectionIds = new Set(
      pillarAnswerRows.filter((r: any) => r.status === "em_progresso").map((r: any) => r.secao)
    );

    const completedCount = sections.filter(s => completedSectionIds.has(s.id)).length;
    const totalCount = sections.length;
    const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    const missingSections = sections.filter(s => !completedSectionIds.has(s.id));
    const inProgressSections = sections.filter(s => inProgressSectionIds.has(s.id) && !completedSectionIds.has(s.id));

    return {
      pillar,
      sections,
      completedCount,
      totalCount,
      pct,
      missingSections,
      inProgressSections,
      isComplete: completedCount === totalCount && totalCount > 0,
      isStarted: pillarAnswerRows.length > 0,
    };
  });

  const totalSectionsAll = pillarProgress.reduce((sum, p) => sum + p.totalCount, 0);
  const completedSectionsAll = pillarProgress.reduce((sum, p) => sum + p.completedCount, 0);
  const overallPct = totalSectionsAll > 0 ? Math.round((completedSectionsAll / totalSectionsAll) * 100) : 0;
  const completedPillars = pillarProgress.filter(p => p.isComplete).length;

  return (
    <div className="space-y-5">
      {/* Resumo geral */}
      <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl border border-primary/20 p-5">
        <h2 className="font-bold text-foreground text-lg mb-1">Seu Progresso Geral</h2>
        <div className="flex items-end gap-3 mb-3">
          <span className="text-4xl font-bold text-primary">{overallPct}%</span>
          <span className="text-sm text-muted-foreground mb-1">
            {completedSectionsAll} de {totalSectionsAll} seções concluídas
          </span>
        </div>
        <div className="h-3 bg-white/60 rounded-full overflow-hidden mb-3">
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${overallPct}%` }}
          />
        </div>
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="text-muted-foreground">{completedPillars} pilares completos</span>
          </div>
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span className="text-muted-foreground">{7 - completedPillars} pendentes</span>
          </div>
        </div>
      </div>

      {/* Progresso por pilar */}
      <div className="space-y-3">
        {pillarProgress.map(({ pillar, completedCount, totalCount, pct, missingSections, inProgressSections, isComplete, isStarted }) => (
          <div
            key={pillar.id}
            className={`bg-card rounded-xl border overflow-hidden ${
              isComplete ? "border-emerald-200" :
              isStarted ? "border-primary/30" :
              "border-border"
            }`}
          >
            {/* Header do pilar */}
            <div className="flex items-center gap-3 p-4">
              <div className={`w-9 h-9 rounded-xl ${pillar.color} flex items-center justify-center flex-shrink-0`}>
                <span className="text-white text-base">{pillar.emoji}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-sm text-foreground">Pilar {pillar.id}</span>
                  <span className="text-xs text-muted-foreground truncate">{PILLAR_TITLES[pillar.id]}</span>
                  {isComplete && (
                    <span className="ml-auto text-xs font-medium text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                      <CheckCircle2 className="w-3 h-3" /> Completo
                    </span>
                  )}
                  {!isComplete && isStarted && (
                    <span className="ml-auto text-xs font-medium text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full shrink-0">
                      Em andamento
                    </span>
                  )}
                  {!isStarted && (
                    <span className="ml-auto text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full shrink-0">
                      Não iniciado
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isComplete ? "bg-emerald-500" : "bg-primary"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">{completedCount}/{totalCount}</span>
                </div>
              </div>
            </div>

            {/* Seções pendentes */}
            {!isComplete && totalCount > 0 && (
              <div className="border-t border-border px-4 pb-4 pt-3">
                {missingSections.length > 0 ? (
                  <>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      {missingSections.length === 1
                        ? "1 seção pendente"
                        : `${missingSections.length} seções pendentes`}
                    </p>
                    <div className="space-y-1.5">
                      {missingSections.map(s => {
                        const isInProgress = inProgressSections.some(ip => ip.id === s.id);
                        return (
                          <div key={s.id} className="flex items-center gap-2">
                            {isInProgress
                              ? <Clock className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                              : <Circle className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            }
                            <span className={`text-sm ${
                              isInProgress ? "text-blue-700 font-medium" : "text-muted-foreground"
                            }`}>
                              {s.icone && <span className="mr-1">{s.icone}</span>}
                              {s.titulo}
                              {isInProgress && <span className="ml-1 text-xs text-blue-500">(em andamento)</span>}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    <button
                      onClick={() => {
                        // Scroll to top and switch to home tab to open the pillar
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className="mt-3 text-xs text-primary font-medium flex items-center gap-1 hover:underline"
                    >
                      <ChevronRight className="w-3 h-3" />
                      Ir para o Pilar {pillar.id}
                    </button>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">Todas as seções respondidas. Aguardando avaliação do mentor.</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* NPS */}
      <NpsSection />
    </div>
  );
}

function NpsSection() {
  const [npsScore, setNpsScore] = useState<number | null>(null);
  const [npsComment, setNpsComment] = useState("");
  const submitNps = trpc.portal.submitNps.useMutation({
    onSuccess: () => toast.success("Obrigado pelo seu feedback!"),
  });
  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <h3 className="font-semibold text-foreground mb-1">Avalie sua experiência</h3>
      <p className="text-xs text-muted-foreground mb-4">
        De 0 a 10, qual a probabilidade de você recomendar esta mentoria?
      </p>
      <div className="flex gap-1 flex-wrap mb-4">
        {Array.from({ length: 11 }, (_, i) => (
          <button
            key={i}
            onClick={() => setNpsScore(i)}
            className={`w-9 h-9 rounded-lg text-sm font-medium border transition-all ${
              npsScore === i
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:border-primary"
            }`}
          >
            {i}
          </button>
        ))}
      </div>
      {npsScore !== null && (
        <div className="space-y-3">
          <textarea
            placeholder="Comentário (opcional)"
            value={npsComment}
            onChange={(e) => setNpsComment(e.target.value)}
            className="w-full border border-border rounded-lg p-3 text-sm resize-none h-16 focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <Button
            size="sm"
            className="w-full bg-primary text-primary-foreground"
            disabled={submitNps.isPending}
            onClick={() => submitNps.mutate({ pillarId: 0, score: npsScore, comentario: npsComment })}
          >
            {submitNps.isPending ? "Enviando..." : "Enviar Avaliação"}
          </Button>
        </div>
      )}
    </div>
  );
}

// ============================================================
// MAIN PORTAL
// ============================================================
export default function MenteePortal() {
  const [, navigate] = useLocation();
  const myData = trpc.portal.myData.useQuery(undefined, { retry: false });
  const mySessions = myData.data?.sessions || [];
  const stopSimulation = trpc.mentor.stopSimulation.useMutation({
    onSuccess: () => navigate("/mentor"),
    onError: () => navigate("/mentor"),
  });
  const submitNps = trpc.portal.submitNps.useMutation({
    onSuccess: () => toast.success("Obrigado pelo seu feedback!"),
  });

  const [activeTab, setActiveTab] = useState<"home" | "sessions" | "progress">("home");
  const [npsScore, setNpsScore] = useState<number | null>(null);
  const [npsComment, setNpsComment] = useState("");

  const logout = () => {
    localStorage.removeItem("mentee_token");
    navigate("/acesso");
  };

  // Redirect in useEffect to avoid render-phase navigation (React anti-pattern)
  useEffect(() => {
    if (!myData.isLoading && !myData.data?.mentee) {
      navigate("/acesso");
    }
  }, [myData.isLoading, myData.data, navigate]);

  if (myData.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const mentee = myData.data?.mentee;
  if (!mentee) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-primary text-primary-foreground shadow-sm">
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500 flex items-center justify-center">
              <span className="text-white font-bold text-xs">ITC</span>
            </div>
            <span className="font-display font-bold text-sm">MedMentoring</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-primary-foreground/80 hidden sm:block">{mentee.nome}</span>
            {/* Botão visível apenas quando o mentor está simulando o portal */}
            <button
              onClick={() => stopSimulation.mutate()}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-violet-500/20 hover:bg-violet-500/30 text-violet-200 text-xs font-medium transition-colors"
              title="Voltar ao Painel do Mentor"
            >
              <EyeOff className="w-3.5 h-3.5" />
              Sair da simulação
            </button>
            <button onClick={logout} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Welcome banner */}
      <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground px-4 py-5">
        <div className="container">
          <h1 className="font-display text-xl font-bold">Olá, {mentee.nome.split(" ")[0]}!</h1>
          <p className="text-primary-foreground/70 text-sm mt-0.5">
            {mentee.especialidade || "Bem-vindo à sua jornada de mentoria"}
          </p>
          <p className="text-primary-foreground/60 text-xs mt-2">
            Responda os questionários de cada pilar. Um assistente de orientação está disponível em cada pergunta.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b bg-white sticky top-14 z-10">
        <div className="container flex">
          {[
            { id: "home", label: "Pilares", icon: Star },
            { id: "sessions", label: "Sessões", icon: Calendar },
            { id: "progress", label: "Progresso", icon: TrendingUp },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 container py-5">
        {activeTab === "home" && (
          <div className="space-y-3">
            <IncompleteBanner
              onNavigateToPillar={(pillarId) => {
                const el = document.getElementById(`pillar-card-${pillarId}`);
                if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
            />
            <div className="bg-violet-50 border border-violet-200 rounded-xl p-3 flex items-start gap-3 mb-4">
              <Sparkles className="w-4 h-4 text-violet-600 shrink-0 mt-0.5" />
              <p className="text-xs text-violet-800">
                <strong>Como funciona:</strong> Clique em cada pilar para abrir o questionário. Em cada pergunta, o botão <strong>✦ Orientar</strong> oferece uma orientação personalizada para ajudá-lo a responder. Ao concluir, seu mentor receberá suas respostas para análise.
              </p>
            </div>
            {PILLARS.map((p) => (
              <PillarCard key={p.id} pillar={p} menteeId={mentee.id} />
            ))}
          </div>
        )}

        {activeTab === "sessions" && (
          <div className="space-y-4">
            <h2 className="font-semibold text-foreground">Minhas Sessões</h2>
            {(mySessions as any[]).length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <Calendar className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm">Nenhuma sessão registrada ainda.</p>
                <p className="text-xs mt-1">Solicite uma sessão em qualquer pilar.</p>
              </div>
            ) : (
              (mySessions as any[]).map((session: any) => (
                <div key={session.id} className="bg-card rounded-xl border border-border p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-medium text-sm text-foreground">{session.assunto}</p>
                      {session.dataPreferida && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Preferência: {session.dataPreferida}
                        </p>
                      )}
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      session.status === "pending" ? "bg-amber-100 text-amber-800" :
                      session.status === "confirmed" ? "bg-green-100 text-green-800" :
                      session.status === "refused" ? "bg-red-100 text-red-800" :
                      "bg-blue-100 text-blue-800"
                    }`}>
                      {session.status === "pending" ? "Aguardando" :
                       session.status === "confirmed" ? "Confirmada" :
                       session.status === "refused" ? "Recusada" : "Realizada"}
                    </span>
                  </div>
                  {session.status === "confirmed" && session.dataConfirmada && (
                    <div className="bg-green-50 rounded-lg p-3 mt-2 text-sm">
                      <p className="text-green-800 font-medium">
                        📅 {session.dataConfirmada} às {session.horaConfirmada}
                      </p>
                      {session.linkSessao && (
                        <a href={session.linkSessao} target="_blank" rel="noopener noreferrer"
                          className="text-green-700 underline text-xs mt-1 block">
                          Acessar link da sessão
                        </a>
                      )}
                    </div>
                  )}
                  {session.mentorResposta && (
                    <div className="bg-muted/50 rounded-lg p-2 mt-2">
                      <p className="text-xs text-muted-foreground">
                        <MessageSquare className="w-3 h-3 inline mr-1" />
                        {session.mentorResposta}
                      </p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "progress" && (
          <ProgressTab menteeId={mentee.id} />
        )}
      </main>
    </div>
  );
}
