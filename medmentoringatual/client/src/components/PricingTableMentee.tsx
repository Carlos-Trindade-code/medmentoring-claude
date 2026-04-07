/**
 * PricingTableMentee — Planilha de Precificação para o Mentorado (Pilar 5)
 *
 * Baseada na planilha PLANILHAPRECIFICAÇÃOINSTITUTO.xlsx
 * Colunas: Serviço | Tempo | Preço Venda | Imposto | Taxa Cartão | MOD | Mat/Med |
 *          Bônus | Taxa Equip | Lucro Bruto | Margem Bruta | Taxa Sala | Lucro Op | Margem Op | Rateio
 *
 * Fluxo:
 * - Mentorado lista serviços com dados básicos (pré-preenchidos das respostas anteriores)
 * - Mentor ajusta percentuais e libera
 * - Após liberação: mentorado vê planilha completa + pode fazer simulações + IA assistente
 */
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Plus, Trash2, Save, Sparkles, Send, Loader2,
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle2,
  Info, ChevronDown, ChevronUp, X, HelpCircle, RotateCcw
} from "lucide-react";

// ─── Tipos ────────────────────────────────────────────────────────────────────
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
  rateioPercent: number; // % que fica com o médico (ex: 50 = 50/50)
  quantidadeMes: number; // para cálculo de mix
}

interface CalcResult {
  imposto: number;
  taxaCartao: number;
  modVal: number;
  bonus: number;
  lucroBruto: number;
  margemBruta: number;
  taxaSala: number;
  lucroOperacional: number;
  margemOperacional: number;
  honorarioMedico: number; // após rateio
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// ─── Cálculos ─────────────────────────────────────────────────────────────────
function calcService(s: ServiceRow, taxaSalaHora: number): CalcResult {
  const imposto = s.precoVenda * (s.impostoPercent / 100);
  const taxaCartao = s.precoVenda * (s.taxaCartaoPercent / 100);
  const modVal = s.mod;
  const bonus = s.precoVenda * (s.bonusPercent / 100);
  const lucroBruto = s.precoVenda - imposto - taxaCartao - modVal - s.matMed - bonus - s.taxaEquipamento;
  const margemBruta = s.precoVenda > 0 ? (lucroBruto / s.precoVenda) * 100 : 0;
  const taxaSala = taxaSalaHora * s.duracaoHoras;
  const lucroOperacional = lucroBruto - taxaSala;
  const margemOperacional = s.precoVenda > 0 ? (lucroOperacional / s.precoVenda) * 100 : 0;
  const honorarioMedico = lucroOperacional * (s.rateioPercent / 100);
  return { imposto, taxaCartao, modVal, bonus, lucroBruto, margemBruta, taxaSala, lucroOperacional, margemOperacional, honorarioMedico };
}

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function fmtPct(v: number) {
  return `${v.toFixed(1)}%`;
}
function marginColor(pct: number) {
  if (pct >= 30) return "text-emerald-600 font-semibold";
  if (pct >= 15) return "text-amber-600 font-semibold";
  return "text-red-600 font-semibold";
}
function marginBg(pct: number) {
  if (pct >= 30) return "bg-emerald-100 text-emerald-700";
  if (pct >= 15) return "bg-amber-100 text-amber-700";
  return "bg-red-100 text-red-700";
}

// ─── Componente principal ─────────────────────────────────────────────────────
interface Props {
  isReleased: boolean;
  onComplete?: () => void;
  mode?: "mentee" | "mentor";
}

export function PricingTableMentee({ isReleased, onComplete, mode = "mentee" }: Props) {
  const isMentor = mode === "mentor";
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [originalServices, setOriginalServices] = useState<ServiceRow[]>([]); // snapshot dos dados salvos
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showAiChat, setShowAiChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [objetivo, setObjetivo] = useState("");
  const [showObjetivo, setShowObjetivo] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);

