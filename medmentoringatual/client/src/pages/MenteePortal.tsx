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
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const PILLAR_TIME_ESTIMATES: Record<number, string> = {
  1: "~30 min",
  2: "~25 min",
  3: "~45 min",
  4: "~20 min",
  5: "~35 min",
  6: "~25 min",
  7: "~30 min",
};

// ============================================================
// PILLAR CARD — Clickable premium card with progress ring
// ============================================================
function PillarCard({ pillar, menteeId }: { pillar: typeof PILLARS[0]; menteeId: number }) {
  const [, navigate] = useLocation();
  const myDataQuery = trpc.portal.myData.useQuery();
  const releases = myDataQuery.data?.releases || [];

  const { data: conclusionData } = trpc.pillarAnswers.isConclusionReleased.useQuery({ pillarId: pillar.id });
  const { data: feedbackData } = trpc.pillarAnswers.getFeedback.useQuery({ pillarId: pillar.id });
  const { data: savedAnswers } = trpc.pillarAnswers.getByPillar.useQuery({ pillarId: pillar.id });

  const sections = PILLAR_SECTIONS[pillar.id] ?? [];
  const completedSections = new Set<string>(
    (savedAnswers ?? []).filter((r: any) => r.status === "concluida").map((r: any) => r.secao)
  );
  const totalSections = sections.length;
  const completedCount = sections.filter(s => completedSections.has(s.id)).length;
  const progressPct = totalSections > 0 ? Math.round((completedCount / totalSections) * 100) : 0;
  const allDone = completedCount === totalSections && totalSections > 0;
  const isFeedbackReleased = conclusionData?.released && feedbackData;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: (pillar.id - 1) * 0.08 }}
      className={cn(
        "group relative bg-card rounded-2xl border overflow-hidden cursor-pointer border-l-4",
        "hover:shadow-lg hover:-translate-y-1 transition-all duration-300",
        allDone ? "border-l-emerald-500" : progressPct > 0 ? "border-l-blue-500" : "border-l-gray-200",
        allDone && isFeedbackReleased ? "border-secondary/50 border-l-emerald-500" : "border-border"
      )}
      onClick={() => navigate(`/portal/pilar/${pillar.id}`)}
    >
      {/* Colored top bar */}
      <div className={cn("h-1.5", pillar.color)} />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{pillar.emoji}</span>
            <div>
              <h3 className="font-display font-bold text-foreground text-base">
                {pillar.title}
              </h3>
              <p className="text-xs text-muted-foreground">
                {completedCount}/{totalSections} seções
              </p>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <Clock className="w-3 h-3" /> {PILLAR_TIME_ESTIMATES[pillar.id] || "~30 min"}
              </p>
            </div>
          </div>
          {allDone && isFeedbackReleased && (
            <span className="text-xs px-2.5 py-1 rounded-full bg-secondary/15 text-secondary border border-secondary/30 font-medium flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Feedback
            </span>
          )}
          {allDone && !isFeedbackReleased && (
            <span className="text-xs px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 border border-amber-200 font-medium flex items-center gap-1">
              <Clock className="w-3 h-3" /> Aguardando
            </span>
          )}
        </div>

        {/* Progress ring + message */}
        <div className="flex items-center gap-4">
          <div className="relative w-14 h-14 flex-shrink-0">
            <svg className="w-14 h-14 -rotate-90" viewBox="0 0 36 36">
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none" stroke="currentColor" strokeWidth="3"
                className="text-muted/40"
              />
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none" strokeWidth="3" strokeLinecap="round"
                className={allDone ? "text-secondary" : "text-primary"}
                strokeDasharray={`${progressPct}, 100`}
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">
              {progressPct}%
            </span>
          </div>
          <div className="flex-1 text-sm text-muted-foreground">
            {!allDone && completedCount === 0 && "Comece agora"}
            {!allDone && completedCount > 0 && "Continue de onde parou"}
            {allDone && isFeedbackReleased && "Veja o que seu mentor preparou"}
            {allDone && !isFeedbackReleased && "Seu mentor está analisando"}
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
      </div>
    </motion.div>
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

      {/* Transformação */}
      {overallPct > 40 && (
        <div className="bg-gradient-to-br from-primary/5 via-background to-emerald-50/30 border border-primary/10 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" /> Sua Transformação
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg p-4 border">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Progresso</p>
              <p className="text-2xl font-bold text-primary">{overallPct}%</p>
              <p className="text-xs text-muted-foreground mt-1">{completedPillars} de 7 pilares concluídos</p>
            </div>
            <div className="bg-white rounded-lg p-4 border">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Seções Concluídas</p>
              <p className="text-2xl font-bold text-emerald-600">{completedSectionsAll}</p>
              <p className="text-xs text-muted-foreground mt-1">de {totalSectionsAll} seções no total</p>
            </div>
            <div className="bg-white rounded-lg p-4 border">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Próxima Etapa</p>
              {(() => {
                const next = pillarProgress.find(p => !p.isComplete);
                return next ? (
                  <>
                    <p className="text-sm font-medium text-foreground">Pilar {next.pillar.id}</p>
                    <p className="text-xs text-muted-foreground mt-1">{next.pillar.title}</p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-medium text-foreground">Concluído!</p>
                    <p className="text-xs text-muted-foreground mt-1">Parabéns pela jornada!</p>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

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
// WELCOME SCREEN — First-time mentee onboarding
// ============================================================
function WelcomeScreen({ onStart }: { onStart: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-lg mx-auto text-center px-6 py-16"
    >
      <div className="w-20 h-20 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
        <Sparkles className="w-10 h-10 text-primary" />
      </div>
      <h1 className="text-3xl font-display font-bold text-foreground mb-3">
        Bem-vindo ao MedMentoring
      </h1>
      <p className="text-muted-foreground mb-8 leading-relaxed">
        Sua jornada de transformação profissional começa agora. Vamos trabalhar juntos em
        {" "}<strong>7 pilares</strong> que vão estruturar sua carreira médica.
      </p>
      <div className="space-y-3 text-left mb-8">
        {[
          { icon: "📝", text: "Responda as perguntas no seu ritmo" },
          { icon: "💾", text: "Tudo é salvo automaticamente" },
          { icon: "🎯", text: "Seu mentor analisa e devolve insights exclusivos" },
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-3 bg-muted/50 rounded-xl px-4 py-3">
            <span className="text-xl">{item.icon}</span>
            <span className="text-sm text-foreground">{item.text}</span>
          </div>
        ))}
      </div>
      <Button onClick={onStart} size="lg" className="w-full gap-2">
        Começar Jornada <ChevronRight className="w-4 h-4" />
      </Button>
    </motion.div>
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

  const { data: partReleases } = trpc.portal.getMyPartReleases.useQuery();

  const { data: allAnswers } = trpc.pillarAnswers.getAllAnswers.useQuery();

  const [activeTab, setActiveTab] = useState<"home" | "sessions" | "progress">("home");
  const [npsScore, setNpsScore] = useState<number | null>(null);
  const [npsComment, setNpsComment] = useState("");

  // Calculate overall progress
  const overallProgress = (() => {
    const totalSections = PILLARS.reduce((sum, p) => sum + (PILLAR_SECTIONS[p.id] ?? []).length, 0);
    if (totalSections === 0) return 0;
    const completedSections = PILLARS.reduce((sum, p) => {
      const sections = PILLAR_SECTIONS[p.id] ?? [];
      const pillarAnswerRows = (allAnswers ?? []).filter((r: any) => r.pillarId === p.id);
      const completedIds = new Set(
        pillarAnswerRows.filter((r: any) => r.status === "concluida").map((r: any) => r.secao)
      );
      return sum + sections.filter(s => completedIds.has(s.id)).length;
    }, 0);
    return Math.round((completedSections / totalSections) * 100);
  })();

  // Next incomplete pillar for "Próximo Passo" card
  const nextPillar = (() => {
    for (const p of PILLARS) {
      const sections = PILLAR_SECTIONS[p.id] ?? [];
      const pillarAnswerRows = (allAnswers ?? []).filter((r: any) => r.pillarId === p.id);
      const completedIds = new Set(
        pillarAnswerRows.filter((r: any) => r.status === "concluida").map((r: any) => r.secao)
      );
      const completedCount = sections.filter(s => completedIds.has(s.id)).length;
      if (sections.length === 0 || completedCount < sections.length) {
        return p;
      }
    }
    return null;
  })();

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
      <div className="min-h-screen bg-background">
        <div className="bg-gradient-to-br from-primary to-primary/80 px-4 py-8">
          <div className="max-w-5xl mx-auto">
            <div className="h-8 bg-white/20 rounded w-48 mb-2 animate-pulse" />
            <div className="h-4 bg-white/10 rounded w-64 animate-pulse" />
          </div>
        </div>
        <div className="max-w-5xl mx-auto px-4 py-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1,2,3,4].map(i => (
              <div key={i} className="h-32 bg-muted/50 rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
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
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">
            Olá, {mentee.nome?.split(" ")[0] || "Mentorado"} 👋
          </h1>
          <p className="text-white/70 text-sm">
            {overallProgress === 100
              ? "Parabéns! Você completou todos os pilares. Aguarde o relatório final do seu mentor."
              : overallProgress > 50
                ? `Você já completou ${overallProgress}% da mentoria. Continue assim!`
                : overallProgress > 0
                  ? `Sua jornada está começando. ${overallProgress}% concluído.`
                  : "Bem-vindo à sua jornada de transformação profissional."}
          </p>
          <p className="text-primary-foreground/60 text-xs mt-2">
            Responda os questionários de cada pilar. Um assistente de orientação está disponível em cada pergunta.
          </p>
          {/* Seu Mentor */}
          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 mt-4">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm">
              CT
            </div>
            <div>
              <p className="text-white/60 text-xs">Seu Mentor</p>
              <p className="text-white font-medium text-sm">Carlos Trindade</p>
            </div>
          </div>
        </div>
      </div>

      {/* Released analysis notification */}
      {partReleases && partReleases.some((r: any) => r.released) && (
        <div className="mx-4 -mt-2 mb-4 bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-emerald-800">Seu mentor liberou análises!</p>
            <p className="text-xs text-emerald-600">Abra os pilares para ver o diagnóstico personalizado.</p>
          </div>
        </div>
      )}

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
          <div>
            <IncompleteBanner
              onNavigateToPillar={(pillarId) => navigate(`/portal/pilar/${pillarId}`)}
            />
            {/* Próximo Passo */}
            {nextPillar && overallProgress < 100 && (
              <div className="mb-6 mt-4 bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-primary uppercase tracking-wide">Próximo Passo</p>
                  <p className="text-sm text-foreground mt-1">
                    Continue preenchendo o <strong>Pilar {nextPillar.id} — {nextPillar.title}</strong>
                  </p>
                </div>
                <Button size="sm" onClick={() => navigate(`/portal/pilar/${nextPillar.id}`)} className="shrink-0">
                  Continuar →
                </Button>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {PILLARS.map((p) => (
                <PillarCard key={p.id} pillar={p} menteeId={mentee.id} />
              ))}
            </div>
            {/* Atividades Recentes */}
            <div className="mt-6 p-4 bg-muted/30 rounded-xl">
              <h3 className="text-sm font-semibold text-foreground mb-3">Atividades Recentes</h3>
              <div className="space-y-2">
                {partReleases?.filter((r: any) => r.released).slice(0, 5).map((r: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>Mentor liberou análise: Pilar {r.pillarId} — Parte {r.partId?.toUpperCase()}</span>
                  </div>
                ))}
                {(!partReleases || partReleases.filter((r: any) => r.released).length === 0) && (
                  <p className="text-xs text-muted-foreground">Nenhuma atividade recente.</p>
                )}
              </div>
            </div>
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
