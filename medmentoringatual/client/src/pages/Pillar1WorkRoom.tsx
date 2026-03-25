import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  ArrowLeft, Brain, ChevronDown, ChevronRight, Save, CheckCircle2,
  AlertTriangle, Lightbulb, Heart, Zap, Globe, DollarSign,
  Target, Star, Eye, BookOpen, Compass, Sparkles, Lock
} from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";

// ─── IKIGAI DATA ──────────────────────────────────────────────────────────────
const IKIGAI_CIRCLES = [
  {
    id: "ama",
    label: "O que você AMA",
    icon: Heart,
    color: "#E74C3C",
    colorLight: "#FDECEA",
    description: "Atividades, especialidades e momentos que te dão energia e prazer genuíno na medicina",
    questions: [
      "Qual tipo de caso clínico faz você esquecer o tempo enquanto trabalha?",
      "Quando você termina um dia se sentindo pleno — o que aconteceu naquele dia?",
      "Que parte da medicina você faria mesmo sem ser pago?",
      "Qual resultado entregou a um paciente que te deixou genuinamente orgulhoso?",
      "Se pudesse escolher apenas um tipo de paciente para sempre, quem seria?",
    ],
    placeholder: "Ex: Procedimentos de alta complexidade que exigem raciocínio clínico apurado; acompanhar pacientes crônicos ao longo do tempo; ensinar residentes...",
  },
  {
    id: "bom",
    label: "No que você é BOM",
    icon: Zap,
    color: "#F39C12",
    colorLight: "#FEF9E7",
    description: "Suas habilidades técnicas, competências únicas e diferenciais que colegas reconhecem",
    questions: [
      "O que você faz que nenhum colega da sua especialidade faz igual?",
      "Qual habilidade técnica você domina melhor do que a maioria?",
      "Para que tipo de caso os colegas te pedem opinião ou encaminham pacientes?",
      "Que tipo de médico você admira e por quê? O que isso diz sobre você?",
      "Qual foi o feedback mais marcante que um paciente ou colega te deu?",
    ],
    placeholder: "Ex: Diagnóstico diferencial em casos complexos; procedimentos minimamente invasivos; comunicação empática com pacientes difíceis; gestão de dor crônica refratária...",
  },
  {
    id: "mundo",
    label: "O que o mundo PRECISA",
    icon: Globe,
    color: "#27AE60",
    colorLight: "#E9F7EF",
    description: "Lacunas reais no mercado médico local e necessidades não atendidas dos pacientes",
    questions: [
      "Qual problema de saúde na sua região é mal tratado ou subdiagnosticado?",
      "Que queixa você ouve repetidamente de pacientes que não encontram solução?",
      "Qual tipo de paciente chega até você sem ter sido bem atendido antes?",
      "O que falta na sua cidade em termos de cuidado médico especializado?",
      "Qual tecnologia ou abordagem você domina que poucos colegas oferecem?",
    ],
    placeholder: "Ex: Pacientes com dor crônica sem diagnóstico preciso; falta de abordagem integrativa; ausência de especialista em determinada área na região...",
  },
  {
    id: "pago",
    label: "Pelo que você pode ser PAGO",
    icon: DollarSign,
    color: "#2980B9",
    colorLight: "#D6EAF8",
    description: "Serviços e especialidades com demanda real e disposição de pagamento no seu mercado",
    questions: [
      "Qual serviço seus pacientes pagariam mais sem questionar o preço?",
      "Que procedimento ou consulta tem maior demanda reprimida na sua área?",
      "Qual público tem maior capacidade de investimento em saúde na sua cidade?",
      "O que você oferece que os planos de saúde não cobrem e os pacientes buscam?",
      "Qual é o seu serviço com maior margem e menor custo operacional?",
    ],
    placeholder: "Ex: Consultas de segunda opinião para casos complexos; procedimentos estéticos médicos; medicina preventiva e longevidade; tratamentos não cobertos por planos...",
  },
];

