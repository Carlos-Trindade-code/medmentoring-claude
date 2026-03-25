import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  ArrowLeft, Megaphone, ChevronDown, ChevronRight, Save, CheckCircle2,
  AlertTriangle, Lightbulb, Lock, Sparkles, Copy, ExternalLink,
  Instagram, Monitor, Smartphone, Video, Image, Calendar,
  Zap, Globe, Star, RefreshCw, Download, BookOpen, Brain
} from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";

// ─── FERRAMENTAS DIGITAIS ─────────────────────────────────────────────────────
const FERRAMENTAS = [
  {
    categoria: "Criação de Conteúdo Visual",
    icon: Image,
    cor: "#E74C3C",
    ferramentas: [
      {
        nome: "Canva",
        url: "https://canva.com",
        descricao: "Criação de carrosséis, posts e stories. Use os templates de saúde.",
        nivel: "Essencial",
        dica: "Ative o Canva Pro para acessar o 'Magic Design' — descreva o post e a IA cria o layout completo. Conecte ao ChatGPT para gerar o texto dentro do próprio Canva.",
        usoCaso: "Carrosséis de segunda (Educação Profunda) e posts de sexta (Branding)",
      },
      {
        nome: "Adobe Express",
        url: "https://express.adobe.com",
        descricao: "Alternativa ao Canva com mais recursos de animação.",
        nivel: "Avançado",
        dica: "Ideal para criar posts animados que se destacam no feed. Integra com o Adobe Firefly para geração de imagens médicas.",
        usoCaso: "Posts com animação para maior engajamento",
      },
    ],
  },
  {
    categoria: "Criação de Vídeos e Reels",
    icon: Video,
    cor: "#9B59B6",
    ferramentas: [
      {
        nome: "CapCut",
        url: "https://capcut.com",
        descricao: "Editor de vídeo gratuito com IA para Reels e TikTok.",
        nivel: "Essencial",
        dica: "Use o 'Auto Captions' para legendar automaticamente. O recurso 'Script to Video' transforma texto em vídeo narrado — escreva o roteiro no ChatGPT e cole no CapCut.",
        usoCaso: "Reels de quarta (Desmistificação Rápida) — grave 1 vez, edite em 15 minutos",
      },
      {
        nome: "HeyGen",
        url: "https://heygen.com",
        descricao: "Crie vídeos com avatar digital — sem precisar aparecer na câmera.",
        nivel: "Avançado",
        dica: "Crie um avatar com sua voz e aparência. Ideal para médicos com resistência a aparecer em vídeo. Gere o script no ChatGPT e o avatar apresenta.",
        usoCaso: "Vídeos educativos sem precisar gravar",
      },
      {
        nome: "Descript",
        url: "https://descript.com",
        descricao: "Edite vídeo como se fosse um documento de texto.",
        nivel: "Intermediário",
        dica: "Grave uma vez, edite apagando palavras no texto. Elimina vícios de linguagem automaticamente.",
        usoCaso: "Edição rápida de Reels e vídeos longos",
      },
    ],
  },
  {
    categoria: "Inteligência Artificial para Conteúdo",
    icon: Brain,
    cor: "#2980B9",
    ferramentas: [
      {
        nome: "ChatGPT",
        url: "https://chat.openai.com",
        descricao: "Geração de roteiros, legendas, carrosséis e estratégia de conteúdo.",
        nivel: "Essencial",
        dica: "Use o prompt personalizado gerado nesta plataforma como base. O ChatGPT com GPT-4 pode criar um mês de conteúdo em 30 minutos. Integra com Canva via plugin.",
        usoCaso: "Roteiros de Reels, textos de carrosséis, legendas, hashtags",
      },
      {
        nome: "Claude (Anthropic)",
        url: "https://claude.ai",
        descricao: "Alternativa ao ChatGPT com melhor escrita em português.",
        nivel: "Intermediário",
        dica: "Excelente para textos longos e artigos. Use para criar o conteúdo do carrossel de segunda com linguagem mais elegante.",
        usoCaso: "Textos de educação profunda com linguagem científica e empática",
      },
      {
        nome: "Gemini (Google)",
        url: "https://gemini.google.com",
        descricao: "IA do Google com acesso a informações atualizadas.",
        nivel: "Intermediário",
        dica: "Útil para pesquisar dados e estatísticas recentes para embasar o conteúdo científico. Integra com Google Workspace.",
        usoCaso: "Pesquisa de dados e tendências para embasar posts científicos",
      },
    ],
  },
  {
    categoria: "Agendamento e Gestão",
    icon: Calendar,
    cor: "#27AE60",
    ferramentas: [
      {
        nome: "Later",
        url: "https://later.com",
        descricao: "Agendamento de posts com sugestão de melhores horários.",
        nivel: "Essencial",
        dica: "Agende 1 semana de conteúdo de uma vez. O Later analisa seu público e sugere os melhores horários. Integra com Instagram, TikTok e LinkedIn.",
        usoCaso: "Agendar os 3 posts semanais com antecedência",
      },
      {
        nome: "Metricool",
        url: "https://metricool.com",
        descricao: "Análise de métricas e agendamento em uma plataforma.",
        nivel: "Intermediário",
        dica: "Versão gratuita já é suficiente para monitorar crescimento de seguidores, alcance e engajamento. Relatório mensal automático.",
        usoCaso: "Acompanhar métricas e ajustar a estratégia mensalmente",
      },
    ],
  },
  {
    categoria: "Presença Digital Médica",
    icon: Globe,
    cor: "#C9A84C",
    ferramentas: [
      {
        nome: "Doctoralia",
        url: "https://doctoralia.com.br",
        descricao: "Plataforma de agendamento e avaliações médicas.",
        nivel: "Essencial",
        dica: "Perfil completo no Doctoralia aparece no Google. Solicite avaliações de pacientes satisfeitos — cada avaliação aumenta seu ranqueamento.",
        usoCaso: "Captação de novos pacientes via busca orgânica",
      },
      {
        nome: "Google Meu Negócio",
        url: "https://business.google.com",
        descricao: "Presença no Google Maps e busca local.",
        nivel: "Essencial",
        dica: "Perfil otimizado aparece quando alguém busca 'médico especialista [cidade]'. Adicione fotos da clínica, horários e responda avaliações.",
        usoCaso: "Captação de pacientes que buscam especialistas na sua cidade",
      },
    ],
  },
];

