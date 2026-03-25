import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { ChevronLeft, ChevronDown, ChevronUp, Brain, CheckCircle2, Circle, MessageSquare, Sparkles, Copy, RefreshCw } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";

const PNL_QUESTIONS = [
  {
    id: 1,
    pergunta: "Quando um paciente diz 'vou pensar', o que você sente e o que faz?",
    motivo: "Revela o padrão de resposta emocional e comportamental diante da resistência. A maioria dos médicos desiste imediatamente — e isso tem um custo enorme.",
    angustia: "Medo de parecer vendedor ou mercantilizar a medicina",
    tecnica: "Reframe de Serviço",
    como_aplicar: "\"Vender saúde não é mercantilizar — é garantir que o paciente receba o tratamento que precisa. O médico que não sabe comunicar valor deixa o paciente sem o melhor cuidado.\"",
    cor: "violet",
  },
  {
    id: 2,
    pergunta: "Qual é a objeção que você mais ouve e que mais te trava?",
    motivo: "Identifica o ponto de maior vulnerabilidade na comunicação. A objeção mais frequente é sempre a que o médico menos sabe responder.",
    angustia: "Não sabe como falar de preço sem constrangimento",
    tecnica: "Ancoragem de Valor",
    como_aplicar: "\"Antes de falar de preço, sempre ancore o valor. 'O que seria diferente na sua vida se esse problema fosse resolvido?' — deixe o paciente calcular o valor antes de você apresentar o preço.\"",
    cor: "purple",
  },
  {
    id: 3,
    pergunta: "Como você apresenta um tratamento de alto valor para um paciente que não perguntou o preço?",
    motivo: "Testa a habilidade de apresentação proativa. A maioria espera o paciente perguntar — e perde a janela de oportunidade.",
    angustia: "Insegurança sobre como abordar o tema financeiro",
    tecnica: "Pergunta Poderosa",
    como_aplicar: "\"'O que é mais importante para você neste tratamento — o resultado, o tempo de recuperação ou o investimento?' — a resposta do paciente te diz exatamente como apresentar.\"",
    cor: "indigo",
  },
];

const OBJECTIONS = [
  "Está muito caro",
  "Vou pensar e te aviso",
  "Preciso consultar meu marido/esposa",
  "Vou pesquisar outros médicos",
  "Não tenho dinheiro agora",
  "Meu plano não cobre",
  "Prefiro esperar para ver se melhora",
  "Já fiz esse tratamento e não funcionou",
];

const CHECKLIST_ITEMS = [
  "Script de apresentação de tratamento de alto valor estruturado",
  "Respostas para as 5 objeções mais comuns documentadas",
  "Técnica de ancoragem de valor praticada",
  "Processo de follow-up pós-consulta definido",
  "Indicadores de conversão sendo monitorados",
];

const COR_MAP: Record<string, string> = {
  violet: "bg-violet-50 border-violet-200 text-violet-800",
  purple: "bg-purple-50 border-purple-200 text-purple-800",
  indigo: "bg-indigo-50 border-indigo-200 text-indigo-800",
};
const BADGE_MAP: Record<string, string> = {
  violet: "bg-violet-100 text-violet-700",
  purple: "bg-purple-100 text-purple-700",
  indigo: "bg-indigo-100 text-indigo-700",
};

type ObjectionResult = {
  resposta_principal: string;
  tecnica_usada: string;
  explicacao_tecnica: string;
  variacao_alternativa: string;
  dica_comportamental: string;
};

