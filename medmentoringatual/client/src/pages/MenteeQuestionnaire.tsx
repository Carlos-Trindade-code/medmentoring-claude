import { useState, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Circle,
  Clock,
  Sparkles,
  ArrowLeft,
  Save,
  Send,
  Lock,
} from "lucide-react";

// ============================================================
// PERGUNTAS POR FASE
// ============================================================
const FASES = [
  {
    id: 1,
    titulo: "Identidade e Propósito",
    subtitulo: "Quem você é e o que te move",
    cor: "from-violet-600 to-purple-700",
    corBadge: "bg-violet-100 text-violet-700",
    icone: "✨",
    descricao: "Nesta fase, vamos explorar sua essência como médico — seus valores, motivações e o propósito que guia sua prática.",
    perguntas: [
      {
        id: "p1_1",
        pergunta: "Por que você escolheu a medicina? Qual foi o momento ou a pessoa que influenciou essa decisão?",
        dica: "Seja honesto e específico. Não há resposta certa ou errada — queremos conhecer a sua história real.",
        placeholder: "Conte sua história com detalhes. Quanto mais genuíno, mais valioso para o seu posicionamento...",
      },
      {
        id: "p1_2",
        pergunta: "Se você pudesse trabalhar apenas com um tipo de problema de saúde pelo resto da vida, qual seria? Por quê?",
        dica: "Pense no que te faz perder a noção do tempo, no que você estuda por prazer, não por obrigação.",
        placeholder: "Descreva com paixão o que realmente te move na medicina...",
      },
      {
        id: "p1_3",
        pergunta: "Quando você termina um dia de trabalho se sentindo pleno e realizado — o que aconteceu naquele dia? Descreva um dia assim.",
        dica: "Pense em um dia específico que você se lembra com satisfação. O que estava presente? O que você fez?",
        placeholder: "Descreva esse dia ideal com detalhes — tipo de paciente, tipo de atendimento, ambiente...",
      },
      {
        id: "p1_4",
        pergunta: "Quais são os 3 a 5 valores que você considera inegociáveis na sua prática médica? Como eles aparecem no seu dia a dia?",
        dica: "Valores como: excelência técnica, humanização, inovação, acessibilidade, educação do paciente, etc.",
        placeholder: "Liste seus valores e dê um exemplo prático de como cada um se manifesta no seu trabalho...",
      },
      {
        id: "p1_5",
        pergunta: "Se um paciente seu descrevesse você para um amigo, o que você gostaria que ele dissesse? (Seja ambicioso — não o que ele diria hoje, mas o que você quer que ele diga.)",
        dica: "Essa é a sua reputação desejada. É diferente da sua reputação atual — e tudo bem.",
        placeholder: "Escreva como se fosse o próprio paciente falando sobre você...",
      },
    ],
  },
  {
    id: 2,
    titulo: "Perfil Profissional",
    subtitulo: "Sua especialidade e diferenciais",
    cor: "from-blue-600 to-cyan-700",
    corBadge: "bg-blue-100 text-blue-700",
    icone: "🩺",
    descricao: "Aqui vamos mapear sua trajetória profissional, especializações e o que te diferencia no mercado médico.",
    perguntas: [
      {
        id: "p2_1",
        pergunta: "Qual é a sua especialidade principal? Tem alguma subespecialidade ou área de interesse particular dentro dela?",
        dica: "Seja específico. Ex: não apenas 'cardiologia', mas 'cardiologia de alto risco em mulheres' se for o caso.",
        placeholder: "Descreva sua especialidade com precisão e qualquer foco específico que você tenha...",
      },
      {
        id: "p2_2",
        pergunta: "Qual foi o caso clínico mais desafiador que você já resolveu? O que ele revelou sobre suas competências únicas?",
        dica: "Não precisa dar detalhes do paciente — foque no raciocínio clínico, na abordagem e no resultado.",
        placeholder: "Descreva o desafio, sua abordagem e o que esse caso mostrou sobre sua capacidade...",
      },
      {
        id: "p2_3",
        pergunta: "O que colegas ou pacientes costumam elogiar em você com mais frequência? O que te pedem ajuda ou conselho?",
        dica: "Às vezes os outros enxergam nossos diferenciais melhor do que nós mesmos.",
        placeholder: "Liste os elogios e pedidos de ajuda mais recorrentes que você recebe...",
      },
      {
        id: "p2_4",
        pergunta: "Que formações, cursos ou experiências internacionais você tem que poucos médicos da sua área possuem?",
        dica: "Inclua fellowships, estágios no exterior, cursos de alta especialização, publicações, etc.",
        placeholder: "Liste suas qualificações diferenciadas e onde as adquiriu...",
      },
      {
        id: "p2_5",
        pergunta: "Se você fosse se apresentar em 30 segundos para um paciente ideal, o que diria? Escreva esse pitch.",
        dica: "Sem jargões médicos. Como se estivesse explicando para um familiar inteligente, não médico.",
        placeholder: "Escreva seu pitch de 30 segundos aqui...",
      },
    ],
  },
  {
    id: 3,
    titulo: "Situação Atual",
    subtitulo: "Onde você está hoje",
    cor: "from-amber-600 to-orange-700",
    corBadge: "bg-amber-100 text-amber-700",
    icone: "📍",
    descricao: "Uma análise honesta da sua realidade atual — estrutura, equipe, desafios e o que você quer transformar.",
    perguntas: [
      {
        id: "p3_1",
        pergunta: "Como é sua estrutura de trabalho hoje? (Consultório próprio, hospital, clínica parceira, home office, etc.) Você está satisfeito com ela?",
        dica: "Descreva o ambiente físico, o modelo de atendimento e o que funciona ou não funciona.",
        placeholder: "Descreva sua estrutura atual e seu nível de satisfação com ela...",
      },
      {
        id: "p3_2",
        pergunta: "Você tem equipe? Quem são essas pessoas e como elas contribuem (ou não) para o seu trabalho?",
        dica: "Secretária, enfermeiro, sócio, parceiros... Seja honesto sobre o que funciona e o que precisa melhorar.",
        placeholder: "Descreva sua equipe atual, os papéis de cada um e os desafios...",
      },
      {
        id: "p3_3",
        pergunta: "Qual é a sua maior dor ou frustração no dia a dia da sua prática médica hoje?",
        dica: "Pode ser operacional, financeiro, emocional, relacional. Seja específico — não 'falta de tempo', mas 'perco 2h por dia com X'.",
        placeholder: "Descreva sua principal dor com detalhes e exemplos concretos...",
      },
      {
        id: "p3_4",
        pergunta: "Se você pudesse mudar apenas UMA coisa na sua prática médica amanhã, o que seria?",
        dica: "Essa resposta revela sua prioridade real — não a que você acha que deveria ter, mas a que realmente sente.",
        placeholder: "Descreva essa mudança e por que ela seria transformadora para você...",
      },
      {
        id: "p3_5",
        pergunta: "O que você já tentou para resolver seus principais problemas? O que funcionou parcialmente e o que não funcionou?",
        dica: "Isso nos ajuda a não repetir o que não funciona e a construir sobre o que já mostrou resultados.",
        placeholder: "Liste as tentativas anteriores e os resultados obtidos...",
      },
    ],
  },
  {
    id: 4,
    titulo: "Sonhos e Objetivos",
    subtitulo: "Para onde você quer ir",
    cor: "from-emerald-600 to-teal-700",
    corBadge: "bg-emerald-100 text-emerald-700",
    icone: "🎯",
    descricao: "Vamos explorar sua visão de futuro — profissional, financeira e de estilo de vida. Sem filtros.",
    perguntas: [
      {
        id: "p4_1",
        pergunta: "Como você imagina sua vida profissional daqui a 5 anos? Descreva um dia típico nessa vida ideal.",
        dica: "Seja específico: onde você está, com quem trabalha, quantas horas, que tipo de paciente, quanto ganha.",
        placeholder: "Descreva esse dia ideal em detalhes — do acordar ao dormir...",
      },
      {
        id: "p4_2",
        pergunta: "Qual é o impacto que você quer ter na vida dos seus pacientes e na medicina? Que legado você quer deixar?",
        dica: "Pense além do consultório — livros, ensino, pesquisa, comunidade, transformação de vidas.",
        placeholder: "Descreva o legado que você quer construir...",
      },
      {
        id: "p4_3",
        pergunta: "Qual é o faturamento mensal que você considera 'chegou lá'? E qual seria o mínimo para você se sentir financeiramente tranquilo?",
        dica: "Números reais. Sem julgamento. Esses dados são essenciais para construir metas concretas.",
        placeholder: "Informe os valores (ex: R$ 30.000/mês seria tranquilidade; R$ 80.000/mês seria 'chegou lá')...",
      },
      {
        id: "p4_4",
        pergunta: "Que tipo de reconhecimento profissional você deseja? (Referência nacional, influencer médico, professor, pesquisador, etc.)",
        dica: "Não há resposta errada. Alguns querem ser famosos, outros querem ser respeitados pelos pares — ambos são válidos.",
        placeholder: "Descreva o tipo de reconhecimento que você busca e por quê...",
      },
      {
        id: "p4_5",
        pergunta: "Qual é o maior obstáculo que você acredita que está entre você e esse futuro que descreveu?",
        dica: "Pode ser interno (crenças, medos) ou externo (mercado, recursos, tempo). Seja honesto.",
        placeholder: "Identifique e descreva o principal obstáculo com clareza...",
      },
    ],
  },
  {
    id: 5,
    titulo: "Presença Digital",
    subtitulo: "Como você aparece online",
    cor: "from-pink-600 to-rose-700",
    corBadge: "bg-pink-100 text-pink-700",
    icone: "📱",
    descricao: "Vamos entender sua relação atual com as redes sociais e o marketing digital para construir uma estratégia autêntica.",
    perguntas: [
      {
        id: "p5_1",
        pergunta: "Você tem presença nas redes sociais hoje? Se sim, em quais plataformas e com que frequência publica?",
        dica: "Instagram, YouTube, LinkedIn, TikTok, blog... Seja honesto sobre a frequência real, não a desejada.",
        placeholder: "Liste suas redes, frequência de postagem e o tipo de conteúdo que você publica...",
      },
      {
        id: "p5_2",
        pergunta: "Qual é o seu maior medo ou resistência em relação a aparecer nas redes sociais como médico?",
        dica: "Julgamento de colegas? Exposição excessiva? Não saber o que falar? Falta de tempo? Seja específico.",
        placeholder: "Descreva seus medos e resistências com honestidade...",
      },
      {
        id: "p5_3",
        pergunta: "Tem algum médico ou profissional de saúde que você admira nas redes sociais? O que você aprecia na comunicação dele(a)?",
        dica: "Referências concretas nos ajudam a entender o estilo de comunicação que ressoa com você.",
        placeholder: "Cite nomes e descreva o que você admira na comunicação deles...",
      },
      {
        id: "p5_4",
        pergunta: "Se você fosse criar um conteúdo hoje, sobre qual tema médico você falaria com mais naturalidade e entusiasmo?",
        dica: "O tema que você domina tanto que poderia falar por horas sem preparação — esse é seu pilar de conteúdo natural.",
        placeholder: "Descreva o tema e por que você se sente tão à vontade com ele...",
      },
      {
        id: "p5_5",
        pergunta: "Como seus pacientes atuais te encontraram? Qual canal trouxe os melhores pacientes para você?",
        dica: "Indicação, Google, Instagram, hospital, convênio... Entender o que já funciona é o ponto de partida.",
        placeholder: "Descreva os canais de aquisição de pacientes e quais trazem os melhores resultados...",
      },
    ],
  },
  {
    id: 6,
    titulo: "Paciente Ideal",
    subtitulo: "Para quem você quer trabalhar",
    cor: "from-indigo-600 to-blue-700",
    corBadge: "bg-indigo-100 text-indigo-700",
    icone: "👤",
    descricao: "A fase final e mais estratégica: definir com precisão quem é o paciente que você quer atrair e servir.",
    perguntas: [
      {
        id: "p6_1",
        pergunta: "Pense no paciente que você mais gosta de atender — aquele que te energiza, que valoriza seu trabalho e que você sente que faz diferença. Descreva essa pessoa em detalhes.",
        dica: "Idade, perfil, comportamento, como ele se comunica, o que ele valoriza, qual é o problema que ele traz.",
        placeholder: "Descreva esse paciente ideal com riqueza de detalhes...",
      },
      {
        id: "p6_2",
        pergunta: "Qual é a maior dor, medo ou desejo do seu paciente ideal em relação à saúde? O que o mantém acordado à noite?",
        dica: "Quanto mais você conhece as dores do seu paciente, mais eficaz é sua comunicação e mais ele se sente compreendido.",
        placeholder: "Descreva as dores, medos e desejos mais profundos do seu paciente ideal...",
      },
      {
        id: "p6_3",
        pergunta: "Que tipo de resultado ou transformação seu paciente ideal busca ao te procurar? O que ele quer alcançar?",
        dica: "Não apenas o resultado clínico (ex: 'curar a doença'), mas o resultado de vida (ex: 'voltar a jogar com os filhos').",
        placeholder: "Descreva a transformação que seu paciente ideal busca...",
      },
      {
        id: "p6_4",
        pergunta: "Onde seu paciente ideal passa o tempo online? Que conteúdo ele consome? Quem ele segue?",
        dica: "Instagram, YouTube, podcasts, grupos de WhatsApp, blogs... Isso define onde você precisa estar.",
        placeholder: "Descreva os hábitos digitais do seu paciente ideal...",
      },
      {
        id: "p6_5",
        pergunta: "O que seu paciente ideal precisa ouvir ou sentir para confiar em você e escolher seu tratamento? Qual é o gatilho de decisão dele?",
        dica: "Credenciais? Depoimentos? Empatia? Explicação detalhada? Conhecer o gatilho é a chave da comunicação eficaz.",
        placeholder: "Descreva o que faz seu paciente ideal dizer 'sim' para você...",
      },
    ],
  },
];

