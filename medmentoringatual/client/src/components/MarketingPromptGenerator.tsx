/**
 * MarketingPromptGenerator — Gerador de Prompt Master de Marketing
 * Pilar 5: Gera prompt completo para o médico usar em IA de conteúdo
 * Usa dados de P1 (identidade), P2 (produto), P4 (estratégia)
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Sparkles, Loader2, Copy, Check, Megaphone } from "lucide-react";

export function MarketingPromptGenerator({ menteeId, pillarId }: { menteeId: number; pillarId: number }) {
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const generateMutation = trpc.pillarTools.generatePillarConclusions.useMutation();

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const result = await generateMutation.mutateAsync({ menteeId, pillarId });
      const r = result as Record<string, unknown>;
      // Extract prompt_master from the generated JSON
      const masterPrompt = r.prompt_master || r.promptMaster || r.prompt || "";
      if (typeof masterPrompt === "string" && masterPrompt.length > 100) {
        setPrompt(masterPrompt);
        toast.success("Prompt master gerado! Revise e copie.");
      } else {
        // Fallback: use all content as prompt
        const toText = (v: unknown): string => {
          if (typeof v === "string") return v;
          if (Array.isArray(v)) return v.map(i => toText(i)).join("\n");
          if (typeof v === "object" && v) return Object.entries(v as Record<string,unknown>).map(([k,vv]) => `${k}: ${toText(vv)}`).join("\n");
          return String(v ?? "");
        };
        setPrompt(toText(result));
        toast.success("Conteúdo gerado! Revise e copie.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      toast.error(msg || "Erro ao gerar prompt.");
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(prompt);
    setCopied(true);
    toast.success("Prompt copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-teal-600" /> Prompt Master de Marketing
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Gera prompt completo para o medico usar em IA (ChatGPT, Claude, etc.)
          </p>
        </div>
        <Button onClick={handleGenerate} size="sm" disabled={generating} className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white">
          {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          {prompt ? "Regerar" : "Gerar Prompt"}
        </Button>
      </div>

      {generating && (
        <div className="py-8 flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
          <p className="text-sm text-muted-foreground">Gerando prompt master baseado em todos os pilares...</p>
        </div>
      )}

      {!generating && !prompt && (
        <div className="text-center py-6 bg-teal-50/30 border border-teal-200 rounded-xl">
          <Megaphone className="w-8 h-8 text-teal-300 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Clique em "Gerar Prompt" para criar o agente de marketing personalizado.</p>
          <p className="text-xs text-muted-foreground mt-1">Usa dados dos Pilares 1 a 4 para personalizar.</p>
        </div>
      )}

      {prompt && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">{prompt.length} caracteres</p>
            <Button onClick={handleCopy} size="sm" variant="outline" className="gap-1.5">
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copiado!" : "Copiar Prompt"}
            </Button>
          </div>
          <Textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            rows={20}
            className="text-sm font-mono bg-slate-50 border-slate-200"
            placeholder="Prompt master aparece aqui..."
          />
        </div>
      )}
    </div>
  );
}
