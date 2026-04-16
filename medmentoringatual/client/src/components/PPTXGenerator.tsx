/**
 * PPTXGenerator — Botão para gerar apresentação PPTX de treinamento
 * Pilar 6 (Vendas): Gera slides com protocolo de consulta + cardápio de serviços
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Presentation } from "lucide-react";

export function PPTXGenerator({ menteeId }: { menteeId: number }) {
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch(`/api/pptx/${menteeId}/consultation`, {
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Erro desconhecido" }));
        throw new Error(err.error || "Erro ao gerar PPTX");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `protocolo-consulta.pptx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Apresentacao PPTX baixada!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao gerar PPTX";
      toast.error(msg);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="flex items-center gap-3 p-4 bg-indigo-50/50 border border-indigo-200 rounded-xl">
      <Presentation className="w-5 h-5 text-indigo-600 shrink-0" />
      <div className="flex-1">
        <p className="text-sm font-semibold text-indigo-900">Apresentacao de Treinamento</p>
        <p className="text-xs text-muted-foreground">Gera PPTX com protocolo de consulta e cardapio de servicos</p>
      </div>
      <Button
        onClick={handleGenerate}
        size="sm"
        disabled={generating}
        className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"
      >
        {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Presentation className="w-3.5 h-3.5" />}
        Baixar PPTX
      </Button>
    </div>
  );
}
