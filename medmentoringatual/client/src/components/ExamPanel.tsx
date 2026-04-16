/**
 * ExamPanel — Painel Visual de Exames (Semáforo)
 * Pilar 3 (Diagnóstico): Mostra exames do paciente com status visual
 * Comparativo entre visitas para acompanhamento longitudinal
 */
import { useState, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Save, Loader2, Plus, Trash2, ArrowUp, ArrowDown, Minus,
  Activity, ChevronLeft, ChevronRight,
} from "lucide-react";

interface ExamDef {
  id: string;
  nome: string;
  unidade: string;
  refMin: number;
  refMax: number;
  alertaMin: number;
  alertaMax: number;
}

interface ExamResult {
  id: string;
  valor: number | null;
}

interface ExamVisit {
  data: string;
  exames: ExamResult[];
}

// Exames padrão para nefrologia — valores de referência baseados em guidelines
const DEFAULT_EXAMS: ExamDef[] = [
  { id: "creatinina", nome: "Creatinina", unidade: "mg/dL", refMin: 0.7, refMax: 1.3, alertaMin: 0, alertaMax: 2.0 },
  { id: "tfg", nome: "TFG (eGFR)", unidade: "mL/min", refMin: 60, refMax: 120, alertaMin: 15, alertaMax: 999 },
  { id: "potassio", nome: "Potassio", unidade: "mEq/L", refMin: 3.5, refMax: 5.0, alertaMin: 3.0, alertaMax: 5.5 },
  { id: "hemoglobina", nome: "Hemoglobina", unidade: "g/dL", refMin: 12, refMax: 16, alertaMin: 10, alertaMax: 18 },
  { id: "albumina", nome: "Albumina", unidade: "g/dL", refMin: 3.5, refMax: 5.5, alertaMin: 3.0, alertaMax: 6.0 },
  { id: "fosforo", nome: "Fosforo", unidade: "mg/dL", refMin: 2.5, refMax: 4.5, alertaMin: 2.0, alertaMax: 5.5 },
  { id: "pth", nome: "PTH", unidade: "pg/mL", refMin: 10, refMax: 65, alertaMin: 5, alertaMax: 300 },
  { id: "proteinuria", nome: "Proteinuria", unidade: "mg/24h", refMin: 0, refMax: 150, alertaMin: 0, alertaMax: 3500 },
];

function getStatus(valor: number | null, def: ExamDef): "green" | "yellow" | "red" | "none" {
  if (valor === null || valor === undefined) return "none";
  // TFG is inverted: lower is worse
  if (def.id === "tfg") {
    if (valor >= def.refMin) return "green";
    if (valor >= def.alertaMin) return "yellow";
    return "red";
  }
  // For most exams: within range is green, outside range but within alert is yellow, beyond alert is red
  if (valor >= def.refMin && valor <= def.refMax) return "green";
  if (valor >= def.alertaMin && valor <= def.alertaMax) return "yellow";
  return "red";
}

const STATUS_COLORS = {
  green: "bg-emerald-100 text-emerald-800 border-emerald-300",
  yellow: "bg-amber-100 text-amber-800 border-amber-300",
  red: "bg-red-100 text-red-800 border-red-300",
  none: "bg-gray-50 text-gray-400 border-gray-200",
};

const STATUS_DOT = {
  green: "bg-emerald-500",
  yellow: "bg-amber-500",
  red: "bg-red-500",
  none: "bg-gray-300",
};

const STATUS_LABEL = {
  green: "Normal",
  yellow: "Atencao",
  red: "Alerta",
  none: "—",
};