  // Busca dados pré-preenchidos
  const { data: pricingData, isLoading } = trpc.portal.getPricingTableData.useQuery();
  const saveServicesMutation = trpc.portal.saveMyServices.useMutation();
  const aiAdviceMutation = trpc.portal.getPricingAiAdvice.useMutation();

  // Inicializa serviços com dados pré-preenchidos
  useEffect(() => {
    if (!pricingData) return;
    if (pricingData.servicos && pricingData.servicos.length > 0) {
      // Já tem serviços salvos — carrega com rateioPercent e quantidadeMes
      const loaded = (pricingData.servicos as any[]).map(s => ({
        ...s,
        rateioPercent: s.rateioPercent ?? 100,
        quantidadeMes: (pricingData.mixAtendimentos as Record<string, number>)[s.id] ?? 0,
      }));
      setServices(loaded);
      setOriginalServices(loaded); // guarda snapshot para reset
    } else if (pricingData.procedimentosLista) {
      // Pré-preenche a partir da lista de procedimentos do Pilar 5
      const lines = pricingData.procedimentosLista.split("\n")
        .map(l => l.trim())
        .filter(l => l.length > 0 && l.startsWith("-"));
      const parsed: ServiceRow[] = lines.slice(0, 10).map((line, i) => {
        const match = line.match(/[-•]\s*(.+?):\s*R\$\s*([\d.,]+)/i);
        const nome = match ? match[1].trim() : `Serviço ${i + 1}`;
        const preco = match ? parseFloat(match[2].replace(",", ".")) : 0;
        return {
          id: `svc_${Date.now()}_${i}`,
          nome,
          duracaoHoras: 0.5,
          precoVenda: preco || (pricingData.valorConsultaParticular || 0),
          impostoPercent: 12.5,
          taxaCartaoPercent: pricingData.taxaCartaoDefault || 5,
          mod: 0,
          matMed: pricingData.materialPorConsulta || 0,
          bonusPercent: 1,
          taxaEquipamento: 0,
          rateioPercent: 100,
          quantidadeMes: 0,
        };
      });
      if (parsed.length > 0) {
        setServices(parsed);
        setOriginalServices(parsed); // guarda snapshot para reset
      }
    }
  }, [pricingData]);

  // ─── Auto-save com debounce de 2s ───────────────────────────────────────────
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialLoad = useRef(true);

