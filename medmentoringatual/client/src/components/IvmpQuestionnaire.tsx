/**
 * IvmpQuestionnaire — Questionario iVMP para o mentorado
 *
 * Wizard com 7 dimensoes, 53 perguntas (escala 0-10).
 * REGRA CRITICA: Nenhum score, total, porcentagem ou analise e exibido ao mentorado.
 * Apos completar: mensagem de sucesso direcionando ao mentor.
 */
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import {
  IVMP_DIMENSIONS,
  TOTAL_IVMP_QUESTIONS,
} from "../../../shared/ivmp-questions";
import type { IvmpDimension } from "../../../shared/ivmp-questions";

// ============================================================
// TIPOS
// ============================================================
interface IvmpQuestionnaireProps {
  onComplete?: () => void;
}

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
export function IvmpQuestionnaire({ onComplete }: IvmpQuestionnaireProps) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [currentDimIndex, setCurrentDimIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [completed, setCompleted] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialLoad = useRef(true);

  // tRPC
  const { data: progressData, isLoading } =
    trpc.portal.getMyIvmpProgress.useQuery();
  const saveMutation = trpc.portal.saveIvmpAnswers.useMutation();

  // Carrega dados salvos
  useEffect(() => {
    if (progressData?.answers) {
      const saved = progressData.answers as Record<string, number>;
      if (Object.keys(saved).length > 0) {
        setAnswers(saved);
      }
    }
  }, [progressData]);

  // Contagem de respostas
  const answeredCount = useMemo(
    () => Object.keys(answers).length,
    [answers]
  );

  const allAnswered = answeredCount === TOTAL_IVMP_QUESTIONS;

  // Contagem por dimensao
  const getDimAnsweredCount = useCallback(
    (dim: IvmpDimension): number => {
      return dim.perguntas.filter((q) => answers[q.id] !== undefined).length;
    },
    [answers]
  );

  const isDimComplete = useCallback(
    (dim: IvmpDimension): boolean => {
      return dim.perguntas.every((q) => answers[q.id] !== undefined);
    },
    [answers]
  );

  // Auto-save com debounce de 2s
  const triggerSave = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (Object.keys(answers).length === 0) return;
      setSaving(true);
      try {
        await saveMutation.mutateAsync({ answers });
        toast.success("Salvo automaticamente", {
          duration: 2000,
          id: "ivmp-autosave",
        });
      } catch {
        toast.error("Erro ao salvar. Tente novamente.");
      } finally {
        setSaving(false);
      }
    }, 2000);
  }, [answers, saveMutation]);

  // Dispara auto-save ao mudar respostas
  useEffect(() => {
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      return;
    }
    triggerSave();
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [answers]);

  // Handlers
  const setAnswer = useCallback((questionId: string, value: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }, []);

  const goNext = useCallback(() => {
    if (currentDimIndex < IVMP_DIMENSIONS.length - 1) {
      setCurrentDimIndex((i) => i + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [currentDimIndex]);

  const goPrev = useCallback(() => {
    if (currentDimIndex > 0) {
      setCurrentDimIndex((i) => i - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [currentDimIndex]);

  const handleFinish = useCallback(async () => {
    // Save final answers immediately
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSaving(true);
    try {
      await saveMutation.mutateAsync({ answers });
      setCompleted(true);
      onComplete?.();
    } catch {
      toast.error("Erro ao salvar. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }, [answers, saveMutation, onComplete]);

  // Dimensao atual
  const currentDim = IVMP_DIMENSIONS[currentDimIndex];
  const isLastDim = currentDimIndex === IVMP_DIMENSIONS.length - 1;
  const isFirstDim = currentDimIndex === 0;

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">
          Carregando questionario...
        </span>
      </div>
    );
  }

  // Tela de conclusao
  if (completed) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-emerald-600" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">
            Questionario concluido!
          </h2>
          <p className="text-muted-foreground max-w-md leading-relaxed">
            Suas respostas foram registradas. Seu mentor analisara os resultados
            na proxima sessao.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">
            Indice de Valor Medico Percebido
          </h2>
          {saving && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="w-3 h-3 animate-spin" />
              Salvando...
            </div>
          )}
        </div>

        {/* Barra de progresso geral */}
        <div>
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>
              {answeredCount} de {TOTAL_IVMP_QUESTIONS} perguntas respondidas
            </span>
            <span>
              {Math.round((answeredCount / TOTAL_IVMP_QUESTIONS) * 100)}%
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{
                width: `${(answeredCount / TOTAL_IVMP_QUESTIONS) * 100}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Navegacao por dimensoes — pills horizontais (desktop) */}
      <div className="overflow-x-auto pb-1">
        <div className="flex gap-2 min-w-max">
          {IVMP_DIMENSIONS.map((dim, idx) => {
            const dimAnswered = getDimAnsweredCount(dim);
            const dimTotal = dim.perguntas.length;
            const dimComplete = isDimComplete(dim);
            const isCurrent = idx === currentDimIndex;

            return (
              <button
                key={dim.id}
                onClick={() => {
                  setCurrentDimIndex(idx);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className={`
                  flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all whitespace-nowrap
                  ${
                    isCurrent
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : dimComplete
                      ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                      : "bg-muted/50 text-muted-foreground hover:bg-muted"
                  }
                `}
              >
                {dimComplete && (
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                )}
                <span className="font-medium">{dim.label}</span>
                <Badge
                  variant="secondary"
                  className={`text-[10px] px-1.5 py-0 ${
                    isCurrent
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : dimComplete
                      ? "bg-emerald-200 text-emerald-800"
                      : ""
                  }`}
                >
                  {dimAnswered}/{dimTotal}
                </Badge>
              </button>
            );
          })}
        </div>
      </div>

      {/* Dimensao atual */}
      <div className="space-y-2">
        <h3 className="text-base font-semibold text-foreground">
          {currentDim.label}
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {currentDim.descricao}
        </p>
      </div>

      {/* Perguntas */}
      <div className="space-y-6">
        {currentDim.perguntas.map((question, qIdx) => {
          const value = answers[question.id];
          const hasAnswer = value !== undefined;

          return (
            <div
              key={question.id}
              className={`
                p-4 rounded-xl border transition-all
                ${
                  hasAnswer
                    ? "border-primary/20 bg-primary/[0.02]"
                    : "border-border bg-card"
                }
              `}
            >
              {/* Texto da pergunta */}
              <p className="text-sm font-medium text-foreground leading-relaxed mb-1">
                <span className="text-muted-foreground mr-1.5">
                  {qIdx + 1}.
                </span>
                {question.texto}
              </p>
              <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                {question.instrucao}
              </p>

              {/* Slider */}
              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <Slider
                      min={0}
                      max={10}
                      step={1}
                      value={hasAnswer ? [value] : [5]}
                      onValueChange={([v]) => setAnswer(question.id, v)}
                      className="w-full"
                    />
                  </div>
                  <div
                    className={`
                      w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold shrink-0
                      ${
                        hasAnswer
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                      }
                    `}
                  >
                    {hasAnswer ? value : "-"}
                  </div>
                </div>

                {/* Labels e marcas */}
                <div className="flex justify-between text-[11px] text-muted-foreground px-1">
                  <span>0 - Nao faco</span>
                  <span className="hidden sm:inline">5</span>
                  <span>10 - Excelencia</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Navegacao */}
      <div className="flex items-center justify-between pt-4 border-t">
        <Button
          variant="outline"
          onClick={goPrev}
          disabled={isFirstDim}
          className="gap-2"
        >
          <ChevronLeft className="w-4 h-4" />
          Anterior
        </Button>

        <span className="text-xs text-muted-foreground">
          {currentDimIndex + 1} de {IVMP_DIMENSIONS.length}
        </span>

        {isLastDim && allAnswered ? (
          <Button onClick={handleFinish} disabled={saving} className="gap-2">
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            Concluir
          </Button>
        ) : (
          <Button
            onClick={goNext}
            disabled={isLastDim}
            className="gap-2"
          >
            Proximo
            <ChevronRight className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