// ─── ESTRUTURA DE CONTEÚDO SEMANAL ───────────────────────────────────────────
const ESTRUTURA_SEMANAL = [
  {
    dia: "Segunda-feira",
    horario: "12h",
    pilar: "Educação Profunda",
    formato: "Carrossel (8–12 slides)",
    objetivo: "Capturar o 'Paciente Investigador' — intelectual, sofisticado, que busca entender a lógica do tratamento",
    estrutura: [
      "Slide 1: Gancho — pergunta ou afirmação provocativa sobre a condição",
      "Slide 2–3: O problema — o que a maioria não sabe sobre esta condição",
      "Slide 4–6: A ciência — explicação técnica com analogia brilhante",
      "Slide 7–9: A solução — como você aborda de forma diferente",
      "Slide 10: CTA — 'Salve para não esquecer' ou 'Marque quem precisa saber'",
      "Slide 11: Cliffhanger — 'Na quarta-feira, vou mostrar por que...'",
    ],
    regra: "Termine sempre com uma 'ponta solta' que gera antecipação para o próximo post",
    cor: "#2980B9",
  },
  {
    dia: "Quarta-feira",
    horario: "19h–20h",
    pilar: "Desmistificação Rápida",
    formato: "Reels (30–60 segundos)",
    objetivo: "Atrair público amplo com ganchos fortes — quebrar mitos sobre a especialidade",
    estrutura: [
      "0–3s: Gancho visual — comece com a conclusão ou com uma afirmação surpreendente",
      "3–15s: O mito — 'A maioria das pessoas acredita que...'",
      "15–40s: A verdade — explicação rápida com linguagem acessível",
      "40–55s: A implicação — 'O que isso significa para você'",
      "55–60s: CTA — 'Siga para mais' ou 'Comente se você já passou por isso'",
    ],
    regra: "O primeiro frame precisa parar o scroll. Use texto grande, expressão facial ou movimento.",
    cor: "#9B59B6",
  },
  {
    dia: "Sexta-feira",
    horario: "12h",
    pilar: "Branding & Posicionamento",
    formato: "Carrossel ou Post único",
    objetivo: "Conectar-se com o 'Buscador Premium' — construir autoridade e mostrar os bastidores",
    estrutura: [
      "Opção A: Bastidores — 'Como é um dia na minha clínica'",
      "Opção B: Filosofia — 'Por que eu pratico medicina desta forma'",
      "Opção C: Caso clínico (sem identificação) — 'O que aprendi com este paciente'",
      "Opção D: Conquista — formação, publicação, evento, reconhecimento",
      "Sempre: Mostrar o ambiente, a tecnologia, a equipe",
    ],
    regra: "Este é o post mais pessoal. Mostre quem você é, não apenas o que você sabe.",
    cor: "#C9A84C",
  },
];

