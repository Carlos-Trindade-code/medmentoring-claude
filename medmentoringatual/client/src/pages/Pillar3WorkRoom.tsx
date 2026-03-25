import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { ChevronLeft, ChevronDown, ChevronUp, Brain, CheckCircle2, Circle, TrendingDown, Calculator, AlertCircle, ExternalLink } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";

const PNL_QUESTIONS = [
  {
    id: 1,
    pergunta: "Se você somasse todos os seus custos fixos mensais agora, de cabeça, qual seria o número?",
    motivo: "Testa a consciência financeira básica. A maioria subestima em 30–50%. O gap entre o estimado e o real é o primeiro insight da sessão.",
    angustia: "Medo de ver os números reais",
    tecnica: "Dissociação",
    como_aplicar: "\"Imagine que você é um médico consultando outro médico. O que diria a um colega com medo de fazer o próprio diagnóstico?\"",
    cor: "red",
    impacto: "💡 Frase de impacto: \"A maioria dos médicos que atendo não sabe que paga a sala mesmo quando está vazia. Esse custo existe 24h por dia.\"",
  },
  {
    id: 2,
    pergunta: "Qual é o seu custo por hora de consultório — incluindo quando a sala está vazia?",
    motivo: "A maioria nunca calculou. A resposta revela se o preço cobrado cobre o custo real ou apenas gera a ilusão de lucro.",
    angustia: "Não entende de finanças / nunca aprendeu",
    tecnica: "Ressignificação de Identidade",
    como_aplicar: "\"Você aprendeu medicina — o sistema mais complexo existente. Finanças básicas são muito mais simples. O que te impede é a crença, não a capacidade.\"",
    cor: "orange",
    impacto: null,
  },
  {
    id: 3,
    pergunta: "Qual é o mínimo que você precisa faturar este mês para não ter prejuízo?",
    motivo: "Estabelece o ponto de equilíbrio real. Sem esse número, qualquer meta financeira é arbitrária.",
    angustia: "Sensação de que nunca sobra dinheiro",
    tecnica: "Chunking Down",
    como_aplicar: "\"De todas as suas despesas, qual é a única que, se reduzida, não afetaria a qualidade do atendimento? Um por um.\"",
    cor: "yellow",
    impacto: null,
  },
  {
    id: 4,
    pergunta: "Se pudesse mudar apenas um custo hoje para impacto imediato, qual seria?",
    motivo: "Força priorização e ação concreta. Sai da análise paralisante para a decisão executável.",
    angustia: "Paralisia diante da complexidade financeira",
    tecnica: "Modelagem de Excelência",
    como_aplicar: "\"Você já tomou uma decisão financeira difícil que deu certo. O que fez diferente naquela vez?\"",
    cor: "blue",
    impacto: null,
  },
];

const CHECKLIST_ITEMS = [
  "Fase atual de estrutura profissional identificada e decisão de evolução tomada",
  "iVMP calculado por pilar (ferramenta integrada)",
  "Todos os custos fixos mapeados, incluindo deslocamento e marketing digital",
  "Custo real por hora clínica e por paciente calculados",
  "Ponto de equilíbrio e metas financeiras em 3 níveis (conservador / moderado / agressivo)",
];

const COR_MAP: Record<string, string> = {
  red: "bg-red-50 border-red-200 text-red-800",
  orange: "bg-orange-50 border-orange-200 text-orange-800",
  yellow: "bg-yellow-50 border-yellow-200 text-yellow-800",
  blue: "bg-blue-50 border-blue-200 text-blue-800",
};

const BADGE_MAP: Record<string, string> = {
  red: "bg-red-100 text-red-700",
  orange: "bg-orange-100 text-orange-700",
  yellow: "bg-yellow-100 text-yellow-700",
  blue: "bg-blue-100 text-blue-700",
};

