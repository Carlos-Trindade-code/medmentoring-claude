/**
 * ScenarioSimulator — Simulador de cenarios financeiros
 *
 * Dois modos:
 *  - "mentor": acesso total, edita parametros globais, servicos, salva, exporta
 *  - "mentee": somente leitura da base, com sliders para simulacao what-if
 *
 * Calculos feitos client-side via calculateSimulation() para updates em tempo real.
 */
import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import {
  DollarSign,
  TrendingUp,
  Percent,
  Clock,
  Target,
  Plus,
  Trash2,
  Save,
  Download,
  FileSpreadsheet,
  Loader2,
  Calculator,
  BarChart3,
  SlidersHorizontal,
} from "lucide-react";
import type {
  Service,
  SimulationParams,
  SimulationResult,
} from "../../../shared/pricing-model";
import {
  calculateSimulation,
  calculateTarget,
} from "../../../shared/pricing-model";

// ============================================================
// TIPOS
// ============================================================
interface ScenarioSimulatorProps {
  menteeId: number;
  mode: "mentor" | "mentee";
}

// ============================================================
// FORMATACAO
// ============================================================
function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

function formatPercent(value: number): string {
  return `${value.toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`;
}

// ============================================================
// DEFAULTS
// ============================================================
const DEFAULT_SERVICES: Service[] = [
  {
    id: "consulta-particular",
    nome: "Consulta Particular",
    duracaoHoras: 1,
    precoVenda: 400,
    impostoPercent: 12.5,
    taxaCartaoPercent: 5,
    mod: 0,
    matMed: 0,
    bonusPercent: 0,
    taxaEquipamento: 0,
  },
  {
    id: "consulta-retorno",
    nome: "Consulta Retorno",
    duracaoHoras: 0.5,
    precoVenda: 250,
    impostoPercent: 12.5,
    taxaCartaoPercent: 5,
    mod: 0,
    matMed: 0,
    bonusPercent: 0,
    taxaEquipamento: 0,
  },
  {
    id: "procedimento",
    nome: "Procedimento",
    duracaoHoras: 1,
    precoVenda: 2000,
    impostoPercent: 12.5,
    taxaCartaoPercent: 5,
    mod: 0,
    matMed: 200,
    bonusPercent: 0,
    taxaEquipamento: 50,
  },
  {
    id: "pacote-tratamento",
    nome: "Pacote Tratamento",
    duracaoHoras: 5,
    precoVenda: 6000,
    impostoPercent: 12.5,
    taxaCartaoPercent: 5,
    mod: 0,
    matMed: 500,
    bonusPercent: 0,
    taxaEquipamento: 100,
  },
];

const DEFAULT_MIX: Record<string, number> = {
  "consulta-particular": 40,
  "consulta-retorno": 20,
  "procedimento": 8,
  "pacote-tratamento": 2,
};

