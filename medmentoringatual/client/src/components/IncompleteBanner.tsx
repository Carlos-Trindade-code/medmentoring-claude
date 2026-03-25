import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { AlertTriangle, X, ChevronDown, ChevronUp, Clock, Wrench, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Pendency {
  type: "questionnaire" | "tool" | "urgent";
  pillarId: number;
  pillarTitle: string;
  sectionId?: string;
  sectionTitle?: string;
  message: string;
  partId?: string;
}

interface Props {
  onNavigateToPillar?: (pillarId: number, partId?: string) => void;
}

const DISMISS_KEY = "itcmentor_banner_dismissed_at";
const DISMISS_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

export function IncompleteBanner({ onNavigateToPillar }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Check if banner was dismissed recently
  useEffect(() => {
    const dismissedAt = localStorage.getItem(DISMISS_KEY);
    if (dismissedAt) {
      const elapsed = Date.now() - Number(dismissedAt);
      if (elapsed < DISMISS_DURATION_MS) {
        setDismissed(true);
      } else {
        localStorage.removeItem(DISMISS_KEY);
      }
    }
  }, []);

  const { data, isLoading } = trpc.portal.getPendencies.useQuery(undefined, {
    refetchInterval: 5 * 60 * 1000, // refresh every 5 minutes
    enabled: !dismissed,
  });

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setDismissed(true);
  };

  if (dismissed || isLoading || !data || data.summary.total === 0) return null;

  const { pendencies, summary } = data;

  const urgentItems: Pendency[] = pendencies.filter((p: Pendency) => p.type === "urgent");
  const questionnaireItems: Pendency[] = pendencies.filter((p: Pendency) => p.type === "questionnaire");
  const toolItems: Pendency[] = pendencies.filter((p: Pendency) => p.type === "tool");

  const hasUrgent = urgentItems.length > 0;

  return (
    <div
      className={`rounded-xl border shadow-sm mb-6 overflow-hidden transition-all duration-300 ${
        hasUrgent
          ? "border-amber-400/60 bg-amber-50/80 dark:bg-amber-950/30 dark:border-amber-500/40"
          : "border-blue-300/60 bg-blue-50/80 dark:bg-blue-950/30 dark:border-blue-500/40"
      }`}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div
          className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
            hasUrgent
              ? "bg-amber-400/20 text-amber-600 dark:text-amber-400"
              : "bg-blue-400/20 text-blue-600 dark:text-blue-400"
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
        </div>

        <div className="flex-1 min-w-0">
          <p
            className={`font-semibold text-sm ${
              hasUrgent
                ? "text-amber-800 dark:text-amber-300"
                : "text-blue-800 dark:text-blue-300"
            }`}
          >
            {hasUrgent
              ? `Você tem ${summary.total} pendência${summary.total > 1 ? "s" : ""} para resolver`
              : `Você tem ${summary.total} item${summary.total > 1 ? "s" : ""} incompleto${summary.total > 1 ? "s" : ""}`}
          </p>
          <p
            className={`text-xs mt-0.5 ${
              hasUrgent
                ? "text-amber-700/80 dark:text-amber-400/70"
                : "text-blue-700/80 dark:text-blue-400/70"
            }`}
          >
            {summary.urgent > 0 && `${summary.urgent} urgente${summary.urgent > 1 ? "s" : ""}`}
            {summary.urgent > 0 && summary.questionnaire > 0 && " · "}
            {summary.questionnaire > 0 && `${summary.questionnaire} questionário${summary.questionnaire > 1 ? "s" : ""} em andamento`}
            {(summary.urgent > 0 || summary.questionnaire > 0) && summary.tools > 0 && " · "}
            {summary.tools > 0 && `${summary.tools} ferramenta${summary.tools > 1 ? "s" : ""} incompleta${summary.tools > 1 ? "s" : ""}`}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setExpanded(!expanded)}
            className={`text-xs font-medium flex items-center gap-1 px-2 py-1 rounded-md transition-colors ${
              hasUrgent
                ? "text-amber-700 hover:bg-amber-200/50 dark:text-amber-400 dark:hover:bg-amber-800/30"
                : "text-blue-700 hover:bg-blue-200/50 dark:text-blue-400 dark:hover:bg-blue-800/30"
            }`}
          >
            {expanded ? "Ocultar" : "Ver detalhes"}
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          <button
            onClick={handleDismiss}
            className={`p-1 rounded-md transition-colors ${
              hasUrgent
                ? "text-amber-600 hover:bg-amber-200/50 dark:text-amber-400 dark:hover:bg-amber-800/30"
                : "text-blue-600 hover:bg-blue-200/50 dark:text-blue-400 dark:hover:bg-blue-800/30"
            }`}
            title="Ocultar por 24h"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-current/10 px-4 py-3 space-y-3">

          {/* Urgent items */}
          {urgentItems.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                <span className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wide">
                  Ação necessária
                </span>
              </div>
              <div className="space-y-1.5">
                {urgentItems.map((item: Pendency, i: number) => (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-2 bg-red-50/60 dark:bg-red-950/20 rounded-lg px-3 py-2 border border-red-200/50 dark:border-red-800/30"
                  >
                    <p className="text-xs text-red-700 dark:text-red-300 flex-1">{item.message}</p>
                    {onNavigateToPillar && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 text-xs px-2 border-red-300 text-red-600 hover:bg-red-100 dark:border-red-700 dark:text-red-400 flex-shrink-0"
                        onClick={() => onNavigateToPillar(item.pillarId, item.partId)}
                      >
                        Ir agora
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Questionnaire items */}
          {questionnaireItems.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide">
                  Questionários em andamento
                </span>
              </div>
              <div className="space-y-1.5">
                {questionnaireItems.map((item: Pendency, i: number) => (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-2 bg-amber-50/60 dark:bg-amber-950/20 rounded-lg px-3 py-2 border border-amber-200/50 dark:border-amber-800/30"
                  >
                    <p className="text-xs text-amber-700 dark:text-amber-300 flex-1">{item.message}</p>
                    {onNavigateToPillar && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 text-xs px-2 border-amber-300 text-amber-600 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-400 flex-shrink-0"
                        onClick={() => onNavigateToPillar(item.pillarId, item.partId)}
                      >
                        Continuar
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tool items */}
          {toolItems.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Wrench className="w-3.5 h-3.5 text-blue-500" />
                <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide">
                  Ferramentas incompletas
                </span>
              </div>
              <div className="space-y-1.5">
                {toolItems.map((item: Pendency, i: number) => (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-2 bg-blue-50/60 dark:bg-blue-950/20 rounded-lg px-3 py-2 border border-blue-200/50 dark:border-blue-800/30"
                  >
                    <p className="text-xs text-blue-700 dark:text-blue-300 flex-1">{item.message}</p>
                    {onNavigateToPillar && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 text-xs px-2 border-blue-300 text-blue-600 hover:bg-blue-100 dark:border-blue-700 dark:text-blue-400 flex-shrink-0"
                        onClick={() => onNavigateToPillar(item.pillarId, item.partId)}
                      >
                        Preencher
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="text-xs text-muted-foreground text-center pt-1">
            Clique em "Ok, entendi" para ocultar este aviso por 24 horas.
          </p>
          <div className="flex justify-center">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={handleDismiss}
            >
              Ok, entendi
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