export default function Pillar3WorkRoom() {
  const params = useParams<{ menteeId: string }>();
  const menteeId = parseInt(params.menteeId || "0");
  const [, navigate] = useLocation();
  const { user, loading: authLoading } = useAuth();


  const [openSection, setOpenSection] = useState<string>("roteiro");
  const [openQuestion, setOpenQuestion] = useState<number | null>(null);
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [checklist, setChecklist] = useState<boolean[]>(new Array(CHECKLIST_ITEMS.length).fill(false));

  // Calculadora de custo por hora
  const [aluguel, setAluguel] = useState("");
  const [funcionarios, setFuncionarios] = useState("");
  const [outros, setOutros] = useState("");
  const [horasMes, setHorasMes] = useState("");
  const [taxaOciosidade, setTaxaOciosidade] = useState("20");

  const { data: mentee } = trpc.mentor.getMentee.useQuery({ id: menteeId }, { enabled: !!menteeId });

  // Load mentee portal answers for pre-fill
  const { data: menteeAnswers } = trpc.pillarFeedback.getAnswers.useQuery(
    { menteeId, pillarId: 3 },
    { enabled: !!menteeId }
  );

  const getMenteeAnswer = (sectionId: string, questionId: string): string => {
    if (!menteeAnswers) return "";
    const section = menteeAnswers.find(r => r.secao === sectionId);
    if (!section) return "";
    const respostas = section.respostas as Array<{ id: string; answer: string }> | null;
    if (!respostas) return "";
    const item = respostas.find(r => r.id === questionId);
    return item?.answer ?? "";
  };

  useEffect(() => {
    if (!menteeAnswers?.length) return;
    const aluguelVal = getMenteeAnswer("estrutura_clinica", "p3_aluguel_valor") ||
      getMenteeAnswer("estrutura_clinica", "p3_aluguel_valor_geral");
    const pessoalVal = getMenteeAnswer("estrutura_clinica", "p3_custo_pessoal");
    const outrosArr = [
      getMenteeAnswer("estrutura_clinica", "p3_custo_energia"),
      getMenteeAnswer("estrutura_clinica", "p3_custo_internet"),
      getMenteeAnswer("estrutura_clinica", "p3_custo_materiais"),
      getMenteeAnswer("estrutura_clinica", "p3_custo_software"),
      getMenteeAnswer("estrutura_clinica", "p3_custo_marketing"),
      getMenteeAnswer("estrutura_clinica", "p3_custo_contador"),
    ].filter(Boolean);
    if (aluguelVal) setAluguel(p => p || aluguelVal);
    if (pessoalVal) setFuncionarios(p => p || pessoalVal);
    if (outrosArr.length) setOutros(p => p || outrosArr.join(" | "));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menteeAnswers]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }
  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
            <span className="text-amber-600 text-xl">!</span>
          </div>
          <h2 className="text-lg font-semibold text-foreground">Sessão expirada</h2>
          <p className="text-sm text-muted-foreground">Faça login novamente para acessar o painel do mentor.</p>
          <button onClick={() => navigate("/mentor")} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm">Ir para o painel</button>
        </div>
      </div>
    );
  }

  const saveDiagnostic = trpc.mentor.savePillarDiagnostic.useMutation({
    onSuccess: () => toast.success("Anotações salvas com sucesso."),
    onError: () => toast.error("Erro ao salvar anotações."),
  });

  const handleSave = () => {
    saveDiagnostic.mutate({
      menteeId,
      pillarId: 3,
      respostasJson: { pnlNotes: notes, calculadora: { aluguel, funcionarios, outros, horasMes, taxaOciosidade }, checklist },
    });
  };

  const toggleSection = (s: string) => setOpenSection(openSection === s ? "" : s);
  const toggleChecklist = (i: number) => {
    const next = [...checklist]; next[i] = !next[i]; setChecklist(next);
  };

  // Cálculos da calculadora
  const totalFixo = (parseFloat(aluguel) || 0) + (parseFloat(funcionarios) || 0) + (parseFloat(outros) || 0);
  const horas = parseFloat(horasMes) || 0;
  const ociosidade = parseFloat(taxaOciosidade) || 0;
  const horasEfetivas = horas * (1 - ociosidade / 100);
  const custoPorHora = horasEfetivas > 0 ? totalFixo / horasEfetivas : 0;
  const custoPorHoraComOciosidade = horas > 0 ? totalFixo / horas : 0;
  const custoOciosidade = totalFixo - (horasEfetivas > 0 ? custoPorHoraComOciosidade * horasEfetivas : 0);
  const completedCount = checklist.filter(Boolean).length;

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-red-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(`/mentor/mentorado/${menteeId}`)} className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
              <ChevronLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-red-600 text-white text-xs font-bold flex items-center justify-center">3</span>
                <h1 className="font-bold text-slate-900">Pilar 3 — Diagnóstico do Negócio</h1>
              </div>
              {mentee && <p className="text-sm text-slate-500 mt-0.5">{mentee.nome}</p>}
            </div>
          </div>
          <button onClick={handleSave} disabled={saveDiagnostic.isPending}
            className="bg-red-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50">
            {saveDiagnostic.isPending ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">

        {/* WOW Banner */}
        <div className="bg-gradient-to-r from-red-600 to-orange-500 rounded-2xl p-5 text-white">
          <div className="flex items-start gap-3">
            <TrendingDown className="w-8 h-8 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-lg">O que trava hoje</p>
              <p className="text-red-100 mt-1">Fatura bem mas não sabe para onde o dinheiro vai. Trabalha muito e não entende por que não sobra.</p>
              <div className="mt-3 bg-white bg-opacity-20 rounded-xl p-3">
                <p className="font-bold text-sm">💡 Frase de impacto para usar na sessão:</p>
                <p className="italic mt-1 text-sm">"A maioria dos médicos que atendo não sabe que paga a sala mesmo quando está dormindo. Esse custo existe 24h por dia, 7 dias por semana."</p>
              </div>
            </div>
          </div>
        </div>

        {/* Section 1: Roteiro PNL */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <button onClick={() => toggleSection("roteiro")} className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-colors">
            <div className="flex items-center gap-3">
              <Brain className="w-5 h-5 text-red-600" />
              <span className="font-bold text-slate-900">Roteiro de Investigação com PNL</span>
              <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">4 perguntas</span>
            </div>
            {openSection === "roteiro" ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
          </button>

          {openSection === "roteiro" && (
            <div className="px-5 pb-5 space-y-3 border-t border-slate-100">
              <p className="text-sm text-slate-500 pt-3">Esta é a parte que costuma gerar o maior desconforto — e o maior valor percebido.</p>
              {PNL_QUESTIONS.map((q) => (
                <div key={q.id} className={`rounded-xl border ${COR_MAP[q.cor]} overflow-hidden`}>
                  <button onClick={() => setOpenQuestion(openQuestion === q.id ? null : q.id)}
                    className="w-full flex items-center justify-between p-4 text-left">
                    <div className="flex items-start gap-3">
                      <span className={`w-6 h-6 rounded-full ${BADGE_MAP[q.cor]} text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5`}>{q.id}</span>
                      <p className="font-medium text-sm leading-relaxed">"{q.pergunta}"</p>
                    </div>
                    {openQuestion === q.id ? <ChevronUp className="w-4 h-4 flex-shrink-0 ml-2" /> : <ChevronDown className="w-4 h-4 flex-shrink-0 ml-2" />}
                  </button>
                  {openQuestion === q.id && (
                    <div className="px-4 pb-4 space-y-3 border-t border-current border-opacity-20">
                      {q.impacto && (
                        <div className="pt-3 bg-white bg-opacity-60 rounded-lg p-3">
                          <p className="text-sm font-bold">{q.impacto}</p>
                        </div>
                      )}
                      <div className={q.impacto ? "" : "pt-3"}>
                        <p className="text-xs font-semibold uppercase tracking-wide opacity-70 mb-1">Por que fazer</p>
                        <p className="text-sm">{q.motivo}</p>
                      </div>
                      <div className="bg-white bg-opacity-60 rounded-lg p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide opacity-70 mb-1">Angústia que pode revelar</p>
                        <p className="text-sm font-medium">{q.angustia}</p>
                      </div>
                      <div className="bg-white bg-opacity-60 rounded-lg p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide opacity-70 mb-1">Técnica: {q.tecnica}</p>
                        <p className="text-sm italic">"{q.como_aplicar}"</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide opacity-70 mb-1">Anotações da sessão</p>
                        <textarea
                          value={notes[q.id] || ""}
                          onChange={(e) => setNotes({ ...notes, [q.id]: e.target.value })}
                          placeholder="O que o mentorado respondeu..."
                          rows={3}
                          className="w-full bg-white bg-opacity-80 border border-current border-opacity-30 rounded-lg p-2 text-sm resize-none focus:outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 2: Calculadora de Custo por Hora — WOW TOOL */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <button onClick={() => toggleSection("calculadora")} className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-colors">
            <div className="flex items-center gap-3">
              <Calculator className="w-5 h-5 text-orange-500" />
              <span className="font-bold text-slate-900">Calculadora de Custo Real por Hora</span>
              <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">Momento WOW</span>
            </div>
            {openSection === "calculadora" ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
          </button>

          {openSection === "calculadora" && (
            <div className="px-5 pb-5 border-t border-slate-100">
              <div className="pt-4 space-y-4">
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                  <p className="text-sm text-orange-800 font-medium">Preencha com o mentorado ao vivo. O resultado costuma gerar surpresa — e é o gatilho para a mudança.</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Aluguel/sala (R$/mês)</label>
                    <input type="number" value={aluguel} onChange={(e) => setAluguel(e.target.value)}
                      placeholder="Ex: 3500"
                      className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Equipe (R$/mês)</label>
                    <input type="number" value={funcionarios} onChange={(e) => setFuncionarios(e.target.value)}
                      placeholder="Ex: 5000"
                      className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Outros fixos (R$/mês)</label>
                    <input type="number" value={outros} onChange={(e) => setOutros(e.target.value)}
                      placeholder="Ex: 2000"
                      className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Horas/mês disponíveis</label>
                    <input type="number" value={horasMes} onChange={(e) => setHorasMes(e.target.value)}
                      placeholder="Ex: 160"
                      className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Taxa de ociosidade estimada: {taxaOciosidade}%</label>
                  <input type="range" min="0" max="60" value={taxaOciosidade} onChange={(e) => setTaxaOciosidade(e.target.value)}
                    className="w-full mt-2 accent-orange-500" />
                  <div className="flex justify-between text-xs text-slate-400 mt-1">
                    <span>0% (agenda cheia)</span>
                    <span>30% (típico)</span>
                    <span>60% (crítico)</span>
                  </div>
                </div>

                {totalFixo > 0 && horas > 0 && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
                        <p className="text-xs text-slate-500 uppercase tracking-wide">Custo fixo total</p>
                        <p className="text-2xl font-bold text-slate-800 mt-1">{fmt(totalFixo)}</p>
                        <p className="text-xs text-slate-500">por mês</p>
                      </div>
                      <div className="bg-orange-50 border border-orange-300 rounded-xl p-4 text-center">
                        <p className="text-xs text-orange-700 uppercase tracking-wide">Custo por hora efetiva</p>
                        <p className="text-2xl font-bold text-orange-700 mt-1">{fmt(custoPorHora)}</p>
                        <p className="text-xs text-orange-600">com {taxaOciosidade}% ociosidade</p>
                      </div>
                    </div>

                    {ociosidade > 0 && (
                      <div className="bg-red-50 border border-red-300 rounded-xl p-4">
                        <div className="flex items-start gap-3">
                          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="font-bold text-red-800">Custo da ociosidade</p>
                            <p className="text-2xl font-bold text-red-700 mt-1">{fmt(totalFixo * (ociosidade / 100))}<span className="text-sm font-normal text-red-600">/mês</span></p>
                            <p className="text-sm text-red-700 mt-1">
                              Com {taxaOciosidade}% de ociosidade, você paga <strong>{fmt(totalFixo * (ociosidade / 100))}</strong> por mês sem atender nenhum paciente. São <strong>{fmt(totalFixo * (ociosidade / 100) * 12)}</strong> por ano.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                      <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2">Interpretação para o mentorado</p>
                      <p className="text-sm text-blue-800">
                        Para não ter prejuízo, cada hora de consultório precisa gerar pelo menos <strong>{fmt(custoPorHora)}</strong>. Se você cobra menos do que isso por consulta, está trabalhando no prejuízo.
                      </p>
                    </div>
                  </div>
                )}

                {/* Link para ferramenta completa */}
                <div className="border border-slate-200 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-800 text-sm">Diagnóstico Financeiro Completo</p>
                    <p className="text-xs text-slate-500">Mapeamento detalhado de todas as despesas fixas</p>
                  </div>
                  <button onClick={() => navigate(`/mentor/financeiro/${menteeId}`)}
                    className="flex items-center gap-1 bg-slate-800 text-white px-3 py-2 rounded-lg text-xs font-semibold hover:bg-slate-700 transition-colors">
                    Abrir <ExternalLink className="w-3 h-3" />
                  </button>
                </div>

                {/* Link para iVMP */}
                <div className="border border-slate-200 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-800 text-sm">Ferramenta iVMP</p>
                    <p className="text-xs text-slate-500">Índice de Valor e Maturidade Profissional — 7 categorias</p>
                  </div>
                  <button onClick={() => navigate(`/mentor/ivmp/${menteeId}`)}
                    className="flex items-center gap-1 bg-slate-800 text-white px-3 py-2 rounded-lg text-xs font-semibold hover:bg-slate-700 transition-colors">
                    Abrir <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Section 3: Checklist */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <button onClick={() => toggleSection("checklist")} className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-colors">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <span className="font-bold text-slate-900">Checklist de Conclusão do Pilar</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${completedCount === CHECKLIST_ITEMS.length ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"}`}>
                {completedCount}/{CHECKLIST_ITEMS.length}
              </span>
            </div>
            {openSection === "checklist" ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
          </button>

          {openSection === "checklist" && (
            <div className="px-5 pb-5 border-t border-slate-100">
              <div className="pt-4 space-y-2">
                {CHECKLIST_ITEMS.map((item, i) => (
                  <button key={i} onClick={() => toggleChecklist(i)}
                    className={`w-full flex items-start gap-3 p-3 rounded-xl text-left transition-colors ${checklist[i] ? "bg-green-50 border border-green-200" : "bg-slate-50 border border-slate-200 hover:bg-slate-100"}`}>
                    {checklist[i] ? <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" /> : <Circle className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />}
                    <span className={`text-sm ${checklist[i] ? "text-green-800 line-through" : "text-slate-700"}`}>{item}</span>
                  </button>
                ))}
                {completedCount === CHECKLIST_ITEMS.length && (
                  <div className="bg-green-100 border border-green-300 rounded-xl p-4 text-center mt-2">
                    <p className="text-green-800 font-bold">🎯 Pilar 3 concluído!</p>
                    <p className="text-green-700 text-sm mt-1">O mentorado tem um raio-X completo do seu negócio.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
