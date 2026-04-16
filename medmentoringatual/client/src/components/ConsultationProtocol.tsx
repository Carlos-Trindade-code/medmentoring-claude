/**
 * ConsultationProtocol — Construtor de Roteiro de Consulta (Inicial + Retorno)
 * Pilar 6: Monta protocolos personalizados com fases
 * Persiste via tRPC saveToolData (pillarFeedback.toolDataJson)
 */
import { useState, useCallback, useEffect } from "react";
import { trpc } from "@/lib/trpc";
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

const DEFAULT_INITIAL: Phase[] = [
  { id: 1, nome: "Acolhimento", objetivo: "Criar conexao e confianca nos primeiros minutos", duracaoMinutos: 5, frasesChave: "Me conta o que te trouxe aqui.\nFique a vontade, estou aqui para ouvir.", oQueNaoFazer: "Nao pular direto para o exame. Nao olhar o computador enquanto o paciente fala." },
  { id: 2, nome: "Escuta Ativa", objetivo: "Ouvir a queixa completa sem interromper", duracaoMinutos: 10, frasesChave: "Entendi que...\nAlgo mais que voce gostaria de me contar?", oQueNaoFazer: "Nao interromper. Nao comecar a diagnosticar antes de ouvir tudo." },
  { id: 3, nome: "Avaliacao Narrada", objetivo: "Narrar o raciocinio em voz alta durante o exame", duracaoMinutos: 20, frasesChave: "Estou olhando seu rim porque...\nVou avaliar sua pressao para entender...", oQueNaoFazer: "Nao ficar em silencio durante o exame. O paciente precisa entender o que voce esta fazendo." },
  { id: 4, nome: "Diagnostico de Situacao", objetivo: "Apresentar a conclusao de forma acessivel", duracaoMinutos: 10, frasesChave: "Seu rim esta nesta faixa...\nIsso significa que...", oQueNaoFazer: "Nao usar jargao medico sem explicar. Nao minimizar nem dramatizar." },
  { id: 5, nome: "Plano de Saude", objetivo: "Apresentar e entregar o plano por escrito", duracaoMinutos: 10, frasesChave: "Aqui esta o seu plano por escrito.\nVamos revisar juntos cada ponto.", oQueNaoFazer: "Nao dar o plano apenas verbalmente. Sempre entregar por escrito." },
  { id: 6, nome: "Decisao sobre Seguimento", objetivo: "Recomendar acompanhamento como conduta clinica", duracaoMinutos: 5, frasesChave: "Pela sua condicao, o ideal e nos vermos a cada X meses.\nVou te explicar como funciona o acompanhamento.", oQueNaoFazer: "Nao apresentar como produto. E conduta clinica, nao venda." },
];

const DEFAULT_RETORNO: Phase[] = [
  { id: 1, nome: "Reconexao", objetivo: "Retomar vinculo com o paciente", duracaoMinutos: 3, frasesChave: "Como voce esta desde a ultima vez?\nConseguiu seguir o plano?", oQueNaoFazer: "Nao pular direto para os exames. Reconectar antes." },
  { id: 2, nome: "Revisao de Resultados", objetivo: "Comparar exames anteriores vs atuais e mostrar evolucao", duracaoMinutos: 10, frasesChave: "Olha como seu exame evoluiu...\nAqui melhorou, aqui precisamos ajustar.", oQueNaoFazer: "Nao mostrar numeros sem explicar o significado. Usar comparativo visual." },
  { id: 3, nome: "Avaliacao Atual", objetivo: "Exame direcionado + novos sintomas", duracaoMinutos: 12, frasesChave: "Tem algo novo que gostaria de me contar?\nVou verificar...", oQueNaoFazer: "Nao repetir exame completo se nao necessario. Foco no que mudou." },
  { id: 4, nome: "Atualizacao do Plano", objetivo: "Ajustar medicacoes, metas e entregar novo plano impresso", duracaoMinutos: 10, frasesChave: "Vamos ajustar seu plano.\nAqui esta a versao atualizada.", oQueNaoFazer: "Nao manter plano anterior sem revisar. Sempre atualizar e reimprimir." },
  { id: 5, nome: "Proximos Passos", objetivo: "Definir seguimento e proximo retorno", duracaoMinutos: 5, frasesChave: "Nos proximos X meses, quero que voce...\nJa estamos juntos ha Y meses.", oQueNaoFazer: "Nao encerrar sem definir proximo retorno. Reforcar longitudinalidade." },
];

type ProtocolType = "initial" | "retorno";

