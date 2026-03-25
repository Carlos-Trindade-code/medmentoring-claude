/**
 * MenteePillarQuestionnaire — Componente reutilizável de questionário guiado por pilar
 *
 * Cada pilar tem suas próprias seções e perguntas.
 * O mentorado responde autonomamente, com guias de orientação e opção "Não sei".
 * As respostas são salvas automaticamente e enviadas ao mentor.
 */
import { useState, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ChevronRight, ChevronLeft, CheckCircle2, HelpCircle,
  Info, Loader2, Lock, Star, AlertCircle, Sparkles, X
} from "lucide-react";

// ============================================================
// TIPOS
// ============================================================
export type QuestionType =
  | "text"           // Resposta livre em texto
  | "textarea"       // Resposta longa
  | "number"         // Número (ex: R$ 1.200)
  | "currency"       // Valor monetário com formatação
  | "select"         // Escolha única
  | "multiselect"    // Múltipla escolha
  | "yesno"          // Sim / Não / Não sei
  | "scale"          // Escala 1-10
  | "percentage";    // Percentual 0-100%

export interface Question {
  id: string;
  pergunta: string;
  tipo: QuestionType;
  obrigatoria?: boolean;
  placeholder?: string;
  guia?: string;          // Texto de orientação (aparece ao clicar em "?")
  exemplo?: string;       // Exemplo de resposta
  opcoes?: string[];      // Para select e multiselect
  unidade?: string;       // Ex: "por mês", "por consulta", "%"
  dependeDe?: { id: string; valor: string | boolean }; // Mostrar só se outra pergunta tiver certo valor
}

export interface Section {
  id: string;
  titulo: string;
  descricao?: string;
  icone?: string;
  perguntas: Question[];
}

export interface Answer {
  id: string;
  pergunta: string;
  resposta: string | number | boolean | null;
  naoSabe: boolean;
}