// ─── MISSÃO GUIADA ────────────────────────────────────────────────────────────
const MISSAO_STEPS = [
  {
    id: "quem",
    label: "Para quem você trabalha?",
    question: "Descreva o perfil do paciente que você quer impactar. Seja específico: idade, condição, momento de vida, nível de consciência sobre saúde.",
    hint: "Evite 'qualquer pessoa'. Quanto mais específico, mais poderosa a missão.",
    placeholder: "Ex: Adultos entre 40–65 anos com dor crônica que já tentaram múltiplos tratamentos sem resultado e buscam uma solução definitiva baseada em ciência...",
  },
  {
    id: "problema",
    label: "Qual problema você resolve?",
    question: "Qual é a dor real — física, emocional ou funcional — que você elimina da vida do paciente? Não o diagnóstico, mas o impacto na vida dele.",
    hint: "Pense no 'antes e depois' do paciente. O que ele não conseguia fazer antes e passa a fazer depois?",
    placeholder: "Ex: Devolver a capacidade de dormir, trabalhar e se movimentar sem dor, sem depender de medicamentos que entorpecem a vida...",
  },
  {
    id: "como",
    label: "Como você faz isso de forma única?",
    question: "Qual é o seu método, abordagem ou diferencial que torna sua solução diferente de tudo que o paciente já tentou?",
    hint: "Este é o seu 'como' — a tecnologia, o raciocínio clínico, a abordagem que só você oferece.",
    placeholder: "Ex: Através de diagnóstico de precisão com tecnologia de imagem guiada, identificando a causa biológica exata da dor e tratando com intervenções minimamente invasivas...",
  },
  {
    id: "impacto",
    label: "Qual é o impacto maior?",
    question: "Além do tratamento, qual transformação de vida você proporciona? O que o paciente recupera além da saúde física?",
    hint: "Pense em liberdade, identidade, relações, trabalho, qualidade de vida.",
    placeholder: "Ex: Recuperar a identidade de pessoa ativa, presente e capaz — devolver ao paciente o controle sobre a própria vida...",
  },
];

// ─── VISÃO GUIADA ─────────────────────────────────────────────────────────────
const VISAO_STEPS = [
  {
    id: "cenario5",
    label: "Cenário em 5 anos",
    question: "Imagine que são 2030 e sua carreira está exatamente como você sempre quis. Descreva o que vê: onde você atende, quem são seus pacientes, como é sua semana de trabalho.",
    hint: "Seja visual e concreto. Quantos pacientes por semana? Que tipo de caso? Qual é a sua reputação?",
    placeholder: "Ex: Tenho uma clínica boutique com 3 salas, atendo 15 pacientes/semana por encaminhamento, sou referência regional em dor crônica intervencionista...",
  },
  {
    id: "reconhecimento",
    label: "Como você quer ser reconhecido?",
    question: "Quando um colega te menciona para um paciente, o que você quer que ele diga? Qual é a frase que define sua reputação ideal?",
    hint: "Este é o seu posicionamento futuro — a percepção que você quer construir.",
    placeholder: "Ex: 'Ele é o médico que resolve os casos que ninguém conseguiu resolver. Usa tecnologia que poucos têm e pensa diferente.'",
  },
  {
    id: "legado",
    label: "Qual é o seu legado?",
    question: "Daqui a 20 anos, quando você olhar para trás, o que precisará ter acontecido para sentir que valeu a pena? Que impacto deixou na medicina e nos seus pacientes?",
    hint: "Pense além do consultório: ensino, pesquisa, comunidade, inovação.",
    placeholder: "Ex: Ter formado uma nova geração de médicos que tratam a dor de forma mais humana e eficaz; ter contribuído para que menos pacientes dependam de opioides...",
  },
];

// ─── VALORES GUIADOS ──────────────────────────────────────────────────────────
const VALORES_CATALOGO = [
  { valor: "Excelência clínica", descricao: "Buscar o melhor resultado técnico possível em cada caso" },
  { valor: "Empatia genuína", descricao: "Sentir e compreender a experiência do paciente" },
  { valor: "Honestidade radical", descricao: "Dizer a verdade mesmo quando é difícil" },
  { valor: "Inovação contínua", descricao: "Buscar sempre o que há de mais avançado na medicina" },
  { valor: "Autonomia do paciente", descricao: "Empoderar o paciente a participar das decisões" },
  { valor: "Educação em saúde", descricao: "Ensinar o paciente a entender sua condição" },
  { valor: "Integridade científica", descricao: "Basear decisões em evidências, não em modismos" },
  { valor: "Presença total", descricao: "Estar completamente presente em cada consulta" },
  { valor: "Resultados concretos", descricao: "Comprometer-se com desfechos mensuráveis" },
  { valor: "Cuidado integral", descricao: "Tratar o ser humano, não apenas a doença" },
  { valor: "Liberdade terapêutica", descricao: "Oferecer alternativas não farmacológicas e não cirúrgicas" },
  { valor: "Responsabilidade", descricao: "Assumir o resultado do tratamento como próprio" },
  { valor: "Curiosidade intelectual", descricao: "Nunca parar de aprender e questionar" },
  { valor: "Impacto social", descricao: "Usar a medicina para transformar comunidades" },
  { valor: "Equilíbrio vida-trabalho", descricao: "Ser um médico sustentável, não um mártir" },
  { valor: "Colaboração", descricao: "Trabalhar em equipe e valorizar outros profissionais" },
];

