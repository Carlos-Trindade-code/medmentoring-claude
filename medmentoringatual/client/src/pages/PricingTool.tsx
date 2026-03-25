import { useState, useEffect, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ArrowLeft, Plus, Trash2, AlertTriangle, CheckCircle,
  Lightbulb, TrendingUp, Info, DollarSign, Save, HelpCircle,
  ChevronDown, ChevronUp
} from "lucide-react";

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface VariableCost {
  id: string;
  name: string;
  value: number;
  perUnit: "por_consulta" | "por_hora" | "por_procedimento" | "mensal";
  hint: string;
}

interface Service {
  id: string;
  name: string;
  durationMin: number;
  volumeMonth: number; // quantas vezes por mês
  variableCosts: VariableCost[];
  desiredMargin: number; // 0.0 – 1.0
  currentPrice: number; // preço que cobra hoje
  showVariables: boolean;
}

// ─── Catálogo de custos variáveis por tipo de serviço ────────────────────────
const VARIABLE_COST_CATALOG: Record<string, { name: string; hint: string; perUnit: VariableCost["perUnit"] }[]> = {
  "Consulta clínica": [
    { name: "Material descartável (luvas, gazes)", hint: "Custo médio de descartáveis por atendimento.", perUnit: "por_consulta" },
    { name: "Receituário / impressão", hint: "Papel, toner, receitas especiais.", perUnit: "por_consulta" },
    { name: "Café / água para o paciente", hint: "Custo médio de cortesia por paciente.", perUnit: "por_consulta" },
    { name: "Comissão de indicação (se houver)", hint: "% pago ao indicador por cada paciente.", perUnit: "por_consulta" },
    { name: "Taxa de cartão (% sobre valor)", hint: "Percentual cobrado pela maquininha.", perUnit: "por_consulta" },
  ],
  "Procedimento estético": [
    { name: "Insumos do procedimento (ácido, toxina, etc.)", hint: "Custo real do material consumido por procedimento.", perUnit: "por_procedimento" },
    { name: "Descartáveis específicos (agulhas, cânulas)", hint: "Custo por procedimento.", perUnit: "por_procedimento" },
    { name: "Anestésico tópico", hint: "Custo por aplicação.", perUnit: "por_procedimento" },
    { name: "Taxa de cartão", hint: "% cobrado pela maquininha sobre o valor.", perUnit: "por_procedimento" },
    { name: "Comissão de captação / parceria", hint: "% pago ao parceiro que indicou o paciente.", perUnit: "por_procedimento" },
  ],
  "Cirurgia": [
    { name: "Material cirúrgico / OPME", hint: "Custo do material cirúrgico específico.", perUnit: "por_procedimento" },
    { name: "Anestesista (se pago pelo médico)", hint: "Honorário do anestesista quando não cobrado à parte.", perUnit: "por_procedimento" },
    { name: "Instrumentador cirúrgico", hint: "Custo do instrumentador por cirurgia.", perUnit: "por_procedimento" },
    { name: "Descartáveis cirúrgicos", hint: "Fios, campos, luvas cirúrgicas, etc.", perUnit: "por_procedimento" },
    { name: "Taxa de cartão / intermediação", hint: "% cobrado pela operadora ou plano.", perUnit: "por_procedimento" },
  ],
  "Teleconsulta": [
    { name: "Plataforma de telemedicina", hint: "Custo por consulta ou mensalidade rateada.", perUnit: "por_consulta" },
    { name: "Assinatura de prescrição digital", hint: "Custo por receita emitida.", perUnit: "por_consulta" },
    { name: "Comissão da plataforma", hint: "% cobrado pela plataforma sobre cada consulta.", perUnit: "por_consulta" },
  ],
  "Laudo / Exame": [
    { name: "Insumos do exame", hint: "Reagentes, eletrodos, papel de ECG, etc.", perUnit: "por_procedimento" },
    { name: "Manutenção do equipamento (rateio)", hint: "Custo de manutenção dividido pelo volume de exames.", perUnit: "por_procedimento" },
    { name: "Taxa de cartão", hint: "% cobrado pela maquininha.", perUnit: "por_procedimento" },
  ],
};