export default function Pillar7WorkRoom() {
  const params = useParams<{ menteeId: string }>();
  const menteeId = parseInt(params.menteeId || "0");
  const [, navigate] = useLocation();
  const { user, loading: authLoading } = useAuth();


  const [openSection, setOpenSection] = useState<string>("roteiro");
  const [openQuestion, setOpenQuestion] = useState<number | null>(null);
  const [notes, setNotes] = useState<Record<number, string>>({});

  // Simulador de objeções
  const [selectedObjection, setSelectedObjection] = useState("");
  const [customObjection, setCustomObjection] = useState("");
  const [tratamento, setTratamento] = useState("");
  const [estilo, setEstilo] = useState<"empático" | "direto" | "consultivo">("empático");
  const [objResult, setObjResult] = useState<ObjectionResult | null>(null);
  const [copied, setCopied] = useState(false);

  // Checklist (DB-backed)
  const utils = trpc.useUtils();
  const { data: checklistData } = trpc.mentor.getChecklist.useQuery({ menteeId });
  const updateChecklistItem = trpc.mentor.updateChecklistItem.useMutation({
    onSuccess: () => utils.mentor.getChecklist.invalidate({ menteeId }),
  });
  const pillarChecklist = (checklistData ?? []).filter((c: any) => c.pillarId === 7);
  const checklist = CHECKLIST_ITEMS.map((_item, i) => {
    const saved = pillarChecklist.find((c: any) => c.itemIndex === i);
    return saved?.status === "completed";
  });
  const completedCount = checklist.filter(Boolean).length;

  const { data: mentee } = trpc.mentor.getMentee.useQuery({ id: menteeId }, { enabled: !!menteeId });

  // Load mentee portal answers for pre-fill
  const { data: menteeAnswers } = trpc.pillarFeedback.getAnswers.useQuery(
    { menteeId, pillarId: 7 },
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
    const objecoesVal = getMenteeAnswer("objecoes_comuns", "p7_objecoes");
    const tratamentoVal = getMenteeAnswer("apresentacao_tratamento", "p7_como_apresenta");
    const respostaObjecaoVal = getMenteeAnswer("objecoes_comuns", "p7_como_responde_objecao");
    if (objecoesVal) setCustomObjection(p => p || objecoesVal);
    if (tratamentoVal) setTratamento(p => p || tratamentoVal);
    if (respostaObjecaoVal) setNotes(p => Object.keys(p).length ? p : { 1: respostaObjecaoVal });
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

  const genObjection = trpc.pillarTools.generateObjectionResponse.useMutation({
    onSuccess: (data) => setObjResult(data),
    onError: () => toast.error("Erro ao gerar resposta. Tente novamente."),
  });

  const saveDiagnostic = trpc.mentor.savePillarDiagnostic.useMutation({
    onSuccess: () => toast.success("Anotações salvas com sucesso."),
    onError: () => toast.error("Erro ao salvar anotações."),
  });

  const handleSave = () => {
    saveDiagnostic.mutate({
      menteeId,
      pillarId: 7,
      respostasJson: { pnlNotes: notes, objResult, checklist },
    });
  };

  const handleGenerate = () => {
    const objecao = customObjection || selectedObjection;
    if (!objecao) return;
    genObjection.mutate({
      menteeId,
      objecao,
      especialidade: mentee?.especialidade || undefined,
      tratamento: tratamento || undefined,
      estilo,
    });
  };

  const handleCopy = () => {
    if (!objResult) return;
    const text = `OBJEÇÃO: "${customObjection || selectedObjection}"\n\nRESPOSTA PRINCIPAL:\n"${objResult.resposta_principal}"\n\nTÉCNICA: ${objResult.tecnica_usada}\n${objResult.explicacao_tecnica}\n\nVARIAÇÃO ALTERNATIVA:\n"${objResult.variacao_alternativa}"\n\nDICA COMPORTAMENTAL:\n${objResult.dica_comportamental}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleSection = (s: string) => setOpenSection(openSection === s ? "" : s);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-violet-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(`/mentor/mentorado/${menteeId}`)} className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
              <ChevronLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-violet-600 text-white text-xs font-bold flex items-center justify-center">7</span>
                <h1 className="font-bold text-slate-900">Pilar 7 — Vendas e Comunicação</h1>
              </div>
              {mentee && <p className="text-sm text-slate-500 mt-0.5">{mentee.nome}</p>}
            </div>
          </div>
          <button onClick={handleSave} disabled={saveDiagnostic.isPending}
            className="bg-violet-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-violet-700 transition-colors disabled:opacity-50">
            {saveDiagnostic.isPending ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">

        {/* WOW Banner */}
        <div className="bg-gradient-to-r from-violet-600 to-purple-600 rounded-2xl p-5 text-white">
          <div className="flex items-start gap-3">
            <MessageSquare className="w-8 h-8 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-lg">O que trava hoje</p>
              <p className="text-violet-100 mt-1">Excelente clínico, mas perde pacientes na hora de comunicar o valor do tratamento. Sente que "vender" é incompatível com a ética médica.</p>
              <div className="mt-3 bg-white bg-opacity-20 rounded-xl p-3">
                <p className="font-bold text-sm">💡 Reframe central para a sessão:</p>
                <p className="italic mt-1 text-sm">"O médico que não sabe comunicar valor não está sendo mais ético — está deixando o paciente sem o melhor tratamento."</p>
              </div>
            </div>
          </div>
        </div>

        {/* Section 1: Roteiro PNL */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <button onClick={() => toggleSection("roteiro")} className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-colors">
            <div className="flex items-center gap-3">
              <Brain className="w-5 h-5 text-violet-600" />
              <span className="font-bold text-slate-900">Roteiro de Investigação com PNL</span>
              <span className="text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full">3 perguntas</span>
            </div>
            {openSection === "roteiro" ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
          </button>

          {openSection === "roteiro" && (
            <div className="px-5 pb-5 space-y-3 border-t border-slate-100">
              <p className="text-sm text-slate-500 pt-3">Perguntas que revelam a relação do médico com vendas e comunicação — o tema mais carregado de crenças limitantes.</p>
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

        {/* Section 2: Simulador de Objeções — WOW TOOL */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <button onClick={() => toggleSection("simulador")} className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-colors">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-violet-600" />
              <span className="font-bold text-slate-900">Simulador de Objeções com IA</span>
              <span className="text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full">Script personalizado</span>
            </div>
            {openSection === "simulador" ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
          </button>

          {openSection === "simulador" && (
            <div className="px-5 pb-5 border-t border-slate-100">
              <div className="pt-4 space-y-4">
                <div className="bg-violet-50 border border-violet-200 rounded-xl p-4">
                  <p className="text-sm text-violet-800 font-medium">Selecione uma objeção comum ou digite uma personalizada. A IA gera uma resposta ética e eficaz adaptada à especialidade do mentorado.</p>
                </div>

                {/* Objeções rápidas */}
                <div>
                  <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Objeções mais comuns</p>
                  <div className="flex flex-wrap gap-2">
                    {OBJECTIONS.map((obj) => (
                      <button key={obj}
                        onClick={() => { setSelectedObjection(obj); setCustomObjection(""); setObjResult(null); }}
                        className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${selectedObjection === obj && !customObjection ? "bg-violet-600 text-white border-violet-600" : "bg-white text-slate-600 border-slate-200 hover:border-violet-400"}`}>
                        {obj}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Objeção personalizada */}
                <div>
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Ou digite uma objeção específica</label>
                  <input value={customObjection}
                    onChange={(e) => { setCustomObjection(e.target.value); setSelectedObjection(""); setObjResult(null); }}
                    placeholder="Ex: O plano de saúde cobre esse procedimento?"
                    className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
                </div>

                {/* Contexto */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Tratamento em discussão</label>
                    <input value={tratamento} onChange={(e) => setTratamento(e.target.value)}
                      placeholder="Ex: bloqueio neural, botox, cirurgia..."
                      className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Estilo de resposta</label>
                    <select value={estilo} onChange={(e) => setEstilo(e.target.value as typeof estilo)}
                      className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white">
                      <option value="empático">Empático</option>
                      <option value="direto">Direto</option>
                      <option value="consultivo">Consultivo</option>
                    </select>
                  </div>
                </div>

                <button
                  onClick={handleGenerate}
                  disabled={(!selectedObjection && !customObjection) || genObjection.isPending}
                  className="w-full bg-violet-600 text-white py-3 rounded-xl font-semibold hover:bg-violet-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  {genObjection.isPending ? "Gerando script com IA..." : "Gerar Script de Resposta"}
                </button>

                {objResult && (
                  <div className="space-y-3">
                    <div className="bg-violet-50 border border-violet-300 rounded-xl p-5">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-semibold text-violet-700 uppercase tracking-wide">Resposta Principal</p>
                        <div className="flex gap-2">
                          <button onClick={handleCopy}
                            className="flex items-center gap-1 text-xs text-violet-600 hover:text-violet-800 transition-colors">
                            <Copy className="w-3 h-3" />
                            {copied ? "Copiado!" : "Copiar tudo"}
                          </button>
                          <button onClick={() => { setObjResult(null); handleGenerate(); }}
                            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 transition-colors">
                            <RefreshCw className="w-3 h-3" />
                            Regenerar
                          </button>
                        </div>
                      </div>
                      <p className="text-sm font-medium text-violet-900 italic leading-relaxed">"{objResult.resposta_principal}"</p>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                        <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">Técnica: {objResult.tecnica_usada}</p>
                        <p className="text-sm text-blue-800">{objResult.explicacao_tecnica}</p>
                      </div>
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                        <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Variação Alternativa</p>
                        <p className="text-sm text-slate-700 italic">"{objResult.variacao_alternativa}"</p>
                      </div>
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                        <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">Dica Comportamental</p>
                        <p className="text-sm text-amber-800">{objResult.dica_comportamental}</p>
                      </div>
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
                    pillarId: 7,
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
                    <p className="text-green-800 font-bold">🎯 Pilar 7 concluído!</p>
                    <p className="text-green-700 text-sm mt-1">O mentorado comunica valor com confiança e converte mais sem abrir mão da ética.</p>
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