// ============================================================
// COMPONENT
// ============================================================
export default function MenteeQuestionnaire() {
  const [faseAtual, setFaseAtual] = useState(1);
  const [perguntaAtual, setPerguntaAtual] = useState(0);
  const [respostas, setRespostas] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState(false);
  const [concluindo, setConcluindo] = useState(false);
  const [view, setView] = useState<"intro" | "questionnaire" | "phase_complete" | "all_complete">("intro");

  const { data: progresso, refetch: refetchProgresso } = trpc.questionnaire.getProgress.useQuery(undefined, {
    retry: false,
  });

  const savePhase = trpc.questionnaire.savePhaseAnswers.useMutation();
  const completePhase = trpc.questionnaire.completePhase.useMutation();

  const fase = FASES[faseAtual - 1];
  const pergunta = fase?.perguntas[perguntaAtual];

  // Carrega respostas salvas ao mudar de fase
  const { data: faseData } = trpc.questionnaire.getPhase.useQuery(
    { faseId: faseAtual },
    { retry: false, enabled: view === "questionnaire" }
  );

  useEffect(() => {
    if (faseData?.respostasJson) {
      const saved = faseData.respostasJson as Array<{ perguntaId: string; resposta: string }>;
      const map: Record<string, string> = {};
      saved.forEach((r) => { map[r.perguntaId] = r.resposta; });
      setRespostas(map);
    } else {
      setRespostas({});
    }
    setPerguntaAtual(0);
  }, [faseAtual, faseData]);

  // Calcula progresso geral
  const fasesCompletas = progresso?.filter((p) => p.status === "concluida").length ?? 0;
  const progressoGeral = Math.round((fasesCompletas / 6) * 100);

  // Status de cada fase
  const getFaseStatus = (faseId: number) => {
    const p = progresso?.find((p) => p.faseId === faseId);
    return p?.status ?? "nao_iniciada";
  };

  // Auto-save ao digitar (debounced)
  const autoSave = useCallback(async (novasRespostas: Record<string, string>) => {
    const respostasArray = fase.perguntas
      .filter((p) => novasRespostas[p.id])
      .map((p) => ({ perguntaId: p.id, pergunta: p.pergunta, resposta: novasRespostas[p.id] }));
    if (respostasArray.length === 0) return;
    try {
      await savePhase.mutateAsync({ faseId: faseAtual, respostas: respostasArray, status: "em_progresso" });
    } catch (_) {}
  }, [faseAtual, fase.perguntas]);

  const handleResposta = (valor: string) => {
    const novas = { ...respostas, [pergunta.id]: valor };
    setRespostas(novas);
  };

  const handleProximaPergunta = async () => {
    if (perguntaAtual < fase.perguntas.length - 1) {
      // Auto-save silencioso
      setSalvando(true);
      await autoSave(respostas);
      setSalvando(false);
      setPerguntaAtual(perguntaAtual + 1);
    }
  };

  const handlePerguntaAnterior = () => {
    if (perguntaAtual > 0) setPerguntaAtual(perguntaAtual - 1);
  };

  const handleConcluirFase = async () => {
    const respostasArray = fase.perguntas.map((p) => ({
      perguntaId: p.id,
      pergunta: p.pergunta,
      resposta: respostas[p.id] || "",
    }));

    // Verifica se todas as perguntas foram respondidas
    const naoRespondidas = respostasArray.filter((r) => !r.resposta.trim());
    if (naoRespondidas.length > 0) {
      toast.warning(`Você ainda tem ${naoRespondidas.length} pergunta(s) sem resposta. Tudo bem pular, mas quanto mais completo, melhor o resultado.`);
    }

    setConcluindo(true);
    try {
      await completePhase.mutateAsync({ faseId: faseAtual, respostas: respostasArray });
      await refetchProgresso();
      setView("phase_complete");
    } catch (e) {
      toast.error("Não foi possível concluir a fase. Tente novamente.");
    } finally {
      setConcluindo(false);
    }
  };

  const handleProximaFase = () => {
    if (faseAtual < 6) {
      setFaseAtual(faseAtual + 1);
      setView("questionnaire");
    } else {
      setView("all_complete");
    }
  };

  const handleIrParaFase = (faseId: number) => {
    setFaseAtual(faseId);
    setView("questionnaire");
  };

  const respostaAtual = respostas[pergunta?.id] || "";
  const temResposta = respostaAtual.trim().length > 0;

  // ============================================================
  // INTRO VIEW
  // ============================================================
  if (view === "intro") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="max-w-3xl mx-auto px-4 py-12">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-2 text-sm mb-6">
              <Sparkles className="w-4 h-4 text-yellow-400" />
              <span>Questionário de Autoconhecimento Médico</span>
            </div>
            <h1 className="text-4xl font-bold mb-4 leading-tight">
              Antes de transformar sua carreira,<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-400">
                precisamos te conhecer profundamente.
              </span>
            </h1>
            <p className="text-slate-300 text-lg max-w-2xl mx-auto leading-relaxed">
              Este questionário foi desenvolvido especialmente para médicos em processo de mentoria. 
              Suas respostas alimentarão toda a estratégia da sua mentoria — do posicionamento ao marketing digital.
            </p>
          </div>

          {/* Progresso geral */}
          {fasesCompletas > 0 && (
            <div className="bg-white/10 rounded-2xl p-6 mb-8 border border-white/20">
              <div className="flex items-center justify-between mb-3">
                <span className="font-semibold">Seu progresso</span>
                <span className="text-violet-400 font-bold">{progressoGeral}%</span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-2 mb-4">
                <div
                  className="bg-gradient-to-r from-violet-500 to-cyan-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${progressoGeral}%` }}
                />
              </div>
              <p className="text-slate-300 text-sm">{fasesCompletas} de 6 fases concluídas</p>
            </div>
          )}

          {/* Fases */}
          <div className="grid gap-3 mb-10">
            {FASES.map((f) => {
              const status = getFaseStatus(f.id);
              const concluida = status === "concluida";
              const emProgresso = status === "em_progresso";
              return (
                <button
                  key={f.id}
                  onClick={() => handleIrParaFase(f.id)}
                  className={`flex items-center gap-4 p-4 rounded-xl border text-left transition-all duration-200 ${
                    concluida
                      ? "bg-emerald-500/20 border-emerald-500/40 hover:bg-emerald-500/30"
                      : emProgresso
                      ? "bg-amber-500/20 border-amber-500/40 hover:bg-amber-500/30"
                      : "bg-white/5 border-white/10 hover:bg-white/10"
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0 bg-gradient-to-br ${f.cor}`}>
                    {f.icone}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">Fase {f.id}</span>
                      {concluida && <Badge className="bg-emerald-500/30 text-emerald-300 text-xs border-0">Concluída</Badge>}
                      {emProgresso && <Badge className="bg-amber-500/30 text-amber-300 text-xs border-0">Em andamento</Badge>}
                    </div>
                    <p className="text-white font-medium">{f.titulo}</p>
                    <p className="text-slate-400 text-sm">{f.subtitulo}</p>
                  </div>
                  <div className="flex-shrink-0">
                    {concluida ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : emProgresso ? (
                      <Clock className="w-5 h-5 text-amber-400" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* CTA */}
          <div className="text-center">
            <Button
              onClick={() => {
                // Vai para a primeira fase não concluída
                const proximaFase = FASES.find((f) => getFaseStatus(f.id) !== "concluida");
                if (proximaFase) {
                  handleIrParaFase(proximaFase.id);
                } else {
                  setView("all_complete");
                }
              }}
              className="bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-700 hover:to-cyan-700 text-white px-10 py-6 text-lg rounded-2xl font-semibold shadow-lg shadow-violet-500/25"
              size="lg"
            >
              {fasesCompletas === 0 ? "Começar Questionário" : fasesCompletas === 6 ? "Ver Resumo" : "Continuar de onde parei"}
              <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
            <p className="text-slate-400 text-sm mt-4">
              Você pode pausar e retomar a qualquer momento. Suas respostas são salvas automaticamente.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // PHASE COMPLETE VIEW
  // ============================================================
  if (view === "phase_complete") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-center">
        <div className="max-w-lg mx-auto px-4 text-center">
          <div className={`w-24 h-24 rounded-full bg-gradient-to-br ${fase.cor} flex items-center justify-center text-4xl mx-auto mb-6 shadow-2xl`}>
            {fase.icone}
          </div>
          <div className="inline-flex items-center gap-2 bg-emerald-500/20 rounded-full px-4 py-2 text-emerald-300 text-sm mb-6">
            <CheckCircle2 className="w-4 h-4" />
            <span>Fase {faseAtual} concluída!</span>
          </div>
          <h2 className="text-3xl font-bold mb-4">
            Excelente, {fase.titulo} concluída!
          </h2>
          <p className="text-slate-300 text-lg mb-8 leading-relaxed">
            Suas respostas foram salvas e um resumo foi enviado ao seu mentor para análise. 
            Continue para a próxima fase!
          </p>

          {/* Progresso atualizado */}
          <div className="bg-white/10 rounded-2xl p-5 mb-8 border border-white/20">
            <div className="flex justify-between text-sm mb-2">
              <span>Progresso geral</span>
              <span className="text-violet-400 font-bold">{Math.round(((fasesCompletas) / 6) * 100)}%</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-violet-500 to-cyan-500 h-2 rounded-full transition-all duration-700"
                style={{ width: `${Math.round(((fasesCompletas) / 6) * 100)}%` }}
              />
            </div>
          </div>

          <div className="flex gap-3 justify-center">
            <Button
              variant="outline"
              onClick={() => setView("intro")}
              className="border-white/20 text-white hover:bg-white/10 bg-transparent"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Ver todas as fases
            </Button>
            {faseAtual < 6 ? (
              <Button
                onClick={handleProximaFase}
                className={`bg-gradient-to-r ${fase.cor} text-white hover:opacity-90`}
              >
                Próxima fase
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={() => setView("all_complete")}
                className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:opacity-90"
              >
                Ver conclusão
                <Sparkles className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // ALL COMPLETE VIEW
  // ============================================================
  if (view === "all_complete") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-center">
        <div className="max-w-lg mx-auto px-4 text-center">
          <div className="text-6xl mb-6">🎉</div>
          <h2 className="text-4xl font-bold mb-4">Questionário Concluído!</h2>
          <p className="text-slate-300 text-lg mb-8 leading-relaxed">
            Parabéns! Você concluiu todas as 6 fases do questionário. Seu mentor já recebeu todas as suas respostas 
            e utilizará essas informações para personalizar completamente a sua mentoria.
          </p>
          <div className="bg-gradient-to-r from-violet-500/20 to-cyan-500/20 rounded-2xl p-6 border border-violet-500/30 mb-8">
            <p className="text-violet-300 font-semibold mb-2">O que acontece agora?</p>
            <p className="text-slate-300 text-sm leading-relaxed">
              Seu mentor analisará suas respostas, gerará sua persona de marketing e preparará um prompt personalizado 
              para guiar toda a sua estratégia de conteúdo nas redes sociais.
            </p>
          </div>
          <Button
            onClick={() => setView("intro")}
            variant="outline"
            className="border-white/20 text-white hover:bg-white/10 bg-transparent"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar ao início
          </Button>
        </div>
      </div>
    );
  }

  // ============================================================
  // QUESTIONNAIRE VIEW
  // ============================================================
  const totalPerguntas = fase.perguntas.length;
  const progressoFase = Math.round(((perguntaAtual + 1) / totalPerguntas) * 100);
  const isUltimaPergunta = perguntaAtual === totalPerguntas - 1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Header fixo */}
      <div className="sticky top-0 z-10 bg-slate-900/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => setView("intro")}
              className="flex items-center gap-1 text-slate-400 hover:text-white text-sm transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </button>
            <div className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${fase.cor} flex items-center justify-center text-xs`}>
                {fase.icone}
              </div>
              <span className="text-sm font-medium">Fase {faseAtual}: {fase.titulo}</span>
            </div>
            <div className="flex items-center gap-1 text-slate-400 text-sm">
              {salvando ? (
                <>
                  <Save className="w-3 h-3 animate-pulse" />
                  <span>Salvando...</span>
                </>
              ) : (
                <span>{perguntaAtual + 1}/{totalPerguntas}</span>
              )}
            </div>
          </div>
          {/* Barra de progresso da fase */}
          <div className="w-full bg-white/10 rounded-full h-1">
            <div
              className={`bg-gradient-to-r ${fase.cor} h-1 rounded-full transition-all duration-300`}
              style={{ width: `${progressoFase}%` }}
            />
          </div>
        </div>
      </div>

      {/* Conteúdo principal */}
      <div className="max-w-2xl mx-auto px-4 py-10">
        {/* Indicador de pergunta */}
        <div className="flex items-center gap-2 mb-8">
          {fase.perguntas.map((_, i) => (
            <button
              key={i}
              onClick={() => setPerguntaAtual(i)}
              className={`transition-all duration-200 rounded-full ${
                i === perguntaAtual
                  ? `h-2 w-8 bg-gradient-to-r ${fase.cor}`
                  : respostas[fase.perguntas[i].id]
                  ? "h-2 w-2 bg-emerald-500"
                  : "h-2 w-2 bg-white/20"
              }`}
            />
          ))}
        </div>

        {/* Pergunta */}
        <div className="mb-8">
          <p className="text-slate-400 text-sm mb-3 font-medium uppercase tracking-wide">
            Pergunta {perguntaAtual + 1} de {totalPerguntas}
          </p>
          <h2 className="text-2xl font-bold leading-snug mb-4">
            {pergunta.pergunta}
          </h2>
          {pergunta.dica && (
            <div className="flex items-start gap-2 bg-white/5 rounded-xl p-3 border border-white/10">
              <span className="text-yellow-400 text-sm mt-0.5">💡</span>
              <p className="text-slate-300 text-sm leading-relaxed">{pergunta.dica}</p>
            </div>
          )}
        </div>

        {/* Área de resposta */}
        <div className="mb-8">
          <Textarea
            value={respostaAtual}
            onChange={(e) => handleResposta(e.target.value)}
            placeholder={pergunta.placeholder}
            className="min-h-[180px] bg-white/5 border-white/20 text-white placeholder:text-slate-500 resize-none text-base leading-relaxed focus:border-violet-500 focus:ring-violet-500/20 rounded-xl"
            autoFocus
          />
          <div className="flex justify-between items-center mt-2">
            <span className="text-slate-500 text-xs">
              {respostaAtual.length > 0 ? `${respostaAtual.length} caracteres` : "Escreva com liberdade — não há resposta errada"}
            </span>
            {temResposta && (
              <span className="text-emerald-400 text-xs flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Respondida
              </span>
            )}
          </div>
        </div>

        {/* Navegação */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handlePerguntaAnterior}
            disabled={perguntaAtual === 0}
            className="border-white/20 text-white hover:bg-white/10 bg-transparent disabled:opacity-30"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Anterior
          </Button>

          {isUltimaPergunta ? (
            <Button
              onClick={handleConcluirFase}
              disabled={concluindo}
              className={`bg-gradient-to-r ${fase.cor} text-white hover:opacity-90 px-6 font-semibold shadow-lg`}
            >
              {concluindo ? (
                <>
                  <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                  Gerando resumo...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Concluir Fase {faseAtual}
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={handleProximaPergunta}
              className={`bg-gradient-to-r ${fase.cor} text-white hover:opacity-90 px-6`}
            >
              Próxima
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>

        {/* Fases bloqueadas / progresso geral */}
        <div className="mt-12 pt-8 border-t border-white/10">
          <p className="text-slate-400 text-xs text-center mb-4">Progresso geral do questionário</p>
          <div className="flex gap-2 justify-center">
            {FASES.map((f) => {
              const status = getFaseStatus(f.id);
              const ativa = f.id === faseAtual;
              return (
                <button
                  key={f.id}
                  onClick={() => handleIrParaFase(f.id)}
                  title={f.titulo}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all ${
                    status === "concluida"
                      ? "bg-emerald-500 text-white"
                      : ativa
                      ? `bg-gradient-to-br ${f.cor} text-white ring-2 ring-white/30`
                      : status === "em_progresso"
                      ? "bg-amber-500/40 text-amber-300"
                      : "bg-white/10 text-slate-400"
                  }`}
                >
                  {status === "concluida" ? <CheckCircle2 className="w-4 h-4" /> : f.id}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