const PHASE_COLORS = ["bg-blue-400", "bg-emerald-400", "bg-amber-400", "bg-violet-400", "bg-teal-400", "bg-rose-400"];
const CARD_COLORS = ["border-blue-200 bg-blue-50/30", "border-emerald-200 bg-emerald-50/30", "border-amber-200 bg-amber-50/30", "border-violet-200 bg-violet-50/30", "border-teal-200 bg-teal-50/30", "border-rose-200 bg-rose-50/30"];
const TEXT_COLORS = ["text-blue-700", "text-emerald-700", "text-amber-700", "text-violet-700", "text-teal-700", "text-rose-700"];

export function ConsultationProtocol({ menteeId, pillarId }: { menteeId: number; pillarId: number }) {
  const [activeProtocol, setActiveProtocol] = useState<ProtocolType>("initial");
  const [phasesInitial, setPhasesInitial] = useState<Phase[]>(DEFAULT_INITIAL);
  const [phasesRetorno, setPhasesRetorno] = useState<Phase[]>(DEFAULT_RETORNO);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const { data: toolData } = trpc.mentor.getToolData.useQuery({ menteeId, pillarId });
  const saveMutation = trpc.mentor.saveToolData.useMutation({
    onSuccess: () => toast.success("Protocolos salvos!"),
    onError: (e) => toast.error(e.message || "Erro ao salvar protocolo"),
  });

  // Load saved phases — backward compatible with single array format
  useEffect(() => {
    if (toolData && !loaded) {
      const saved = toolData.consultationProtocol;
      if (saved) {
        if (Array.isArray(saved)) {
          // Legacy: single array -> treat as initial
          if (saved.length > 0) setPhasesInitial(saved as Phase[]);
        } else {
          const obj = saved as { initial?: Phase[]; retorno?: Phase[] };
          if (obj.initial?.length) setPhasesInitial(obj.initial);
          if (obj.retorno?.length) setPhasesRetorno(obj.retorno);
        }
      }
      setLoaded(true);
    }
  }, [toolData, loaded]);

  const phases = activeProtocol === "initial" ? phasesInitial : phasesRetorno;
  const setPhases = activeProtocol === "initial" ? setPhasesInitial : setPhasesRetorno;

  const updatePhase = useCallback((id: number, field: keyof Phase, value: string | number) => {
    setPhases(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  }, [setPhases]);

  const totalMinutos = phases.reduce((s, p) => s + p.duracaoMinutos, 0);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await saveMutation.mutateAsync({
        menteeId,
        pillarId,
        toolData: { consultationProtocol: { initial: phasesInitial, retorno: phasesRetorno } },
      });
    } finally {
      setSaving(false);
    }
  }, [phasesInitial, phasesRetorno, menteeId, pillarId, saveMutation]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-rose-600" /> Protocolo de Consulta
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {phases.length} fases | Tempo total: {totalMinutos} min
          </p>
        </div>
        <Button onClick={handleSave} size="sm" disabled={saving} className="gap-1.5 bg-rose-600 hover:bg-rose-700 text-white">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Salvar Protocolos
        </Button>
      </div>

      {/* Tab: Inicial vs Retorno */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveProtocol("initial")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeProtocol === "initial"
              ? "bg-rose-600 text-white"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          Consulta Inicial (60 min)
        </button>
        <button
          onClick={() => setActiveProtocol("retorno")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeProtocol === "retorno"
              ? "bg-rose-600 text-white"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          Consulta de Retorno (40 min)
        </button>
      </div>

      {/* Timeline visual */}
      <div className="flex gap-1 h-2 rounded-full overflow-hidden">
        {phases.map((p, i) => {
          const width = totalMinutos > 0 ? (p.duracaoMinutos / totalMinutos) * 100 : 100 / phases.length;
          return <div key={p.id} className={`${PHASE_COLORS[i % PHASE_COLORS.length]} h-full`} style={{ width: `${width}%` }} title={`${p.nome}: ${p.duracaoMinutos}min`} />;
        })}
      </div>

      {phases.map((phase, idx) => (
        <div key={phase.id} className={`border rounded-xl p-4 space-y-3 ${CARD_COLORS[idx % CARD_COLORS.length]}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`w-6 h-6 rounded-full bg-white flex items-center justify-center text-xs font-bold ${TEXT_COLORS[idx % TEXT_COLORS.length]}`}>{phase.id}</span>
              <span className={`text-sm font-semibold ${TEXT_COLORS[idx % TEXT_COLORS.length]}`}>{phase.nome}</span>
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
      ))}
    </div>
  );
}