interface Props {
  pillarId: number;
  pillarTitle: string;
  sections: Section[];
  onComplete?: () => void;
  /** Quando true, não mostra a tela de cadeado mesmo se todas as seções foram concluídas */
  allowReview?: boolean;
}

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
export function MenteePillarQuestionnaire({ pillarId, pillarTitle, sections, onComplete, allowReview }: Props) {
  const [currentSectionIdx, setCurrentSectionIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Answer[]>>({});
  const [showGuide, setShowGuide] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [completedSections, setCompletedSections] = useState<Set<string>>(new Set());
  const [isDirty, setIsDirty] = useState(false);

  // Aviso de saída sem salvar
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  // Carrega respostas salvas
  const { data: savedAnswers } = trpc.pillarAnswers.getByPillar.useQuery({ pillarId });
  const { data: conclusionData } = trpc.pillarAnswers.isConclusionReleased.useQuery({ pillarId });
  const { data: feedbackData } = trpc.pillarAnswers.getFeedback.useQuery({ pillarId });

  const saveMutation = trpc.pillarAnswers.save.useMutation();
  const aiHintMutation = trpc.pillarAnswers.getAiHint.useMutation();
  const aiSuggestionMutation = trpc.portal.getAiSuggestion.useMutation();
  const [aiHints, setAiHints] = useState<Record<string, string>>({});
  const [loadingHint, setLoadingHint] = useState<string | null>(null);
  const [showHint, setShowHint] = useState<string | null>(null);
  // Section-level AI proactive suggestion
  const [sectionAiSuggestion, setSectionAiSuggestion] = useState<Record<string, string>>({});
  const [loadingSectionAi, setLoadingSectionAi] = useState(false);

  const handleSectionAiSuggestion = async () => {
    if (loadingSectionAi || !currentSection) return;
    setLoadingSectionAi(true);
    try {
      const answeredInSection = (answers[currentSection.id] ?? [])
        .filter(a => !a.naoSabe && a.resposta !== null && a.resposta !== undefined && a.resposta !== "")
        .map(a => `${a.pergunta}: ${a.resposta}`);
      const unansweredInSection = visibleQuestions
        .filter(q => {
          const a = getAnswer(q.id);
          return !a || (!a.naoSabe && (a.resposta === null || a.resposta === undefined || a.resposta === ""));
        })
        .map(q => q.pergunta);
      const dadosStr = `Seção: ${currentSection.titulo}\nRespostas já dadas: ${answeredInSection.length > 0 ? answeredInSection.join("; ") : "nenhuma"}\nPerguntas não respondidas: ${unansweredInSection.length > 0 ? unansweredInSection.join("; ") : "todas respondidas"}`;
      const result = await aiSuggestionMutation.mutateAsync({
        contexto: `Pilar ${pillarId} — ${pillarTitle} — Seção: ${currentSection.titulo}`,
        dados: dadosStr,
        tipo: "questionnaire",
      });
      setSectionAiSuggestion(prev => ({ ...prev, [currentSection.id]: result.suggestion }));
    } catch {
      toast.error("Não foi possível obter a sugestão. Tente novamente.");
    } finally {
      setLoadingSectionAi(false);
    }
  };

  const handleGetAiHint = async (question: Question) => {
    if (aiHints[question.id]) {
      setShowHint(showHint === question.id ? null : question.id);
      return;
    }
    setLoadingHint(question.id);
    setShowHint(question.id);
    try {
      const allAnswered = Object.values(answers).flat()
        .filter(a => !a.naoSabe && a.resposta !== null && a.resposta !== undefined && a.resposta !== "")
        .map(a => ({ pergunta: a.pergunta, resposta: String(a.resposta) }))
        .slice(0, 5);
      const result = await aiHintMutation.mutateAsync({
        pillarId,
        pergunta: question.pergunta,
        guia: question.guia,
        respostasAnteriores: allAnswered,
      });
      setAiHints(prev => ({ ...prev, [question.id]: result.hint }));
    } catch {
      toast.error("Não foi possível obter a dica. Tente novamente.");
      setShowHint(null);
    } finally {
      setLoadingHint(null);
    }
  };

  // Inicializa respostas salvas
  useEffect(() => {
    if (savedAnswers && savedAnswers.length > 0) {
      const loaded: Record<string, Answer[]> = {};
      const completed = new Set<string>();
      for (const row of savedAnswers) {
        if (row.secao && row.respostas) {
          loaded[row.secao] = row.respostas as Answer[];
          if (row.status === "concluida") completed.add(row.secao);
        }
      }
      setAnswers(loaded);
      setCompletedSections(completed);
      // Vai para a primeira seção não concluída
      const firstIncomplete = sections.findIndex(s => !completed.has(s.id));
      if (firstIncomplete >= 0) setCurrentSectionIdx(firstIncomplete);
    }
  }, [savedAnswers]);

  const currentSection = sections[currentSectionIdx];
  const sectionAnswers = answers[currentSection?.id] ?? [];

  const getAnswer = (questionId: string): Answer | undefined =>
    sectionAnswers.find(a => a.id === questionId);

  const setAnswer = useCallback((question: Question, value: string | number | boolean | null, naoSabe = false) => {
    setIsDirty(true);
    setAnswers(prev => {
      const secao = currentSection.id;
      const existing = prev[secao] ?? [];
      const idx = existing.findIndex(a => a.id === question.id);
      const newAnswer: Answer = { id: question.id, pergunta: question.pergunta, resposta: naoSabe ? null : value, naoSabe };
      if (idx >= 0) {
        const updated = [...existing];
        updated[idx] = newAnswer;
        return { ...prev, [secao]: updated };
      }
      return { ...prev, [secao]: [...existing, newAnswer] };
    });
  }, [currentSection]);

  const isQuestionVisible = (q: Question): boolean => {
    if (!q.dependeDe) return true;
    const dep = getAnswer(q.dependeDe.id);
    if (!dep) return false;
    return String(dep.resposta) === String(q.dependeDe.valor);
  };

  const visibleQuestions = currentSection?.perguntas.filter(isQuestionVisible) ?? [];
  const answeredCount = visibleQuestions.filter(q => {
    const a = getAnswer(q.id);
    return a && (a.naoSabe || (a.resposta !== null && a.resposta !== undefined && a.resposta !== ""));
  }).length;
  const progress = visibleQuestions.length > 0 ? Math.round((answeredCount / visibleQuestions.length) * 100) : 0;

  const saveSection = async (status: "em_progresso" | "concluida") => {
    setSaving(true);
    try {
      const secaoAnswers = answers[currentSection.id] ?? [];
      await saveMutation.mutateAsync({
        pillarId,
        secao: currentSection.id,
        respostas: secaoAnswers,
        status,
      });
      setLastSaved(new Date());
      setIsDirty(false);
      if (status === "concluida") {
        setCompletedSections(prev => new Set(Array.from(prev).concat(currentSection.id)));
        toast.success(`Seção "${currentSection.titulo}" concluída! ✓`);
      } else {
        toast.success("Progresso salvo!");
      }
    } catch {
      toast.error("Erro ao salvar. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  const handleNext = async () => {
    await saveSection("concluida");
    if (currentSectionIdx < sections.length - 1) {
      setCurrentSectionIdx(prev => prev + 1);
    } else {
      onComplete?.();
    }
  };

  // Ao re-salvar uma seção já concluída, mantém o status "concluida" para não regredir
  const handleSaveProgress = () => {
    const alreadyCompleted = completedSections.has(currentSection?.id ?? "");
    saveSection(alreadyCompleted ? "concluida" : "em_progresso");
  };

  const allSectionsCompleted = sections.every(s => completedSections.has(s.id));
  // Pilar bloqueado: seção já concluída E não está em modo de revisão
  // Quando allowReview=true, o mentorado pode editar e re-salvar mesmo seções concluídas
  const isSectionLocked = completedSections.has(currentSection?.id ?? "") && !allowReview;

  // Se conclusão foi liberada pelo mentor, mostra feedback
  if (conclusionData?.released && feedbackData) {
    return (
      <div className="space-y-6">
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            <div>
              <h3 className="font-bold text-emerald-800 text-lg">Conclusão liberada pelo seu mentor!</h3>
              <p className="text-emerald-600 text-sm">Seu mentor avaliou suas respostas e preparou um feedback personalizado.</p>
            </div>
          </div>
          {feedbackData.feedback && (
            <div className="mb-4">
              <h4 className="font-semibold text-foreground mb-2">Feedback do Mentor</h4>
              <p className="text-muted-foreground text-sm whitespace-pre-wrap">{feedbackData.feedback}</p>
            </div>
          )}
          {feedbackData.planoAcao && (
            <div className="mb-4">
              <h4 className="font-semibold text-foreground mb-2">Plano de Ação</h4>
              <p className="text-muted-foreground text-sm whitespace-pre-wrap">{feedbackData.planoAcao}</p>
            </div>
          )}
          {Array.isArray(feedbackData.pontosFortesJson) && feedbackData.pontosFortesJson.length > 0 && (
            <div className="mb-4">
              <h4 className="font-semibold text-emerald-700 mb-2 flex items-center gap-2"><Star className="w-4 h-4" /> Pontos Fortes</h4>
              <ul className="space-y-1">
                {(feedbackData.pontosFortesJson as string[]).map((p, i) => (
                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />{p}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {Array.isArray(feedbackData.pontosMelhoriaJson) && feedbackData.pontosMelhoriaJson.length > 0 && (
            <div>
              <h4 className="font-semibold text-amber-700 mb-2 flex items-center gap-2"><AlertCircle className="w-4 h-4" /> Pontos de Melhoria</h4>
              <ul className="space-y-1">
                {(feedbackData.pontosMelhoriaJson as string[]).map((p, i) => (
                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                    <ChevronRight className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />{p}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Se todas as seções foram concluídas mas conclusão ainda não liberada
  // (quando allowReview=true, não mostra o cadeado — permite revisão das respostas)
  if (allSectionsCompleted && !conclusionData?.released && !allowReview) {
    return (
      <div className="text-center py-12 space-y-4">
        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
          <Lock className="w-8 h-8 text-amber-600" />
        </div>
        <h3 className="font-bold text-foreground text-lg">Questionário concluído!</h3>
        <p className="text-muted-foreground text-sm max-w-sm mx-auto">
          Você respondeu todas as perguntas do <strong>Pilar {pillarId} — {pillarTitle}</strong>.
          Seu mentor está avaliando suas respostas e em breve liberará o feedback e a conclusão deste pilar.
        </p>
        <div className="flex items-center justify-center gap-2 text-amber-600 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          Aguardando avaliação do mentor...
        </div>
      </div>
    );
  }

  if (!currentSection) return null;

  return (
    <div className="space-y-6">
      {/* Progresso geral */}
      <div className="flex gap-1.5 mb-2">
        {sections.map((s, i) => (
          <button
            key={s.id}
            onClick={() => setCurrentSectionIdx(i)}
            className={`flex-1 h-2 rounded-full transition-colors ${
              completedSections.has(s.id) ? "bg-emerald-500" :
              i === currentSectionIdx ? "bg-primary" : "bg-muted"
            }`}
            title={s.titulo}
          />
        ))}
      </div>

      {/* Cabeçalho da seção */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {currentSection.icone && <span className="text-2xl">{currentSection.icone}</span>}
            <h3 className="font-bold text-foreground text-lg">{currentSection.titulo}</h3>
            {completedSections.has(currentSection.id) && (
              <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 text-xs">Concluída</Badge>
            )}
          </div>
          {currentSection.descricao && (
            <p className="text-muted-foreground text-sm">{currentSection.descricao}</p>
          )}
        </div>
        <span className="text-xs text-muted-foreground shrink-0 ml-4">
          {currentSectionIdx + 1} / {sections.length}
        </span>
      </div>

      {/* Barra de progresso da seção */}
      <div>
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>{answeredCount} de {visibleQuestions.length} respondidas</span>
          <div className="flex items-center gap-2">
            <span>{progress}%</span>
            {!isSectionLocked && (
              <button
                onClick={handleSectionAiSuggestion}
                disabled={loadingSectionAi}
                className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border border-violet-200 text-violet-500 hover:bg-violet-50 transition-colors"
                title="Pedir orientação para esta seção"
              >
                {loadingSectionAi ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                <span className="hidden sm:inline">Orientar</span>
              </button>
            )}
          </div>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>
      {/* Orientação Proativa — sugestão de dados esquecidos na seção */}
      {sectionAiSuggestion[currentSection.id] && (
        <div className="p-3 bg-violet-50 border border-violet-200 rounded-lg">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2 flex-1">
              <Sparkles className="w-3.5 h-3.5 text-violet-600 shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-semibold text-violet-700 block mb-1">Orientação — Algo que pode enriquecer suas respostas</span>
                <p className="text-xs text-violet-800 leading-relaxed whitespace-pre-wrap">{sectionAiSuggestion[currentSection.id]}</p>
              </div>
            </div>
            <button
              onClick={() => setSectionAiSuggestion(prev => { const n = {...prev}; delete n[currentSection.id]; return n; })}
              className="text-violet-400 hover:text-violet-600 shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Perguntas */}
      <div className="space-y-5">
        {visibleQuestions.map((q) => {
          const answer = getAnswer(q.id);
          const answered = answer && (answer.naoSabe || (answer.resposta !== null && answer.resposta !== undefined && answer.resposta !== ""));

          return (
            <div key={q.id} className={`rounded-xl border p-4 transition-colors ${answered ? "border-emerald-200 bg-emerald-50/30" : "border-border bg-card"}`}>
              <div className="flex items-start justify-between gap-2 mb-3">
                <label className="text-sm font-medium text-foreground leading-relaxed">
                  {q.pergunta}
                  {q.obrigatoria && <span className="text-destructive ml-1">*</span>}
                </label>
                <div className="flex items-center gap-1 shrink-0">
                  {answered && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                  {q.guia && (
                    <button
                      onClick={() => setShowGuide(showGuide === q.id ? null : q.id)}
                      className="text-muted-foreground hover:text-primary transition-colors"
                      title="Ver orientação"
                    >
                      <HelpCircle className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleGetAiHint(q)}
                    className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border transition-colors ${
                      showHint === q.id
                        ? "bg-violet-100 border-violet-300 text-violet-700"
                        : "border-violet-200 text-violet-500 hover:bg-violet-50"
                    }`}
                    title="Pedir orientação"
                    disabled={loadingHint === q.id}
                  >
                    {loadingHint === q.id
                      ? <Loader2 className="w-3 h-3 animate-spin" />
                      : <Sparkles className="w-3 h-3" />}
                    <span className="hidden sm:inline">Orientar</span>
                  </button>
                </div>
              </div>

              {/* Guia de orientação */}
              {showGuide === q.id && q.guia && (
                <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg flex gap-2">
                  <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-blue-800">
                    <p>{q.guia}</p>
                    {q.exemplo && <p className="mt-1 font-medium">Exemplo: {q.exemplo}</p>}
                  </div>
                </div>
              )}

              {/* Dica de Orientação */}
              {showHint === q.id && (
                <div className="mb-3 p-3 bg-violet-50 border border-violet-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-violet-600" />
                      <span className="text-xs font-semibold text-violet-700">Orientação</span>
                    </div>
                    <button onClick={() => setShowHint(null)} className="text-violet-400 hover:text-violet-600">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {loadingHint === q.id ? (
                    <div className="flex items-center gap-2 py-2">
                      <Loader2 className="w-4 h-4 animate-spin text-violet-500" />
                      <span className="text-xs text-violet-600">Gerando orientação personalizada...</span>
                    </div>
                  ) : (
                    <p className="text-xs text-violet-800 leading-relaxed whitespace-pre-wrap">{aiHints[q.id]}</p>
                  )}
                </div>
              )}

              {/* Campo de resposta */}
              {!answer?.naoSabe && (
                <QuestionInput
                  question={q}
                  value={answer?.resposta ?? null}
                  onChange={isSectionLocked ? () => {} : (val) => setAnswer(q, val)}
                  disabled={isSectionLocked}
                />
              )}

              {/* Botão "Não sei" */}
              <div className="mt-2 flex items-center gap-2">
                {isSectionLocked ? (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    Seção concluída — não é possível editar
                  </span>
                ) : (
                  <button
                    onClick={() => setAnswer(q, null, !answer?.naoSabe)}
                    className={`text-xs flex items-center gap-1 transition-colors ${
                      answer?.naoSabe
                        ? "text-amber-600 font-medium"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <HelpCircle className="w-3 h-3" />
                    {answer?.naoSabe ? "✓ Marcado como 'Não sei'" : "Não sei / Não tenho certeza"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Indicador de salvamento */}
      {lastSaved && !saving && (
        <div className="text-xs text-emerald-600 pt-1">
          ✓ Salvo às {lastSaved.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
        </div>
      )}

      {/* Ações */}
      <div className="flex items-center justify-between pt-2 border-t">
        <div className="flex gap-2">
          {currentSectionIdx > 0 && (
            <Button variant="outline" size="sm" onClick={() => setCurrentSectionIdx(prev => prev - 1)}>
              <ChevronLeft className="w-4 h-4 mr-1" /> Anterior
            </Button>
          )}
          <Button
              variant="outline"
              size="sm"
              onClick={handleSaveProgress}
              disabled={saving}
              className="border-green-300 text-green-700 hover:bg-green-50 hover:border-green-400 font-medium bg-green-50"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
              ) : (
                <CheckCircle2 className="w-4 h-4 mr-1" />
              )}
              {completedSections.has(currentSection?.id ?? "") ? "Atualizar respostas" : "Salvar respostas"}
            </Button>
        </div>
        {isSectionLocked ? (
          <Button variant="outline" size="sm" onClick={() => setCurrentSectionIdx(prev => Math.min(prev + 1, sections.length - 1))} disabled={currentSectionIdx >= sections.length - 1}>
            Próxima seção <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        ) : (
          <Button onClick={handleNext} disabled={saving} className="gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {currentSectionIdx < sections.length - 1 ? (
              <><span>Próxima seção</span><ChevronRight className="w-4 h-4" /></>
            ) : (
              <><CheckCircle2 className="w-4 h-4" /><span>Concluir pilar</span></>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

// ============================================================
// COMPONENTE DE INPUT POR TIPO
// ============================================================
function QuestionInput({
  question, value, onChange, disabled = false,
}: {
  question: Question;
  value: string | number | boolean | null;
  onChange: (val: string | number | boolean | null) => void;
  disabled?: boolean;
}) {
  const { tipo, placeholder, opcoes, unidade } = question;

  const disabledClass = disabled ? "opacity-60 pointer-events-none" : "";

  if (tipo === "yesno") {
    return (
      <div className={`flex gap-2 ${disabledClass}`}>
        {["Sim", "Não", "Não sei"].map(opt => (
          <button
            key={opt}
            onClick={() => !disabled && onChange(opt)}
            disabled={disabled}
            className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
              value === opt
                ? opt === "Sim" ? "bg-emerald-100 border-emerald-400 text-emerald-700"
                  : opt === "Não" ? "bg-red-100 border-red-400 text-red-700"
                  : "bg-amber-100 border-amber-400 text-amber-700"
                : "border-border"
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    );
  }

  if (tipo === "select" && opcoes) {
    return (
      <div className={`grid grid-cols-2 gap-2 ${disabledClass}`}>
        {opcoes.map(opt => (
          <button
            key={opt}
            onClick={() => !disabled && onChange(opt)}
            disabled={disabled}
            className={`py-2 px-3 rounded-lg border text-sm text-left transition-colors ${
              value === opt ? "bg-primary/10 border-primary text-primary font-medium" : "border-border"
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    );
  }

  if (tipo === "multiselect" && opcoes) {
    const selected = String(value || "").split(",").filter(Boolean);
    const toggle = (opt: string) => {
      if (disabled) return;
      const newSelected = selected.includes(opt)
        ? selected.filter(s => s !== opt)
        : [...selected, opt];
      onChange(newSelected.join(","));
    };
    return (
      <div className={`grid grid-cols-2 gap-2 ${disabledClass}`}>
        {opcoes.map(opt => (
          <button
            key={opt}
            onClick={() => toggle(opt)}
            disabled={disabled}
            className={`py-2 px-3 rounded-lg border text-sm text-left transition-colors ${
              selected.includes(opt) ? "bg-primary/10 border-primary text-primary font-medium" : "border-border"
            }`}
          >
            {selected.includes(opt) ? "✓ " : ""}{opt}
          </button>
        ))}
      </div>
    );
  }

  if (tipo === "scale") {
    return (
      <div className={`space-y-2 ${disabledClass}`}>
        <div className="flex gap-1">
          {[1,2,3,4,5,6,7,8,9,10].map(n => (
            <button
              key={n}
              onClick={() => !disabled && onChange(n)}
              disabled={disabled}
              className={`flex-1 py-2 rounded-lg border text-xs font-bold transition-colors ${
                value === n ? "bg-primary text-primary-foreground border-primary" : "border-border"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Muito baixo</span><span>Muito alto</span>
        </div>
      </div>
    );
  }

  if (tipo === "currency" || tipo === "number" || tipo === "percentage") {
    return (
      <div className="flex items-center gap-2">
        {tipo === "currency" && <span className="text-muted-foreground text-sm font-medium">R$</span>}
        <Input
          type="number"
          value={value as number ?? ""}
          onChange={e => !disabled && onChange(e.target.value === "" ? null : Number(e.target.value))}
          placeholder={placeholder || (tipo === "currency" ? "0,00" : "0")}
          className="flex-1"
          min={0}
          disabled={disabled}
        />
        {unidade && <span className="text-muted-foreground text-sm shrink-0">{unidade}</span>}
        {tipo === "percentage" && <span className="text-muted-foreground text-sm">%</span>}
      </div>
    );
  }

  if (tipo === "textarea") {
    return (
      <Textarea
        value={value as string ?? ""}
        onChange={e => !disabled && onChange(e.target.value)}
        placeholder={placeholder || "Digite sua resposta..."}
        rows={3}
        className="resize-none"
        disabled={disabled}
        readOnly={disabled}
      />
    );
  }

  // Default: text
  return (
    <Input
      value={value as string ?? ""}
      onChange={e => !disabled && onChange(e.target.value)}
      placeholder={placeholder || "Digite sua resposta..."}
      disabled={disabled}
      readOnly={disabled}
    />
  );
}