export function ExamPanel({ menteeId, pillarId }: { menteeId: number; pillarId: number }) {
  const [examDefs] = useState<ExamDef[]>(DEFAULT_EXAMS);
  const [visits, setVisits] = useState<ExamVisit[]>([]);
  const [activeVisitIdx, setActiveVisitIdx] = useState(0);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const { data: toolData } = trpc.mentor.getToolData.useQuery({ menteeId, pillarId });
  const saveMutation = trpc.mentor.saveToolData.useMutation({
    onSuccess: () => toast.success("Exames salvos!"),
    onError: (e) => toast.error(e.message || "Erro ao salvar exames"),
  });

  // Load saved visits
  useEffect(() => {
    if (toolData && !loaded) {
      const saved = toolData.examPanel as ExamVisit[] | undefined;
      if (saved && Array.isArray(saved) && saved.length > 0) {
        setVisits(saved);
        setActiveVisitIdx(saved.length - 1); // go to latest
      }
      setLoaded(true);
    }
  }, [toolData, loaded]);

  const addVisit = useCallback(() => {
    const newVisit: ExamVisit = {
      data: new Date().toISOString().slice(0, 10),
      exames: examDefs.map(d => ({ id: d.id, valor: null })),
    };
    setVisits(prev => {
      const next = [...prev, newVisit];
      setActiveVisitIdx(next.length - 1);
      return next;
    });
  }, [examDefs]);

  const removeVisit = useCallback((idx: number) => {
    setVisits(prev => {
      const next = prev.filter((_, i) => i !== idx);
      if (activeVisitIdx >= next.length) setActiveVisitIdx(Math.max(0, next.length - 1));
      return next;
    });
  }, [activeVisitIdx]);

  const updateVisitDate = useCallback((idx: number, date: string) => {
    setVisits(prev => prev.map((v, i) => i === idx ? { ...v, data: date } : v));
  }, []);

  const updateExamValue = useCallback((visitIdx: number, examId: string, valor: number | null) => {
    setVisits(prev => prev.map((v, i) =>
      i === visitIdx
        ? { ...v, exames: v.exames.map(e => e.id === examId ? { ...e, valor } : e) }
        : v
    ));
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await saveMutation.mutateAsync({
        menteeId,
        pillarId,
        toolData: { examPanel: visits },
      });
    } finally {
      setSaving(false);
    }
  }, [visits, menteeId, pillarId, saveMutation]);

  const activeVisit = visits[activeVisitIdx];
  const prevVisit = activeVisitIdx > 0 ? visits[activeVisitIdx - 1] : null;

  function getDelta(examId: string): { delta: number; direction: "up" | "down" | "same" } | null {
    if (!activeVisit || !prevVisit) return null;
    const curr = activeVisit.exames.find(e => e.id === examId)?.valor;
    const prev = prevVisit.exames.find(e => e.id === examId)?.valor;
    if (curr === null || curr === undefined || prev === null || prev === undefined) return null;
    const delta = curr - prev;
    return { delta, direction: delta > 0 ? "up" : delta < 0 ? "down" : "same" };
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-600" /> Painel de Exames
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {visits.length} visita{visits.length !== 1 ? "s" : ""} registrada{visits.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={addVisit} size="sm" variant="outline" className="gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Nova Visita
          </Button>
          <Button onClick={handleSave} size="sm" disabled={saving} className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Salvar
          </Button>
        </div>
      </div>

      {visits.length === 0 && (
        <div className="text-center py-8 bg-blue-50/30 border border-blue-200 rounded-xl">
          <Activity className="w-10 h-10 text-blue-300 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Nenhuma visita registrada.</p>
          <p className="text-xs text-muted-foreground mt-1">Clique em "Nova Visita" para registrar os exames do paciente.</p>
          <Button onClick={addVisit} size="sm" variant="outline" className="mt-3 gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Registrar primeira visita
          </Button>
        </div>
      )}

      {visits.length > 0 && activeVisit && (
        <>
          {/* Visit navigation */}
          <div className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-2">
            <Button
              onClick={() => setActiveVisitIdx(i => Math.max(0, i - 1))}
              size="sm" variant="ghost" disabled={activeVisitIdx === 0}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">Visita {activeVisitIdx + 1} de {visits.length}</span>
              <Input
                type="date"
                value={activeVisit.data}
                onChange={e => updateVisitDate(activeVisitIdx, e.target.value)}
                className="w-40 h-7 text-xs"
              />
              {visits.length > 1 && (
                <button onClick={() => removeVisit(activeVisitIdx)} className="text-muted-foreground hover:text-red-500">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <Button
              onClick={() => setActiveVisitIdx(i => Math.min(visits.length - 1, i + 1))}
              size="sm" variant="ghost" disabled={activeVisitIdx === visits.length - 1}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Exam table */}
          <div className="border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b">
                  <th className="text-left px-3 py-2 font-semibold text-xs text-muted-foreground">Exame</th>
                  <th className="text-center px-3 py-2 font-semibold text-xs text-muted-foreground w-28">Valor</th>
                  <th className="text-center px-3 py-2 font-semibold text-xs text-muted-foreground w-24">Ref.</th>
                  <th className="text-center px-3 py-2 font-semibold text-xs text-muted-foreground w-24">Status</th>
                  {prevVisit && (
                    <th className="text-center px-3 py-2 font-semibold text-xs text-muted-foreground w-20">Delta</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {examDefs.map(def => {
                  const examResult = activeVisit.exames.find(e => e.id === def.id);
                  const valor = examResult?.valor ?? null;
                  const status = getStatus(valor, def);
                  const delta = getDelta(def.id);

                  return (
                    <tr key={def.id} className="border-b last:border-b-0 hover:bg-slate-50/50">
                      <td className="px-3 py-2">
                        <span className="font-medium text-sm">{def.nome}</span>
                        <span className="text-xs text-muted-foreground ml-1">({def.unidade})</span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <Input
                          type="number"
                          step="0.1"
                          value={valor ?? ""}
                          onChange={e => {
                            const v = e.target.value === "" ? null : parseFloat(e.target.value);
                            updateExamValue(activeVisitIdx, def.id, v);
                          }}
                          className="w-24 h-7 text-xs text-center mx-auto"
                          placeholder="—"
                        />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className="text-xs text-muted-foreground">
                          {def.refMin}–{def.refMax}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <Badge className={`text-xs border ${STATUS_COLORS[status]}`}>
                          <span className={`w-2 h-2 rounded-full ${STATUS_DOT[status]} mr-1 inline-block`} />
                          {STATUS_LABEL[status]}
                        </Badge>
                      </td>
                      {prevVisit && (
                        <td className="px-3 py-2 text-center">
                          {delta ? (
                            <span className={`text-xs flex items-center justify-center gap-0.5 ${
                              delta.direction === "up" ? "text-red-600" :
                              delta.direction === "down" ? "text-emerald-600" :
                              "text-gray-400"
                            }`}>
                              {delta.direction === "up" && <ArrowUp className="w-3 h-3" />}
                              {delta.direction === "down" && <ArrowDown className="w-3 h-3" />}
                              {delta.direction === "same" && <Minus className="w-3 h-3" />}
                              {delta.delta !== 0 ? Math.abs(delta.delta).toFixed(1) : ""}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-300">—</span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Summary badges */}
          <div className="flex gap-3 text-xs">
            {(["green", "yellow", "red"] as const).map(s => {
              const count = examDefs.filter(def => {
                const val = activeVisit.exames.find(e => e.id === def.id)?.valor ?? null;
                return getStatus(val, def) === s;
              }).length;
              if (count === 0) return null;
              return (
                <span key={s} className={`flex items-center gap-1 px-2 py-1 rounded-full border ${STATUS_COLORS[s]}`}>
                  <span className={`w-2 h-2 rounded-full ${STATUS_DOT[s]}`} />
                  {count} {STATUS_LABEL[s].toLowerCase()}
                </span>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