const PERUNIT_LABELS: Record<VariableCost["perUnit"], string> = {
  por_consulta: "por consulta",
  por_hora: "por hora",
  por_procedimento: "por procedimento",
  mensal: "mensal (rateado)",
};

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtPct = (v: number) => `${(v * 100).toFixed(1)}%`;
const uid = () => Math.random().toString(36).slice(2, 9);

function defaultService(name = "Nova consulta"): Service {
  return {
    id: uid(),
    name,
    durationMin: 30,
    volumeMonth: 20,
    variableCosts: [],
    desiredMargin: 0.40,
    currentPrice: 0,
    showVariables: true,
  };
}

// ─── Perguntas diagnósticas para revelar custo variável ──────────────────────
const DIAGNOSTIC_QUESTIONS = [
  {
    q: "Quanto você gasta em material por consulta — luvas, gazes, descartáveis?",
    why: "A maioria dos médicos não sabe. A resposta revela o custo invisível mais comum.",
    field: "Material descartável",
  },
  {
    q: "Você usa maquininha de cartão? Sabe qual é a taxa que paga por transação?",
    why: "Taxas de 2–4% sobre cada venda são frequentemente ignoradas. Em R$500 de consulta, são R$10–20 que somem.",
    field: "Taxa de cartão",
  },
  {
    q: "Você paga alguém para indicar pacientes? Tem parceria com academia, nutricionista, clínica?",
    why: "Comissões de indicação são custos variáveis que muitos não incluem na precificação.",
    field: "Comissão de indicação",
  },
  {
    q: "Para procedimentos: qual é o custo real do material que você consome por procedimento?",
    why: "Insumos de procedimentos estéticos (toxina, ácido) podem representar 30–60% do preço cobrado.",
    field: "Insumos do procedimento",
  },
  {
    q: "Você oferece café, água, brinde para o paciente? Qual o custo médio por visita?",
    why: "Parece pequeno, mas R$5 por paciente × 100 pacientes/mês = R$500/mês invisíveis.",
    field: "Cortesia ao paciente",
  },
  {
    q: "Você usa plataforma de telemedicina ou agendamento online? Quanto paga por consulta realizada?",
    why: "Plataformas cobram por consulta ou % sobre o valor — custo variável direto.",
    field: "Plataforma digital",
  },
];

