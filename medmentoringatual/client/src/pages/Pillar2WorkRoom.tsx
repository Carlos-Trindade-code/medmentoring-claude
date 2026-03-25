import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { ChevronLeft, ChevronDown, ChevronUp, Sparkles, Target, CheckCircle2, Circle, Brain, Star, AlertTriangle, TrendingUp, Lightbulb } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";

// ─── PNL Questions for Pilar 2 ───────────────────────────────────────────────
const PNL_QUESTIONS = [
  {
    id: 1,
    pergunta: "Se pudesse escolher apenas 10 pacientes para sempre, quem seriam? Descreva cada um.",
    motivo: "Força a concretização do público ideal. A maioria dos médicos nunca pensou nisso — a pergunta em si já é uma intervenção.",
    angustia: "Medo de perder pacientes ao se especializar",
    tecnica: "Reframe de Abundância",
    como_aplicar: "\"Generalista fideliza poucos, especialista fideliza muito mais. Qual paciente prefere: o que compara preço ou o que não encontra alternativa?\"",
    cor: "blue",
  },
  {
    id: 2,
    pergunta: "O que te diferencia de um médico com a mesma especialidade na mesma cidade?",
    motivo: "Testa se o diferencial existe e se o médico consegue articulá-lo. A incapacidade de responder é o diagnóstico.",
    angustia: "Não sabe como comunicar o diferencial",
    tecnica: "Chunking Down",
    como_aplicar: "\"Pense no último paciente que te escolheu em vez de outro médico. O que ele disse? O que você fez diferente?\"",
    cor: "purple",
  },
  {
    id: 3,
    pergunta: "Qual comportamento seu está inconsistente com o médico que quer ser percebido?",
    motivo: "Abre a consciência para as incongruências entre identidade desejada e comportamento real. Sem essa pergunta, o posicionamento fica no papel.",
    angustia: "Sente arrogância em se posicionar como especialista",
    tecnica: "Reframe de Serviço",
    como_aplicar: "\"Não se posicionar é injusto com o paciente que precisa de você — ele não vai te encontrar. Especialização é serviço, não vaidade.\"",
    cor: "green",
  },
  {
    id: 4,
    pergunta: "Se um paciente ideal te descrevesse a um amigo, o que você gostaria que ele dissesse?",
    motivo: "Constrói o posicionamento de trás para frente — a partir da percepção desejada, não da oferta disponível.",
    angustia: "Insegurança sobre viabilidade financeira do nicho",
    tecnica: "Reframe de Perspectiva",
    como_aplicar: "\"Posicionamento é um experimento de 90 dias, não uma sentença. O que você pode testar sem comprometer o que já tem?\"",
    cor: "orange",
  },
];

const CHECKLIST_ITEMS = [
  "Público-alvo definido com profundidade (perfil demográfico e psicográfico)",
  "Posicionamento declarado em uma frase que o paciente ideal entende e repete",
  "Viabilidade financeira do posicionamento avaliada com critérios objetivos",
  "Comportamentos coerentes com o posicionamento listados",
  "Incongruências entre comportamento e posicionamento identificadas",
  "Padrões limitantes com plano de dissolução definido",
];

const COR_MAP: Record<string, string> = {
  blue: "bg-blue-50 border-blue-200 text-blue-800",
  purple: "bg-purple-50 border-purple-200 text-purple-800",
  green: "bg-green-50 border-green-200 text-green-800",
  orange: "bg-orange-50 border-orange-200 text-orange-800",
};

const BADGE_MAP: Record<string, string> = {
  blue: "bg-blue-100 text-blue-700",
  purple: "bg-purple-100 text-purple-700",
  green: "bg-green-100 text-green-700",
  orange: "bg-orange-100 text-orange-700",
};

type DiffResult = {
  score: number;
  classificacao: string;
  pontos_fortes: string[];
  pontos_fracos: string[];
  sugestao_melhorada: string;
  explicacao: string;
};

type PosResult = {
  versao_1: string;
  versao_2: string;
  versao_3: string;
  recomendada: string;
  motivo_recomendacao: string;
};

