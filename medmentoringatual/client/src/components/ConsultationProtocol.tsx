/**
 * ConsultationProtocol — Construtor de Roteiro de Consulta
 * Pilar 6: Monta o protocolo de 6 fases personalizado
 * Cada fase tem: objetivo, duração, frases-chave, o que não fazer
 */
import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Save, Loader2, ClipboardList } from "lucide-react";

interface Phase {
  id: number;
  nome: string;
  objetivo: string;
  duracaoMinutos: number;
  frasesChave: string;
  oQueNaoFazer: string;
}

const DEFAULT_PHASES: Phase[] = [
  { id: 1, nome: "Acolhimento", objetivo: "Criar conexao e confianca nos primeiros minutos", duracaoMinutos: 5, frasesChave: "", oQueNaoFazer: "Nao pular direto para o exame. Nao olhar o computador enquanto o paciente fala." },
  { id: 2, nome: "Escuta Ativa", objetivo: "Ouvir a queixa completa sem interromper", duracaoMinutos: 10, frasesChave: "", oQueNaoFazer: "Nao interromper. Nao começar a diagnosticar antes de ouvir tudo." },
  { id: 3, nome: "Avaliacao Narrada", objetivo: "Narrar o raciocinio em voz alta durante o exame", duracaoMinutos: 15, frasesChave: "", oQueNaoFazer: "Nao ficar em silencio durante o exame. O paciente precisa entender o que voce esta fazendo." },
  { id: 4, nome: "Diagnostico de Situacao", objetivo: "Apresentar a conclusao de forma acessivel", duracaoMinutos: 10, frasesChave: "", oQueNaoFazer: "Nao usar jargao medico sem explicar. Nao minimizar nem dramatizar." },
  { id: 5, nome: "Plano de Saude", objetivo: "Apresentar e entregar o plano por escrito", duracaoMinutos: 10, frasesChave: "", oQueNaoFazer: "Nao dar o plano apenas verbalmente. Sempre entregar por escrito." },
  { id: 6, nome: "Decisao sobre Seguimento", objetivo: "Recomendar acompanhamento como conduta clinica", duracaoMinutos: 10, frasesChave: "", oQueNaoFazer: "Nao apresentar como produto. E conduta clinica, nao venda." },
];

export function ConsultationProtocol({ menteeId, onSave }: { menteeId: number; onSave?: (phases: Phase[]) => void }) {
  const [phases, setPhases] = useState<Phase[]>(DEFAULT_PHASES);
  const [saving, setSaving] = useState(false);

  const updatePhase = useCallback((id: number, field: keyof Phase, value: string | number) => {
    setPhases(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  }, []);

  const totalMinutos = phases.reduce((s, p) => s + p.duracaoMinutos, 0);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      onSave?.(phases);
      toast.success("Protocolo salvo!");
    } finally {
      setSaving(false);
    }
  }, [phases, onSave]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-rose-600" /> Protocolo de Consulta
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            6 fases | Tempo total: {totalMinutos} min
          </p>
        </div>
        <Button onClick={handleSave} size="sm" disabled={saving} className="gap-1.5 bg-rose-600 hover:bg-rose-700 text-white">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Salvar Protocolo
        </Button>
      </div>

      {/* Timeline visual */}
      <div className="flex gap-1 h-2 rounded-full overflow-hidden">
        {phases.map((p, i) => {
          const colors = ["bg-blue-400", "bg-emerald-400", "bg-amber-400", "bg-violet-400", "bg-teal-400", "bg-rose-400"];
          const width = totalMinutos > 0 ? (p.duracaoMinutos / totalMinutos) * 100 : 16.66;
          return <div key={p.id} className={`${colors[i]} h-full`} style={{ width: `${width}%` }} title={`${p.nome}: ${p.duracaoMinutos}min`} />;
        })}
      </div>

      {phases.map((phase, idx) => {
        const colors = ["border-blue-200 bg-blue-50/30", "border-emerald-200 bg-emerald-50/30", "border-amber-200 bg-amber-50/30", "border-violet-200 bg-violet-50/30", "border-teal-200 bg-teal-50/30", "border-rose-200 bg-rose-50/30"];
        const textColors = ["text-blue-700", "text-emerald-700", "text-amber-700", "text-violet-700", "text-teal-700", "text-rose-700"];

        return (
          <div key={phase.id} className={`border rounded-xl p-4 space-y-3 ${colors[idx]}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`w-6 h-6 rounded-full bg-white flex items-center justify-center text-xs font-bold ${textColors[idx]}`}>{phase.id}</span>
                <span className={`text-sm font-semibold ${textColors[idx]}`}>{phase.nome}</span>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={phase.duracaoMinutos}
                  onChange={e => updatePhase(phase.id, "duracaoMinutos", parseInt(e.target.value) || 0)}
                  className="w-16 h-7 text-xs text-center"
                />
                <span className="text-xs text-muted-foreground">min</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">Objetivo desta fase</label>
              <Input value={phase.objetivo} onChange={e => updatePhase(phase.id, "objetivo", e.target.value)} className="text-sm" />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">Frases-chave (nas palavras do medico)</label>
              <Textarea value={phase.frasesChave} onChange={e => updatePhase(phase.id, "frasesChave", e.target.value)} rows={2} placeholder="Uma frase por linha — como o medico diria naturalmente" className="text-sm" />
            </div>

            <div>
              <label className="text-xs font-semibold text-red-600 block mb-1">O que NAO fazer nesta fase</label>
              <Textarea value={phase.oQueNaoFazer} onChange={e => updatePhase(phase.id, "oQueNaoFazer", e.target.value)} rows={2} className="text-sm border-red-200 bg-red-50/50" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