  const triggerAutoSave = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (services.length === 0) return;
      try {
        await saveServicesMutation.mutateAsync({ servicos: services });
        setLastSaved(new Date());
        setOriginalServices(JSON.parse(JSON.stringify(services)));
      } catch {
        // silently fail — manual save still shows toast
      }
    }, 2000);
  }, [services, saveServicesMutation]);

  useEffect(() => {
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      return;
    }
    triggerAutoSave();
  }, [services, triggerAutoSave]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const taxaSalaHora = pricingData?.taxaSalaHora ?? 0;
  const custoFixoTotal = pricingData?.custoFixoTotal ?? 0;

  // Totais
  const totals = useMemo(() => {
    let faturamento = 0, lucroBruto = 0, lucroOp = 0, honorario = 0;
    for (const s of services) {
      const qty = s.quantidadeMes || 0;
      const c = calcService(s, taxaSalaHora);
      faturamento += s.precoVenda * qty;
      lucroBruto += c.lucroBruto * qty;
      lucroOp += c.lucroOperacional * qty;
      honorario += c.honorarioMedico * qty;
    }
    const margemBruta = faturamento > 0 ? (lucroBruto / faturamento) * 100 : 0;
    const margemOp = faturamento > 0 ? (lucroOp / faturamento) * 100 : 0;
    const sobra = lucroOp - custoFixoTotal;
    return { faturamento, lucroBruto, lucroOp, honorario, margemBruta, margemOp, sobra };
  }, [services, taxaSalaHora, custoFixoTotal]);

  const addService = () => {
    setServices(prev => [...prev, {
      id: `svc_${Date.now()}`,
      nome: "Novo serviço",
      duracaoHoras: 0.5,
      precoVenda: 0,
      impostoPercent: 12.5,
      taxaCartaoPercent: pricingData?.taxaCartaoDefault || 5,
      mod: 0,
      matMed: 0,
      bonusPercent: 1,
      taxaEquipamento: 0,
      rateioPercent: 100,
      quantidadeMes: 0,
    }]);
  };

  const updateService = (id: string, field: keyof ServiceRow, value: string | number) => {
    setServices(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const removeService = (id: string) => {
    setServices(prev => prev.filter(s => s.id !== id));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveServicesMutation.mutateAsync({ servicos: services });
      setLastSaved(new Date());
      setOriginalServices(JSON.parse(JSON.stringify(services))); // atualiza snapshot após salvar
      toast.success("Planilha salva com sucesso!");
      onComplete?.();
    } catch {
      toast.error("Erro ao salvar. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setServices(JSON.parse(JSON.stringify(originalServices)));
    setShowResetConfirm(false);
    toast.success("Simulação resetada para os valores salvos.");
  };

  // Detecta se há alterações em relação ao snapshot original
  const hasChanges = useMemo(() => {
    if (services.length !== originalServices.length) return true;
    return JSON.stringify(services) !== JSON.stringify(originalServices);
  }, [services, originalServices]);

  const handleAiChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg = chatInput.trim();
    setChatMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setChatInput("");
    setChatLoading(true);
    try {
      const result = await aiAdviceMutation.mutateAsync({
        pergunta: userMsg,
        servicos: services,
        custoFixoTotal,
        objetivo: objetivo || undefined,
      });
      setChatMessages(prev => [...prev, { role: "assistant", content: result.advice }]);
    } catch {
      setChatMessages(prev => [...prev, { role: "assistant", content: "Não foi possível obter a resposta. Tente novamente." }]);
    } finally {
      setChatLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground text-sm">Carregando dados...</span>
      </div>
    );
  }

  // ─── MODO PREENCHIMENTO (antes da liberação) ─────────────────────────────────
  if (!isReleased) {
    return (
      <div className="space-y-5">
        {/* Cabeçalho */}
        <div className="bg-gradient-to-r from-violet-50 to-blue-50 border border-violet-200 rounded-xl p-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-bold text-foreground text-base flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-violet-600" />
                Engenharia de Preços
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Liste seus serviços e procedimentos. Seu mentor usará esses dados para montar a planilha completa de precificação.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {lastSaved && !saving && (
                <div className="flex items-center gap-1.5 text-xs text-green-600 bg-green-50 px-2.5 py-1 rounded-full border border-green-200">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Salvo às {lastSaved.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </div>
              )}
              <button
                onClick={() => setShowGuide(!showGuide)}
                className="text-muted-foreground hover:text-primary"
              >
                <HelpCircle className="w-5 h-5" />
              </button>
            </div>
          </div>
          {showGuide && (
            <div className="mt-3 p-3 bg-white rounded-lg border border-violet-100 text-xs text-muted-foreground space-y-1">
              <p><strong>Preço de venda:</strong> o valor que você cobra do paciente hoje.</p>
              <p><strong>Duração:</strong> tempo médio do atendimento em horas (ex: 0.5 = 30 min).</p>
              <p><strong>Imposto:</strong> alíquota do seu regime tributário (MEI ~6%, Simples ~12.5%, PJ ~32%).</p>
              <p><strong>Taxa cartão:</strong> percentual cobrado pela maquininha (verifique no extrato).</p>
              <p><strong>Materiais:</strong> custo de insumos por procedimento (luvas, medicamentos, etc.).</p>
              <p><strong>Taxa equipamento:</strong> depreciação do equipamento por uso (opcional).</p>
              <p><strong>Rateio:</strong> % que fica com você (100% = atendimento próprio; 50% = divisão com clínica).</p>
              <p><strong>Qtd/mês:</strong> quantas vezes você faz esse procedimento por mês.</p>
            </div>
          )}
        </div>

        {/* Tabela de serviços */}
        <div className="space-y-3">
          {services.map((s) => {
            const calc = calcService(s, taxaSalaHora);
            const isExpanded = expandedRow === s.id;
            return (
              <div key={s.id} className="border rounded-xl overflow-hidden bg-card">
                {/* Linha principal */}
                <div className="p-3 flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <Input
                      value={s.nome}
                      onChange={e => updateService(s.id, "nome", e.target.value)}
                      className="font-medium text-sm border-0 p-0 h-auto focus-visible:ring-0 bg-transparent"
                      placeholder="Nome do serviço"
                    />
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Badge className={`text-xs ${marginBg(calc.margemOperacional)}`}>
                      {fmtPct(calc.margemOperacional)}
                    </Badge>
                    <button
                      onClick={() => setExpandedRow(isExpanded ? null : s.id)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => removeService(s.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Campos expandidos */}
                {isExpanded && (
                  <div className="border-t p-3 bg-muted/20">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                      <div>
                        <label className="text-xs text-muted-foreground block mb-1">Preço de venda (R$)</label>
                        <Input
                          type="number"
                          value={s.precoVenda || ""}
                          onChange={e => updateService(s.id, "precoVenda", parseFloat(e.target.value) || 0)}
                          className="h-8 text-sm"
                          placeholder="0,00"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground block mb-1">Duração (horas)</label>
                        <Input
                          type="number"
                          step="0.25"
                          value={s.duracaoHoras || ""}
                          onChange={e => updateService(s.id, "duracaoHoras", parseFloat(e.target.value) || 0)}
                          className="h-8 text-sm"
                          placeholder="0.5"
                        />
                      </div>
                      {isMentor && (
                        <div>
                          <label className="text-xs text-muted-foreground block mb-1">Imposto (%)</label>
                          <Input
                            type="number"
                            step="0.5"
                            value={s.impostoPercent || ""}
                            onChange={e => updateService(s.id, "impostoPercent", parseFloat(e.target.value) || 0)}
                            className="h-8 text-sm"
                            placeholder="12.5"
                          />
                        </div>
                      )}
                      {isMentor && (
                        <div>
                          <label className="text-xs text-muted-foreground block mb-1">Taxa cartão (%)</label>
                          <Input
                            type="number"
                            step="0.5"
                            value={s.taxaCartaoPercent || ""}
                            onChange={e => updateService(s.id, "taxaCartaoPercent", parseFloat(e.target.value) || 0)}
                            className="h-8 text-sm"
                            placeholder="5"
                          />
                        </div>
                      )}
                      <div>
                        <label className="text-xs text-muted-foreground block mb-1">Materiais (R$/proc.)</label>
                        <Input
                          type="number"
                          value={s.matMed || ""}
                          onChange={e => updateService(s.id, "matMed", parseFloat(e.target.value) || 0)}
                          className="h-8 text-sm"
                          placeholder="0,00"
                        />
                      </div>
                      {isMentor && (
                        <div>
                          <label className="text-xs text-muted-foreground block mb-1">Taxa equipamento (R$)</label>
                          <Input
                            type="number"
                            value={s.taxaEquipamento || ""}
                            onChange={e => updateService(s.id, "taxaEquipamento", parseFloat(e.target.value) || 0)}
                            className="h-8 text-sm"
                            placeholder="0,00"
                          />
                        </div>
                      )}
                      {isMentor && (
                        <div>
                          <label className="text-xs text-muted-foreground block mb-1">Rateio médico (%)</label>
                          <Input
                            type="number"
                            min="1"
                            max="100"
                            value={s.rateioPercent || ""}
                            onChange={e => updateService(s.id, "rateioPercent", parseFloat(e.target.value) || 100)}
                            className="h-8 text-sm"
                            placeholder="100"
                          />
                        </div>
                      )}
                      {isMentor && (
                        <div>
                          <label className="text-xs text-muted-foreground block mb-1">Qtd. por mês</label>
                          <Input
                            type="number"
                            value={s.quantidadeMes || ""}
                            onChange={e => updateService(s.id, "quantidadeMes", parseInt(e.target.value) || 0)}
                            className="h-8 text-sm"
                            placeholder="0"
                          />
                        </div>
                      )}
                    </div>
                    {/* Preview dos cálculos */}
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t">
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Lucro Bruto</p>
                        <p className={`text-sm font-semibold ${calc.lucroBruto >= 0 ? "text-emerald-600" : "text-red-600"}`}>{fmt(calc.lucroBruto)}</p>
                        <p className="text-xs text-muted-foreground">{fmtPct(calc.margemBruta)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Lucro Operacional</p>
                        <p className={`text-sm font-semibold ${calc.lucroOperacional >= 0 ? "text-emerald-600" : "text-red-600"}`}>{fmt(calc.lucroOperacional)}</p>
                        <p className={`text-xs ${marginColor(calc.margemOperacional)}`}>{fmtPct(calc.margemOperacional)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Honorário Médico</p>
                        <p className="text-sm font-semibold text-violet-600">{fmt(calc.honorarioMedico)}</p>
                        <p className="text-xs text-muted-foreground">{s.rateioPercent}% do lucro op.</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Adicionar serviço */}
        <Button variant="outline" size="sm" onClick={addService} className="w-full gap-2">
          <Plus className="w-4 h-4" /> Adicionar serviço
        </Button>

        {/* Resumo */}
        {services.length > 0 && (
          <div className="bg-muted/30 rounded-xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Faturamento/mês</p>
              <p className="font-bold text-foreground">{fmt(totals.faturamento)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Lucro Bruto</p>
              <p className={`font-bold ${totals.lucroBruto >= 0 ? "text-emerald-600" : "text-red-600"}`}>{fmt(totals.lucroBruto)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Lucro Operacional</p>
              <p className={`font-bold ${totals.lucroOp >= 0 ? "text-emerald-600" : "text-red-600"}`}>{fmt(totals.lucroOp)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Honorário Total</p>
              <p className="font-bold text-violet-600">{fmt(totals.honorario)}</p>
            </div>
          </div>
        )}

        {/* Salvar */}
        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            {saving ? (
              <span className="flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Salvando...</span>
            ) : lastSaved ? (
              <span className="text-emerald-600">✓ Salvo às {lastSaved.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
            ) : null}
          </div>
          <Button onClick={handleSave} disabled={saving || services.length === 0} className="gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salvar planilha
          </Button>
        </div>

        {/* Aviso */}
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800">
            Seu mentor revisará e ajustará esta planilha antes de liberar a análise completa para você.
            Após a liberação, você terá acesso ao simulador de cenários e ao assistente de precificação.
          </p>
        </div>
      </div>
    );
  }

  // ─── MODO VISUALIZAÇÃO PREMIUM (após liberação) ───────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header premium */}
      <div className="bg-gradient-to-r from-violet-600 to-blue-600 rounded-xl p-5 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Engenharia de Preços — Análise Completa
            </h3>
            <p className="text-violet-100 text-sm mt-1">Planilha liberada pelo seu mentor. Você pode simular cenários e consultar o assistente.</p>
          </div>
          <CheckCircle2 className="w-8 h-8 text-white/80" />
        </div>
        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <div className="bg-white/10 rounded-lg p-3 text-center">
            <p className="text-xs text-violet-100">Faturamento/mês</p>
            <p className="font-bold text-white text-sm">{fmt(totals.faturamento)}</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3 text-center">
            <p className="text-xs text-violet-100">Margem Operacional</p>
            <p className="font-bold text-white text-sm">{fmtPct(totals.margemOp)}</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3 text-center">
            <p className="text-xs text-violet-100">Honorário Médico</p>
            <p className="font-bold text-white text-sm">{fmt(totals.honorario)}</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3 text-center">
            <p className="text-xs text-violet-100">Sobra após custos fixos</p>
            <p className={`font-bold text-sm ${totals.sobra >= 0 ? "text-emerald-300" : "text-red-300"}`}>{fmt(totals.sobra)}</p>
          </div>
        </div>
      </div>

      {/* Mobile: card stack */}
      <div className="block md:hidden space-y-3">
        {services.map((s, i) => {
          const calc = calcService(s, taxaSalaHora);
          return (
            <div key={i} className="bg-card border border-border rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="font-semibold text-foreground text-sm flex items-center gap-1.5">
                  {calc.margemOperacional >= 30
                    ? <TrendingUp className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    : calc.margemOperacional >= 15
                    ? <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    : <TrendingDown className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                  {s.nome || `Serviço ${i + 1}`}
                </div>
                <Badge className={`text-xs ${marginBg(calc.margemOperacional)}`}>
                  {fmtPct(calc.margemOperacional)}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground text-xs">Preço:</span> <span className="font-medium">{fmt(s.precoVenda)}</span></div>
                <div><span className="text-muted-foreground text-xs">Duração:</span> <span className="font-medium">{s.duracaoHoras}h</span></div>
                <div><span className="text-muted-foreground text-xs">L. Bruto:</span> <span className={`font-medium ${calc.lucroBruto >= 0 ? "text-emerald-600" : "text-red-600"}`}>{fmt(calc.lucroBruto)}</span></div>
                <div><span className="text-muted-foreground text-xs">L. Oper.:</span> <span className={`font-medium ${calc.lucroOperacional >= 0 ? "text-blue-600" : "text-red-600"}`}>{fmt(calc.lucroOperacional)}</span></div>
                <div><span className="text-muted-foreground text-xs">Honorário:</span> <span className="font-medium text-violet-600">{fmt(calc.honorarioMedico)}</span></div>
                <div><span className="text-muted-foreground text-xs">Qtd/mês:</span> <span className="font-medium">{s.quantidadeMes || 0}</span></div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tabela completa */}
      <div className="hidden md:block overflow-x-auto rounded-xl border">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-muted/50 border-b">
              <th className="text-left p-2 font-semibold text-foreground min-w-[140px]">Serviço</th>
              <th className="text-right p-2 font-semibold text-foreground">Tempo</th>
              <th className="text-right p-2 font-semibold text-foreground">Preço</th>
              <th className="text-right p-2 font-semibold text-muted-foreground">Imposto</th>
              <th className="text-right p-2 font-semibold text-muted-foreground">Cartão</th>
              <th className="text-right p-2 font-semibold text-muted-foreground">Mat/Med</th>
              <th className="text-right p-2 font-semibold text-muted-foreground">Equip.</th>
              <th className="text-right p-2 font-semibold text-emerald-700">L. Bruto</th>
              <th className="text-right p-2 font-semibold text-emerald-700">M. Bruta</th>
              <th className="text-right p-2 font-semibold text-muted-foreground">Taxa Sala</th>
              <th className="text-right p-2 font-semibold text-blue-700">L. Oper.</th>
              <th className="text-right p-2 font-semibold text-blue-700">M. Oper.</th>
              <th className="text-right p-2 font-semibold text-violet-700">Honorário</th>
              <th className="text-right p-2 font-semibold text-foreground">Qtd/mês</th>
            </tr>
          </thead>
          <tbody>
            {services.map((s, i) => {
              const calc = calcService(s, taxaSalaHora);
              return (
                <tr key={s.id} className={`border-b hover:bg-muted/20 transition-colors ${i % 2 === 0 ? "" : "bg-muted/10"}`}>
                  <td className="p-2 font-medium text-foreground">
                    <div className="flex items-center gap-1">
                      {calc.margemOperacional >= 30
                        ? <TrendingUp className="w-3 h-3 text-emerald-500 shrink-0" />
                        : calc.margemOperacional >= 15
                        ? <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
                        : <TrendingDown className="w-3 h-3 text-red-500 shrink-0" />}
                      {/* Simulação: editar preço */}
                      <Input
                        value={s.nome}
                        onChange={e => updateService(s.id, "nome", e.target.value)}
                        className="border-0 p-0 h-auto text-xs focus-visible:ring-0 bg-transparent font-medium"
                      />
                    </div>
                  </td>
                  <td className="p-2 text-right text-muted-foreground">{s.duracaoHoras}h</td>
                  <td className="p-2 text-right">
                    <Input
                      type="number"
                      value={s.precoVenda || ""}
                      onChange={e => updateService(s.id, "precoVenda", parseFloat(e.target.value) || 0)}
                      className="border-0 p-0 h-auto text-xs text-right focus-visible:ring-0 bg-transparent font-medium w-20 ml-auto"
                    />
                  </td>
                  <td className="p-2 text-right text-muted-foreground">{fmt(calc.imposto)}</td>
                  <td className="p-2 text-right text-muted-foreground">{fmt(calc.taxaCartao)}</td>
                  <td className="p-2 text-right text-muted-foreground">{fmt(s.matMed)}</td>
                  <td className="p-2 text-right text-muted-foreground">{fmt(s.taxaEquipamento)}</td>
                  <td className={`p-2 text-right ${calc.lucroBruto >= 0 ? "text-emerald-600" : "text-red-600"}`}>{fmt(calc.lucroBruto)}</td>
                  <td className={`p-2 text-right ${marginColor(calc.margemBruta)}`}>{fmtPct(calc.margemBruta)}</td>
                  <td className="p-2 text-right text-muted-foreground">{fmt(calc.taxaSala)}</td>
                  <td className={`p-2 text-right font-semibold ${calc.lucroOperacional >= 0 ? "text-blue-600" : "text-red-600"}`}>{fmt(calc.lucroOperacional)}</td>
                  <td className={`p-2 text-right ${marginColor(calc.margemOperacional)}`}>
                    <span className={`px-1.5 py-0.5 rounded text-xs ${marginBg(calc.margemOperacional)}`}>
                      {fmtPct(calc.margemOperacional)}
                    </span>
                  </td>
                  <td className="p-2 text-right font-semibold text-violet-600">{fmt(calc.honorarioMedico)}</td>
                  <td className="p-2 text-right">
                    <Input
                      type="number"
                      value={s.quantidadeMes || ""}
                      onChange={e => updateService(s.id, "quantidadeMes", parseInt(e.target.value) || 0)}
                      className="border-0 p-0 h-auto text-xs text-right focus-visible:ring-0 bg-transparent w-12 ml-auto"
                      placeholder="0"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-muted/40 font-bold border-t-2">
              <td className="p-2 text-foreground" colSpan={2}>TOTAL</td>
              <td className="p-2 text-right text-foreground">{fmt(totals.faturamento)}</td>
              <td colSpan={4} />
              <td className={`p-2 text-right ${totals.lucroBruto >= 0 ? "text-emerald-600" : "text-red-600"}`}>{fmt(totals.lucroBruto)}</td>
              <td className={`p-2 text-right ${marginColor(totals.margemBruta)}`}>{fmtPct(totals.margemBruta)}</td>
              <td />
              <td className={`p-2 text-right ${totals.lucroOp >= 0 ? "text-blue-600" : "text-red-600"}`}>{fmt(totals.lucroOp)}</td>
              <td className={`p-2 text-right ${marginColor(totals.margemOp)}`}>{fmtPct(totals.margemOp)}</td>
              <td className="p-2 text-right text-violet-600">{fmt(totals.honorario)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Legenda semáforo */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" /> Margem ≥ 30% — Excelente</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-amber-500 inline-block" /> Margem 15–30% — Atenção</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500 inline-block" /> Margem &lt; 15% — Crítico</span>
      </div>

      {/* Objetivo para IA */}
      <div className="border rounded-xl p-4 space-y-3">
        <button
          onClick={() => setShowObjetivo(!showObjetivo)}
          className="flex items-center justify-between w-full text-sm font-medium text-foreground"
        >
          <span className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-violet-600" />
            Definir objetivo financeiro (opcional)
          </span>
          {showObjetivo ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {showObjetivo && (
          <Input
            value={objetivo}
            onChange={e => setObjetivo(e.target.value)}
            placeholder="Ex: Quero atingir R$ 30.000/mês com margem mínima de 35%"
            className="text-sm"
          />
        )}
      </div>

      {/* Assistente */}
      <div className="border rounded-xl overflow-hidden">
        <button
          onClick={() => setShowAiChat(!showAiChat)}
          className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-violet-600" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-sm text-foreground">Assistente de Precificação</p>
              <p className="text-xs text-muted-foreground">Pergunte sobre ajustes, simulações e estratégias de preço</p>
            </div>
          </div>
          {showAiChat ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>

        {showAiChat && (
          <div className="border-t">
            {/* Sugestões de perguntas */}
            {chatMessages.length === 0 && (
              <div className="p-3 bg-violet-50 border-b">
                <p className="text-xs text-violet-700 font-medium mb-2">Exemplos de perguntas:</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    "O que preciso mudar para atingir 40% de margem na consulta?",
                    "Qual serviço devo priorizar para aumentar meu faturamento?",
                    "O que acontece se eu aumentar o preço da consulta em 20%?",
                    "Como o rateio afeta meu honorário líquido?",
                  ].map(q => (
                    <button
                      key={q}
                      onClick={() => { setChatInput(q); }}
                      className="text-xs px-2 py-1 bg-white border border-violet-200 rounded-full text-violet-700 hover:bg-violet-100 transition-colors text-left"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Mensagens */}
            <div className="max-h-64 overflow-y-auto p-3 space-y-3">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-xl px-3 py-2 text-xs ${
                    msg.role === "user"
                      ? "bg-violet-600 text-white"
                      : "bg-muted text-foreground"
                  }`}>
                    {msg.role === "assistant" && (
                      <div className="flex items-center gap-1 mb-1">
                        <Sparkles className="w-3 h-3 text-violet-600" />
                        <span className="text-xs font-semibold text-violet-700">Assistente</span>
                      </div>
                    )}
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-xl px-3 py-2 flex items-center gap-2">
                    <Loader2 className="w-3 h-3 animate-spin text-violet-600" />
                    <span className="text-xs text-muted-foreground">Analisando sua planilha...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-3 border-t flex gap-2">
              <Input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleAiChat()}
                placeholder="Pergunte sobre sua precificação..."
                className="text-sm flex-1"
                disabled={chatLoading}
              />
              <Button
                size="sm"
                onClick={handleAiChat}
                disabled={!chatInput.trim() || chatLoading}
                className="gap-1"
              >
                {chatLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Ações: Resetar + Salvar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {/* Botão Resetar simulação */}
        <div className="flex items-center gap-2">
          {!showResetConfirm ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowResetConfirm(true)}
              disabled={!hasChanges}
              className="gap-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 disabled:opacity-40"
              title={hasChanges ? "Reverter para os valores salvos" : "Sem alterações para resetar"}
            >
              <RotateCcw className="w-4 h-4" />
              Resetar simulação
            </Button>
          ) : (
            <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-1.5">
              <span className="text-xs text-destructive font-medium">Reverter todas as alterações?</span>
              <Button
                size="sm"
                variant="destructive"
                className="h-7 text-xs px-2"
                onClick={handleReset}
              >
                Sim, reverter
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs px-2"
                onClick={() => setShowResetConfirm(false)}
              >
                Cancelar
              </Button>
            </div>
          )}
        </div>

        {/* Botão Salvar + indicador */}
        <div className="flex items-center gap-3">
          {lastSaved && !hasChanges && (
            <span className="text-xs text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Salvo às {lastSaved.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          {hasChanges && lastSaved && (
            <span className="text-xs text-amber-600 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              Alterações não salvas
            </span>
          )}
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salvar simulação
          </Button>
        </div>
      </div>
    </div>
  );
}