export default function PricingTool() {
  const params = useParams<{ menteeId: string }>();
  const menteeId = Number(params.menteeId);
  const [, navigate] = useLocation();

  const [services, setServices] = useState<Service[]>([defaultService("Consulta particular")]);
  const [custoHora, setCustoHora] = useState(0);
  const [faturamento, setFaturamento] = useState(0);
  const [showQuestions, setShowQuestions] = useState(false);
  const [saved, setSaved] = useState(false);

  const { data: menteeData } = trpc.mentor.getMentee.useQuery({ id: menteeId }, { enabled: !!menteeId });
  const { data: financialData } = trpc.mentor.getFinancial.useQuery({ menteeId }, { enabled: !!menteeId });

  useEffect(() => {
    if (financialData) {
      // Tenta carregar custo/hora do diagnóstico financeiro
      if (financialData.despesasJson && Array.isArray(financialData.despesasJson)) {
        try {
          const cats = financialData.despesasJson as { items: { monthly: number }[] }[];
          const total = cats.reduce((s, c) => s + c.items.reduce((ss, i) => ss + (i.monthly || 0), 0), 0);
          if (total > 0) setCustoHora(total / 160); // assume 160h/mês
        } catch { /* ignora */ }
      }
      // Carrega precificação salva
      if (financialData.precificacaoJson && Array.isArray(financialData.precificacaoJson) && (financialData.precificacaoJson as unknown[]).length > 0) {
        try {
          const saved = financialData.precificacaoJson as Service[];
          if (saved[0]?.id) setServices(saved);
        } catch { /* usa padrão */ }
      }
    }
  }, [financialData]);

  const saveFinancial = trpc.mentor.updateFinancial.useMutation({
    onSuccess: () => { setSaved(true); toast.success("Precificação salva!"); },
    onError: () => toast.error("Erro ao salvar"),
  });

  // ─── Cálculos por serviço ────────────────────────────────────────────────────
  const calcService = (s: Service) => {
    const durationHours = s.durationMin / 60;
    const custoFixoPorUnidade = custoHora * durationHours;

    // Custo variável total por unidade
    const custoVariavelPorUnidade = s.variableCosts.reduce((sum, vc) => {
      if (vc.perUnit === "mensal") return sum + (vc.value / Math.max(s.volumeMonth, 1));
      return sum + vc.value;
    }, 0);

    const custoTotalPorUnidade = custoFixoPorUnidade + custoVariavelPorUnidade;
    const precoMinimo = s.desiredMargin < 1 ? custoTotalPorUnidade / (1 - s.desiredMargin) : custoTotalPorUnidade * 2;
    const precoIdeal = precoMinimo * 1.2;
    const faturamentoMes = s.currentPrice > 0 ? s.currentPrice * s.volumeMonth : precoIdeal * s.volumeMonth;
    const margemAtual = s.currentPrice > 0 ? (s.currentPrice - custoTotalPorUnidade) / s.currentPrice : null;
    const dinheiroPerdido = s.currentPrice > 0 && s.currentPrice < precoMinimo
      ? (precoMinimo - s.currentPrice) * s.volumeMonth : 0;

    return {
      custoFixoPorUnidade,
      custoVariavelPorUnidade,
      custoTotalPorUnidade,
      precoMinimo,
      precoIdeal,
      faturamentoMes,
      margemAtual,
      dinheiroPerdido,
    };
  };

  // ─── Totais gerais ────────────────────────────────────────────────────────────
  const totals = useMemo(() => {
    const all = services.map(s => ({ s, c: calcService(s) }));
    const fatTotal = all.reduce((sum, { s, c }) => sum + (s.currentPrice > 0 ? s.currentPrice * s.volumeMonth : c.precoIdeal * s.volumeMonth), 0);
    const perdaTotal = all.reduce((sum, { c }) => sum + c.dinheiroPerdido, 0);
    return { fatTotal, perdaTotal };
  }, [services, custoHora]);

  // ─── Handlers ────────────────────────────────────────────────────────────────
  const addService = () => setServices(prev => [...prev, defaultService()]);
  const removeService = (id: string) => setServices(prev => prev.filter(s => s.id !== id));
  const updateService = (id: string, field: keyof Service, value: unknown) => {
    setServices(prev => prev.map(s => s.id !== id ? s : { ...s, [field]: value }));
    setSaved(false);
  };

  const addVariableCost = (serviceId: string, suggestion?: { name: string; hint: string; perUnit: VariableCost["perUnit"] }) => {
    const vc: VariableCost = {
      id: uid(),
      name: suggestion?.name || "Novo custo variável",
      value: 0,
      perUnit: suggestion?.perUnit || "por_consulta",
      hint: suggestion?.hint || "",
    };
    setServices(prev => prev.map(s => s.id !== serviceId ? s : { ...s, variableCosts: [...s.variableCosts, vc] }));
    setSaved(false);
  };

  const updateVariableCost = (serviceId: string, vcId: string, field: keyof VariableCost, value: string | number) => {
    setServices(prev => prev.map(s => s.id !== serviceId ? s : {
      ...s,
      variableCosts: s.variableCosts.map(vc => vc.id !== vcId ? vc : { ...vc, [field]: field === "value" ? parseFloat(String(value)) || 0 : value })
    }));
    setSaved(false);
  };

  const removeVariableCost = (serviceId: string, vcId: string) => {
    setServices(prev => prev.map(s => s.id !== serviceId ? s : { ...s, variableCosts: s.variableCosts.filter(vc => vc.id !== vcId) }));
    setSaved(false);
  };

  const handleSave = () => {
    saveFinancial.mutate({ menteeId, precificacaoJson: services as unknown as Record<string, unknown>[] });
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      {/* Header */}
      <div className="bg-[#1A3A5C] text-white px-6 py-4 flex items-center gap-4 sticky top-0 z-10">
        <button onClick={() => navigate(`/mentor/mentorado/${menteeId}`)} className="hover:opacity-70 transition-opacity">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-lg font-bold flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#C9A84C]" />
            Precificação por Serviço — Pilar 3
          </h1>
          {menteeData && <p className="text-sm opacity-70">{(menteeData as { nome?: string; name?: string }).nome || (menteeData as { nome?: string; name?: string }).name}</p>}
        </div>
        <div className="ml-auto flex items-center gap-3">
          {saved && <span className="text-green-300 text-sm flex items-center gap-1"><CheckCircle className="w-4 h-4" />Salvo</span>}
          <Button onClick={handleSave} disabled={saveFinancial.isPending}
            className="bg-[#C9A84C] hover:bg-[#B8973B] text-white text-sm">
            <Save className="w-4 h-4 mr-2" />
            {saveFinancial.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">

        {/* Contexto */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-[#C9A84C] flex-shrink-0 mt-0.5" />
            <div>
              <h2 className="font-bold text-[#1A3A5C] mb-1">Como funciona a precificação correta</h2>
              <p className="text-sm text-gray-600">
                O preço mínimo de um serviço deve cobrir <strong>dois tipos de custo</strong>:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="text-xs font-bold text-blue-700 mb-1">📌 Custo Fixo (por unidade)</div>
                  <div className="text-sm text-blue-800">Calculado a partir do custo/hora da operação × duração do serviço. Inclui aluguel, salários, impostos, etc.</div>
                  {custoHora > 0 && <div className="text-sm font-bold text-blue-900 mt-2">Custo/hora atual: {fmt(custoHora)}</div>}
                  {custoHora === 0 && <div className="text-xs text-blue-600 mt-2">⚠️ Preencha o Diagnóstico Financeiro primeiro para calcular automaticamente.</div>}
                </div>
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                  <div className="text-xs font-bold text-orange-700 mb-1">🔄 Custo Variável (por serviço)</div>
                  <div className="text-sm text-orange-800">Custos que existem <em>porque</em> o serviço foi realizado: insumos, taxa de cartão, comissão de indicação, descartáveis específicos.</div>
                  <div className="text-xs text-orange-600 mt-2">Este é o "dinheiro invisível" — a maioria dos médicos não inclui na conta.</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Custo/hora manual se não vier do diagnóstico */}
        {custoHora === 0 && (
          <div className="bg-yellow-50 border border-yellow-300 rounded-xl p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-bold text-yellow-800">Custo/hora não calculado</p>
              <p className="text-xs text-yellow-700">Preencha o Diagnóstico Financeiro para calcular automaticamente, ou insira manualmente:</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-600">R$/h</span>
              <input type="number" value={custoHora || ""}
                onChange={e => setCustoHora(Number(e.target.value))}
                placeholder="Ex: 150"
                className="w-28 border border-yellow-400 rounded-lg px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-yellow-500" />
            </div>
          </div>
        )}

        {/* Perguntas diagnósticas */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <button
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
            onClick={() => setShowQuestions(!showQuestions)}
          >
            <div className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-[#C9A84C]" />
              <span className="font-bold text-[#1A3A5C]">Perguntas para revelar o custo variável oculto</span>
              <Badge variant="outline" className="text-xs border-[#C9A84C] text-[#C9A84C]">{DIAGNOSTIC_QUESTIONS.length} perguntas</Badge>
            </div>
            {showQuestions ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </button>
          {showQuestions && (
            <div className="px-5 pb-5 space-y-3 border-t border-gray-100">
              <p className="text-xs text-gray-500 pt-3">Use estas perguntas durante a sessão para descobrir os custos que o mentorado não mapeou:</p>
              {DIAGNOSTIC_QUESTIONS.map((item, i) => (
                <div key={i} className="border-l-4 border-[#C9A84C] pl-4 py-2 bg-amber-50 rounded-r-lg">
                  <p className="text-sm font-semibold text-[#1A3A5C] italic">"{item.q}"</p>
                  <p className="text-xs text-gray-600 mt-1">→ <strong>Por que perguntar:</strong> {item.why}</p>
                  <p className="text-xs text-[#C9A84C] mt-0.5">→ Adicionar como: <strong>{item.field}</strong></p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Resumo geral */}
        {totals.perdaTotal > 0 && (
          <div className="bg-red-50 border border-red-300 rounded-xl p-4 flex items-center gap-3">
            <TrendingDown className="w-5 h-5 text-red-600 flex-shrink-0" />
            <div>
              <p className="font-bold text-red-800">Dinheiro invisível identificado</p>
              <p className="text-sm text-red-700">
                O mentorado está deixando <strong>{fmt(totals.perdaTotal)}/mês</strong> na mesa por cobrar abaixo do preço mínimo calculado.
              </p>
            </div>
          </div>
        )}

        {/* Serviços */}
        {services.map((service, sIdx) => {
          const calc = calcService(service);
          const suggestionsForType = VARIABLE_COST_CATALOG[service.name] || VARIABLE_COST_CATALOG["Consulta clínica"];
          const existingVcNames = service.variableCosts.map(vc => vc.name.toLowerCase());
          const availableSuggestions = suggestionsForType.filter(s => !existingVcNames.some(e => e.includes(s.name.toLowerCase().slice(0, 8))));

          return (
            <div key={service.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* Cabeçalho do serviço */}
              <div className="bg-[#1A3A5C]/5 border-b border-gray-200 px-5 py-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-sm font-bold text-gray-500">Serviço {sIdx + 1}</span>
                  <input
                    value={service.name}
                    onChange={e => updateService(service.id, "name", e.target.value)}
                    className="flex-1 min-w-[180px] bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-sm font-bold text-[#1A3A5C] focus:outline-none focus:ring-2 focus:ring-[#1A3A5C]"
                    placeholder="Nome do serviço"
                  />
                  {services.length > 1 && (
                    <button onClick={() => removeService(service.id)} className="text-red-400 hover:text-red-600 ml-auto">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Duração (minutos)</label>
                    <input type="number" value={service.durationMin}
                      onChange={e => updateService(service.id, "durationMin", Number(e.target.value))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3A5C]" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Volume/mês (quantas vezes)</label>
                    <input type="number" value={service.volumeMonth}
                      onChange={e => updateService(service.id, "volumeMonth", Number(e.target.value))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3A5C]" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Margem desejada (%)</label>
                    <div className="flex items-center gap-1">
                      <input type="number" value={Math.round(service.desiredMargin * 100)}
                        onChange={e => updateService(service.id, "desiredMargin", Number(e.target.value) / 100)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3A5C]" />
                      <span className="text-sm text-gray-500">%</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Preço que cobra hoje (R$)</label>
                    <input type="number" value={service.currentPrice || ""}
                      onChange={e => updateService(service.id, "currentPrice", Number(e.target.value))}
                      placeholder="0"
                      className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3A5C]" />
                  </div>
                </div>
              </div>

              <div className="p-5">
                {/* Custos variáveis */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-bold text-[#1A3A5C] flex items-center gap-2">
                      <span className="text-orange-500">🔄</span> Custos Variáveis deste serviço
                      <span className="text-xs font-normal text-gray-500">(o que você gasta porque realizou este serviço)</span>
                    </h3>
                    <button
                      onClick={() => updateService(service.id, "showVariables", !service.showVariables)}
                      className="text-xs text-gray-500 hover:text-gray-700">
                      {service.showVariables ? "Recolher" : "Expandir"}
                    </button>
                  </div>

                  {service.showVariables && (
                    <>
                      {service.variableCosts.length === 0 ? (
                        <div className="bg-orange-50 border border-dashed border-orange-300 rounded-lg p-4 text-center">
                          <p className="text-sm text-orange-700 font-medium">Nenhum custo variável mapeado</p>
                          <p className="text-xs text-orange-600 mt-1">Este é o "dinheiro invisível". Adicione os custos abaixo para calcular o preço real.</p>
                        </div>
                      ) : (
                        <table className="w-full text-sm mb-2">
                          <thead>
                            <tr className="border-b border-gray-100">
                              <th className="text-left py-1.5 text-xs text-gray-500 font-medium">Custo</th>
                              <th className="text-center py-1.5 text-xs text-gray-500 font-medium w-36">Frequência</th>
                              <th className="text-right py-1.5 text-xs text-gray-500 font-medium w-28">Valor (R$)</th>
                              <th className="text-right py-1.5 text-xs text-gray-500 font-medium w-24">Por unidade</th>
                              <th className="w-8"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {service.variableCosts.map(vc => {
                              const perUnit = vc.perUnit === "mensal"
                                ? vc.value / Math.max(service.volumeMonth, 1)
                                : vc.value;
                              return (
                                <tr key={vc.id} className="border-b border-gray-50 hover:bg-gray-50 group">
                                  <td className="py-1.5 pr-2">
                                    <input value={vc.name}
                                      onChange={e => updateVariableCost(service.id, vc.id, "name", e.target.value)}
                                      className="w-full bg-transparent border-none text-sm text-gray-800 focus:outline-none focus:bg-white focus:border focus:border-[#1A3A5C] focus:rounded px-1 py-0.5" />
                                    {vc.hint && <p className="text-xs text-gray-400 px-1">{vc.hint}</p>}
                                  </td>
                                  <td className="py-1.5 px-2 text-center">
                                    <select value={vc.perUnit}
                                      onChange={e => updateVariableCost(service.id, vc.id, "perUnit", e.target.value)}
                                      className="text-xs bg-gray-100 border-none rounded px-2 py-1 focus:outline-none">
                                      {Object.entries(PERUNIT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                    </select>
                                  </td>
                                  <td className="py-1.5 pl-2">
                                    <input type="number" value={vc.value || ""}
                                      onChange={e => updateVariableCost(service.id, vc.id, "value", e.target.value)}
                                      placeholder="0"
                                      className="w-full text-right bg-gray-50 border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-[#1A3A5C]" />
                                  </td>
                                  <td className="py-1.5 pl-2 text-right text-xs font-medium text-orange-600">
                                    {perUnit > 0 ? fmt(perUnit) : "—"}
                                  </td>
                                  <td className="py-1.5 pl-2">
                                    <button onClick={() => removeVariableCost(service.id, vc.id)}
                                      className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-600">
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                          <tfoot>
                            <tr className="border-t border-gray-200">
                              <td colSpan={3} className="py-1.5 text-xs font-bold text-orange-700">Total custo variável/unidade</td>
                              <td className="py-1.5 text-right font-bold text-orange-700">{fmt(calc.custoVariavelPorUnidade)}</td>
                              <td></td>
                            </tr>
                          </tfoot>
                        </table>
                      )}

                      <div className="flex gap-2 flex-wrap mt-2">
                        <button onClick={() => addVariableCost(service.id)}
                          className="flex items-center gap-1 text-xs text-[#1A3A5C] hover:text-[#C9A84C] transition-colors border border-dashed border-[#1A3A5C] rounded px-3 py-1.5">
                          <Plus className="w-3 h-3" /> Adicionar custo variável
                        </button>
                        {availableSuggestions.length > 0 && availableSuggestions.slice(0, 3).map((s, i) => (
                          <button key={i} onClick={() => addVariableCost(service.id, s)}
                            className="flex items-center gap-1 text-xs text-amber-700 border border-dashed border-amber-400 rounded px-3 py-1.5 bg-amber-50 hover:bg-amber-100 transition-colors">
                            <Lightbulb className="w-3 h-3" /> + {s.name}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Resultado do cálculo */}
                <div className="bg-[#1A3A5C]/5 rounded-xl p-4">
                  <h3 className="text-sm font-bold text-[#1A3A5C] mb-3">Resultado do Cálculo</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                      <div className="text-xs text-blue-600 mb-1">Custo fixo/unidade</div>
                      <div className="text-lg font-bold text-blue-700">{fmt(calc.custoFixoPorUnidade)}</div>
                      <div className="text-xs text-blue-500">{service.durationMin}min × {fmt(custoHora)}/h</div>
                    </div>
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-center">
                      <div className="text-xs text-orange-600 mb-1">Custo variável/unidade</div>
                      <div className="text-lg font-bold text-orange-700">{fmt(calc.custoVariavelPorUnidade)}</div>
                      <div className="text-xs text-orange-500">
                        {calc.custoVariavelPorUnidade === 0 ? "⚠️ Não mapeado" : `${service.variableCosts.length} item(s)`}
                      </div>
                    </div>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                      <div className="text-xs text-red-600 mb-1">Preço mínimo</div>
                      <div className="text-lg font-bold text-red-700">{fmt(calc.precoMinimo)}</div>
                      <div className="text-xs text-red-500">Margem de {Math.round(service.desiredMargin * 100)}%</div>
                    </div>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                      <div className="text-xs text-green-600 mb-1">Preço ideal</div>
                      <div className="text-lg font-bold text-green-700">{fmt(calc.precoIdeal)}</div>
                      <div className="text-xs text-green-500">20% acima do mínimo</div>
                    </div>
                  </div>

                  {/* Comparação com preço atual */}
                  {service.currentPrice > 0 && (
                    <div className={`rounded-lg p-3 border ${
                      service.currentPrice >= calc.precoIdeal ? "bg-green-50 border-green-300" :
                      service.currentPrice >= calc.precoMinimo ? "bg-yellow-50 border-yellow-300" :
                      "bg-red-50 border-red-300"
                    }`}>
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div>
                          <span className="text-sm font-bold">Preço atual: {fmt(service.currentPrice)}</span>
                          {calc.margemAtual !== null && (
                            <span className="text-xs ml-2 text-gray-600">
                              (margem real: {fmtPct(Math.max(0, calc.margemAtual))})
                            </span>
                          )}
                        </div>
                        <div className="text-sm font-bold">
                          {service.currentPrice >= calc.precoIdeal ? (
                            <span className="text-green-700 flex items-center gap-1"><CheckCircle className="w-4 h-4" /> Preço adequado</span>
                          ) : service.currentPrice >= calc.precoMinimo ? (
                            <span className="text-yellow-700 flex items-center gap-1"><AlertTriangle className="w-4 h-4" /> Abaixo do ideal — reajuste sugerido: {fmt(calc.precoIdeal - service.currentPrice)}</span>
                          ) : (
                            <span className="text-red-700 flex items-center gap-1"><AlertTriangle className="w-4 h-4" /> Abaixo do mínimo — prejuízo de {fmt(calc.precoMinimo - service.currentPrice)}/unidade</span>
                          )}
                        </div>
                      </div>
                      {calc.dinheiroPerdido > 0 && (
                        <p className="text-xs text-red-700 mt-2 font-medium">
                          💸 Dinheiro invisível: {fmt(calc.dinheiroPerdido)}/mês sendo deixado na mesa com {service.volumeMonth} {service.name.toLowerCase()}(s)/mês.
                        </p>
                      )}
                    </div>
                  )}

                  <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-gray-600">
                    <div>Faturamento potencial/mês: <strong className="text-[#1A3A5C]">{fmt(calc.faturamentoMes)}</strong></div>
                    <div>Custo total/mês (este serviço): <strong className="text-red-600">{fmt(calc.custoTotalPorUnidade * service.volumeMonth)}</strong></div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        <button onClick={addService}
          className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-[#1A3A5C] rounded-xl text-[#1A3A5C] hover:bg-[#1A3A5C]/5 transition-colors text-sm font-medium">
          <Plus className="w-4 h-4" /> Adicionar outro serviço
        </button>

        {/* Resumo consolidado */}
        {services.length > 1 && (
          <div className="bg-[#1A3A5C] text-white rounded-xl p-5">
            <h2 className="font-bold mb-4 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-[#C9A84C]" />
              Consolidado — Todos os Serviços
            </h2>
            <div className="space-y-2">
              {services.map(s => {
                const c = calcService(s);
                return (
                  <div key={s.id} className="flex items-center justify-between text-sm">
                    <span className="opacity-80">{s.name} ({s.volumeMonth}×/mês)</span>
                    <div className="flex items-center gap-4">
                      <span className="text-xs opacity-60">Mín: {fmt(c.precoMinimo)}</span>
                      <span className="font-bold text-[#C9A84C]">{fmt(c.faturamentoMes)}/mês</span>
                    </div>
                  </div>
                );
              })}
              <div className="flex items-center justify-between pt-2 border-t border-white/20">
                <span className="font-bold">Faturamento potencial total</span>
                <span className="text-xl font-bold text-[#C9A84C]">{fmt(totals.fatTotal)}/mês</span>
              </div>
              {totals.perdaTotal > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-red-300">💸 Dinheiro invisível total</span>
                  <span className="text-xl font-bold text-red-300">{fmt(totals.perdaTotal)}/mês</span>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// Componente auxiliar para ícone de tendência
function TrendingDown({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
      <polyline points="17 18 23 18 23 12" />
    </svg>
  );
}