let _serviceCounter = 0;
function generateServiceId(): string {
  _serviceCounter += 1;
  return `servico-${Date.now()}-${_serviceCounter}`;
}

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
export function ScenarioSimulator({ menteeId, mode }: ScenarioSimulatorProps) {
  // ----------------------------------------------------------
  // STATE: Parametros Globais
  // ----------------------------------------------------------
  const [custoFixoTotal, setCustoFixoTotal] = useState(15000);
  const [impostoDefault, setImpostoDefault] = useState(12.5);
  const [taxaCartaoDefault, setTaxaCartaoDefault] = useState(5);
  const [taxaSalaHora, setTaxaSalaHora] = useState(180);
  const [horasDisponiveis, setHorasDisponiveis] = useState(128);
  const [horasOcupadas, setHorasOcupadas] = useState(80);
  const [outrasReceitas, setOutrasReceitas] = useState(0);

  // ----------------------------------------------------------
  // STATE: Servicos e Mix
  // ----------------------------------------------------------
  const [servicos, setServicos] = useState<Service[]>(DEFAULT_SERVICES);
  const [mixAtendimentos, setMixAtendimentos] = useState<Record<string, number>>(DEFAULT_MIX);

  // ----------------------------------------------------------
  // STATE: Modo Meta
  // ----------------------------------------------------------
  const [metaLucro, setMetaLucro] = useState(50000);
  const [metaResult, setMetaResult] = useState<{ faturamentoNecessario: number } | null>(null);

  // ----------------------------------------------------------
  // STATE: Mentee sliders (what-if)
  // ----------------------------------------------------------
  const [sliderConsultas, setSliderConsultas] = useState(0);
  const [sliderPreco, setSliderPreco] = useState(0);
  const [sliderCusto, setSliderCusto] = useState(0);

  // ----------------------------------------------------------
  // STATE: Loading / saving
  // ----------------------------------------------------------
  const [isLoaded, setIsLoaded] = useState(false);

  // ----------------------------------------------------------
  // TRPC: Load data (hooks always called, enabled flag controls execution)
  // ----------------------------------------------------------
  const mentorQuery = trpc.mentor.getSimulationData.useQuery(
    { menteeId },
    { enabled: mode === "mentor" }
  );
  const menteeQuery = trpc.portal.getMySimulation.useQuery(
    undefined,
    { enabled: mode === "mentee" }
  );
  const loadQuery = mode === "mentor" ? mentorQuery : menteeQuery;

  const saveMutation = trpc.mentor.saveSimulationData.useMutation({
    onSuccess: () => toast.success("Simulacao salva com sucesso!"),
    onError: () => toast.error("Erro ao salvar simulacao"),
  });

  // Mentee: store the pre-calculated base result from server
  const [menteeBaseResult, setMenteeBaseResult] = useState<SimulationResult | null>(null);

  // Load data when available
  useEffect(() => {
    if (loadQuery.data && !isLoaded) {
      const d = loadQuery.data as any;
      if (mode === "mentor") {
        // Mentor: data = { servicos, mixAtendimentos, params }
        if (d.params) {
          setCustoFixoTotal(d.params.custoFixoTotal ?? 15000);
          setImpostoDefault(12.5); // stored as combined, default split
          setTaxaCartaoDefault(5);
          setTaxaSalaHora(d.params.taxaSalaHora ?? 180);
          setHorasDisponiveis(d.params.horasDisponiveisMes ?? 128);
          setHorasOcupadas(d.params.horasOcupadasMes ?? 80);
        }
        if (d.servicos?.length) setServicos(d.servicos);
        if (d.mixAtendimentos) setMixAtendimentos(d.mixAtendimentos);
      } else {
        // Mentee: data = { result, baseParams }
        if (d.result) setMenteeBaseResult(d.result as SimulationResult);
        if (d.baseParams) {
          setCustoFixoTotal(d.baseParams.custoFixoTotal ?? 15000);
          setHorasDisponiveis(d.baseParams.horasDisponiveisMes ?? 128);
          setHorasOcupadas(d.baseParams.horasOcupadasMes ?? 80);
        }
        // Populate services from result for display
        if (d.result?.porServico) {
          const srvcs: Service[] = d.result.porServico.map((sr: any) => ({
            id: sr.serviceId,
            nome: sr.nome,
            duracaoHoras: sr.horasNecessarias / (sr.quantidade || 1),
            precoVenda: sr.faturamentoBruto / (sr.quantidade || 1),
            impostoPercent: 12.5,
            taxaCartaoPercent: 5,
            mod: sr.mod / (sr.quantidade || 1),
            matMed: sr.matMed / (sr.quantidade || 1),
            bonusPercent: 0,
            taxaEquipamento: sr.taxaEquipamento / (sr.quantidade || 1),
          }));
          setServicos(srvcs);
          const mix: Record<string, number> = {};
          for (const sr of d.result.porServico) {
            mix[sr.serviceId] = sr.quantidade;
          }
          setMixAtendimentos(mix);
        }
      }
      setIsLoaded(true);
    }
  }, [loadQuery.data, isLoaded, mode]);

  // ----------------------------------------------------------
  // AUTO-SAVE (mentor, debounced)
  // ----------------------------------------------------------
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debouncedSave = useCallback(() => {
    if (mode !== "mentor") return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveMutation.mutate({
        menteeId,
        servicos,
        mixAtendimentos,
        params: {
          custoFixoTotal,
          custosVariaveisPercent: impostoDefault + taxaCartaoDefault,
          taxaSalaHora,
          horasDisponiveisMes: horasDisponiveis,
          horasOcupadasMes: horasOcupadas,
          faturamentoMensal: 0,
        },
      });
    }, 2000);
  }, [
    mode, menteeId,
    custoFixoTotal, impostoDefault, taxaCartaoDefault, taxaSalaHora,
    horasDisponiveis, horasOcupadas, servicos, mixAtendimentos,
  ]);

  // Trigger auto-save on param changes (only mentor, skip if no valid services)
  useEffect(() => {
    if (mode === "mentor" && isLoaded) {
      // Only auto-save if there are services with prices filled
      const hasValidServices = servicos.some(s => s.precoVenda > 0);
      if (hasValidServices) {
        debouncedSave();
      }
    }
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [
    custoFixoTotal, impostoDefault, taxaCartaoDefault, taxaSalaHora,
    horasDisponiveis, horasOcupadas, servicos, mixAtendimentos,
    mode, isLoaded, debouncedSave,
  ]);

  // ----------------------------------------------------------
  // CALCULATION (real-time, client-side)
  // ----------------------------------------------------------
  const simulationParams = useMemo<SimulationParams>(() => {
    let adjustedServicos = servicos;
    let adjustedMix = { ...mixAtendimentos };
    let adjustedCustoFixo = custoFixoTotal;

    if (mode === "mentee") {
      // Apply slider adjustments
      // Consultas slider: adds/removes quantity proportionally to all services
      if (sliderConsultas !== 0) {
        adjustedMix = { ...mixAtendimentos };
        for (const key of Object.keys(adjustedMix)) {
          adjustedMix[key] = Math.max(0, Math.round(adjustedMix[key] + sliderConsultas * (adjustedMix[key] / totalQty())));
        }
      }
      // Preco slider: adjust all prices by %
      if (sliderPreco !== 0) {
        adjustedServicos = servicos.map((s) => ({
          ...s,
          precoVenda: s.precoVenda * (1 + sliderPreco / 100),
        }));
      }
      // Custo slider: reduce fixed costs
      if (sliderCusto !== 0) {
        adjustedCustoFixo = custoFixoTotal * (1 + sliderCusto / 100);
      }
    }

    return {
      custoFixoTotal: adjustedCustoFixo,
      custosVariaveisPercent: impostoDefault + taxaCartaoDefault,
      taxaSalaHora,
      horasDisponiveisMes: horasDisponiveis,
      horasOcupadasMes: horasOcupadas,
      faturamentoMensal: 0,
      servicos: adjustedServicos,
      mixAtendimentos: adjustedMix,
    };
  }, [
    servicos, mixAtendimentos, custoFixoTotal, impostoDefault, taxaCartaoDefault,
    taxaSalaHora, horasDisponiveis, horasOcupadas,
    mode, sliderConsultas, sliderPreco, sliderCusto,
  ]);

  const result = useMemo<SimulationResult>(() => {
    return calculateSimulation(simulationParams);
  }, [simulationParams]);

  // Helper: total quantity of services
  function totalQty(): number {
    return Object.values(mixAtendimentos).reduce((s, v) => s + v, 0) || 1;
  }

  // ----------------------------------------------------------
  // SERVICE TABLE HANDLERS (mentor only)
  // ----------------------------------------------------------
  const updateService = useCallback((id: string, field: keyof Service, value: string | number) => {
    setServicos((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  }, []);

  const updateMix = useCallback((id: string, qty: number) => {
    setMixAtendimentos((prev) => ({ ...prev, [id]: Math.max(0, qty) }));
  }, []);

  const addService = useCallback(() => {
    const newId = generateServiceId();
    setServicos((prev) => [
      ...prev,
      {
        id: newId,
        nome: "Novo Servico",
        duracaoHoras: 1,
        precoVenda: 0,
        impostoPercent: impostoDefault,
        taxaCartaoPercent: taxaCartaoDefault,
        mod: 0,
        matMed: 0,
        bonusPercent: 0,
        taxaEquipamento: 0,
      },
    ]);
    setMixAtendimentos((prev) => ({ ...prev, [newId]: 0 }));
  }, [impostoDefault, taxaCartaoDefault]);

  const removeService = useCallback((id: string) => {
    setServicos((prev) => prev.filter((s) => s.id !== id));
    setMixAtendimentos((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  // ----------------------------------------------------------
  // META CALCULATOR
  // ----------------------------------------------------------
  const handleCalcMeta = useCallback(() => {
    const avgVarPercent = result.faturamentoBrutoTotal > 0
      ? (result.custosVariaveisTotal / result.faturamentoBrutoTotal) * 100
      : impostoDefault + taxaCartaoDefault;
    const r = calculateTarget(custoFixoTotal, avgVarPercent, metaLucro);
    setMetaResult(r);
  }, [metaLucro, custoFixoTotal, result, impostoDefault, taxaCartaoDefault]);

  // ----------------------------------------------------------
  // MANUAL SAVE
  // ----------------------------------------------------------
  const handleSave = useCallback(() => {
    if (mode !== "mentor") return;
    saveMutation.mutate({
      menteeId,
      servicos,
      mixAtendimentos,
      params: {
        custoFixoTotal,
        custosVariaveisPercent: impostoDefault + taxaCartaoDefault,
        taxaSalaHora,
        horasDisponiveisMes: horasDisponiveis,
        horasOcupadasMes: horasOcupadas,
        faturamentoMensal: 0,
      },
    });
  }, [
    menteeId, mode, custoFixoTotal, impostoDefault, taxaCartaoDefault,
    taxaSalaHora, horasDisponiveis, horasOcupadas, servicos, mixAtendimentos,
  ]);

  // ----------------------------------------------------------
  // LOADING
  // ----------------------------------------------------------
  if (loadQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Carregando simulacao...</span>
      </div>
    );
  }

  // ----------------------------------------------------------
  // RENDER
  // ----------------------------------------------------------
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#1e3a5f]" />
            Simulador de Cenarios
          </h2>
          <p className="text-sm text-muted-foreground">
            {mode === "mentor"
              ? "Configure servicos e parametros para simular cenarios financeiros"
              : "Explore cenarios ajustando os parametros abaixo"}
          </p>
        </div>
        {mode === "mentor" && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(`/api/excel/${menteeId}/pricing`, "_blank")}
            >
              <FileSpreadsheet className="w-4 h-4 mr-1.5" />
              Exportar Excel
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(`/api/pdf/pilar-conclusoes/${menteeId}/3`, "_blank")}
            >
              <Download className="w-4 h-4 mr-1.5" />
              Exportar PDF
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className="bg-[#1e3a5f] hover:bg-[#152d4a]"
            >
              {saveMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-1.5" />
              )}
              Salvar Simulacao
            </Button>
          </div>
        )}
      </div>

      {/* ============================== */}
      {/* SECAO 1: PARAMETROS GLOBAIS    */}
      {/* ============================== */}
      <GlobalParamsSection
        custoFixoTotal={custoFixoTotal}
        impostoDefault={impostoDefault}
        taxaCartaoDefault={taxaCartaoDefault}
        taxaSalaHora={taxaSalaHora}
        horasDisponiveis={horasDisponiveis}
        horasOcupadas={horasOcupadas}
        outrasReceitas={outrasReceitas}
        editable={mode === "mentor"}
        onCustoFixoChange={setCustoFixoTotal}
        onImpostoChange={setImpostoDefault}
        onTaxaCartaoChange={setTaxaCartaoDefault}
        onTaxaSalaHoraChange={setTaxaSalaHora}
        onHorasDisponiveisChange={setHorasDisponiveis}
        onHorasOcupadasChange={setHorasOcupadas}
        onOutrasReceitasChange={setOutrasReceitas}
      />

      {/* ============================== */}
      {/* SECAO 2: TABELA DE SERVICOS    */}
      {/* ============================== */}
      <ServiceTable
        servicos={servicos}
        mixAtendimentos={mixAtendimentos}
        taxaSalaHora={taxaSalaHora}
        result={result}
        editable={mode === "mentor"}
        onUpdateService={updateService}
        onUpdateMix={updateMix}
        onAddService={addService}
        onRemoveService={removeService}
      />

      {/* ============================== */}
      {/* MENTEE: SLIDERS WHAT-IF        */}
      {/* ============================== */}
      {mode === "mentee" && (
        <WhatIfSliders
          sliderConsultas={sliderConsultas}
          sliderPreco={sliderPreco}
          sliderCusto={sliderCusto}
          onConsultasChange={setSliderConsultas}
          onPrecoChange={setSliderPreco}
          onCustoChange={setSliderCusto}
        />
      )}

      {/* ============================== */}
      {/* SECAO 3: DASHBOARD KPIs        */}
      {/* ============================== */}
      <KpiCards result={result} outrasReceitas={outrasReceitas} />

      {/* Detalhamento do cálculo */}
      <Card className="border-blue-200 bg-blue-50/30">
        <CardContent className="pt-4 pb-3">
          <h4 className="text-xs font-semibold text-blue-800 uppercase tracking-wide mb-3">Como chegamos neste resultado</h4>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-foreground font-medium">Faturamento Bruto</span>
              <span className="font-semibold text-foreground">{formatBRL(result.faturamentoBrutoTotal)}</span>
            </div>
            {result.porServico.reduce((s, r) => s + r.imposto, 0) > 0 && (
              <div className="flex justify-between text-red-600">
                <span>- Impostos ({result.porServico[0] ? ((result.porServico[0].imposto / result.porServico[0].faturamentoBruto) * 100).toFixed(0) + "%" : ""})</span>
                <span>-{formatBRL(result.porServico.reduce((s, r) => s + r.imposto, 0))}</span>
              </div>
            )}
            {result.porServico.reduce((s, r) => s + r.taxaCartao, 0) > 0 && (
              <div className="flex justify-between text-red-600">
                <span>- Taxa Cartao</span>
                <span>-{formatBRL(result.porServico.reduce((s, r) => s + r.taxaCartao, 0))}</span>
              </div>
            )}
            {result.porServico.reduce((s, r) => s + r.mod + r.matMed + r.bonus + r.taxaEquipamento, 0) > 0 && (
              <div className="flex justify-between text-red-600">
                <span>- Custos diretos (MOD + materiais + bonus + equip)</span>
                <span>-{formatBRL(result.porServico.reduce((s, r) => s + r.mod + r.matMed + r.bonus + r.taxaEquipamento, 0))}</span>
              </div>
            )}
            {result.porServico.reduce((s, r) => s + r.taxaSala, 0) > 0 && (
              <div className="flex justify-between text-red-600">
                <span>- Taxa de Sala ({formatBRL(result.porServico[0]?.taxaSala / (result.porServico[0]?.quantidade || 1))}/consulta)</span>
                <span>-{formatBRL(result.porServico.reduce((s, r) => s + r.taxaSala, 0))}</span>
              </div>
            )}
            <div className="flex justify-between text-red-600">
              <span>- Custo Fixo Mensal</span>
              <span>-{formatBRL(result.custoFixoTotal)}</span>
            </div>
            {outrasReceitas > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>+ Outras Receitas</span>
                <span>+{formatBRL(outrasReceitas)}</span>
              </div>
            )}
            <div className="border-t border-blue-200 pt-1.5 mt-1.5 flex justify-between font-bold">
              <span className={result.lucroLiquido + outrasReceitas >= 0 ? "text-emerald-700" : "text-red-700"}>
                = LUCRO LIQUIDO
              </span>
              <span className={result.lucroLiquido + outrasReceitas >= 0 ? "text-emerald-700" : "text-red-700"}>
                {formatBRL(result.lucroLiquido + outrasReceitas)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ============================== */}
      {/* SECAO 4: MODO META             */}
      {/* ============================== */}
      {mode === "mentor" && (
        <MetaCalculator
          metaLucro={metaLucro}
          metaResult={metaResult}
          result={result}
          custoFixoTotal={custoFixoTotal}
          onMetaLucroChange={setMetaLucro}
          onCalculate={handleCalcMeta}
        />
      )}
    </div>
  );
}