export default function Pillar2WorkRoom() {
  const params = useParams<{ menteeId: string }>();
  const menteeId = parseInt(params.menteeId || "0");
  const [, navigate] = useLocation();
  const { user, loading: authLoading } = useAuth();


  // Sections open/close
  const [openSection, setOpenSection] = useState<string>("roteiro");

  // PNL roteiro
  const [openQuestion, setOpenQuestion] = useState<number | null>(null);
  const [notes, setNotes] = useState<Record<number, string>>({});

  // Differential test
  const [diferencial, setDiferencial] = useState("");
  const [diffResult, setDiffResult] = useState<DiffResult | null>(null);

  // Positioning statement builder
  const [publico, setPublico] = useState("");
  const [resultado, setResultado] = useState("");
  const [diferencialPos, setDiferencialPos] = useState("");
  const [posResult, setPosResult] = useState<PosResult | null>(null);

  // Checklist (DB-backed)
  const utils = trpc.useUtils();
  const { data: checklistData } = trpc.mentor.getChecklist.useQuery({ menteeId });
  const updateChecklistItem = trpc.mentor.updateChecklistItem.useMutation({
    onSuccess: () => utils.mentor.getChecklist.invalidate({ menteeId }),
  });
  const pillarChecklist = (checklistData ?? []).filter((c: any) => c.pillarId === 2);
  const checklist = CHECKLIST_ITEMS.map((_item, i) => {
    const saved = pillarChecklist.find((c: any) => c.itemIndex === i);
    return saved?.status === "completed";
  });
  const completedCount = checklist.filter(Boolean).length;

  // Mentee data
  const { data: mentee } = trpc.mentor.getMentee.useQuery({ id: menteeId }, { enabled: !!menteeId });

  // Load mentee portal answers for pre-fill
  const { data: menteeAnswers } = trpc.pillarFeedback.getAnswers.useQuery(
    { menteeId, pillarId: 2 },
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
    const diferencialVal = getMenteeAnswer("diferencial", "p2_diferencial_tecnico") ||
      getMenteeAnswer("diferencial", "p2_por_que_escolhem");
    const publicoVal = getMenteeAnswer("publico_ideal", "p2_paciente_ideal_descricao");
    const resultadoVal = getMenteeAnswer("publico_ideal", "p2_paciente_sonho");
    const diferencialPosVal = getMenteeAnswer("diferencial", "p2_diferencial_atendimento");
    if (diferencialVal) setDiferencial(p => p || diferencialVal);
    if (publicoVal) setPublico(p => p || publicoVal);
    if (resultadoVal) setResultado(p => p || resultadoVal);
    if (diferencialPosVal) setDiferencialPos(p => p || diferencialPosVal);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menteeAnswers]);

  // Mutations
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

  const evalDiff = trpc.pillarTools.evaluateDifferential.useMutation({
    onSuccess: (data) => setDiffResult(data),
    onError: () => toast.error("Erro ao avaliar diferencial. Tente novamente."),
  });

  const genPos = trpc.pillarTools.generatePositioningStatement.useMutation({
    onSuccess: (data) => setPosResult(data),
    onError: () => toast.error("Erro ao gerar frase. Tente novamente."),
  });

  // Save notes
  const saveDiagnostic = trpc.mentor.savePillarDiagnostic.useMutation({
    onSuccess: () => toast.success("Anotações salvas com sucesso."),
    onError: () => toast.error("Erro ao salvar anotações."),
  });

  const handleSaveNotes = () => {
    saveDiagnostic.mutate({
      menteeId,
      pillarId: 2,
      respostasJson: { pnlNotes: notes, diferencial, checklist },
      analiseEstrategica: diffResult ? `Score: ${diffResult.score}/10 | ${diffResult.classificacao}\n${diffResult.explicacao}\nSugestão: ${diffResult.sugestao_melhorada}` : undefined,
      tecnicasJson: posResult || undefined,
    });
  };

  const toggleSection = (s: string) => setOpenSection(openSection === s ? "" : s);
  const scoreColor = diffResult
    ? diffResult.score >= 7 ? "text-green-600" : diffResult.score >= 4 ? "text-yellow-600" : "text-red-600"
    : "";
  const scoreBg = diffResult
    ? diffResult.score >= 7 ? "bg-green-50 border-green-200" : diffResult.score >= 4 ? "bg-yellow-50 border-yellow-200" : "bg-red-50 border-red-200"
    : "";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(`/mentor/mentorado/${menteeId}`)} className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
              <ChevronLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-purple-600 text-white text-xs font-bold flex items-center justify-center">2</span>
                <h1 className="font-bold text-slate-900">Pilar 2 — Posicionamento</h1>
              </div>
              {mentee && <p className="text-sm text-slate-500 mt-0.5">{mentee.nome}</p>}
            </div>
          </div>
          <button onClick={handleSaveNotes} disabled={saveDiagnostic.isPending}
            className="bg-purple-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50">
            {saveDiagnostic.isPending ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">

        {/* WOW Banner */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-5 text-white">
          <div className="flex items-start gap-3">
            <Target className="w-8 h-8 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-lg">O que trava hoje</p>
              <p className="text-purple-100 mt-1">Atende todo tipo de paciente, não tem diferencial claro no mercado. A ausência de posicionamento é uma decisão — ela apenas não foi tomada conscientemente.</p>
              <p className="mt-3 font-semibold text-white">Promessa do pilar: Uma posição clara, viável e memorável no mercado. O paciente ideal sabe encontrá-lo e sabe por que o escolhe.</p>
            </div>
          </div>
        </div>

        {/* Section 1: Roteiro PNL */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <button onClick={() => toggleSection("roteiro")} className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-colors">
            <div className="flex items-center gap-3">
              <Brain className="w-5 h-5 text-purple-600" />
              <span className="font-bold text-slate-900">Roteiro de Investigação com PNL</span>
              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">4 perguntas</span>
            </div>
            {openSection === "roteiro" ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
          </button>

          {openSection === "roteiro" && (
            <div className="px-5 pb-5 space-y-3 border-t border-slate-100">
              <p className="text-sm text-slate-500 pt-3">Clique em cada pergunta para ver o motivo estratégico, a angústia que pode emergir e a técnica de PNL recomendada.</p>
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
                          className="w-full bg-white bg-opacity-80 border border-current border-opacity-30 rounded-lg p-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-current focus:ring-opacity-30"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 2: Teste do Diferencial — WOW TOOL */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <button onClick={() => toggleSection("diferencial")} className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-colors">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              <span className="font-bold text-slate-900">Teste do Diferencial</span>
              <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">IA avalia</span>
            </div>
            {openSection === "diferencial" ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
          </button>

          {openSection === "diferencial" && (
            <div className="px-5 pb-5 border-t border-slate-100">
              <div className="pt-4 space-y-4">
                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                  <p className="text-sm text-indigo-800 font-medium">Peça ao mentorado que descreva seu diferencial em 1-2 frases, como se estivesse se apresentando a um paciente novo. Cole a resposta abaixo e a IA avalia se é genérico, mediano ou único.</p>
                </div>
                <textarea
                  value={diferencial}
                  onChange={(e) => setDiferencial(e.target.value)}
                  placeholder="Ex: Sou cardiologista especializado em prevenção cardiovascular para executivos de alto desempenho, com foco em longevidade e performance..."
                  rows={4}
                  className="w-full border border-slate-200 rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  onClick={() => evalDiff.mutate({ menteeId, diferencial, especialidade: mentee?.especialidade || undefined })}
                  disabled={diferencial.length < 10 || evalDiff.isPending}
                  className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  {evalDiff.isPending ? "Avaliando com IA..." : "Avaliar Diferencial com IA"}
                </button>

                {diffResult && (
                  <div className={`rounded-xl border p-5 space-y-4 ${scoreBg}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Classificação</p>
                        <p className={`text-2xl font-bold capitalize ${scoreColor}`}>{diffResult.classificacao}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Score</p>
                        <p className={`text-4xl font-bold ${scoreColor}`}>{diffResult.score}<span className="text-lg text-slate-400">/10</span></p>
                      </div>
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed">{diffResult.explicacao}</p>
                    {diffResult.pontos_fortes.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-green-700 mb-2 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Pontos Fortes</p>
                        <ul className="space-y-1">
                          {diffResult.pontos_fortes.map((p, i) => (
                            <li key={i} className="text-sm text-green-800 flex items-start gap-2"><CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />{p}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {diffResult.pontos_fracos.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-red-700 mb-2 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> O que falta</p>
                        <ul className="space-y-1">
                          {diffResult.pontos_fracos.map((p, i) => (
                            <li key={i} className="text-sm text-red-800 flex items-start gap-2"><AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />{p}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div className="bg-white rounded-lg p-4 border border-current border-opacity-20">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2 flex items-center gap-1"><Lightbulb className="w-3 h-3" /> Versão Aprimorada pela IA</p>
                      <p className="text-sm font-medium text-slate-800 italic">"{diffResult.sugestao_melhorada}"</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Section 3: Construtor de Frase de Posicionamento */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <button onClick={() => toggleSection("posicionamento")} className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-colors">
            <div className="flex items-center gap-3">
              <Star className="w-5 h-5 text-amber-500" />
              <span className="font-bold text-slate-900">Construtor de Frase de Posicionamento</span>
              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">3 versões</span>
            </div>
            {openSection === "posicionamento" ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
          </button>

          {openSection === "posicionamento" && (
            <div className="px-5 pb-5 border-t border-slate-100">
              <div className="pt-4 space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <p className="text-sm text-amber-800 font-medium">Template: <span className="font-bold">"Eu ajudo [quem] a [resultado] através de [diferencial]"</span></p>
                  <p className="text-xs text-amber-700 mt-1">Preencha os campos abaixo com as respostas do mentorado e a IA gera 3 versões refinadas.</p>
                </div>
                <div className="grid gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Público-alvo (quem)</label>
                    <input value={publico} onChange={(e) => setPublico(e.target.value)}
                      placeholder="Ex: executivos com síndrome metabólica acima de 40 anos"
                      className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Resultado entregue</label>
                    <input value={resultado} onChange={(e) => setResultado(e.target.value)}
                      placeholder="Ex: recuperar energia, performance e qualidade de vida"
                      className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Diferencial único</label>
                    <input value={diferencialPos} onChange={(e) => setDiferencialPos(e.target.value)}
                      placeholder="Ex: um protocolo integrativo que combina cardiologia e medicina do estilo de vida"
                      className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
                  </div>
                </div>
                <button
                  onClick={() => genPos.mutate({ menteeId, publico, resultado, diferencial: diferencialPos, especialidade: mentee?.especialidade || undefined })}
                  disabled={!publico || !resultado || !diferencialPos || genPos.isPending}
                  className="w-full bg-amber-500 text-white py-3 rounded-xl font-semibold hover:bg-amber-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  {genPos.isPending ? "Gerando com IA..." : "Gerar 3 Versões com IA"}
                </button>

                {posResult && (
                  <div className="space-y-3">
                    {[
                      { key: "versao_1", label: "Versão 1" },
                      { key: "versao_2", label: "Versão 2" },
                      { key: "versao_3", label: "Versão 3" },
                    ].map(({ key, label }) => {
                      const isRec = posResult.recomendada === key;
                      return (
                        <div key={key} className={`rounded-xl border p-4 ${isRec ? "border-amber-400 bg-amber-50" : "border-slate-200 bg-slate-50"}`}>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-semibold text-slate-500">{label}</span>
                            {isRec && <span className="text-xs bg-amber-500 text-white px-2 py-0.5 rounded-full font-semibold">Recomendada pela IA</span>}
                          </div>
                          <p className="text-sm font-medium text-slate-800 italic">"{posResult[key as keyof PosResult]}"</p>
                        </div>
                      );
                    })}
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                      <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">Por que a IA recomenda esta versão</p>
                      <p className="text-sm text-blue-800">{posResult.motivo_recomendacao}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Section 4: Checklist */}
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
                    pillarId: 2,
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
                    <p className="text-green-800 font-bold">🎯 Pilar 2 concluído!</p>
                    <p className="text-green-700 text-sm mt-1">O mentorado tem um posicionamento claro, viável e memorável.</p>
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
