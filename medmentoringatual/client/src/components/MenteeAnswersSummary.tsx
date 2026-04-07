import type { Answer } from "@/components/MenteePillarQuestionnaire";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Copy, Check, Save, Loader2 } from "lucide-react";
import { useState, useCallback } from "react";
import { toast } from "sonner";

interface SectionDef {
  id: string;
  titulo: string;
  perguntas: { id: string; pergunta: string }[];
}

interface AnswerRow {
  secao: string;
  respostas: Answer[];
}

interface Props {
  sections: SectionDef[];
  answers: AnswerRow[];
  editable?: boolean;
  onSave?: (sectionId: string, questionId: string, value: string) => Promise<void>;
}

export function MenteeAnswersSummary({ sections, answers, editable = false, onSave }: Props) {
  const [copied, setCopied] = useState(false);
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());

  const answerMap = new Map<string, Answer>();
  answers.forEach((a) => a.respostas.forEach((r) => answerMap.set(r.id, r)));

  const filledCount = Array.from(answerMap.values()).filter(
    (a) => a.resposta !== null && a.resposta !== "" && !a.naoSabe
  ).length;
  const totalCount = sections.reduce((s, sec) => s + sec.perguntas.length, 0);

  function copyAll() {
    const text = sections
      .map((sec) => {
        const qas = sec.perguntas
          .map((q) => {
            const a = answerMap.get(q.id);
            const val = a?.naoSabe ? "(Nao sabe)" : a?.resposta ?? "(Nao respondido)";
            return `${q.pergunta}\n-> ${val}`;
          })
          .join("\n\n");
        return `=== ${sec.titulo} ===\n\n${qas}`;
      })
      .join("\n\n\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Respostas copiadas!");
    setTimeout(() => setCopied(false), 2000);
  }

  const handleEdit = useCallback((questionId: string, value: string) => {
    setEditedValues(prev => ({ ...prev, [questionId]: value }));
  }, []);

  const handleSave = useCallback(async (sectionId: string, questionId: string) => {
    if (!onSave) return;
    const value = editedValues[questionId];
    if (value === undefined) return;

    setSavingIds(prev => new Set(prev).add(questionId));
    try {
      await onSave(sectionId, questionId, value);
      setEditedValues(prev => {
        const next = { ...prev };
        delete next[questionId];
        return next;
      });
      toast.success("Resposta salva!");
    } catch {
      toast.error("Erro ao salvar resposta.");
    } finally {
      setSavingIds(prev => {
        const next = new Set(prev);
        next.delete(questionId);
        return next;
      });
    }
  }, [onSave, editedValues]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <Badge variant="outline" className="text-xs">
          {filledCount}/{totalCount} respondidas
        </Badge>
        <button
          onClick={copyAll}
          className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? "Copiado!" : "Copiar tudo"}
        </button>
      </div>

      <div className="space-y-6">
        {sections.map((sec) => (
          <div key={sec.id}>
            <h4 className="text-sm font-semibold text-foreground border-b border-border pb-2 mb-3">
              {sec.titulo}
            </h4>
            <div className="space-y-3">
              {sec.perguntas.map((q) => {
                const a = answerMap.get(q.id);
                const hasAnswer = a && a.resposta !== null && a.resposta !== "" && !a.naoSabe;
                const currentValue = editedValues[q.id] ?? (hasAnswer ? String(a.resposta) : "");
                const isEdited = editedValues[q.id] !== undefined;
                const isSaving = savingIds.has(q.id);
                const isLongAnswer = currentValue.length > 80;

                return (
                  <div key={q.id} className="space-y-1">
                    <p className="text-xs text-muted-foreground">{q.pergunta}</p>
                    {editable ? (
                      <div className="flex gap-2 items-start">
                        {isLongAnswer ? (
                          <Textarea
                            value={currentValue}
                            onChange={(e) => handleEdit(q.id, e.target.value)}
                            rows={3}
                            className="text-sm flex-1 resize-none"
                            placeholder="Sem resposta"
                          />
                        ) : (
                          <Input
                            value={currentValue}
                            onChange={(e) => handleEdit(q.id, e.target.value)}
                            className="text-sm flex-1"
                            placeholder="Sem resposta"
                          />
                        )}
                        {isEdited && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSave(sec.id, q.id)}
                            disabled={isSaving}
                            className="shrink-0"
                          >
                            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                          </Button>
                        )}
                      </div>
                    ) : (
                      <p className={`text-sm ${hasAnswer ? "text-foreground" : "text-muted-foreground italic"}`}>
                        {a?.naoSabe ? "Nao sabe" : hasAnswer ? String(a.resposta) : "—"}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