// ─── PERGUNTAS ESTRATÉGICAS DO MENTOR ────────────────────────────────────────
const PERGUNTAS_MENTOR = [
  {
    pergunta: "O que você faria profissionalmente se soubesse que não poderia falhar?",
    motivo: "Desativa o filtro do medo e acessa o desejo genuíno. A resposta revela o propósito real que o médico censura por julgá-lo inviável.",
    angustia: "Síndrome do impostor — 'não sou bom o suficiente para isso'",
    tecnica: "Linha do Tempo + Evidências — conduza-o a 3 momentos de resultado real e ancore como prova concreta contra o impostor",
  },
  {
    pergunta: "Que tipo de médico você admira e por quê? O que isso diz sobre você?",
    motivo: "O que admiramos nos outros é o que reconhecemos como possível em nós mesmos. Mapeia valores e potenciais não declarados.",
    angustia: "Medo do julgamento dos colegas — 'quem sou eu para me comparar a ele?'",
    tecnica: "Modelagem de Excelência — 'você já fez algo parecido, mesmo que menor. O que fez diferente naquela vez?'",
  },
  {
    pergunta: "Quando você termina um dia se sentindo pleno — o que aconteceu naquele dia?",
    motivo: "Identifica os contextos de alta performance e satisfação. O que está presente nos dias bons é o que precisa ser amplificado.",
    angustia: "Conflito entre o que ama fazer e o que gera dinheiro",
    tecnica: "Chunking Up — 'para que você quer dinheiro? E para que serve isso?' Conecta propósito à liberdade que o dinheiro proporciona",
  },
  {
    pergunta: "Qual resultado entregou a um paciente que te deixou genuinamente orgulhoso?",
    motivo: "Ancora evidências concretas de competência. Combate diretamente a síndrome do impostor com fatos, não com afirmações.",
    angustia: "Dificuldade em definir o propósito — 'não sei o que me move'",
    tecnica: "Âncora de Estado de Pico — no pico do relato, aplique âncora (gesto ou palavra) para reativar o estado quando necessário",
  },
];

// ─── CHECKLIST DO PILAR ───────────────────────────────────────────────────────
const CHECKLIST_PILAR = [
  "Propósito declarado em uma frase clara e autêntica",
  "Ikigai mapeado nas 4 dimensões (amor, habilidade, necessidade, remuneração)",
  "Mínimo 2 potenciais únicos identificados e nomeados",
  "3–5 valores inegociáveis com manifestações práticas no dia a dia",
  "Missão construída pelo mentorado com as próprias palavras",
  "Visão de 5 anos concreta e inspiradora",
  "Bloqueios reconhecidos: síndrome do impostor, relação com dinheiro, perfeccionismo",
  "Linha central da mentoria traçada e validada pelo mentor",
];

