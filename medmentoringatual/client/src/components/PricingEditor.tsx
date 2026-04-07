/**
 * PricingEditor — Tabela de precificacao editavel para o mentor
 * Usa adminProcedure (getSimulationData/saveSimulationData)
 */
import { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, Save, Loader2 } from "lucide-react";

interface ServiceRow {
  id: string;
  nome: string;
  duracaoHoras: number;
  precoVenda: number;
  impostoPercent: number;
  taxaCartaoPercent: number;
  mod: number;
  matMed: number;
  bonusPercent: number;
  taxaEquipamento: number;
}

function calcMargin(s: ServiceRow) {
  const imposto = s.precoVenda * (s.impostoPercent / 100);
  const taxaCartao = s.precoVenda * (s.taxaCartaoPercent / 100);
  const bonus = s.precoVenda * (s.bonusPercent / 100);
  const lucroBruto = s.precoVenda - imposto - taxaCartao - s.mod - s.matMed - bonus - s.taxaEquipamento;
  const margem = s.precoVenda > 0 ? (lucroBruto / s.precoVenda) * 100 : 0;
  return { lucroBruto, margem };
}

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function PricingEditor({ menteeId }: { menteeId: number }) {
  const { data, isLoading, refetch } = trpc.mentor.getSimulationData.useQuery({ menteeId });
  const saveMutation = trpc.mentor.saveSimulationData.useMutation({
    onSuccess: () => { refetch(); toast.success("Servicos salvos!"); },
    onError: (e) => toast.error(e.message),
  });

  const [services, setServices] = useState<ServiceRow[]>([]);
  const [initialized, setInitialized] = useState(false);

  // Initialize from query data
  if (data?.servicos && !initialized) {
    setServices(data.servicos as ServiceRow[]);
    setInitialized(true);
  }

  const updateField = useCallback((id: string, field: keyof ServiceRow, value: string | number) => {
    setServices(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  }, []);

  const addService = useCallback(() => {
    setServices(prev => [...prev, {
      id: `svc_${Date.now()}`,
      nome: "",
      duracaoHoras: 0.5,
      precoVenda: 0,
      impostoPercent: 12.5,
      taxaCartaoPercent: 5,
      mod: 0,
      matMed: 0,
      bonusPercent: 1,
      taxaEquipamento: 0,
    }]);
  }, []);

  const removeService = useCallback((id: string) => {
    setServices(prev => prev.filter(s => s.id !== id));
  }, []);

  const handleSave = useCallback(() => {
    saveMutation.mutate({
      menteeId,
      servicos: services,
      mixAtendimentos: data?.mixAtendimentos || {},
      params: data?.params || {
        custoFixoTotal: 0,
        custosVariaveisPercent: 20,
        taxaSalaHora: 0,
        horasDisponiveisMes: 160,
        horasOcupadasMes: 80,
        faturamentoMensal: 0,
      },
    });
  }, [menteeId, services, data, saveMutation]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Carregando servicos...</span>
      </div>
    );
  }

  if (services.length === 0 && initialized) {
    return (
      <div className="text-center py-6 space-y-3">
        <p className="text-sm text-muted-foreground">Nenhum servico cadastrado.</p>
        <Button onClick={addService} size="sm" variant="outline" className="gap-1.5">
          <Plus className="w-3.5 h-3.5" /> Adicionar servico
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-xs text-muted-foreground">
              <th className="text-left p-2">Servico</th>
              <th className="text-right p-2">Preco (R$)</th>
              <th className="text-right p-2">Duracao (h)</th>
              <th className="text-right p-2">Materiais</th>
              <th className="text-right p-2">Imposto %</th>
              <th className="text-right p-2">Cartao %</th>
              <th className="text-right p-2">MOD</th>
              <th className="text-right p-2">Equip.</th>
              <th className="text-right p-2">Lucro</th>
              <th className="text-right p-2">Margem</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {services.map((s) => {
              const { lucroBruto, margem } = calcMargin(s);
              return (
                <tr key={s.id} className="border-b hover:bg-muted/30">
                  <td className="p-1">
                    <Input value={s.nome} onChange={e => updateField(s.id, "nome", e.target.value)} className="h-8 text-sm min-w-[150px]" placeholder="Nome do servico" />
                  </td>
                  <td className="p-1">
                    <Input type="number" value={s.precoVenda || ""} onChange={e => updateField(s.id, "precoVenda", parseFloat(e.target.value) || 0)} className="h-8 text-sm w-24 text-right" />
                  </td>
                  <td className="p-1">
                    <Input type="number" step="0.25" value={s.duracaoHoras || ""} onChange={e => updateField(s.id, "duracaoHoras", parseFloat(e.target.value) || 0)} className="h-8 text-sm w-20 text-right" />
                  </td>
                  <td className="p-1">
                    <Input type="number" value={s.matMed || ""} onChange={e => updateField(s.id, "matMed", parseFloat(e.target.value) || 0)} className="h-8 text-sm w-20 text-right" />
                  </td>
                  <td className="p-1">
                    <Input type="number" step="0.5" value={s.impostoPercent || ""} onChange={e => updateField(s.id, "impostoPercent", parseFloat(e.target.value) || 0)} className="h-8 text-sm w-20 text-right" />
                  </td>
                  <td className="p-1">
                    <Input type="number" step="0.5" value={s.taxaCartaoPercent || ""} onChange={e => updateField(s.id, "taxaCartaoPercent", parseFloat(e.target.value) || 0)} className="h-8 text-sm w-20 text-right" />
                  </td>
                  <td className="p-1">
                    <Input type="number" value={s.mod || ""} onChange={e => updateField(s.id, "mod", parseFloat(e.target.value) || 0)} className="h-8 text-sm w-20 text-right" />
                  </td>
                  <td className="p-1">
                    <Input type="number" value={s.taxaEquipamento || ""} onChange={e => updateField(s.id, "taxaEquipamento", parseFloat(e.target.value) || 0)} className="h-8 text-sm w-20 text-right" />
                  </td>
                  <td className="p-2 text-right font-medium">{formatBRL(lucroBruto)}</td>
                  <td className="p-2 text-right">
                    <Badge variant="secondary" className={margem > 40 ? "bg-emerald-100 text-emerald-800" : margem > 20 ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800"}>
                      {margem.toFixed(1)}%
                    </Badge>
                  </td>
                  <td className="p-1">
                    <button onClick={() => removeService(s.id)} className="text-muted-foreground hover:text-red-500 p-1">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex gap-2">
        <Button onClick={addService} size="sm" variant="outline" className="gap-1.5">
          <Plus className="w-3.5 h-3.5" /> Adicionar servico
        </Button>
        <Button onClick={handleSave} size="sm" disabled={saveMutation.isPending} className="gap-1.5 bg-primary text-primary-foreground">
          {saveMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Salvar servicos
        </Button>
      </div>
    </div>
  );
}
