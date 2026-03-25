import type { Answer } from "@/components/MenteePillarQuestionnaire";
import { Badge } from "@/components/ui/badge";
import { Copy, Check } from "lucide-react";
import { useState } from "react";
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
}

export function MenteeAnswersSummary({ sections, answers }: Props) {
  const [copied, setCopied] = useState(false);

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
            const val = a?.naoSabe ? "(Não sabe)" : a?.resposta ?? "(Não respondido)";
            return `${q.pergunta}\n→ ${val}`;
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
                return (
                  <div key={q.id} className="grid grid-cols-1 md:grid-cols-[1fr,1.5fr] gap-1 md:gap-4">
                    <p className="text-xs text-muted-foreground">{q.pergunta}</p>
                    <p className={`text-sm ${hasAnswer ? "text-foreground" : "text-muted-foreground italic"}`}>
                      {a?.naoSabe ? "Não sabe" : hasAnswer ? String(a.resposta) : "—"}
                    </p>
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