// ─── PERGUNTAS DO MENTOR ──────────────────────────────────────────────────────
const PERGUNTAS_MENTOR = [
  {
    pergunta: "Qual é o maior medo de aparecer nas redes sociais como médico?",
    motivo: "Nomeia o bloqueio específico — que pode ser exposição, crítica, ética ou simplesmente não saber o que dizer. Cada um tem uma abordagem diferente.",
    angustia: "Desconforto com exposição nas redes sociais",
    tecnica: "Reframe de Serviço — 'cada post não é sobre você — é sobre um paciente que vai encontrar a resposta que precisa. Inicie com conteúdo educativo, não pessoal.'",
  },
  {
    pergunta: "Se um paciente te encontra pelo Google hoje, o que ele vê? Representa quem você é?",
    motivo: "Testa a consciência sobre a presença digital atual. A maioria nunca pesquisou o próprio nome. A pergunta já é uma ação.",
    angustia: "Medo de críticas públicas",
    tecnica: "Dessensibilização Sistemática — 'imagine a crítica acontecendo. O que você faria? Ensaie a resposta.' A crítica perde poder quando você já sabe como lidar.",
  },
  {
    pergunta: "Qual médico você segue e admira nas redes? O que aprecia nele?",
    motivo: "Identifica referências concretas de comunicação que o médico já validou como autênticas e eficazes. Facilita a modelagem.",
    angustia: "Acha que marketing é incompatível com ética médica",
    tecnica: "Reframe de Propósito — 'marketing médico ético é educação em saúde. Cada post seu pode ajudar alguém a tomar uma decisão melhor sobre saúde.'",
  },
];

const CHECKLIST_PILAR = [
  "Identidade visual auditada e plano de evolução definido",
  "Estratégia de conteúdo estruturada com 3 pilares e frequência realista",
  "Google Meu Negócio otimizado com fotos e horários",
  "Instagram com bio otimizada e link na bio configurado",
  "Doctoralia com perfil completo e avaliações solicitadas",
  "Calendário editorial do primeiro mês criado",
  "Ferramentas de IA configuradas e testadas",
  "Prompt personalizado gerado e entregue ao mentorado",
];