// ─── COMPONENT ────────────────────────────────────────────────────────────────
export default function Pillar1WorkRoom() {
  const { menteeId } = useParams<{ menteeId: string }>();
  const [, navigate] = useLocation();
  const { user, loading: authLoading } = useAuth();

  const mid = Number(menteeId);

  // Tabs
  const [activeTab, setActiveTab] = useState<"mentor" | "ikigai" | "missao" | "visao" | "valores" | "checklist">("mentor");

  // Ikigai state
  const [ikigaiAnswers, setIkigaiAnswers] = useState<Record<string, string>>({ ama: "", bom: "", mundo: "", pago: "" });
  const [ikigaiProposta, setIkigaiProposta] = useState("");
  const [expandedCircle, setExpandedCircle] = useState<string | null>("ama");

  // Missão state
  const [missaoAnswers, setMissaoAnswers] = useState<Record<string, string>>({ quem: "", problema: "", como: "", impacto: "" });
  const [missaoFinal, setMissaoFinal] = useState("");

  // Visão state
  const [visaoAnswers, setVisaoAnswers] = useState<Record<string, string>>({ cenario5: "", reconhecimento: "", legado: "" });
  const [visaoFinal, setVisaoFinal] = useState("");

  // Valores state
  const [valoresSelecionados, setValoresSelecionados] = useState<string[]>([]);
  const [valoresCustom, setValoresCustom] = useState("");
  const [valoresManifestacoes, setValoresManifestacoes] = useState<Record<string, string>>({});

  // Mentor notes state
  const [mentorNotes, setMentorNotes] = useState<Record<number, string>>({});
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(0);
  // Checklist (DB-backed)
  const utils = trpc.useUtils();
  const { data: checklistData } = trpc.mentor.getChecklist.useQuery({ menteeId: mid });
  const updateChecklistItem = trpc.mentor.updateChecklistItem.useMutation({
    onSuccess: () => utils.mentor.getChecklist.invalidate({ menteeId: mid }),
  });
  const pillarChecklist = (checklistData ?? []).filter((c: any) => c.pillarId === 1);
  const checklistStatus = CHECKLIST_PILAR.map((_item, i) => {
    const saved = pillarChecklist.find((c: any) => c.itemIndex === i);
    return saved?.status === "completed";
  });

  // Saving
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Load mentee info
  const { data: mentee } = trpc.mentor.getMentee.useQuery({ id: mid }, { enabled: !!mid });
  const { data: diagnostic } = trpc.mentor.getPillarDiagnostic.useQuery({ menteeId: mid, pillarId: 1 }, { enabled: !!mid });
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

  const saveDiagnostic = trpc.mentor.savePillarDiagnostic.useMutation();

  // Load mentee answers from portal (pillar_answers table)
  const { data: menteeAnswers } = trpc.pillarFeedback.getAnswers.useQuery(
    { menteeId: mid, pillarId: 1 },
    { enabled: !!mid }
  );

  // Helper: extract answer value from mentee's pillar_answers by question id
  const getMenteeAnswer = (sectionId: string, questionId: string): string => {
    if (!menteeAnswers) return "";
    const section = menteeAnswers.find(r => r.secao === sectionId);
    if (!section) return "";
    const respostas = section.respostas as Array<{ id: string; answer: string }> | null;
    if (!respostas) return "";
    const item = respostas.find(r => r.id === questionId);
    return item?.answer ?? "";
  };

  // Load saved data — mentor's own saves take priority; mentee answers fill empty fields
  useEffect(() => {
    if (diagnostic?.respostasJson) {
      const saved = diagnostic.respostasJson as Record<string, unknown>;
      if (saved.ikigaiAnswers) setIkigaiAnswers(saved.ikigaiAnswers as Record<string, string>);
      if (saved.ikigaiProposta) setIkigaiProposta(saved.ikigaiProposta as string);
      if (saved.missaoAnswers) setMissaoAnswers(saved.missaoAnswers as Record<string, string>);
      if (saved.missaoFinal) setMissaoFinal(saved.missaoFinal as string);
      if (saved.visaoAnswers) setVisaoAnswers(saved.visaoAnswers as Record<string, string>);
      if (saved.visaoFinal) setVisaoFinal(saved.visaoFinal as string);
      if (saved.valoresSelecionados) setValoresSelecionados(saved.valoresSelecionados as string[]);
      if (saved.valoresManifestacoes) setValoresManifestacoes(saved.valoresManifestacoes as Record<string, string>);
      if (saved.valoresCustom) setValoresCustom(saved.valoresCustom as string);
      if (saved.mentorNotes) setMentorNotes(saved.mentorNotes as Record<number, string>);
    }
  }, [diagnostic]);

  // Pre-fill from mentee answers when mentor hasn't saved yet
  useEffect(() => {
    if (!menteeAnswers || !menteeAnswers.length) return;
    // Only pre-fill if diagnostic hasn't been saved by mentor yet
    if (diagnostic?.respostasJson) return;

    // Ikigai
    const ama = getMenteeAnswer("ikigai", "p1_ikigai_ama");
    const bom = getMenteeAnswer("ikigai", "p1_ikigai_bom");
    const mundo = getMenteeAnswer("ikigai", "p1_ikigai_mundo");
    const pago = getMenteeAnswer("ikigai", "p1_ikigai_pago");
    const proposta = getMenteeAnswer("ikigai", "p1_ikigai_proposta");
    if (ama || bom || mundo || pago) {
      setIkigaiAnswers(prev => ({
        ama: prev.ama || ama,
        bom: prev.bom || bom,
        mundo: prev.mundo || mundo,
        pago: prev.pago || pago,
      }));
    }
    if (proposta) setIkigaiProposta(p => p || proposta);

    // Missão
    const quem = getMenteeAnswer("missao_construtor", "p1_missao_quem");
    const problema = getMenteeAnswer("missao_construtor", "p1_missao_problema");
    const como = getMenteeAnswer("missao_construtor", "p1_missao_como");
    const impacto = getMenteeAnswer("missao_construtor", "p1_missao_impacto");
    const missaoFinalVal = getMenteeAnswer("missao_construtor", "p1_missao_final");
    if (quem || problema || como || impacto) {
      setMissaoAnswers(prev => ({
        quem: prev.quem || quem,
        problema: prev.problema || problema,
        como: prev.como || como,
        impacto: prev.impacto || impacto,
      }));
    }
    if (missaoFinalVal) setMissaoFinal(p => p || missaoFinalVal);

    // Visão
    const cenario = getMenteeAnswer("visao_construtor", "p1_visao_cenario");
    const reconhecimento = getMenteeAnswer("visao_construtor", "p1_visao_reconhecimento");
    const legado = getMenteeAnswer("visao_construtor", "p1_visao_legado");
    const visaoFinalVal = getMenteeAnswer("visao_construtor", "p1_visao_final");
    if (cenario || reconhecimento || legado) {
      setVisaoAnswers(prev => ({
        cenario5: prev.cenario5 || cenario,
        reconhecimento: prev.reconhecimento || reconhecimento,
        legado: prev.legado || legado,
      }));
    }
    if (visaoFinalVal) setVisaoFinal(p => p || visaoFinalVal);

    // Valores
    const valoresCatalogo = getMenteeAnswer("valores_avancados", "p1_valores_catalogo");
    if (valoresCatalogo) {
      try {
        const parsed = JSON.parse(valoresCatalogo);
        if (Array.isArray(parsed)) setValoresSelecionados(prev => prev.length ? prev : parsed);
      } catch {
        // not JSON, ignore
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menteeAnswers, diagnostic]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveDiagnostic.mutateAsync({
        menteeId: mid,
        pillarId: 1,
        respostasJson: {
          ikigaiAnswers, ikigaiProposta,
          missaoAnswers, missaoFinal,
          visaoAnswers, visaoFinal,
          valoresSelecionados, valoresManifestacoes, valoresCustom,
          mentorNotes,
        },
        angustiasJson: [],
        tecnicasJson: [],
      });
      setLastSaved(new Date());
      toast.success("Progresso salvo com sucesso!");
    } catch {
      toast.error("Erro ao salvar. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  const toggleValor = (valor: string) => {
    setValoresSelecionados(prev =>
      prev.includes(valor) ? prev.filter(v => v !== valor) : prev.length < 7 ? [...prev, valor] : prev
    );
  };

  const completedChecklist = checklistStatus.filter(Boolean).length;
  const ikigaiFilled = Object.values(ikigaiAnswers).filter(v => v.trim().length > 20).length;
  const missaoFilled = Object.values(missaoAnswers).filter(v => v.trim().length > 20).length;

  const TABS = [
    { id: "mentor", label: "Roteiro do Mentor", icon: BookOpen, color: "text-purple-600", badge: null },
    { id: "ikigai", label: "Ikigai", icon: Compass, color: "text-red-500", badge: ikigaiFilled === 4 ? "✓" : `${ikigaiFilled}/4` },
    { id: "missao", label: "Missão", icon: Target, color: "text-orange-500", badge: missaoFinal ? "✓" : null },
    { id: "visao", label: "Visão", icon: Eye, color: "text-blue-500", badge: visaoFinal ? "✓" : null },
    { id: "valores", label: "Valores", icon: Star, color: "text-yellow-500", badge: valoresSelecionados.length > 0 ? `${valoresSelecionados.length}` : null },
    { id: "checklist", label: "Checklist", icon: CheckCircle2, color: "text-green-600", badge: `${completedChecklist}/${CHECKLIST_PILAR.length}` },
  ] as const;

  return (
    <div className="min-h-screen bg-[#F8F5F0]">
      {/* Header */}
      <div className="bg-[#1A3A5C] text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(`/mentor/mentorado/${menteeId}`)} className="hover:opacity-70 transition-opacity">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
            <Brain className="w-5 h-5 text-purple-300" />
          </div>
          <div>
            <div className="text-xs text-white/60 uppercase tracking-wider">Pilar 1</div>
            <div className="font-bold text-lg leading-tight">Identidade & Propósito</div>
          </div>
          {mentee && (
            <Badge className="ml-2 bg-white/10 text-white/80 border-white/20 text-xs">
              {mentee.nome}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3">
          {lastSaved && (
            <span className="text-xs text-white/50">Salvo {lastSaved.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
          )}
          <Button onClick={handleSave} disabled={saving} size="sm"
            className="bg-[#C9A84C] hover:bg-[#B8973B] text-white border-0">
            <Save className="w-4 h-4 mr-1" />
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="bg-[#1A3A5C]/10 px-6 py-2 flex items-center gap-4">
        <div className="flex-1 bg-white/50 rounded-full h-2">
          <div className="bg-[#C9A84C] h-2 rounded-full transition-all duration-500"
            style={{ width: `${(completedChecklist / CHECKLIST_PILAR.length) * 100}%` }} />
        </div>
        <span className="text-xs text-[#1A3A5C]/70 font-medium">{completedChecklist}/{CHECKLIST_PILAR.length} itens concluídos</span>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 px-6">
        <div className="flex gap-1 overflow-x-auto">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-[#1A3A5C] text-[#1A3A5C]"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}>
              <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? tab.color : ""}`} />
              {tab.label}
              {tab.badge && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  tab.badge === "✓" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                }`}>{tab.badge}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">

        {/* ─── TAB: ROTEIRO DO MENTOR ─── */}
        {activeTab === "mentor" && (
          <div className="space-y-4">
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 flex gap-3">
              <Lock className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-purple-800 text-sm">Área exclusiva do mentor</div>
                <div className="text-purple-700 text-xs mt-0.5">Estas perguntas e anotações são visíveis apenas para você. O mentorado vê somente os resultados dos exercícios.</div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-bold text-[#1A3A5C] mb-1">O que trava hoje</h3>
              <p className="text-gray-600 text-sm">O médico trabalha muito, ganha pouco e não sabe por quê. Frequentemente opera por inércia — faz o que sempre fez porque nunca parou para perguntar o que quer de fato.</p>
              <div className="mt-3 p-3 bg-[#C9A84C]/10 rounded-lg border border-[#C9A84C]/30">
                <div className="text-xs font-semibold text-[#C9A84C] uppercase tracking-wider mb-1">Frase de impacto para abrir a sessão</div>
                <div className="text-sm text-gray-700 italic">"A maioria dos médicos que atendo sabe exatamente o que fazer clinicamente — mas nunca parou para perguntar por que está fazendo isso. Hoje vamos descobrir."</div>
              </div>
            </div>

            {PERGUNTAS_MENTOR.map((item, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <button className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
                  onClick={() => setExpandedQuestion(expandedQuestion === i ? null : i)}>
                  <div className="flex items-center gap-3 text-left">
                    <div className="w-7 h-7 rounded-full bg-[#1A3A5C] text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {i + 1}
                    </div>
                    <span className="font-medium text-[#1A3A5C] text-sm">{item.pergunta}</span>
                  </div>
                  {expandedQuestion === i ? <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                </button>

                {expandedQuestion === i && (
                  <div className="px-5 pb-5 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="bg-blue-50 rounded-lg p-3">
                        <div className="text-xs font-semibold text-blue-700 uppercase tracking-wider mb-1">Por que fazer</div>
                        <div className="text-xs text-blue-800">{item.motivo}</div>
                      </div>
                      <div className="bg-orange-50 rounded-lg p-3">
                        <div className="text-xs font-semibold text-orange-700 uppercase tracking-wider mb-1">Angústia que pode revelar</div>
                        <div className="text-xs text-orange-800">{item.angustia}</div>
                      </div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-3">
                      <div className="text-xs font-semibold text-green-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> Técnica de PNL recomendada
                      </div>
                      <div className="text-xs text-green-800">{item.tecnica}</div>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block mb-1">Anotações da sessão (privado)</label>
                      <Textarea
                        value={mentorNotes[i] || ""}
                        onChange={e => setMentorNotes(prev => ({ ...prev, [i]: e.target.value }))}
                        placeholder="Registre as respostas, observações e insights do mentorado durante a sessão..."
                        className="text-sm min-h-[80px] resize-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ─── TAB: IKIGAI ─── */}
        {activeTab === "ikigai" && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-start gap-3">
                <Compass className="w-6 h-6 text-[#C9A84C] flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-[#1A3A5C] text-lg">Ikigai — Sua Razão de Ser</h3>
                  <p className="text-gray-600 text-sm mt-1">O Ikigai é um conceito japonês que representa a intersecção entre o que você ama, o que você faz bem, o que o mundo precisa e pelo que você pode ser pago. Para um médico, encontrar esse ponto é encontrar a prática que sustenta sem desgastar.</p>
                </div>
              </div>
            </div>

            {IKIGAI_CIRCLES.map(circle => (
              <div key={circle.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <button
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
                  onClick={() => setExpandedCircle(expandedCircle === circle.id ? null : circle.id)}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: circle.colorLight }}>
                      <circle.icon className="w-5 h-5" style={{ color: circle.color }} />
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-[#1A3A5C] text-sm">{circle.label}</div>
                      <div className="text-xs text-gray-500">{circle.description}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {ikigaiAnswers[circle.id]?.trim().length > 20 && (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    )}
                    {expandedCircle === circle.id ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                  </div>
                </button>

                {expandedCircle === circle.id && (
                  <div className="px-5 pb-5 space-y-4">
                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Perguntas para reflexão</div>
                      {circle.questions.map((q, qi) => (
                        <div key={qi} className="flex gap-2 text-sm text-gray-600">
                          <span className="text-[#C9A84C] font-bold flex-shrink-0">{qi + 1}.</span>
                          <span>{q}</span>
                        </div>
                      ))}
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block mb-2">
                        Resposta do mentorado
                      </label>
                      <Textarea
                        value={ikigaiAnswers[circle.id]}
                        onChange={e => setIkigaiAnswers(prev => ({ ...prev, [circle.id]: e.target.value }))}
                        placeholder={circle.placeholder}
                        className="text-sm min-h-[100px] resize-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Proposta de valor do Ikigai */}
            {ikigaiFilled >= 3 && (
              <div className="bg-gradient-to-br from-[#1A3A5C] to-[#2C5F8A] rounded-xl p-5 text-white">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-5 h-5 text-[#C9A84C]" />
                  <h3 className="font-bold">Propósito Central (Ikigai)</h3>
                </div>
                <p className="text-white/70 text-sm mb-3">Com base nas 4 dimensões preenchidas, construa a frase central do propósito do mentorado:</p>
                <Textarea
                  value={ikigaiProposta}
                  onChange={e => setIkigaiProposta(e.target.value)}
                  placeholder="Ex: Sou um médico especialista em dor crônica que usa tecnologia de precisão para devolver qualidade de vida a pacientes que já desistiram de melhorar — e faço isso porque é o único trabalho que me faz sentir que estou no lugar certo."
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/40 text-sm min-h-[100px] resize-none"
                />
              </div>
            )}
          </div>
        )}

        {/* ─── TAB: MISSÃO ─── */}
        {activeTab === "missao" && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-start gap-3">
                <Target className="w-6 h-6 text-orange-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-[#1A3A5C] text-lg">Construindo sua Missão</h3>
                  <p className="text-gray-600 text-sm mt-1">A missão não é um slogan — é uma declaração funcional que guia decisões. Responda às 4 perguntas abaixo e a frase final emergirá naturalmente das suas próprias palavras.</p>
                </div>
              </div>
            </div>

            {MISSAO_STEPS.map((step, i) => (
              <div key={step.id} className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-7 h-7 rounded-full bg-orange-100 text-orange-600 text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-[#1A3A5C] text-sm">{step.label}</div>
                    <div className="text-gray-600 text-sm mt-1">{step.question}</div>
                    <div className="flex items-start gap-1.5 mt-2 text-xs text-orange-600">
                      <Lightbulb className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                      <span>{step.hint}</span>
                    </div>
                  </div>
                </div>
                <Textarea
                  value={missaoAnswers[step.id]}
                  onChange={e => setMissaoAnswers(prev => ({ ...prev, [step.id]: e.target.value }))}
                  placeholder={step.placeholder}
                  className="text-sm min-h-[80px] resize-none"
                />
              </div>
            ))}

            {/* Missão final */}
            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-5 text-white">
              <div className="flex items-center gap-2 mb-3">
                <Target className="w-5 h-5" />
                <h3 className="font-bold">Declaração de Missão</h3>
              </div>
              <p className="text-white/80 text-sm mb-3">Agora, com base nas respostas acima, construa a missão em 1–2 frases. Use as palavras do próprio mentorado:</p>
              <Textarea
                value={missaoFinal}
                onChange={e => setMissaoFinal(e.target.value)}
                placeholder="Ex: Minha missão é devolver a capacidade de viver sem dor a pacientes que já desistiram de melhorar, usando diagnóstico de precisão e tecnologias que a medicina convencional ainda não oferece."
                className="bg-white/10 border-white/20 text-white placeholder:text-white/40 text-sm min-h-[100px] resize-none"
              />
            </div>
          </div>
        )}

        {/* ─── TAB: VISÃO ─── */}
        {activeTab === "visao" && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-start gap-3">
                <Eye className="w-6 h-6 text-blue-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-[#1A3A5C] text-lg">Construindo sua Visão</h3>
                  <p className="text-gray-600 text-sm mt-1">A visão é o destino — onde você quer chegar em 5 anos. Ela precisa ser concreta o suficiente para guiar decisões e inspiradora o suficiente para sustentar o esforço nos momentos difíceis.</p>
                </div>
              </div>
            </div>

            {VISAO_STEPS.map((step, i) => (
              <div key={step.id} className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-[#1A3A5C] text-sm">{step.label}</div>
                    <div className="text-gray-600 text-sm mt-1">{step.question}</div>
                    <div className="flex items-start gap-1.5 mt-2 text-xs text-blue-600">
                      <Lightbulb className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                      <span>{step.hint}</span>
                    </div>
                  </div>
                </div>
                <Textarea
                  value={visaoAnswers[step.id]}
                  onChange={e => setVisaoAnswers(prev => ({ ...prev, [step.id]: e.target.value }))}
                  placeholder={step.placeholder}
                  className="text-sm min-h-[80px] resize-none"
                />
              </div>
            ))}

            {/* Visão final */}
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-5 text-white">
              <div className="flex items-center gap-2 mb-3">
                <Eye className="w-5 h-5" />
                <h3 className="font-bold">Declaração de Visão</h3>
              </div>
              <p className="text-white/80 text-sm mb-3">Sintetize a visão em 2–3 frases que o mentorado possa ler toda manhã e sentir direção:</p>
              <Textarea
                value={visaoFinal}
                onChange={e => setVisaoFinal(e.target.value)}
                placeholder="Ex: Em 2030, serei a referência regional em medicina intervencionista para dor crônica, atendendo por encaminhamento, com lista de espera, em uma clínica que reflete o padrão de excelência que ofereço. Meu nome será sinônimo de solução para casos que outros não resolveram."
                className="bg-white/10 border-white/20 text-white placeholder:text-white/40 text-sm min-h-[100px] resize-none"
              />
            </div>
          </div>
        )}

        {/* ─── TAB: VALORES ─── */}
        {activeTab === "valores" && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-start gap-3">
                <Star className="w-6 h-6 text-yellow-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-[#1A3A5C] text-lg">Identificando seus Valores</h3>
                  <p className="text-gray-600 text-sm mt-1">Valores não são aspirações — são princípios que já guiam suas decisões, mesmo que inconscientemente. Selecione os 3 a 7 que mais ressoam com quem você já é (não com quem quer ser).</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-[#1A3A5C] text-sm">Selecione de 3 a 7 valores</h4>
                <Badge className={`${valoresSelecionados.length >= 3 ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                  {valoresSelecionados.length}/7 selecionados
                </Badge>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {VALORES_CATALOGO.map(item => (
                  <button key={item.valor}
                    onClick={() => toggleValor(item.valor)}
                    className={`text-left p-3 rounded-lg border-2 transition-all text-sm ${
                      valoresSelecionados.includes(item.valor)
                        ? "border-[#C9A84C] bg-[#C9A84C]/10 text-[#1A3A5C]"
                        : "border-gray-200 hover:border-gray-300 text-gray-600"
                    }`}>
                    <div className="font-medium text-xs">{item.valor}</div>
                    <div className="text-xs text-gray-500 mt-0.5 leading-tight">{item.descricao}</div>
                  </button>
                ))}
              </div>
              <div className="mt-3">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block mb-1">Outros valores (escreva livremente)</label>
                <input
                  type="text"
                  value={valoresCustom}
                  onChange={e => setValoresCustom(e.target.value)}
                  placeholder="Ex: Precisão diagnóstica, Medicina sem efeitos colaterais..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3A5C]"
                />
              </div>
            </div>

            {/* Manifestações práticas */}
            {valoresSelecionados.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h4 className="font-semibold text-[#1A3A5C] text-sm mb-4">Como cada valor se manifesta na sua prática?</h4>
                <div className="space-y-3">
                  {valoresSelecionados.map(valor => (
                    <div key={valor}>
                      <label className="text-xs font-semibold text-[#C9A84C] uppercase tracking-wider block mb-1">{valor}</label>
                      <input
                        type="text"
                        value={valoresManifestacoes[valor] || ""}
                        onChange={e => setValoresManifestacoes(prev => ({ ...prev, [valor]: e.target.value }))}
                        placeholder={`Como ${valor.toLowerCase()} aparece no seu dia a dia clínico?`}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3A5C]"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── TAB: CHECKLIST ─── */}
        {activeTab === "checklist" && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-[#1A3A5C]">Checklist de Conclusão — Pilar 1</h3>
                  <p className="text-gray-500 text-sm mt-0.5">Marque os itens concluídos ao longo das sessões</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-[#1A3A5C]">{completedChecklist}/{CHECKLIST_PILAR.length}</div>
                  <div className="text-xs text-gray-500">itens concluídos</div>
                </div>
              </div>

              <div className="w-full bg-gray-100 rounded-full h-3 mb-5">
                <div className="bg-gradient-to-r from-[#1A3A5C] to-[#C9A84C] h-3 rounded-full transition-all duration-500"
                  style={{ width: `${(completedChecklist / CHECKLIST_PILAR.length) * 100}%` }} />
              </div>

              <div className="space-y-2">
                {CHECKLIST_PILAR.map((item, i) => (
                  <button key={i}
                    onClick={() => updateChecklistItem.mutate({
                      menteeId: mid,
                      pillarId: 1,
                      itemIndex: i,
                      status: checklistStatus[i] ? "pending" : "completed",
                    })}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 text-left transition-all ${
                      checklistStatus[i]
                        ? "border-green-300 bg-green-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                      checklistStatus[i] ? "border-green-500 bg-green-500" : "border-gray-300"
                    }`}>
                      {checklistStatus[i] && <CheckCircle2 className="w-3 h-3 text-white" />}
                    </div>
                    <span className={`text-sm ${checklistStatus[i] ? "text-green-700 line-through" : "text-gray-700"}`}>
                      {item}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {completedChecklist < CHECKLIST_PILAR.length && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex gap-3">
                <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-orange-800 text-sm">Pilar incompleto</div>
                  <div className="text-orange-700 text-xs mt-0.5">
                    Ainda faltam {CHECKLIST_PILAR.length - completedChecklist} itens. Recomenda-se não avançar para o Pilar 2 sem completar ao menos 6 dos 8 itens deste checklist.
                  </div>
                </div>
              </div>
            )}

            {completedChecklist === CHECKLIST_PILAR.length && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-green-800 text-sm">Pilar 1 concluído!</div>
                  <div className="text-green-700 text-xs mt-0.5">
                    Excelente! O mentorado tem uma base sólida de identidade e propósito. Você pode liberar o Pilar 2 no painel do mentorado.
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
