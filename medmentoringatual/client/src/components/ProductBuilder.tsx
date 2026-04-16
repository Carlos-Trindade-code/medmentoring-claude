/**
 * ProductBuilder — Construtor de Produtos/Serviços do médico
 * Pilar 2: Define cardápio de serviços alinhado com valores do Pilar 1
 * O mentor usa durante a sessão para construir junto com o mentorado
 */
import { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, Save, Loader2, Package } from "lucide-react";

interface Product {
  id: string;
  nome: string;
  paraQuem: string;
  oQueInclui: string;
  formato: string;
  duracao: string;
  precoSugerido: string;
  logicaClinica: string;
  alinhamentoP1: string;
}

const EMPTY_PRODUCT: Product = {
  id: "",
  nome: "",
  paraQuem: "",
  oQueInclui: "",
  formato: "presencial",
  duracao: "",
  precoSugerido: "",
  logicaClinica: "",
  alinhamentoP1: "",
};

export function ProductBuilder({ menteeId }: { menteeId: number }) {
  const { data: simData, refetch } = trpc.mentor.getSimulationData.useQuery({ menteeId });
  const saveMutation = trpc.mentor.saveSimulationData.useMutation({
    onSuccess: () => { refetch(); toast.success("Produtos salvos!"); },
    onError: (e) => toast.error(e.message),
  });

  const [products, setProducts] = useState<Product[]>([]);
  const [initialized, setInitialized] = useState(false);

  // Load from existing services
  if (simData?.servicos && !initialized) {
    const loaded = (simData.servicos as any[]).map((s: any) => ({
      id: s.id || `prod_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      nome: s.nome || s.name || "",
      paraQuem: s.paraQuem || "",
      oQueInclui: s.oQueInclui || "",
      formato: s.formato || "presencial",
      duracao: s.duracao || `${s.duracaoHoras || 1}h`,
      precoSugerido: s.precoSugerido || (s.precoVenda ? `R$ ${s.precoVenda}` : ""),
      logicaClinica: s.logicaClinica || "",
      alinhamentoP1: s.alinhamentoP1 || "",
    }));
    if (loaded.length > 0) setProducts(loaded);
    setInitialized(true);
  }

  const addProduct = useCallback(() => {
    setProducts(prev => [...prev, {
      ...EMPTY_PRODUCT,
      id: `prod_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    }]);
  }, []);

  const removeProduct = useCallback((id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
  }, []);

  const updateProduct = useCallback((id: string, field: keyof Product, value: string) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  }, []);

  const handleSave = useCallback(() => {
    // Convert products to simulation services format for storage
    const servicos = products.map(p => ({
      id: p.id,
      nome: p.nome,
      duracaoHoras: parseFloat(p.duracao) || 1,
      precoVenda: parseFloat(p.precoSugerido.replace(/[^\d.,]/g, "").replace(",", ".")) || 0,
      impostoPercent: 12.5,
      taxaCartaoPercent: 5,
      mod: 0,
      matMed: 0,
      bonusPercent: 0,
      taxaEquipamento: 0,
      // Extra fields for product builder
      paraQuem: p.paraQuem,
      oQueInclui: p.oQueInclui,
      formato: p.formato,
      logicaClinica: p.logicaClinica,
      alinhamentoP1: p.alinhamentoP1,
    }));

    saveMutation.mutate({
      menteeId,
      servicos,
      mixAtendimentos: simData?.mixAtendimentos || {},
      params: simData?.params || {
        custoFixoTotal: 0,
        custosVariaveisPercent: 20,
        taxaSalaHora: 0,
        horasDisponiveisMes: 160,
        horasOcupadasMes: 80,
        faturamentoMensal: 0,
      },
    });
  }, [products, menteeId, simData, saveMutation]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Package className="w-4 h-4 text-indigo-600" /> Cardapio de Servicos
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">Construa os produtos alinhados com os valores do Pilar 1</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={addProduct} size="sm" variant="outline" className="gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Adicionar Servico
          </Button>
          <Button onClick={handleSave} size="sm" disabled={saveMutation.isPending} className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white">
            {saveMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Salvar
          </Button>
        </div>
      </div>

      {products.length === 0 && (
        <div className="text-center py-8 bg-muted/20 rounded-xl">
          <Package className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Nenhum produto cadastrado.</p>
          <Button onClick={addProduct} size="sm" variant="outline" className="mt-3 gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Criar primeiro produto
          </Button>
        </div>
      )}

      {products.map((product, idx) => (
        <div key={product.id} className="border rounded-xl p-4 space-y-3 bg-card">
          <div className="flex items-center justify-between">
            <Badge variant="secondary" className="text-xs">Produto {idx + 1}</Badge>
            <button onClick={() => removeProduct(product.id)} className="text-muted-foreground hover:text-red-500">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">Nome do Servico</label>
              <Input value={product.nome} onChange={e => updateProduct(product.id, "nome", e.target.value)} placeholder="Ex: Consulta de Avaliacao" className="text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">Formato</label>
              <select
                value={product.formato}
                onChange={e => updateProduct(product.id, "formato", e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm"
              >
                <option value="presencial">Presencial</option>
                <option value="online">Online/Telemedicina</option>
                <option value="hibrido">Hibrido</option>
                <option value="recorrente">Acompanhamento Recorrente</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">Duracao</label>
              <Input value={product.duracao} onChange={e => updateProduct(product.id, "duracao", e.target.value)} placeholder="Ex: 60 min" className="text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">Preco Sugerido</label>
              <Input value={product.precoSugerido} onChange={e => updateProduct(product.id, "precoSugerido", e.target.value)} placeholder="Ex: R$ 1.200" className="text-sm" />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1">Para quem e indicado?</label>
            <Textarea value={product.paraQuem} onChange={e => updateProduct(product.id, "paraQuem", e.target.value)} rows={2} placeholder="Perfil do paciente que precisa deste servico" className="text-sm" />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1">O que inclui?</label>
            <Textarea value={product.oQueInclui} onChange={e => updateProduct(product.id, "oQueInclui", e.target.value)} rows={2} placeholder="Descreva o que o paciente recebe" className="text-sm" />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1">Logica clinica (por que este formato?)</label>
            <Textarea value={product.logicaClinica} onChange={e => updateProduct(product.id, "logicaClinica", e.target.value)} rows={2} placeholder="Justificativa clinica para este servico" className="text-sm" />
          </div>

          <div>
            <label className="text-xs font-semibold text-emerald-700 block mb-1">Alinhamento com Pilar 1 (valores)</label>
            <Textarea value={product.alinhamentoP1} onChange={e => updateProduct(product.id, "alinhamentoP1", e.target.value)} rows={2} placeholder="Como este produto se alinha com o proposito e valores do medico?" className="text-sm border-emerald-200 bg-emerald-50/50" />
          </div>
        </div>
      ))}
    </div>
  );
}