// ─── COMPONENT ────────────────────────────────────────────────────────────────
export default function Pillar6WorkRoom() {
  const { menteeId } = useParams<{ menteeId: string }>();
  const [, navigate] = useLocation();
  const { user, loading: authLoading } = useAuth();

  const mid = Number(menteeId);

  const [activeTab, setActiveTab] = useState<"mentor" | "ferramentas" | "conteudo" | "prompt" | "checklist">("mentor");

  // Mentor notes
  const [mentorNotes, setMentorNotes] = useState<Record<number, string>>({});
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(0);
  const [checklistStatus, setChecklistStatus] = useState<boolean[]>(new Array(CHECKLIST_PILAR.length).fill(false));

  // Marketing data
  const [bloqueiosMarketing, setBloqueiosMarketing] = useState("");
  const [referenciasMedico, setReferenciasMedico] = useState("");
  const [presencaAtual, setPresencaAtual] = useState("");
  const [expandedFerramenta, setExpandedFerramenta] = useState<string | null>(null);

  // Prompt generation
  const [promptGerado, setPromptGerado] = useState("");
  const [promptGeradoEm, setPromptGeradoEm] = useState("");
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const { data: mentee } = trpc.mentor.getMentee.useQuery({ id: mid }, { enabled: !!mid });
  const { data: marketingData } = trpc.marketing.getMarketingData.useQuery({ menteeId: mid }, { enabled: !!mid });
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

  const generatePromptMutation = trpc.marketing.generatePrompt.useMutation();
  const saveMarketingData = trpc.marketing.saveMarketingData.useMutation();
  const saveDiagnostic = trpc.mentor.savePillarDiagnostic.useMutation();

  // Load mentee portal answers for pre-fill
  const { data: menteeAnswers } = trpc.pillarFeedback.getAnswers.useQuery(
    { menteeId: mid, pillarId: 6 },
    { enabled: !!mid }
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
    if (marketingData?.respostasJson) {
      const saved = marketingData.respostasJson as Record<string, unknown>;
      if (saved.bloqueiosMarketing) setBloqueiosMarketing(saved.bloqueiosMarketing as string);
      if (saved.referenciasMedico) setReferenciasMedico(saved.referenciasMedico as string);
      if (saved.presencaAtual) setPresencaAtual(saved.presencaAtual as string);
      if (saved.mentorNotes) setMentorNotes(saved.mentorNotes as Record<number, string>);
      if (saved.checklistStatus) setChecklistStatus(saved.checklistStatus as boolean[]);
      if (saved.promptGerado) setPromptGerado(saved.promptGerado as string);
      if (saved.promptGeradoEm) setPromptGeradoEm(saved.promptGeradoEm as string);
    }
  }, [marketingData]);

  // Pre-fill from mentee answers (only if no saved marketing data)
  useEffect(() => {
    if (!menteeAnswers?.length || marketingData?.respostasJson) return;
    const instagramVal = getMenteeAnswer("presenca_digital_atual", "p6_tem_instagram");
    const seguidoresVal = getMenteeAnswer("presenca_digital_atual", "p6_instagram_seguidores");
    const dificuldadeVal = getMenteeAnswer("presenca_digital_atual", "p6_maior_dificuldade_marketing");
    const tomVozVal = getMenteeAnswer("comunicacao_tom_voz", "p6_tom_voz");
    const conteudoAtualVal = getMenteeAnswer("presenca_digital_atual", "p6_conteudo_atual");
    const presencaArr = [
      instagramVal ? `Instagram: ${instagramVal}${seguidoresVal ? ` (${seguidoresVal} seguidores)` : ""}` : "",
      conteudoAtualVal ? `Conteúdo atual: ${conteudoAtualVal}` : "",
    ].filter(Boolean);
    if (presencaArr.length) setPresencaAtual(p => p || presencaArr.join(" | "));
    if (dificuldadeVal) setBloqueiosMarketing(p => p || dificuldadeVal);
    if (tomVozVal) setReferenciasMedico(p => p || `Tom de voz: ${tomVozVal}`);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menteeAnswers, marketingData]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveDiagnostic.mutateAsync({
        menteeId: mid, pillarId: 6,
        respostasJson: { bloqueiosMarketing, referenciasMedico, presencaAtual, mentorNotes, checklistStatus, promptGerado, promptGeradoEm },
        angustiasJson: [], tecnicasJson: [],
      });
      setLastSaved(new Date());
      toast.success("Progresso salvo!");
    } catch { toast.error("Erro ao salvar."); }
    finally { setSaving(false); }
  };

  const handleGeneratePrompt = async () => {
    setGenerating(true);
    setActiveTab("prompt");
    try {
      const result = await generatePromptMutation.mutateAsync({ menteeId: mid });
      setPromptGerado(typeof result.prompt === "string" ? result.prompt : String(result.prompt || ""));
      setPromptGeradoEm(new Date().toISOString());
      toast.success("Prompt personalizado gerado com sucesso!");
    } catch {
      toast.error("Erro ao gerar o prompt. Tente novamente.");
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(promptGerado);
    setCopied(true);
    toast.success("Prompt copiado para a área de transferência!");
    setTimeout(() => setCopied(false), 3000);
  };

  const completedChecklist = checklistStatus.filter(Boolean).length;

  const TABS = [
    { id: "mentor", label: "Roteiro do Mentor", icon: Lock },
    { id: "ferramentas", label: "Ferramentas Digitais", icon: Zap },
    { id: "conteudo", label: "Estratégia de Conteúdo", icon: Calendar },
    { id: "prompt", label: "Prompt Personalizado", icon: Sparkles, badge: promptGerado ? "✓" : null },
    { id: "checklist", label: "Checklist", icon: CheckCircle2, badge: `${completedChecklist}/${CHECKLIST_PILAR.length}` },
  ] as const;

  return (
    <div className="min-h-screen bg-[#F8F5F0]">
      {/* Header */}
      <div className="bg-[#1A3A5C] text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(`/mentor/mentorado/${menteeId}`)} className="hover:opacity-70 transition-opacity">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="w-8 h-8 rounded-lg bg-pink-500/20 flex items-center justify-center">
            <Megaphone className="w-5 h-5 text-pink-300" />
          </div>
          <div>
            <div className="text-xs text-white/60 uppercase tracking-wider">Pilar 6</div>
            <div className="font-bold text-lg leading-tight">Marketing & Presença Digital</div>
          </div>
          {mentee && <Badge className="ml-2 bg-white/10 text-white/80 border-white/20 text-xs">{mentee.nome}</Badge>}
        </div>
        <div className="flex items-center gap-3">
          {lastSaved && <span className="text-xs text-white/50">Salvo {lastSaved.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>}
          <Button onClick={handleSave} disabled={saving} size="sm" className="bg-[#C9A84C] hover:bg-[#B8973B] text-white border-0">
            <Save className="w-4 h-4 mr-1" />{saving ? "Salvando..." : "Salvar"}
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
                activeTab === tab.id ? "border-[#1A3A5C] text-[#1A3A5C]" : "border-transparent text-gray-500 hover:text-gray-700"
              }`}>
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {"badge" in tab && tab.badge && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab.badge === "✓" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>{tab.badge}</span>
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
                <div className="text-purple-700 text-xs mt-0.5">Perguntas estratégicas e anotações visíveis apenas para você.</div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-bold text-[#1A3A5C] mb-1">O que trava hoje</h3>
              <p className="text-gray-600 text-sm">Invisível online — ou presente, mas sem estratégia. O conteúdo publicado não atrai o paciente certo nem comunica o valor real do médico.</p>
              <div className="mt-3 p-3 bg-[#C9A84C]/10 rounded-lg border border-[#C9A84C]/30">
                <div className="text-xs font-semibold text-[#C9A84C] uppercase tracking-wider mb-1">Frase de impacto para abrir a sessão</div>
                <div className="text-sm text-gray-700 italic">"Pesquise seu nome no Google agora. O que aparece? Esse é o médico que seus pacientes potenciais estão encontrando — ou não encontrando."</div>
              </div>
            </div>

            {/* Diagnóstico de presença digital */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
              <h4 className="font-semibold text-[#1A3A5C]">Diagnóstico de Presença Digital</h4>
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block mb-1">Presença digital atual do mentorado</label>
                <Textarea value={presencaAtual} onChange={e => setPresencaAtual(e.target.value)}
                  placeholder="Descreva o que o mentorado tem hoje: Instagram (quantos seguidores? que tipo de conteúdo?), Google Meu Negócio (configurado?), Doctoralia (perfil completo?), site..."
                  className="text-sm min-h-[80px] resize-none" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block mb-1">Referências que o mentorado admira</label>
                <Textarea value={referenciasMedico} onChange={e => setReferenciasMedico(e.target.value)}
                  placeholder="Quais médicos ele segue e admira nas redes? O que aprecia neles? Isso vai guiar o estilo de comunicação..."
                  className="text-sm min-h-[60px] resize-none" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block mb-1">Bloqueios identificados</label>
                <Textarea value={bloqueiosMarketing} onChange={e => setBloqueiosMarketing(e.target.value)}
                  placeholder="Qual é o maior medo ou resistência? Exposição? Críticas? Falta de tempo? Não saber o que dizer? Achar que é antiético?"
                  className="text-sm min-h-[60px] resize-none" />
              </div>
            </div>

            {PERGUNTAS_MENTOR.map((item, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <button className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
                  onClick={() => setExpandedQuestion(expandedQuestion === i ? null : i)}>
                  <div className="flex items-center gap-3 text-left">
                    <div className="w-7 h-7 rounded-full bg-[#1A3A5C] text-white text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</div>
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
                      <Textarea value={mentorNotes[i] || ""} onChange={e => setMentorNotes(prev => ({ ...prev, [i]: e.target.value }))}
                        placeholder="Registre as respostas e observações do mentorado..." className="text-sm min-h-[80px] resize-none" />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ─── TAB: FERRAMENTAS DIGITAIS ─── */}
        {activeTab === "ferramentas" && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-bold text-[#1A3A5C] mb-1">Ferramentas Digitais Essenciais</h3>
              <p className="text-gray-600 text-sm">Ecossistema completo para criar, publicar e monitorar conteúdo médico de forma eficiente. Comece pelas ferramentas marcadas como "Essencial".</p>
            </div>

            {FERRAMENTAS.map(cat => (
              <div key={cat.categoria} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <button className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
                  onClick={() => setExpandedFerramenta(expandedFerramenta === cat.categoria ? null : cat.categoria)}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: cat.cor + "20" }}>
                      <cat.icon className="w-5 h-5" style={{ color: cat.cor }} />
                    </div>
                    <div className="text-left">
                      <div className="font-semibold text-[#1A3A5C] text-sm">{cat.categoria}</div>
                      <div className="text-xs text-gray-500">{cat.ferramentas.length} ferramentas</div>
                    </div>
                  </div>
                  {expandedFerramenta === cat.categoria ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                </button>

                {expandedFerramenta === cat.categoria && (
                  <div className="px-5 pb-5 space-y-4">
                    {cat.ferramentas.map(f => (
                      <div key={f.nome} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-[#1A3A5C] text-sm">{f.nome}</span>
                              <Badge className={`text-xs ${f.nivel === "Essencial" ? "bg-green-100 text-green-700 border-green-300" : f.nivel === "Intermediário" ? "bg-blue-100 text-blue-700 border-blue-300" : "bg-purple-100 text-purple-700 border-purple-300"}`}>
                                {f.nivel}
                              </Badge>
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5">{f.descricao}</div>
                          </div>
                          <a href={f.url} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-[#1A3A5C] hover:underline flex-shrink-0 ml-3">
                            Acessar <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                        <div className="bg-yellow-50 rounded-lg p-3 mb-2">
                          <div className="text-xs font-semibold text-yellow-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                            <Lightbulb className="w-3 h-3" /> Dica para médicos
                          </div>
                          <div className="text-xs text-yellow-800">{f.dica}</div>
                        </div>
                        <div className="text-xs text-gray-500">
                          <span className="font-semibold">Uso recomendado:</span> {f.usoCaso}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Fluxo de trabalho semanal */}
            <div className="bg-gradient-to-br from-[#1A3A5C] to-[#2C5F8A] rounded-xl p-5 text-white">
              <h4 className="font-bold mb-3 flex items-center gap-2">
                <Zap className="w-5 h-5 text-[#C9A84C]" /> Fluxo de trabalho semanal com IA
              </h4>
              <div className="space-y-3 text-sm">
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#C9A84C] text-white text-xs font-bold flex items-center justify-center flex-shrink-0">1</div>
                  <div><span className="font-semibold">Segunda (30 min):</span> Cole o prompt no ChatGPT → Peça o carrossel da semana → Copie o texto para o Canva → Publique às 12h</div>
                </div>
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#C9A84C] text-white text-xs font-bold flex items-center justify-center flex-shrink-0">2</div>
                  <div><span className="font-semibold">Terça (15 min):</span> Grave o Reels (30–60s) com o roteiro do ChatGPT → Edite no CapCut com legenda automática</div>
                </div>
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#C9A84C] text-white text-xs font-bold flex items-center justify-center flex-shrink-0">3</div>
                  <div><span className="font-semibold">Quarta (5 min):</span> Publique o Reels às 19h com a legenda gerada pela IA</div>
                </div>
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#C9A84C] text-white text-xs font-bold flex items-center justify-center flex-shrink-0">4</div>
                  <div><span className="font-semibold">Sexta (20 min):</span> Post de branding — foto do consultório ou bastidores + texto de posicionamento</div>
                </div>
              </div>
              <div className="mt-3 text-xs text-white/60">Total: ~70 minutos por semana para 3 posts estratégicos</div>
            </div>
          </div>
        )}

        {/* ─── TAB: ESTRATÉGIA DE CONTEÚDO ─── */}
        {activeTab === "conteudo" && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-bold text-[#1A3A5C] mb-1">Estratégia de Conteúdo Semanal</h3>
              <p className="text-gray-600 text-sm">3 posts por semana, cada um com objetivo estratégico diferente. Consistência é mais importante que perfeição.</p>
            </div>

            {ESTRUTURA_SEMANAL.map((dia, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100" style={{ borderLeftWidth: 4, borderLeftColor: dia.cor }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-[#1A3A5C]">{dia.dia}</div>
                      <div className="text-xs text-gray-500">{dia.horario} · {dia.formato}</div>
                    </div>
                    <Badge className="text-xs" style={{ backgroundColor: dia.cor + "20", color: dia.cor, borderColor: dia.cor + "40" }}>
                      {dia.pilar}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">{dia.objetivo}</p>
                </div>
                <div className="px-5 py-4 space-y-3">
                  <div>
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Estrutura do conteúdo</div>
                    <div className="space-y-1">
                      {dia.estrutura.map((item, j) => (
                        <div key={j} className="flex gap-2 text-sm text-gray-600">
                          <span className="font-bold flex-shrink-0" style={{ color: dia.cor }}>{j + 1}.</span>
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 flex gap-2">
                    <Star className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: dia.cor }} />
                    <div className="text-xs text-gray-700"><span className="font-semibold">Regra de ouro:</span> {dia.regra}</div>
                  </div>
                </div>
              </div>
            ))}

            {/* Calendário do primeiro mês */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h4 className="font-semibold text-[#1A3A5C] mb-3">Calendário do Primeiro Mês</h4>
              <p className="text-gray-500 text-sm mb-4">Use o prompt personalizado gerado pela IA para criar o calendário completo do primeiro mês com temas específicos para a especialidade do mentorado.</p>
              <Button onClick={() => setActiveTab("prompt")} className="bg-[#1A3A5C] text-white w-full">
                <Sparkles className="w-4 h-4 mr-2" />
                Gerar Prompt Personalizado para o Mentorado
              </Button>
            </div>
          </div>
        )}

        {/* ─── TAB: PROMPT PERSONALIZADO ─── */}
        {activeTab === "prompt" && (
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-[#1A3A5C] to-[#2C5F8A] rounded-xl p-5 text-white">
              <div className="flex items-start gap-3">
                <Sparkles className="w-6 h-6 text-[#C9A84C] flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-lg">Gerador de Prompt Personalizado</h3>
                  <p className="text-white/70 text-sm mt-1">
                    A IA vai criar um prompt completo de marketing pessoal baseado em todos os dados coletados na jornada do mentorado:
                    missão, visão, valores, posicionamento e especialidade.
                  </p>
                  <p className="text-white/60 text-xs mt-2">
                    O mentorado usa este prompt no ChatGPT, Claude ou Gemini para criar conteúdo semanal personalizado para a especialidade dele.
                    Funciona com o Canva para criar os designs automaticamente.
                  </p>
                </div>
              </div>
              <Button
                onClick={handleGeneratePrompt}
                disabled={generating}
                className="mt-4 bg-[#C9A84C] hover:bg-[#B8973B] text-white border-0 w-full">
                {generating ? (
                  <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Gerando prompt personalizado...</>
                ) : (
                  <><Sparkles className="w-4 h-4 mr-2" /> {promptGerado ? "Regenerar Prompt" : "Gerar Prompt Personalizado"}</>
                )}
              </Button>
            </div>

            {generating && (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                <RefreshCw className="w-10 h-10 mx-auto mb-3 text-[#1A3A5C] animate-spin" />
                <div className="font-semibold text-[#1A3A5C]">Gerando prompt personalizado...</div>
                <div className="text-gray-500 text-sm mt-1">A IA está analisando todos os dados da jornada do mentorado</div>
              </div>
            )}

            {promptGerado && !generating && (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-[#1A3A5C]">Prompt Personalizado Gerado</div>
                    {promptGeradoEm && (
                      <div className="text-xs text-gray-500">
                        Gerado em {new Date(promptGeradoEm).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleCopyPrompt} size="sm" variant="outline" className="text-[#1A3A5C] border-[#1A3A5C]">
                      {copied ? <CheckCircle2 className="w-4 h-4 mr-1 text-green-500" /> : <Copy className="w-4 h-4 mr-1" />}
                      {copied ? "Copiado!" : "Copiar"}
                    </Button>
                  </div>
                </div>
                <div className="p-5">
                  <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 whitespace-pre-wrap font-mono leading-relaxed max-h-[500px] overflow-y-auto">
                    {promptGerado}
                  </div>
                </div>
                <div className="px-5 pb-5">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="font-semibold text-blue-800 text-sm mb-2 flex items-center gap-2">
                      <BookOpen className="w-4 h-4" /> Como usar este prompt
                    </div>
                    <ol className="space-y-1 text-xs text-blue-700">
                      <li>1. Copie o prompt acima clicando em "Copiar"</li>
                      <li>2. Abra o ChatGPT (chat.openai.com) ou Claude (claude.ai)</li>
                      <li>3. Cole o prompt em uma nova conversa e pressione Enter</li>
                      <li>4. A IA vai se apresentar como seu agente de marketing pessoal</li>
                      <li>5. Peça: "Crie o carrossel de segunda-feira sobre [tema]"</li>
                      <li>6. Copie o texto gerado para o Canva e crie o design</li>
                    </ol>
                  </div>
                </div>
              </div>
            )}

            {!promptGerado && !generating && (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                <Sparkles className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                <div className="font-semibold text-gray-600">Nenhum prompt gerado ainda</div>
                <div className="text-gray-400 text-sm mt-1">Clique em "Gerar Prompt Personalizado" acima para criar o prompt baseado nos dados do mentorado</div>
                <div className="text-xs text-gray-400 mt-2">Quanto mais dados preenchidos nos Pilares 1 e 2, mais personalizado será o prompt</div>
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
                  <h3 className="font-bold text-[#1A3A5C]">Checklist de Conclusão — Pilar 6</h3>
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
                  <button key={i} onClick={() => {
                    const newStatus = [...checklistStatus];
                    newStatus[i] = !newStatus[i];
                    setChecklistStatus(newStatus);
                  }} className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 text-left transition-all ${checklistStatus[i] ? "border-green-300 bg-green-50" : "border-gray-200 hover:border-gray-300"}`}>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${checklistStatus[i] ? "border-green-500 bg-green-500" : "border-gray-300"}`}>
                      {checklistStatus[i] && <CheckCircle2 className="w-3 h-3 text-white" />}
                    </div>
                    <span className={`text-sm ${checklistStatus[i] ? "text-green-700 line-through" : "text-gray-700"}`}>{item}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
