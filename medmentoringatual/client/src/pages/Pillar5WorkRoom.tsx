import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { ChevronLeft, ChevronDown, ChevronUp, Brain, CheckCircle2, Circle, DollarSign, TrendingUp, AlertCircle } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";

const PNL_QUESTIONS = [
  {
    id: 1,
    pergunta: "Quando você define o preço de uma consulta, o que passa pela sua cabeça?",
    motivo: "Revela a crença central sobre dinheiro e valor. A maioria usa o preço do colega como referência — nunca o próprio custo ou o valor entregue.",
    angustia: "Medo de cobrar caro e perder pacientes",
    tecnica: "Reframe de Valor",
    como_aplicar: "\"O paciente que vai embora por preço nunca foi seu paciente ideal. Qual seria o impacto de ter 30% menos pacientes, mas cobrar 50% mais?\"",
    cor: "emerald",
  },
  {
    id: 2,
    pergunta: "Quanto você acha que vale uma hora do seu trabalho — não o que cobra, o que vale?",
    motivo: "Separa o preço praticado do valor percebido. O gap entre os dois é o termômetro da autoestima profissional.",
    angustia: "Culpa por cobrar bem",
    tecnica: "Ressignificação de Identidade",
    como_aplicar: "\"Cobrar bem é um ato de responsabilidade. Um médico que não se sustenta financeiramente não consegue se atualizar, investir na clínica ou estar presente para o paciente.\"",
    cor: "teal",
  },
  {
    id: 3,
    pergunta: "Qual seria o impacto de aumentar 20% o preço da sua consulta principal amanhã?",
    motivo: "Força a projeção de consequências reais. A maioria superestima a perda de pacientes e subestima o ganho de posicionamento.",
    angustia: "Não sabe como comunicar aumento de preço",
    tecnica: "Ancoragem Futura",
    como_aplicar: "\"Imagine que daqui a 6 meses você já cobra esse valor e tem os pacientes certos. O que você fez diferente para chegar lá?\"",
    cor: "cyan",
  },
];

const CHECKLIST_ITEMS = [
  "Preço de cada serviço calculado com base no custo real (não no mercado)",
  "Tabela de precificação por procedimento revisada e atualizada",
  "Estratégia de comunicação de reajuste definida",
  "Pacotes e programas de acompanhamento estruturados",
  "Política de cancelamento e remarcação estabelecida",
];

const COR_MAP: Record<string, string> = {
  emerald: "bg-emerald-50 border-emerald-200 text-emerald-800",
  teal: "bg-teal-50 border-teal-200 text-teal-800",
  cyan: "bg-cyan-50 border-cyan-200 text-cyan-800",
};
const BADGE_MAP: Record<string, string> = {
  emerald: "bg-emerald-100 text-emerald-700",
  teal: "bg-teal-100 text-teal-700",
  cyan: "bg-cyan-100 text-cyan-700",
};

