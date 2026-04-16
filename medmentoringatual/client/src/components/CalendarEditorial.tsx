/**
 * CalendarEditorial — Gerador de Calendário Editorial
 * Pilar 5 (Comunicação): Gera plano de conteúdo semanal/mensal
 * Usa IA com dados dos pilares anteriores para personalizar
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Sparkles, Loader2, Copy, Check, Calendar } from "lucide-react";

export function CalendarEditorial({ menteeId, pillarId }: { menteeId: number; pillarId: number }) {
  const [calendar, setCalendar] = useState("");
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const generateMutation = trpc.pillarTools.generatePillarConclusions.useMutation();
  const saveMutation = trpc.mentor.saveToolData.useMutation();

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const result = await generateMutation.mutateAsync({ menteeId, pillarId });
      const r = result as Record<string, unknown>;
      // Try to extract calendar content from the response
      const calendarContent = r.calendario_editorial || r.calendarioEditorial || r.calendar || r.conteudo || "";

      const toText = (v: unknown): string => {
        if (typeof v === "string") return v;
        if (Array.isArray(v)) return v.map(i => toText(i)).join("\n");
        if (typeof v === "object" && v) return Object.entries(v as Record<string, unknown>).map(([k, vv]) => `${k}: ${toText(vv)}`).join("\n");
        return String(v ?? "");
      };

      const text = typeof calendarContent === "string" && calendarContent.length > 50
        ? calendarContent
        : toText(result);
      setCalendar(text);
      toast.success("Calendario editorial gerado!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      toast.error(msg || "Erro ao gerar calendario.");
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    try {
      await saveMutation.mutateAsync({
        menteeId,
        pillarId,
        toolData: { calendarEditorial: calendar },
      });
      toast.success("Calendario salvo!");
    } catch {
      toast.error("Erro ao salvar calendario.");
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(calendar);
    setCopied(true);
    toast.success("Calendario copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  // Load saved calendar
  const { data: toolData } = trpc.mentor.getToolData.useQuery({ menteeId, pillarId });
  if (toolData?.calendarEditorial && !calendar) {
    setCalendar(toolData.calendarEditorial as string);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Calendar className="w-4 h-4 text-teal-600" /> Calendario Editorial
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Gera plano de conteudo semanal baseado no perfil do medico
          </p>
        </div>
        <Button onClick={handleGenerate} size="sm" disabled={generating} className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white">
          {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          {calendar ? "Regerar" : "Gerar Calendario"}
        </Button>
      </div>

      {generating && (
        <div className="py-8 flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
          <p className="text-sm text-muted-foreground">Gerando calendario editorial personalizado...</p>
        </div>
      )}

      {!generating && !calendar && (
        <div className="text-center py-6 bg-teal-50/30 border border-teal-200 rounded-xl">
          <Calendar className="w-8 h-8 text-teal-300 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Clique em "Gerar Calendario" para criar o plano de conteudo.</p>
          <p className="text-xs text-muted-foreground mt-1">Usa dados dos Pilares 1 a 4 para personalizar temas e linguagem.</p>
        </div>
      )}

      {calendar && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">{calendar.length} caracteres</p>
            <div className="flex gap-2">
              <Button onClick={handleCopy} size="sm" variant="outline" className="gap-1.5">
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Copiado!" : "Copiar"}
              </Button>
              <Button onClick={handleSave} size="sm" variant="outline" className="gap-1.5" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                Salvar
              </Button>
            </div>
          </div>
          <Textarea
            value={calendar}
            onChange={e => setCalendar(e.target.value)}
            rows={20}
            className="text-sm font-mono bg-slate-50 border-slate-200"
            placeholder="Calendario editorial aparece aqui..."
          />
        </div>
      )}
    </div>
  );
}