// ============================================================
// SUB-COMPONENT: GlobalParamsSection
// ============================================================
function GlobalParamsSection({
  custoFixoTotal,
  impostoDefault,
  taxaCartaoDefault,
  taxaSalaHora,
  horasDisponiveis,
  horasOcupadas,
  outrasReceitas,
  editable,
  onCustoFixoChange,
  onImpostoChange,
  onTaxaCartaoChange,
  onTaxaSalaHoraChange,
  onHorasDisponiveisChange,
  onHorasOcupadasChange,
  onOutrasReceitasChange,
}: {
  custoFixoTotal: number;
  impostoDefault: number;
  taxaCartaoDefault: number;
  taxaSalaHora: number;
  horasDisponiveis: number;
  horasOcupadas: number;
  outrasReceitas: number;
  editable: boolean;
  onCustoFixoChange: (v: number) => void;
  onImpostoChange: (v: number) => void;
  onTaxaCartaoChange: (v: number) => void;
  onTaxaSalaHoraChange: (v: number) => void;
  onHorasDisponiveisChange: (v: number) => void;
  onHorasOcupadasChange: (v: number) => void;
  onOutrasReceitasChange: (v: number) => void;
}) {
  const params = [
    {
      label: "Custo Fixo Total (R$)",
      value: custoFixoTotal,
      onChange: onCustoFixoChange,
      icon: <DollarSign className="w-4 h-4 text-[#1e3a5f]" />,
      step: 100,
    },
    {
      label: "Impostos (%)",
      value: impostoDefault,
      onChange: onImpostoChange,
      icon: <Percent className="w-4 h-4 text-[#1e3a5f]" />,
      step: 0.5,
    },
    {
      label: "Taxa Cartao (%)",
      value: taxaCartaoDefault,
      onChange: onTaxaCartaoChange,
      icon: <Percent className="w-4 h-4 text-[#1e3a5f]" />,
      step: 0.5,
    },
    {
      label: "Taxa Sala/Hora (R$)",
      value: taxaSalaHora,
      onChange: onTaxaSalaHoraChange,
      icon: <DollarSign className="w-4 h-4 text-[#1e3a5f]" />,
      step: 10,
    },
    {
      label: "Horas Disponiveis/Mes",
      value: horasDisponiveis,
      onChange: onHorasDisponiveisChange,
      icon: <Clock className="w-4 h-4 text-[#1e3a5f]" />,
      step: 1,
    },
    {
      label: "Horas Ocupadas/Mes",
      value: horasOcupadas,
      onChange: onHorasOcupadasChange,
      icon: <Clock className="w-4 h-4 text-[#1e3a5f]" />,
      step: 1,
    },
    {
      label: "Outras Receitas (R$/Mes)",
      value: outrasReceitas,
      onChange: onOutrasReceitasChange,
      icon: <DollarSign className="w-4 h-4 text-[#1e3a5f]" />,
      step: 500,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {params.map((p) => (
        <Card key={p.label} className={`py-3 ${!editable ? "bg-muted/30" : "border-[#1e3a5f]/20"}`}>
          <CardContent className="px-3 py-0">
            <div className="flex items-center gap-1.5 mb-1.5">
              {p.icon}
              <span className="text-xs text-muted-foreground font-medium truncate">
                {p.label}
              </span>
            </div>
            {editable ? (
              <Input
                type="number"
                value={p.value}
                step={p.step}
                onChange={(e) => p.onChange(parseFloat(e.target.value) || 0)}
                className="h-8 text-sm font-semibold text-[#1e3a5f]"
              />
            ) : (
              <p className="text-lg font-bold text-muted-foreground truncate">
                {p.label.includes("R$")
                  ? formatBRL(p.value)
                  : p.label.includes("%")
                    ? formatPercent(p.value)
                    : p.value}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ============================================================
// SUB-COMPONENT: ServiceTable
// ============================================================
function ServiceTable({
  servicos,
  mixAtendimentos,
  taxaSalaHora,
  result,
  editable,
  onUpdateService,
  onUpdateMix,
  onAddService,
  onRemoveService,
}: {
  servicos: Service[];
  mixAtendimentos: Record<string, number>;
  taxaSalaHora: number;
  result: SimulationResult;
  editable: boolean;
  onUpdateService: (id: string, field: keyof Service, value: string | number) => void;
  onUpdateMix: (id: string, qty: number) => void;
  onAddService: () => void;
  onRemoveService: (id: string) => void;
}) {
  // Get per-service results for display
  const serviceResults = useMemo(() => {
    const map: Record<string, { lucroBruto: number; margemBruta: number; lucroOperacional: number; margemOperacional: number; taxaSala: number }> = {};
    for (const sr of result.porServico) {
      map[sr.serviceId] = { lucroBruto: sr.lucroBruto, margemBruta: sr.margemBruta, lucroOperacional: sr.lucroOperacional, margemOperacional: sr.margemOperacional, taxaSala: sr.taxaSala };
    }
    return map;
  }, [result]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Tabela de Servicos</CardTitle>
            <CardDescription>
              {editable
                ? "Edite servicos, precos e quantidades para simular cenarios"
                : "Servicos configurados pelo mentor"}
            </CardDescription>
          </div>
          {editable && (
            <Button size="sm" variant="outline" onClick={onAddService}>
              <Plus className="w-4 h-4 mr-1.5" />
              Adicionar Servico
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#1e3a5f]/5">
                <TableHead className="min-w-[140px]">Servico</TableHead>
                <TableHead className="text-center min-w-[70px]">Duracao(h)</TableHead>
                <TableHead className="text-right min-w-[90px]">Preco(R$)</TableHead>
                <TableHead className="text-center min-w-[80px]">Freq.</TableHead>
                <TableHead className="text-center min-w-[70px]">Imposto%</TableHead>
                <TableHead className="text-center min-w-[70px]">Cartao%</TableHead>
                <TableHead className="text-right min-w-[80px]">MOD(R$)</TableHead>
                <TableHead className="text-right min-w-[90px]">Mat/Med(R$)</TableHead>
                <TableHead className="text-center min-w-[70px]">Bonus%</TableHead>
                <TableHead className="text-right min-w-[80px]">Equip(R$)</TableHead>
                <TableHead className="text-center min-w-[70px]">Qtd/Mes</TableHead>
                <TableHead className="text-right min-w-[100px]">Lucro/Consulta</TableHead>
                <TableHead className="text-right min-w-[100px]">Lucro/Mes</TableHead>
                <TableHead className="text-center min-w-[70px]">Margem%</TableHead>
                {editable && <TableHead className="w-[50px]"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {servicos.map((s) => {
                const qty = mixAtendimentos[s.id] ?? 0;
                const sr = serviceResults[s.id];
                return (
                  <TableRow key={s.id}>
                    {/* Nome */}
                    <TableCell>
                      {editable ? (
                        <Input
                          value={s.nome}
                          onChange={(e) => onUpdateService(s.id, "nome", e.target.value)}
                          className="h-7 text-xs min-w-[120px]"
                        />
                      ) : (
                        <span className="text-sm font-medium">{s.nome}</span>
                      )}
                    </TableCell>
                    {/* Duracao */}
                    <TableCell className="text-center">
                      {editable ? (
                        <Input
                          type="number"
                          value={s.duracaoHoras}
                          step={0.5}
                          onChange={(e) =>
                            onUpdateService(s.id, "duracaoHoras", parseFloat(e.target.value) || 0)
                          }
                          className="h-7 text-xs text-center w-16 mx-auto"
                        />
                      ) : (
                        <span className="text-sm">{s.duracaoHoras}</span>
                      )}
                    </TableCell>
                    {/* Preco */}
                    <TableCell className="text-right">
                      {editable ? (
                        <Input
                          type="number"
                          value={s.precoVenda}
                          step={50}
                          onChange={(e) =>
                            onUpdateService(s.id, "precoVenda", parseFloat(e.target.value) || 0)
                          }
                          className="h-7 text-xs text-right w-20 ml-auto"
                        />
                      ) : (
                        <span className="text-sm">{formatBRL(s.precoVenda)}</span>
                      )}
                    </TableCell>
                    {/* Frequencia */}
                    <TableCell className="text-center">
                      {editable ? (
                        <select
                          value={s.frequencia || "mensal"}
                          onChange={(e) =>
                            onUpdateService(s.id, "frequencia", e.target.value)
                          }
                          className="h-7 text-xs text-center w-20 mx-auto rounded border px-1"
                        >
                          <option value="mensal">Mensal</option>
                          <option value="trimestral">Trim.</option>
                          <option value="semestral">Sem.</option>
                        </select>
                      ) : (
                        <span className="text-xs">
                          {s.frequencia === "trimestral" ? "Trim." : s.frequencia === "semestral" ? "Sem." : "Mensal"}
                        </span>
                      )}
                    </TableCell>
                    {/* Imposto */}
                    <TableCell className="text-center">
                      {editable ? (
                        <Input
                          type="number"
                          value={s.impostoPercent}
                          step={0.5}
                          onChange={(e) =>
                            onUpdateService(s.id, "impostoPercent", parseFloat(e.target.value) || 0)
                          }
                          className="h-7 text-xs text-center w-16 mx-auto"
                        />
                      ) : (
                        <span className="text-sm">{formatPercent(s.impostoPercent)}</span>
                      )}
                    </TableCell>
                    {/* Cartao */}
                    <TableCell className="text-center">
                      {editable ? (
                        <Input
                          type="number"
                          value={s.taxaCartaoPercent}
                          step={0.5}
                          onChange={(e) =>
                            onUpdateService(s.id, "taxaCartaoPercent", parseFloat(e.target.value) || 0)
                          }
                          className="h-7 text-xs text-center w-16 mx-auto"
                        />
                      ) : (
                        <span className="text-sm">{formatPercent(s.taxaCartaoPercent)}</span>
                      )}
                    </TableCell>
                    {/* MOD */}
                    <TableCell className="text-right">
                      {editable ? (
                        <Input
                          type="number"
                          value={s.mod}
                          step={10}
                          onChange={(e) =>
                            onUpdateService(s.id, "mod", parseFloat(e.target.value) || 0)
                          }
                          className="h-7 text-xs text-right w-20 ml-auto"
                        />
                      ) : (
                        <span className="text-sm">{formatBRL(s.mod)}</span>
                      )}
                    </TableCell>
                    {/* MatMed */}
                    <TableCell className="text-right">
                      {editable ? (
                        <Input
                          type="number"
                          value={s.matMed}
                          step={10}
                          onChange={(e) =>
                            onUpdateService(s.id, "matMed", parseFloat(e.target.value) || 0)
                          }
                          className="h-7 text-xs text-right w-20 ml-auto"
                        />
                      ) : (
                        <span className="text-sm">{formatBRL(s.matMed)}</span>
                      )}
                    </TableCell>
                    {/* Bonus */}
                    <TableCell className="text-center">
                      {editable ? (
                        <Input
                          type="number"
                          value={s.bonusPercent}
                          step={0.5}
                          onChange={(e) =>
                            onUpdateService(s.id, "bonusPercent", parseFloat(e.target.value) || 0)
                          }
                          className="h-7 text-xs text-center w-16 mx-auto"
                        />
                      ) : (
                        <span className="text-sm">{formatPercent(s.bonusPercent)}</span>
                      )}
                    </TableCell>
                    {/* Equipamento */}
                    <TableCell className="text-right">
                      {editable ? (
                        <Input
                          type="number"
                          value={s.taxaEquipamento}
                          step={10}
                          onChange={(e) =>
                            onUpdateService(s.id, "taxaEquipamento", parseFloat(e.target.value) || 0)
                          }
                          className="h-7 text-xs text-right w-20 ml-auto"
                        />
                      ) : (
                        <span className="text-sm">{formatBRL(s.taxaEquipamento)}</span>
                      )}
                    </TableCell>
                    {/* Qtd/Mes */}
                    <TableCell className="text-center">
                      {editable ? (
                        <Input
                          type="number"
                          value={qty}
                          step={1}
                          onChange={(e) => onUpdateMix(s.id, parseInt(e.target.value) || 0)}
                          className="h-7 text-xs text-center w-16 mx-auto font-semibold"
                        />
                      ) : (
                        <span className="text-sm font-semibold">{qty}</span>
                      )}
                    </TableCell>
                    {/* Lucro por consulta — inclui taxa de sala */}
                    <TableCell className="text-right">
                      <span className={`text-sm font-semibold ${(sr?.lucroOperacional ?? 0) >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                        {sr && qty > 0 ? formatBRL(sr.lucroOperacional / qty) : "-"}
                      </span>
                    </TableCell>
                    {/* Lucro mensal — inclui taxa de sala */}
                    <TableCell className="text-right">
                      <span className={`text-sm font-semibold ${(sr?.lucroOperacional ?? 0) >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                        {sr ? formatBRL(sr.lucroOperacional) : "-"}
                      </span>
                    </TableCell>
                    {/* Margem operacional (inclui taxa de sala) */}
                    <TableCell className="text-center">
                      <Badge
                        variant="secondary"
                        className={`text-xs ${
                          (sr?.margemOperacional ?? 0) >= 50
                            ? "bg-emerald-100 text-emerald-800"
                            : (sr?.margemOperacional ?? 0) >= 30
                              ? "bg-amber-100 text-amber-800"
                              : "bg-red-100 text-red-800"
                        }`}
                      >
                        {sr ? formatPercent(sr.margemOperacional) : "-"}
                      </Badge>
                    </TableCell>
                    {/* Remove */}
                    {editable && (
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => onRemoveService(s.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
            <TableFooter>
              <TableRow className="bg-[#1e3a5f]/5">
                <TableCell colSpan={10} className="font-bold text-foreground">
                  Total
                </TableCell>
                <TableCell className="text-center font-bold">
                  {Object.values(mixAtendimentos).reduce((s, v) => s + v, 0)}
                </TableCell>
                <TableCell className="text-right font-bold text-muted-foreground text-xs">
                  —
                </TableCell>
                <TableCell className="text-right font-bold text-emerald-700">
                  {formatBRL(result.porServico.reduce((s, r) => s + r.lucroOperacional, 0))}
                </TableCell>
                <TableCell className="text-center font-bold">
                  {result.faturamentoBrutoTotal > 0
                    ? formatPercent(
                        (result.porServico.reduce((s, r) => s + r.lucroOperacional, 0) /
                          result.faturamentoBrutoTotal) *
                          100
                      )
                    : "-"}
                </TableCell>
                {editable && <TableCell></TableCell>}
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================
// SUB-COMPONENT: WhatIfSliders (mentee only)
// ============================================================
function WhatIfSliders({
  sliderConsultas,
  sliderPreco,
  sliderCusto,
  onConsultasChange,
  onPrecoChange,
  onCustoChange,
}: {
  sliderConsultas: number;
  sliderPreco: number;
  sliderCusto: number;
  onConsultasChange: (v: number) => void;
  onPrecoChange: (v: number) => void;
  onCustoChange: (v: number) => void;
}) {
  return (
    <Card className="border-[#c4a052]/30 bg-[#faf7f0]">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <SlidersHorizontal className="w-5 h-5 text-[#c4a052]" />
          Simulacao What-If
        </CardTitle>
        <CardDescription>
          Ajuste os parametros abaixo para explorar diferentes cenarios
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Slider: Consultas */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-foreground">
                E se eu atendesse mais/menos?
              </label>
              <Badge variant="secondary" className="bg-[#1e3a5f]/10 text-[#1e3a5f]">
                {sliderConsultas >= 0 ? `+${sliderConsultas}` : sliderConsultas} consultas
              </Badge>
            </div>
            <Slider
              value={[sliderConsultas]}
              min={-20}
              max={50}
              step={1}
              onValueChange={(v) => onConsultasChange(v[0])}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>-20</span>
              <span>0</span>
              <span>+50</span>
            </div>
          </div>

          {/* Slider: Preco */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-foreground">
                E se eu aumentasse o preco?
              </label>
              <Badge variant="secondary" className="bg-[#1e3a5f]/10 text-[#1e3a5f]">
                {sliderPreco >= 0 ? `+${sliderPreco}` : sliderPreco}%
              </Badge>
            </div>
            <Slider
              value={[sliderPreco]}
              min={-20}
              max={50}
              step={1}
              onValueChange={(v) => onPrecoChange(v[0])}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>-20%</span>
              <span>0%</span>
              <span>+50%</span>
            </div>
          </div>

          {/* Slider: Custos */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-foreground">
                E se eu reduzisse custos fixos?
              </label>
              <Badge variant="secondary" className="bg-[#1e3a5f]/10 text-[#1e3a5f]">
                {sliderCusto}%
              </Badge>
            </div>
            <Slider
              value={[sliderCusto]}
              min={-30}
              max={0}
              step={1}
              onValueChange={(v) => onCustoChange(v[0])}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>-30%</span>
              <span>-15%</span>
              <span>0%</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================
// SUB-COMPONENT: KpiCards
// ============================================================
function KpiCards({ result, outrasReceitas = 0 }: { result: SimulationResult; outrasReceitas?: number }) {
  const lucroTotal = result.lucroLiquido + outrasReceitas;
  const receitaTotal = result.faturamentoBrutoTotal + outrasReceitas;
  const margemTotal = receitaTotal > 0 ? (lucroTotal / receitaTotal) * 100 : 0;
  const kpis = [
    {
      title: "Faturamento Bruto",
      value: formatBRL(receitaTotal),
      icon: <DollarSign className="w-4 h-4" />,
      variant: "neutral" as const,
    },
    {
      title: "Lucro Liquido",
      value: formatBRL(lucroTotal),
      icon: <TrendingUp className="w-4 h-4" />,
      variant: lucroTotal >= 0 ? ("success" as const) : ("danger" as const),
    },
    {
      title: "Margem Liquida",
      value: formatPercent(margemTotal),
      icon: <Percent className="w-4 h-4" />,
      variant: result.margemLiquida >= 40 ? ("success" as const) : result.margemLiquida >= 20 ? ("neutral" as const) : ("danger" as const),
    },
    {
      title: "Custo/Hora (mensal)",
      value: `${formatBRL(result.custoHora)}/h`,
      icon: <Clock className="w-4 h-4" />,
      variant: "neutral" as const,
    },
    {
      title: "Ponto Equilibrio",
      value: formatBRL(result.pontoEquilibrio),
      icon: <Target className="w-4 h-4" />,
      variant: result.faturamentoBrutoTotal >= result.pontoEquilibrio ? ("success" as const) : ("danger" as const),
    },
  ];

  const variantStyles = {
    neutral: "border-border",
    success: "border-emerald-200 bg-emerald-50/30",
    danger: "border-red-200 bg-red-50/30",
  };

  const valueColor = {
    neutral: "text-foreground",
    success: "text-emerald-700",
    danger: "text-red-700",
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        Resultados da Simulacao
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {kpis.map((kpi) => (
          <Card key={kpi.title} className={`py-4 ${variantStyles[kpi.variant]}`}>
            <CardContent className="px-4 py-0">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-muted-foreground">{kpi.icon}</span>
                <span className="text-xs text-muted-foreground font-medium truncate">
                  {kpi.title}
                </span>
              </div>
              <p className={`text-lg font-bold ${valueColor[kpi.variant]} truncate`}>
                {kpi.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Carga Horaria card */}
      <Card
        className={`py-4 ${
          result.cargaHorariaNecessaria <= result.horasDisponiveis
            ? "border-emerald-200 bg-emerald-50/30"
            : "border-red-200 bg-red-50/30"
        }`}
      >
        <CardContent className="px-4 py-0">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#1e3a5f]" />
            <div>
              <p className="text-sm font-semibold text-foreground">
                Carga Horaria: {result.cargaHorariaNecessaria.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}h
                necessarias de {result.horasDisponiveis}h disponiveis
              </p>
              <p className="text-xs text-muted-foreground">
                {result.cargaHorariaNecessaria <= result.horasDisponiveis
                  ? `Sobram ${(result.horasDisponiveis - result.cargaHorariaNecessaria).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}h de margem`
                  : `Excede em ${(result.cargaHorariaNecessaria - result.horasDisponiveis).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}h — necessario ajustar mix ou horas`}
              </p>
            </div>
          </div>
          {/* Progress bar */}
          <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                result.cargaHorariaNecessaria <= result.horasDisponiveis
                  ? "bg-emerald-500"
                  : "bg-red-500"
              }`}
              style={{
                width: `${Math.min(100, (result.cargaHorariaNecessaria / result.horasDisponiveis) * 100)}%`,
              }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// SUB-COMPONENT: MetaCalculator
// ============================================================
function MetaCalculator({
  metaLucro,
  metaResult,
  result,
  custoFixoTotal,
  onMetaLucroChange,
  onCalculate,
}: {
  metaLucro: number;
  metaResult: { faturamentoNecessario: number } | null;
  result: SimulationResult;
  custoFixoTotal: number;
  onMetaLucroChange: (v: number) => void;
  onCalculate: () => void;
}) {
  // Calculate suggested proportional scaling
  const suggestedMix = useMemo(() => {
    if (!metaResult || result.faturamentoBrutoTotal <= 0) return null;
    const scaleFactor = metaResult.faturamentoNecessario / result.faturamentoBrutoTotal;
    return result.porServico.map((sr) => ({
      nome: sr.nome,
      quantidadeAtual: sr.quantidade,
      quantidadeSugerida: Math.ceil(sr.quantidade * scaleFactor),
    }));
  }, [metaResult, result]);

  return (
    <Card className="border-[#c4a052]/30">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Calculator className="w-5 h-5 text-[#c4a052]" />
          Modo Meta
        </CardTitle>
        <CardDescription>
          Defina sua meta de lucro liquido e descubra o faturamento necessario
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-3 items-end">
          <div className="flex-1">
            <label className="text-sm font-medium text-foreground mb-1.5 block">
              Qual sua meta de lucro liquido mensal?
            </label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">R$</span>
              <Input
                type="number"
                value={metaLucro}
                step={1000}
                onChange={(e) => onMetaLucroChange(parseFloat(e.target.value) || 0)}
                className="h-9 max-w-[200px] font-semibold"
              />
            </div>
          </div>
          <Button
            onClick={onCalculate}
            className="bg-[#c4a052] hover:bg-[#b3903f] text-white"
          >
            <Calculator className="w-4 h-4 mr-1.5" />
            Calcular
          </Button>
        </div>

        {metaResult && (
          <div className="mt-4 p-4 bg-[#faf7f0] rounded-lg border border-[#c4a052]/20 space-y-3">
            <p className="text-sm text-foreground">
              Para atingir{" "}
              <span className="font-bold text-[#1e3a5f]">{formatBRL(metaLucro)}</span>{" "}
              de lucro liquido, voce precisa faturar{" "}
              <span className="font-bold text-[#c4a052]">
                {formatBRL(metaResult.faturamentoNecessario)}
              </span>{" "}
              brutos por mes.
            </p>

            {suggestedMix && suggestedMix.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Mix Sugerido (proporcional)
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {suggestedMix.map((item) => (
                    <div
                      key={item.nome}
                      className="p-2 bg-white rounded border text-center"
                    >
                      <p className="text-xs text-muted-foreground truncate">{item.nome}</p>
                      <p className="text-sm font-bold text-[#1e3a5f]">
                        {item.quantidadeSugerida}
                        <span className="text-xs font-normal text-muted-foreground">
                          {" "}(atual: {item.quantidadeAtual})
                        </span>
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