export default function Pillar5WorkRoom() {
  const params = useParams<{ menteeId: string }>();
  const menteeId = parseInt(params.menteeId || "0");
  const [, navigate] = useLocation();
  const { user, loading: authLoading } = useAuth();


  const [openSection, setOpenSection] = useState<string>("roteiro");
  const [openQuestion, setOpenQuestion] = useState<number | null>(null);
  const [notes, setNotes] = useState<Record<number, string>>({});

  // Calculadora de dinheiro invisível
  const [precoAtual, setPrecoAtual] = useState("");
  const [consultasMes, setConsultasMes] = useState("");
  const [precoJusto, setPrecoJusto] = useState("");

  // Checklist (DB-backed)
  const utils = trpc.useUtils();
  const { data: checklistData } = trpc.mentor.getChecklist.useQuery({ menteeId });
  const updateChecklistItem = trpc.mentor.updateChecklistItem.useMutation({
    onSuccess: () => utils.mentor.getChecklist.invalidate({ menteeId }),
  });
  const pillarChecklist = (checklistData ?? []).filter((c: any) => c.pillarId === 5);
  const checklist = CHECKLIST_ITEMS.map((_item, i) => {
    const saved = pillarChecklist.find((c: any) => c.itemIndex === i);
    return saved?.status === "completed";
  });
  const completedCount = checklist.filter(Boolean).length;

  const { data: mentee } = trpc.mentor.getMentee.useQuery({ id: menteeId }, { enabled: !!menteeId });

  // Load mentee portal answers for pre-fill
  const { data: menteeAnswers } = trpc.pillarFeedback.getAnswers.useQuery(
    { menteeId, pillarId: 5 },
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
    const precoVal = getMenteeAnswer("precificacao_atual", "p5_procedimentos_lista");
    const consultasVal = getMenteeAnswer("precificacao_atual", "p5_ultima_vez_reajustou");
    if (precoVal) setPrecoAtual(p => p || precoVal);
    if (consultasVal) setConsultasMes(p => p || consultasVal);
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
      pillarId: 5,
      respostasJson: { pnlNotes: notes, calculadora: { precoAtual, consultasMes, precoJusto }, checklist },
    });
  };

  const toggleSection = (s: string) => setOpenSection(openSection === s ? "" : s);

  // Cálculos
  const pa = parseFloat(precoAtual) || 0;
  const cm = parseFloat(consultasMes) || 0;
  const pj = parseFloat(precoJusto) || 0;
  const faturamentoAtual = pa * cm;
  const faturamentoJusto = pj * cm;
  const dinheiroInvisivel = faturamentoJusto - faturamentoAtual;
  const dinheiroInvisivelAnual = dinheiroInvisivel * 12;
  const percentualGanho = pa > 0 ? ((pj - pa) / pa) * 100 : 0;

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(`/mentor/mentorado/${menteeId}`)} className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
              <ChevronLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-emerald-600 text-white text-xs font-bold flex items-center justify-center">5</span>
                <h1 className="font-bold text-slate-900">Pilar 5 — Precificação</h1>
              </div>
              {mentee && <p className="text-sm text-slate-500 mt-0.5">{mentee.nome}</p>}
            </div>
          </div>
          <button onClick={handleSave} disabled={saveDiagnostic.isPending}
            className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50">
            {saveDiagnostic.isPending ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">

        {/* WOW Banner */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-5 text-white">
          <div className="flex items-start gap-3">
            <DollarSign className="w-8 h-8 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-lg">O que trava hoje</p>
              <p className="text-emerald-100 mt-1">Cobra pelo tempo, não pelo valor. Usa o preço do colega como referência e sente culpa ao reajustar.</p>
              <div className="mt-3 bg-white bg-opacity-20 rounded-xl p-3">
                <p className="font-bold text-sm">💡 Frase de impacto para usar na sessão:</p>
                <p className="italic mt-1 text-sm">"Você não cobra pelo que faz. Cobra pelo que acha que o paciente vai aceitar. São coisas completamente diferentes."</p>
              </div>
            </div>
          </div>
        </div>

        {/* Section 1: Roteiro PNL */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <button onClick={() => toggleSection("roteiro")} className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-colors">
            <div className="flex items-center gap-3">
              <Brain className="w-5 h-5 text-emerald-600" />
              <span className="font-bold text-slate-900">Roteiro de Investigação com PNL</span>
              <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">3 perguntas</span>
            </div>
            {openSection === "roteiro" ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
          </button>

          {openSection === "roteiro" && (
            <div className="px-5 pb-5 space-y-3 border-t border-slate-100">
              <p className="text-sm text-slate-500 pt-3">Perguntas que revelam a relação do médico com dinheiro e valor — tema que raramente é discutido na formação médica.</p>
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
                      <div className="pt-3">
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

        {/* Section 2: Calculadora de Dinheiro Invisível — WOW TOOL */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <button onClick={() => toggleSection("calculadora")} className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-colors">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
              <span className="font-bold text-slate-900">Calculadora de Dinheiro Invisível</span>
              <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">Momento WOW</span>
            </div>
            {openSection === "calculadora" ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
          </button>

          {openSection === "calculadora" && (
            <div className="px-5 pb-5 border-t border-slate-100">
              <div className="pt-4 space-y-4">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                  <p className="text-sm text-emerald-800 font-medium">Mostre ao mentorado quanto dinheiro ele está deixando na mesa todo mês. O número costuma ser chocante — e é o gatilho para a decisão de reajuste.</p>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Preço atual da consulta (R$)</label>
                      <input type="number" value={precoAtual} onChange={(e) => setPrecoAtual(e.target.value)}
                        placeholder="Ex: 250"
                        className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Consultas por mês</label>
                      <input type="number" value={consultasMes} onChange={(e) => setConsultasMes(e.target.value)}
                        placeholder="Ex: 80"
                        className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Preço justo (baseado no custo real + valor entregue) (R$)</label>
                    <input type="number" value={precoJusto} onChange={(e) => setPrecoJusto(e.target.value)}
                      placeholder="Ex: 380"
                      className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                    <p className="text-xs text-slate-400 mt-1">Use o custo por hora calculado no Pilar 3 como base mínima</p>
                  </div>
                </div>

                {pa > 0 && cm > 0 && pj > 0 && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
                        <p className="text-xs text-slate-500 uppercase tracking-wide">Faturamento atual</p>
                        <p className="text-2xl font-bold text-slate-700 mt-1">{fmt(faturamentoAtual)}</p>
                        <p className="text-xs text-slate-400">/mês</p>
                      </div>
                      <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-4 text-center">
                        <p className="text-xs text-emerald-700 uppercase tracking-wide">Faturamento justo</p>
                        <p className="text-2xl font-bold text-emerald-700 mt-1">{fmt(faturamentoJusto)}</p>
                        <p className="text-xs text-emerald-600">/mês (+{percentualGanho.toFixed(0)}%)</p>
                      </div>
                    </div>

                    {dinheiroInvisivel > 0 && (
                      <div className="bg-red-50 border border-red-300 rounded-2xl p-5">
                        <div className="flex items-start gap-3">
                          <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="font-bold text-red-800 text-lg">Dinheiro Invisível</p>
                            <p className="text-3xl font-bold text-red-700 mt-1">{fmt(dinheiroInvisivel)}<span className="text-base font-normal text-red-500">/mês</span></p>
                            <p className="text-sm text-red-700 mt-2">
                              Você está deixando <strong>{fmt(dinheiroInvisivel)}</strong> por mês — ou <strong>{fmt(dinheiroInvisivelAnual)}</strong> por ano — na mesa. Não por falta de pacientes. Por subprecificação.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                      <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2">Estratégia de transição recomendada</p>
                      <p className="text-sm text-blue-800">
                        Aumento de {percentualGanho.toFixed(0)}% pode ser feito em 2 etapas de {(percentualGanho / 2).toFixed(0)}% cada, com intervalo de 3 meses. Pacientes fidelizados raramente abandonam por reajuste comunicado com antecedência e justificativa de valor.
                      </p>
                    </div>
                  </div>
                )}
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
                  <button key={i} onClick={() => updateChecklistItem.mutate({
                    menteeId,
                    pillarId: 5,
                    itemIndex: i,
                    status: checklist[i] ? "pending" : "completed",
                  })}
                    className={`w-full flex items-start gap-3 p-3 rounded-xl text-left transition-colors ${checklist[i] ? "bg-green-50 border border-green-200" : "bg-slate-50 border border-slate-200 hover:bg-slate-100"}`}>
                    {checklist[i] ? <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" /> : <Circle className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />}
                    <span className={`text-sm ${checklist[i] ? "text-green-800 line-through" : "text-slate-700"}`}>{item}</span>
                  </button>
                ))}
                {completedCount === CHECKLIST_ITEMS.length && (
                  <div className="bg-green-100 border border-green-300 rounded-xl p-4 text-center mt-2">
                    <p className="text-green-800 font-bold">🎯 Pilar 5 concluído!</p>
                    <p className="text-green-700 text-sm mt-1">O mentorado cobra pelo valor que entrega, não pelo que acha que o mercado aceita.</p>
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
