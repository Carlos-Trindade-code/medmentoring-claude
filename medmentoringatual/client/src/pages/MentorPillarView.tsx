/**
 * MentorPillarView — Painel do mentor para um pilar específico
 *
 * Acessado via /mentor/mentorado/:menteeId/pilar/:pillarId
 *
 * Contém em uma única tela (sanfona):
 * 1. Roteiro de condução (perguntas PNL, técnicas, frases de impacto)
 * 2. Respostas do mentorado (preenchidas autonomamente)
 * 3. Ferramentas interativas do pilar (calculadoras, construtores, etc.)
 * 4. Feedback do mentor + liberação da conclusão
 */
import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ChevronLeft, ChevronDown, ChevronUp, CheckCircle2,
  MessageSquare, BookOpen, Wrench, Send, Lock, Unlock,
  User, AlertCircle, Star, Loader2, Eye,
  Sparkles, Map, RefreshCw, TrendingUp, AlertTriangle, Target, Zap, FileDown
} from "lucide-react";
import { Link } from "wouter";
import { PILLAR_SECTIONS, PILLAR_TITLES, PILLAR_ICONS } from "@/lib/pillar-questions";
import type { Answer } from "@/components/MenteePillarQuestionnaire";
import { MentorAIChat } from "@/components/MentorAIChat";
import { PillarReportGenerator } from "@/components/PillarReportGenerator";
import { PillarPartAnalysis } from "@/components/PillarPartAnalysis";
import { MenteeAnswersSummary } from "@/components/MenteeAnswersSummary";
import { ExpenseAnalysis } from "@/components/ExpenseAnalysis";
import { IvmpAnalysis } from "@/components/IvmpAnalysis";
import { PricingAnalysis } from "@/components/PricingAnalysis";
import { SimulationSummary } from "@/components/SimulationSummary";
import { PILLAR_PARTS } from "../../../shared/pillar-parts";
import { ScenarioSimulator } from "@/components/ScenarioSimulator";

// ============================================================
// TIPOS DE IA
// ============================================================
type AiSpecSuggestion = {
  titulo: string;
  descricao: string;
  alinhamento: string;
  mercado: string;
  como_comecar: string;
};

type AiSpecResult = {
  sugestoes: AiSpecSuggestion[];
  analise_perfil: string;
  aviso_importante: string;
};

type AiPillarPriority = {
  pillar_id: number;
  nome: string;
  urgencia: "alta" | "media" | "baixa";
  motivo: string;
  acao_imediata: string;
};

type AiRoadmapResult = {
  resumo_diagnostico: string;
  pilares_prioritarios: AiPillarPriority[];
  proximos_passos: string[];
  ponto_critico: string;
  potencial_transformacao: string;
};

type AiDiagnosisLacuna = {
  lacuna: string;
  impacto: string;
  urgencia: "alta" | "media" | "baixa";
};

type AiDiagnosisRecomendacao = {
  acao: string;
  prazo: "imediato" | "curto_prazo" | "medio_prazo";
  resultado_esperado: string;
};

type AiDiagnosisResult = {
  resumo: string;
  pontos_fortes: string[];
  lacunas_criticas: AiDiagnosisLacuna[];
  recomendacoes: AiDiagnosisRecomendacao[];
  frase_chave: string;
  nivel_maturidade: string;
};

// ============================================================
// ROTEIROS POR PILAR (para o mentor)
// ============================================================
const PILLAR_SCRIPTS: Record<number, {
  fraseImpacto: string;
  objetivo: string;
  perguntas: string[];
  tecnicas: string[];
  checklistMentor: string[];
}> = {
  1: {
    fraseImpacto: "\"A maioria dos médicos sabe o que faz, mas poucos sabem por que fazem. Quando você descobre seu porquê, tudo muda.\"",
    objetivo: "Ajudar o mentorado a articular sua identidade profunda, missão, visão e valores — a base de todo o posicionamento futuro.",
    perguntas: [
      "Se você não fosse médico, o que você seria? (Revela vocação real)",
      "Qual foi o momento da sua carreira em que você se sentiu mais vivo?",
      "O que você faria de graça se não precisasse de dinheiro?",
      "Qual é o paciente que você mais se lembra? O que esse caso te ensinou?",
      "Daqui a 20 anos, o que você quer que seus pacientes digam sobre você?",
    ],
    tecnicas: [
      "Técnica dos 5 Porquês: Para cada resposta, pergunte 'Por quê?' até chegar na motivação mais profunda",
      "Espelho de Valores: Peça para o mentorado escolher 3 valores e contar uma história de quando cada um foi testado",
      "Linha do Tempo: Peça para mapear os 5 momentos mais marcantes da carreira",
    ],
    checklistMentor: [
      "Mentorado conseguiu articular seu propósito em uma frase?",
      "Os valores escolhidos são autênticos (não os que 'deveria' ter)?",
      "A visão de 5 anos é específica e mensurável?",
      "A missão conecta o que faz com quem ajuda e como ajuda?",
    ],
  },
  2: {
    fraseImpacto: "\"Médico genérico compete por preço. Médico posicionado compete por valor. Qual você quer ser?\"",
    objetivo: "Definir um posicionamento único e autêntico que diferencie o mentorado no mercado e atraia o paciente ideal.",
    perguntas: [
      "Se eu te pedisse para me indicar um médico da sua especialidade na sua cidade, quem você indicaria? Por quê? (Revela o que ele admira e quer ser)",
      "Qual é o paciente que você mais gosta de atender? Descreva ele em detalhes.",
      "O que você faz que nenhum outro médico da sua cidade faz exatamente da mesma forma?",
      "Se você pudesse atender apenas um tipo de paciente pelo resto da vida, qual seria?",
    ],
    tecnicas: [
      "Teste do Elevador: Peça para o mentorado se apresentar em 30 segundos como se fosse para um paciente ideal",
      "Mapa de Empatia: Explore o que o paciente ideal pensa, sente, faz e fala",
      "Matriz de Diferenciação: Compare o mentorado com 3 concorrentes em 5 atributos",
    ],
    checklistMentor: [
      "O diferencial é específico (não genérico como 'atendimento humanizado')?",
      "O paciente ideal está claramente definido?",
      "A frase de posicionamento está construída?",
      "O mentorado consegue explicar seu diferencial em 30 segundos?",
    ],
  },
  3: {
    fraseImpacto: "\"A maioria dos médicos paga a sala mesmo quando está dormindo. Você sabe quanto custa cada hora do seu tempo?\"",
    objetivo: "Revelar a realidade financeira do negócio: custos reais, faturamento, ociosidade e potencial de crescimento.",
    perguntas: [
      "Se você soubesse que sua clínica vai fechar em 6 meses, o que você faria diferente hoje?",
      "Qual é o número que te mantém acordado à noite? (Revela a maior preocupação financeira)",
      "Se você pudesse dobrar seu faturamento sem trabalhar mais horas, como faria?",
      "Você sabe qual é o seu custo por hora de trabalho? (Geralmente não sabem — momento WOW)",
    ],
    tecnicas: [
      "Calculadora ao Vivo: Calcule o custo/hora na frente do mentorado — o impacto é imediato",
      "Análise de Ociosidade: Mostre quanto dinheiro está sendo 'deixado na mesa' pela agenda vazia",
      "Simulação de Reajuste: Mostre o impacto de um reajuste de 20% no faturamento anual",
    ],
    checklistMentor: [
      "Todos os custos fixos foram mapeados (incluindo deslocamento)?",
      "O custo/hora foi calculado?",
      "A taxa de ociosidade foi identificada?",
      "O potencial de crescimento foi quantificado?",
      "O mentorado sabe quanto paga de imposto efetivamente?",
    ],
  },
  4: {
    fraseImpacto: "\"Uma clínica que depende 100% do médico não é um negócio — é um emprego disfarçado.\"",
    objetivo: "Mapear os processos da clínica, identificar gargalos e criar um plano para reduzir a dependência do médico.",
    perguntas: [
      "Se você fosse embora de férias amanhã por 30 dias, o que quebraria na sua clínica?",
      "Qual é a tarefa que você mais odeia fazer mas ainda faz porque 'ninguém faz como você'?",
      "Quantas horas por semana você passa fazendo coisas que não são atender pacientes?",
      "Você tem alguém que poderia substituir você em 80% das decisões operacionais?",
    ],
    tecnicas: [
      "Mapeamento de Processos: Desenhe o fluxo do paciente do primeiro contato ao pós-consulta",
      "Matriz de Delegação: Identifique o que pode ser delegado, automatizado ou eliminado",
      "Teste de Ausência: Simule o que aconteceria se você ficasse 2 semanas sem trabalhar",
    ],
    checklistMentor: [
      "Os processos críticos foram mapeados?",
      "Os gargalos foram identificados?",
      "Existe um plano de delegação?",
      "A taxa de cancelamento foi analisada?",
      "O mentorado sabe de onde vêm seus pacientes?",
    ],
  },
  5: {
    fraseImpacto: "\"Você não cobra pelo tempo de consulta. Você cobra pelo resultado que entrega. Qual é o valor desse resultado para o seu paciente?\"",
    objetivo: "Ajudar o mentorado a precificar com base no valor entregue, não no tempo gasto ou no que o concorrente cobra.",
    perguntas: [
      "Quanto vale para o seu paciente resolver o problema que ele veio te consultar?",
      "Se você fosse o paciente, quanto pagaria pelo resultado que você entrega?",
      "Qual é o procedimento que você mais gosta de fazer e que entrega mais resultado? Quanto você cobra por ele?",
      "Você já perdeu um paciente por causa do preço? Como você se sentiu?",
    ],
    tecnicas: [
      "Calculadora de Dinheiro Invisível: Mostre quanto o mentorado está deixando de ganhar com subpreço",
      "Ancoragem de Valor: Ensine a apresentar o valor antes do preço",
      "Tabela de Precificação: Construa a tabela ideal baseada em custos + margem + valor percebido",
    ],
    checklistMentor: [
      "O custo por procedimento foi calculado?",
      "A margem de lucro desejada foi definida?",
      "O preço está acima do custo + margem mínima?",
      "O mentorado consegue justificar o preço pelo valor entregue?",
      "Existe uma estratégia de reajuste anual?",
    ],
  },
  6: {
    fraseImpacto: "\"Seu paciente ideal está no Instagram agora, procurando respostas que você poderia dar. Mas você não está lá.\"",
    objetivo: "Criar uma estratégia de marketing digital autêntica e sustentável, baseada na identidade e posicionamento já definidos.",
    perguntas: [
      "Se você pudesse falar com 1.000 pacientes ideais ao mesmo tempo, o que você diria?",
      "Qual é a dúvida mais comum que seus pacientes têm antes de marcar consulta com você?",
      "O que você sabe sobre sua especialidade que a maioria das pessoas não sabe?",
      "Você tem medo de aparecer nas redes sociais? Por quê?",
    ],
    tecnicas: [
      "Mapa de Conteúdo: Crie um calendário de 30 dias baseado nas dúvidas dos pacientes",
      "Gerador de Prompt IA: Use os dados coletados para criar um prompt personalizado para o ChatGPT",
      "Auditoria Digital: Analise o perfil atual e identifique 3 melhorias imediatas",
    ],
    checklistMentor: [
      "O tom de voz foi definido?",
      "O paciente ideal para o conteúdo foi definido?",
      "A maior dificuldade com marketing foi identificada?",
      "O prompt de IA foi gerado?",
      "O calendário de conteúdo foi criado?",
    ],
  },
  7: {
    fraseImpacto: "\"Vender não é convencer. É ajudar o paciente a tomar a melhor decisão para a saúde dele.\"",
    objetivo: "Desenvolver habilidades de comunicação e apresentação de tratamentos que aumentem a taxa de aceitação de forma ética.",
    perguntas: [
      "Quando um paciente diz 'está caro', o que você sente?",
      "Você já deixou de propor um tratamento porque achou que o paciente não poderia pagar?",
      "Como você apresenta um tratamento que custa R$ 5.000 para um paciente?",
      "Qual é a objeção que você mais tem dificuldade de responder?",
    ],
    tecnicas: [
      "Simulador de Objeções: Pratique respostas éticas para as 5 objeções mais comuns",
      "Script de Apresentação: Construa um roteiro de apresentação de tratamento personalizado",
      "Técnica do Valor Antes do Preço: Ensine a apresentar o benefício antes do custo",
    ],
    checklistMentor: [
      "A taxa de aceitação atual foi identificada?",
      "As objeções mais comuns foram mapeadas?",
      "O script de apresentação foi construído?",
      "O mentorado consegue diferenciar preço de valor?",
      "As respostas às objeções foram praticadas?",
    ],
  },
};

const PART_SECTION_MAP: Record<number, Record<string, string[]>> = {
  1: { a: ["quem_sou", "valores"], b: ["ikigai", "valores_avancados"], c: ["missao_visao", "reflexao_identidade"] },
  2: { a: ["especialidade_atuacao", "publico_ideal"], b: ["diferencial"], c: ["proposta_valor"] },
  3: { a: ["estrutura_clinica", "custos_fixos", "custos_deslocamento", "faturamento_producao", "ociosidade_potencial", "reflexao_financeira"] },
  4: { a: ["equipe_gestao"], b: ["processos_atendimento"], c: ["reflexao_operacional"] },
  5: { a: ["precificacao_atual"], b: ["custos_variaveis"], c: ["reflexao_precificacao"] },
  6: { a: ["presenca_digital_atual"], b: ["comunicacao_tom_voz"], c: ["reflexao_marketing"] },
  7: { a: ["apresentacao_tratamento"], b: ["objecoes_comuns"], c: ["reflexao_conversao"] },
};

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
export default function MentorPillarView() {
  const { menteeId, pillarId: pillarIdStr } = useParams<{ menteeId: string; pillarId: string }>();
  const menteeIdNum = parseInt(menteeId ?? "0");
  const pillarId = parseInt(pillarIdStr ?? "1");
  const { user, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();

  const [roteiroOpen, setRoteiroOpen] = useState(false);
  const [activePartTab, setActivePartTab] = useState<string>("a");
  const [feedback, setFeedback] = useState("");
  const [planoAcao, setPlanoAcao] = useState("");
  const [pontosFortes, setPontosFortes] = useState<string[]>([""]);
  const [pontosMelhoria, setPontosMelhoria] = useState<string[]>([""]);
  const [savingFeedback, setSavingFeedback] = useState(false);

  const [generatingSpec, setGeneratingSpec] = useState(false);
  const [generatingRoadmap, setGeneratingRoadmap] = useState(false);
  const [aiSpecResult, setAiSpecResult] = useState<AiSpecResult | null>(null);
  const [aiRoadmapResult, setAiRoadmapResult] = useState<AiRoadmapResult | null>(null);
  const [generatingDiagnosis, setGeneratingDiagnosis] = useState(false);
  const [aiDiagnosisResult, setAiDiagnosisResult] = useState<AiDiagnosisResult | null>(null);
  const [savingDiagnosis, setSavingDiagnosis] = useState(false);
  const [generatingFeedbackDraft, setGeneratingFeedbackDraft] = useState(false);
  const [feedbackDraftGenerated, setFeedbackDraftGenerated] = useState(false);
  const [generatingConclusions, setGeneratingConclusions] = useState(false);
  const [conclusionsData, setConclusionsData] = useState<Record<string, unknown> | null>(null);
  const [editedConclusions, setEditedConclusions] = useState<Record<string, string>>({});
  const [savingConclusions, setSavingConclusions] = useState(false);

  const title = PILLAR_TITLES[pillarId];
  const icon = PILLAR_ICONS[pillarId];
  const script = PILLAR_SCRIPTS[pillarId];
  const parts = PILLAR_PARTS[pillarId] ?? [];
  const currentPartSections = PART_SECTION_MAP[pillarId]?.[activePartTab] ?? [];
  const sections = PILLAR_SECTIONS[pillarId];

  // Dados do mentorado
  const { data: mentee } = trpc.mentor.getMentee.useQuery({ id: menteeIdNum });

  // Respostas do mentorado
  const { data: answers, isLoading: loadingAnswers, error: answersError } = trpc.pillarFeedback.getAnswers.useQuery({
    menteeId: menteeIdNum,
    pillarId,
  }, { retry: false });

  // Feedback existente
  const { data: existingFeedback, refetch: refetchFeedback } = trpc.pillarFeedback.getFeedback.useQuery({
    menteeId: menteeIdNum,
    pillarId,
  });

  const saveFeedbackMutation = trpc.pillarFeedback.saveFeedback.useMutation();
  const releaseMutation = trpc.pillarFeedback.releaseConclusion.useMutation();
  const suggestSpecMutation = trpc.pillarTools.suggestSpecializations.useMutation();
  const generateRoadmapMutation = trpc.pillarTools.generatePillarRoadmap.useMutation();
  const generateDiagnosisMutation = trpc.pillarTools.generatePillarDiagnosis.useMutation();
  const saveDiagnosisMutation = trpc.pillarTools.saveDiagnosis.useMutation();
  const saveSpecMutation = trpc.pillarTools.saveSpecializations.useMutation();
  const saveRoadmapMutation = trpc.pillarTools.saveRoadmap.useMutation();
  const generateFeedbackDraftMutation = trpc.pillarTools.generateFeedbackDraft.useMutation();
  const generateConclusionsMutation = trpc.pillarTools.generatePillarConclusions.useMutation();
  const saveConclusionsMutation = trpc.pillarTools.savePillarConclusions.useMutation();
  const { data: existingConclusions, refetch: refetchConclusions } = trpc.pillarTools.getPillarConclusions.useQuery({
    menteeId: menteeIdNum,
    pillarId,
  });

  // Auto-summary IA ao abrir pilar
  const { data: autoSummary, isLoading: summaryLoading } = trpc.mentorAI.autoSummary.useQuery(
    { menteeId: Number(menteeId), pillarId: Number(pillarId) },
    { staleTime: 5 * 60 * 1000 }
  );

  // Inicializa conclusões existentes
  useEffect(() => {
    if (existingConclusions?.conclusoesJson) {
      const data = existingConclusions.conclusoesJson as Record<string, unknown>;
      setConclusionsData(data);
      const edited: Record<string, string> = {};
      for (const [key, val] of Object.entries(data)) {
        if (typeof val === "string") edited[key] = val;
        else if (Array.isArray(val)) edited[key] = val.join("\n");
      }
      setEditedConclusions(edited);
    }
  }, [existingConclusions]);

  const handleGenerateConclusions = async () => {
    setGeneratingConclusions(true);
    try {
      const result = await generateConclusionsMutation.mutateAsync({ menteeId: menteeIdNum, pillarId });
      setConclusionsData(result as Record<string, unknown>);
      const edited: Record<string, string> = {};
      for (const [key, val] of Object.entries(result as Record<string, unknown>)) {
        if (typeof val === "string") edited[key] = val;
        else if (Array.isArray(val)) edited[key] = (val as string[]).join("\n");
      }
      setEditedConclusions(edited);
      toast.success("Conclusões geradas! Revise e ajuste antes de liberar.");
      refetchConclusions();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      toast.error(msg || "Erro ao gerar conclusões. Tente novamente.");
    } finally {
      setGeneratingConclusions(false);
    }
  };

  const handleSaveConclusions = async (liberar = false) => {
    setSavingConclusions(true);
    try {
      // Reconstrói o JSON com os valores editados
      const conclusoesJson: Record<string, unknown> = {};
      if (conclusionsData) {
        for (const [key, val] of Object.entries(conclusionsData)) {
          if (key in editedConclusions) {
            if (Array.isArray(val)) {
              conclusoesJson[key] = editedConclusions[key].split("\n").filter(Boolean);
            } else {
              conclusoesJson[key] = editedConclusions[key];
            }
          } else {
            conclusoesJson[key] = val;
          }
        }
      }
      await saveConclusionsMutation.mutateAsync({
        menteeId: menteeIdNum,
        pillarId,
        conclusoesJson,
        liberarParaMentorado: liberar,
      });
      toast.success(liberar ? "Conclusões liberadas para o mentorado!" : "Conclusões salvas com sucesso!");
      refetchConclusions();
    } catch {
      toast.error("Erro ao salvar conclusões.");
    } finally {
      setSavingConclusions(false);
    }
  };

  // Inicializa feedback existente quando dados chegam do servidor
  useEffect(() => {
    if (existingFeedback) {
      setFeedback(existingFeedback.feedback ?? "");
      setPlanoAcao(existingFeedback.planoAcao ?? "");
      if (existingFeedback.pontosFortesJson) setPontosFortes(existingFeedback.pontosFortesJson as string[]);
      if (existingFeedback.pontosMelhoriaJson) setPontosMelhoria(existingFeedback.pontosMelhoriaJson as string[]);
      // Carrega resultados de IA salvos anteriormente
      if (existingFeedback.aiSpecializationSuggestions) setAiSpecResult(existingFeedback.aiSpecializationSuggestions as AiSpecResult);
      if (existingFeedback.aiPillarRoadmap) setAiRoadmapResult(existingFeedback.aiPillarRoadmap as AiRoadmapResult);
      if (existingFeedback.aiDiagnosis) setAiDiagnosisResult(existingFeedback.aiDiagnosis as AiDiagnosisResult);
    }
  }, [existingFeedback]);

  const handleGenerateSpecializations = async () => {
    setGeneratingSpec(true);
    try {
      const result = await suggestSpecMutation.mutateAsync({ menteeId: menteeIdNum });
      setAiSpecResult(result as AiSpecResult);
      toast.success("Sugestões de especialização geradas!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao gerar sugestões.";
      toast.error(msg);
    } finally {
      setGeneratingSpec(false);
    }
  };

  const handleGenerateRoadmap = async () => {
    setGeneratingRoadmap(true);
    try {
      const result = await generateRoadmapMutation.mutateAsync({ menteeId: menteeIdNum });
      setAiRoadmapResult(result as AiRoadmapResult);
      toast.success("Roteiro estratégico gerado!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao gerar roteiro.";
      toast.error(msg);
    } finally {
      setGeneratingRoadmap(false);
    }
  };

  const handleGenerateDiagnosis = async () => {
    setGeneratingDiagnosis(true);
    try {
      const result = await generateDiagnosisMutation.mutateAsync({ menteeId: menteeIdNum, pillarId });
      setAiDiagnosisResult(result as AiDiagnosisResult);
      toast.success("Diagnóstico gerado com sucesso!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao gerar diagnóstico.";
      toast.error(msg);
    } finally {
      setGeneratingDiagnosis(false);
    }
  };

  const handleSaveDiagnosis = async () => {
    if (!aiDiagnosisResult) return;
    setSavingDiagnosis(true);
    try {
      await saveDiagnosisMutation.mutateAsync({
        menteeId: menteeIdNum,
        pillarId,
        diagnosis: aiDiagnosisResult,
      });
      toast.success("Diagnóstico salvo com sucesso!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao salvar diagnóstico.";
      toast.error(msg);
    } finally {
      setSavingDiagnosis(false);
    }
  };

  const [savingSpec, setSavingSpec] = useState(false);
  const handleSaveSpecializations = async () => {
    if (!aiSpecResult) return;
    setSavingSpec(true);
    try {
      await saveSpecMutation.mutateAsync({ menteeId: menteeIdNum, specializations: aiSpecResult });
      toast.success("Especializacoes salvas!");
    } catch { toast.error("Erro ao salvar especializacoes."); }
    finally { setSavingSpec(false); }
  };

  const [savingRoadmap, setSavingRoadmap] = useState(false);
  const handleSaveRoadmap = async () => {
    if (!aiRoadmapResult) return;
    setSavingRoadmap(true);
    try {
      await saveRoadmapMutation.mutateAsync({ menteeId: menteeIdNum, roadmap: aiRoadmapResult });
      toast.success("Roteiro salvo!");
    } catch { toast.error("Erro ao salvar roteiro."); }
    finally { setSavingRoadmap(false); }
  };

  const handleSaveFeedback = async () => {
    setSavingFeedback(true);
    try {
      await saveFeedbackMutation.mutateAsync({
        menteeId: menteeIdNum,
        pillarId,
        feedback,
        planoAcao,
        pontosFortesJson: pontosFortes.filter(Boolean),
        pontosMelhoriaJson: pontosMelhoria.filter(Boolean),
      });
      toast.success("Feedback salvo com sucesso!");
      refetchFeedback();
    } catch {
      toast.error("Erro ao salvar feedback.");
    } finally {
      setSavingFeedback(false);
    }
  };

  const handleRelease = async () => {
    // Salva o feedback primeiro
    await handleSaveFeedback();
    try {
      await releaseMutation.mutateAsync({ menteeId: menteeIdNum, pillarId });
      toast.success(`Conclusão do Pilar ${pillarId} liberada para ${mentee?.nome}!`);
      refetchFeedback();
    } catch {
      toast.error("Erro ao liberar conclusão.");
    }
  };

  const handleGenerateFeedbackDraft = async () => {
    setGeneratingFeedbackDraft(true);
    try {
      const draft = await generateFeedbackDraftMutation.mutateAsync({
        menteeId: menteeIdNum,
        pillarId,
      });
      // Preenche os campos com o rascunho gerado (sem sobrescrever se já houver conteúdo)
      if (draft.pontos_fortes?.length) setPontosFortes(draft.pontos_fortes);
      if (draft.pontos_melhoria?.length) setPontosMelhoria(draft.pontos_melhoria);
      if (draft.feedback_geral) setFeedback(draft.feedback_geral);
      if (draft.plano_acao) setPlanoAcao(draft.plano_acao);
      setFeedbackDraftGenerated(true);
      toast.success("Rascunho gerado! Revise e ajuste antes de liberar ao mentorado.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("ainda não respondeu")) {
        toast.error("O mentorado ainda não respondeu este pilar.");
      } else {
        toast.error("Erro ao gerar rascunho. Tente novamente.");
      }
    } finally {
      setGeneratingFeedbackDraft(false);
    }
  };

  // Agrupa respostas por seção
  const answersBySection: Record<string, Answer[]> = {};
  if (answers) {
    for (const row of answers) {
      if (row.secao && row.respostas) {
        answersBySection[row.secao] = row.respostas as Answer[];
      }
    }
  }

  const totalAnswers = Object.values(answersBySection).reduce((acc, arr) => acc + arr.length, 0);
  const answeredCount = Object.values(answersBySection).reduce(
    (acc, arr) => acc + arr.filter(a => a.naoSabe || (a.resposta !== null && a.resposta !== undefined && a.resposta !== "")).length,
    0
  );

  // Auth guard: se sessão expirou, mostrar botão de login
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto" />
          <h2 className="text-lg font-semibold text-foreground">Sessão expirada</h2>
          <p className="text-sm text-muted-foreground">Faça login novamente para acessar o painel do mentor.</p>
          <Button onClick={() => navigate("/mentor")} className="mt-2">Ir para o painel</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href={`/mentor/mentorado/${menteeIdNum}`}>
            <Button variant="ghost" size="sm" className="mb-4 gap-2">
              <ChevronLeft className="w-4 h-4" /> Voltar ao mentorado
            </Button>
          </Link>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{icon}</span>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Pilar {pillarId}</p>
                <h1 className="text-2xl font-bold text-foreground">{title}</h1>
                {mentee && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                    <User className="w-3 h-3" /> {mentee.nome}
                  </p>
                )}
              </div>
            </div>
            <div className="text-right">
              {existingFeedback?.conclusaoLiberada ? (
                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                  <Unlock className="w-3 h-3 mr-1" /> Conclusão liberada
                </Badge>
              ) : (
                <Badge variant="secondary">
                  <Lock className="w-3 h-3 mr-1" /> Aguardando liberação
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Auto-summary IA */}
        {summaryLoading && (
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-6 animate-pulse">
            <div className="h-4 bg-primary/10 rounded w-1/3 mb-2" />
            <div className="h-3 bg-primary/10 rounded w-full mb-1" />
            <div className="h-3 bg-primary/10 rounded w-2/3" />
          </div>
        )}
        {autoSummary?.summary && (
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-primary">Resumo IA</span>
              {autoSummary.cached && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Cache</span>
              )}
            </div>
            <div className="text-sm text-foreground whitespace-pre-line leading-relaxed">{autoSummary.summary}</div>
          </div>
        )}

        {/* ============================================================ */}
        {/* Roteiro de Condução — collapsible card                       */}
        {/* ============================================================ */}
        <div className="border rounded-xl mb-4 overflow-hidden">
          <button
            className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
            onClick={() => setRoteiroOpen(!roteiroOpen)}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-foreground">Roteiro de Condução</p>
                <p className="text-xs text-muted-foreground">Perguntas PNL, técnicas e checklist do mentor</p>
              </div>
            </div>
            {roteiroOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </button>

          {roteiroOpen && script && (
            <div className="px-4 pb-4 space-y-5 border-t">
              <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">Frase de Impacto</p>
                <p className="text-sm text-amber-800 italic">{script.fraseImpacto}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Objetivo do Pilar</p>
                <p className="text-sm text-foreground">{script.objetivo}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Perguntas Estratégicas</p>
                <div className="space-y-2">
                  {script.perguntas.map((p, i) => (
                    <div key={i} className="flex gap-3 p-3 bg-muted/30 rounded-lg">
                      <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                      <p className="text-sm text-foreground">{p}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Técnicas e Ferramentas</p>
                <div className="space-y-2">
                  {script.tecnicas.map((t, i) => (
                    <div key={i} className="flex gap-2 text-sm text-muted-foreground">
                      <Wrench className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <span>{t}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Checklist de Conclusão</p>
                <div className="space-y-2">
                  {script.checklistMentor.map((item, i) => (
                    <label key={i} className="flex items-start gap-2 cursor-pointer">
                      <input type="checkbox" className="mt-0.5 rounded" />
                      <span className="text-sm text-foreground">{item}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ============================================================ */}
        {/* Tab bar: Parts + Entrega                                     */}
        {/* ============================================================ */}
        <div className="border rounded-xl overflow-hidden">
          {/* Tab buttons */}
          <div className="flex border-b overflow-x-auto scrollbar-hide gap-0">
            {parts.map((part) => (
              <button
                key={part.id}
                onClick={() => setActivePartTab(part.id)}
                className={`shrink-0 py-3 px-3 sm:px-4 text-center font-medium transition-colors ${
                  activePartTab === part.id
                    ? "text-primary border-b-2 border-primary bg-primary/5"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                <span className="text-xs font-bold">{part.id.toUpperCase()}</span>
                <span className="hidden md:inline ml-1 text-xs">{part.label}</span>
              </button>
            ))}
            <button
              onClick={() => setActivePartTab("entrega")}
              className={`shrink-0 py-3 px-3 sm:px-4 font-medium transition-colors ${
                activePartTab === "entrega"
                  ? "text-emerald-700 border-b-2 border-emerald-600 bg-emerald-50"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <Send className="w-3.5 h-3.5 inline mr-1" />
              <span className="text-xs">Entrega</span>
              {existingFeedback?.conclusaoLiberada && (
                <Badge className="ml-1 bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px] px-1 py-0">OK</Badge>
              )}
            </button>
          </div>

          {/* ============================================================ */}
          {/* Part content (not entrega)                                   */}
          {/* ============================================================ */}
          {activePartTab !== "entrega" && (
            <div className="p-4 space-y-6">
              {/* Part description removed — tab already shows which part is active */}

              {/* Mentee answers filtered by currentPartSections */}
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 mt-2 flex items-center gap-2">
                  <User className="w-3.5 h-3.5" /> Respostas do Mentorado
                </h3>
                {loadingAnswers ? (
                  <div className="py-8 flex justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : answersError ? (
                  <div className="py-6 text-center">
                    <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                    <p className="text-sm font-medium text-foreground">Erro ao carregar respostas</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {(answersError as any)?.data?.httpStatus === 401
                        ? "Sua sessão expirou. Faça login novamente."
                        : answersError.message}
                    </p>
                  </div>
                ) : (() => {
                  const filteredSections = (sections ?? []).filter(s => currentPartSections.includes(s.id));
                  const filteredAnswerRows = (answers ?? []).filter((row: any) => currentPartSections.includes(row.secao));
                  if (filteredSections.length === 0 && filteredAnswerRows.length === 0) {
                    return (
                      <div className="py-6 text-center">
                        <AlertCircle className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                        <p className="text-xs text-muted-foreground">Nenhuma resposta nesta parte ainda.</p>
                      </div>
                    );
                  }
                  return (
                    <MenteeAnswersSummary
                      sections={filteredSections}
                      answers={filteredAnswerRows as any}
                    />
                  );
                })()}
              </div>

              {/* Tool analysis components for specific parts */}
              {pillarId === 3 && activePartTab === "a" && (
                <div className="space-y-4">
                  <PillarTools pillarId={pillarId} menteeId={menteeIdNum} answers={answersBySection} />
                </div>
              )}

              {/* Pilar 3 Part B — Despesas: Análise completa com dados editáveis */}
              {pillarId === 3 && activePartTab === "b" && (
                <div className="space-y-4">
                  <ExpenseAnalysis menteeId={menteeIdNum} />
                </div>
              )}

              {/* Pilar 3 Part C — iVMP: Análise com edição inline de notas */}
              {pillarId === 3 && activePartTab === "c" && (
                <div className="space-y-4">
                  <IvmpAnalysis menteeId={menteeIdNum} />
                </div>
              )}

              {/* Pilar 3 Part D — Simulador: Editável pelo mentor */}
              {pillarId === 3 && activePartTab === "d" && (
                <div className="space-y-6">
                  <ScenarioSimulator menteeId={menteeIdNum} mode="mentor" />
                  <SimulationSummary menteeId={menteeIdNum} />
                </div>
              )}

              {/* Pilar 5 Part B — Precificação: Análise completa */}
              {pillarId === 5 && activePartTab === "b" && (
                <div className="space-y-4">
                  <PricingAnalysis menteeId={menteeIdNum} />
                </div>
              )}

              {/* Part-level AI analysis */}
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5" /> Analise IA desta Parte
                </h3>
                <PillarPartAnalysis menteeId={menteeIdNum} pillarId={pillarId} />
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* Entrega tab content                                          */}
          {/* ============================================================ */}
          {activePartTab === "entrega" && (
            <div className="p-4 space-y-8">
              {/* --- Diagnostico --- */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-500" /> Diagnostico do Pilar
                </h3>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">Analise baseada nas respostas do mentorado neste pilar.</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleGenerateDiagnosis}
                    disabled={generatingDiagnosis}
                    className="gap-2 border-indigo-300 text-indigo-700 hover:bg-indigo-50"
                  >
                    {generatingDiagnosis ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                    {aiDiagnosisResult ? "Regerar" : "Gerar Diagnostico"}
                  </Button>
                </div>

                {generatingDiagnosis && (
                  <div className="py-8 flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                    <p className="text-sm text-muted-foreground">Analisando respostas e gerando diagnostico personalizado...</p>
                  </div>
                )}

                {!generatingDiagnosis && !aiDiagnosisResult && (
                  <div className="py-6 text-center">
                    <Sparkles className="w-10 h-10 text-indigo-300 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground mb-1">Nenhum diagnostico gerado ainda.</p>
                    <p className="text-xs text-muted-foreground">Clique em "Gerar Diagnostico" para analisar as respostas deste pilar.</p>
                  </div>
                )}

                {!generatingDiagnosis && aiDiagnosisResult && (
                  <div className="space-y-4">
                    {/* Frase-chave editavel */}
                    <div>
                      <label className="text-xs font-semibold text-indigo-700 uppercase tracking-wide block mb-1.5">Frase-chave</label>
                      <Textarea
                        value={aiDiagnosisResult.frase_chave}
                        onChange={e => setAiDiagnosisResult(prev => prev ? { ...prev, frase_chave: e.target.value } : prev)}
                        rows={2}
                        className="text-sm border-indigo-200 bg-indigo-50/50"
                      />
                    </div>

                    {/* Resumo editavel */}
                    <div>
                      <label className="text-xs font-semibold text-indigo-700 uppercase tracking-wide block mb-1.5">Resumo do Diagnostico</label>
                      <Textarea
                        value={aiDiagnosisResult.resumo}
                        onChange={e => setAiDiagnosisResult(prev => prev ? { ...prev, resumo: e.target.value } : prev)}
                        rows={4}
                        className="text-sm border-indigo-200 bg-indigo-50/50"
                      />
                    </div>

                    {/* Nivel de maturidade */}
                    <div>
                      <label className="text-xs font-semibold text-indigo-700 uppercase tracking-wide block mb-1.5">Nivel de Maturidade</label>
                      <select
                        value={aiDiagnosisResult.nivel_maturidade}
                        onChange={e => setAiDiagnosisResult(prev => prev ? { ...prev, nivel_maturidade: e.target.value } : prev)}
                        className="w-full rounded-md border border-indigo-200 bg-indigo-50/50 px-3 py-2 text-sm"
                      >
                        <option value="iniciante">Iniciante</option>
                        <option value="em_desenvolvimento">Em Desenvolvimento</option>
                        <option value="avançado">Avancado</option>
                        <option value="expert">Expert</option>
                      </select>
                    </div>

                    {/* Pontos fortes editaveis */}
                    <div>
                      <label className="text-xs font-semibold text-emerald-700 uppercase tracking-wide flex items-center gap-1 mb-1.5">
                        <Star className="w-3 h-3" /> Pontos Fortes
                      </label>
                      <Textarea
                        value={aiDiagnosisResult.pontos_fortes.join("\n")}
                        onChange={e => setAiDiagnosisResult(prev => prev ? { ...prev, pontos_fortes: e.target.value.split("\n") } : prev)}
                        rows={Math.max(3, aiDiagnosisResult.pontos_fortes.length + 1)}
                        className="text-sm border-emerald-200 bg-emerald-50/50"
                        placeholder="Um ponto forte por linha"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Um item por linha</p>
                    </div>

                    {/* Lacunas criticas editaveis */}
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1 mb-1.5">
                        <AlertTriangle className="w-3 h-3" /> Lacunas Criticas
                      </label>
                      {aiDiagnosisResult.lacunas_criticas.map((lacuna, i) => (
                        <div key={i} className="border rounded-lg p-3 mb-2 bg-muted/20">
                          <div className="grid grid-cols-1 gap-2">
                            <Input
                              value={lacuna.lacuna}
                              onChange={e => {
                                const updated = [...aiDiagnosisResult.lacunas_criticas];
                                updated[i] = { ...updated[i], lacuna: e.target.value };
                                setAiDiagnosisResult(prev => prev ? { ...prev, lacunas_criticas: updated } : prev);
                              }}
                              placeholder="Lacuna"
                              className="text-sm"
                            />
                            <Input
                              value={lacuna.impacto}
                              onChange={e => {
                                const updated = [...aiDiagnosisResult.lacunas_criticas];
                                updated[i] = { ...updated[i], impacto: e.target.value };
                                setAiDiagnosisResult(prev => prev ? { ...prev, lacunas_criticas: updated } : prev);
                              }}
                              placeholder="Impacto"
                              className="text-sm"
                            />
                            <select
                              value={lacuna.urgencia}
                              onChange={e => {
                                const updated = [...aiDiagnosisResult.lacunas_criticas];
                                updated[i] = { ...updated[i], urgencia: e.target.value as "alta" | "media" | "baixa" };
                                setAiDiagnosisResult(prev => prev ? { ...prev, lacunas_criticas: updated } : prev);
                              }}
                              className="rounded-md border px-3 py-2 text-sm"
                            >
                              <option value="alta">Alta</option>
                              <option value="media">Media</option>
                              <option value="baixa">Baixa</option>
                            </select>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Recomendacoes editaveis */}
                    <div>
                      <label className="text-xs font-semibold text-blue-700 uppercase tracking-wide flex items-center gap-1 mb-1.5">
                        <Target className="w-3 h-3" /> Recomendacoes
                      </label>
                      {aiDiagnosisResult.recomendacoes.map((rec, i) => (
                        <div key={i} className="border rounded-lg p-3 mb-2 bg-muted/20">
                          <div className="grid grid-cols-1 gap-2">
                            <Input
                              value={rec.acao}
                              onChange={e => {
                                const updated = [...aiDiagnosisResult.recomendacoes];
                                updated[i] = { ...updated[i], acao: e.target.value };
                                setAiDiagnosisResult(prev => prev ? { ...prev, recomendacoes: updated } : prev);
                              }}
                              placeholder="Acao"
                              className="text-sm"
                            />
                            <Input
                              value={rec.resultado_esperado}
                              onChange={e => {
                                const updated = [...aiDiagnosisResult.recomendacoes];
                                updated[i] = { ...updated[i], resultado_esperado: e.target.value };
                                setAiDiagnosisResult(prev => prev ? { ...prev, recomendacoes: updated } : prev);
                              }}
                              placeholder="Resultado esperado"
                              className="text-sm"
                            />
                            <select
                              value={rec.prazo}
                              onChange={e => {
                                const updated = [...aiDiagnosisResult.recomendacoes];
                                updated[i] = { ...updated[i], prazo: e.target.value as "imediato" | "curto_prazo" | "medio_prazo" };
                                setAiDiagnosisResult(prev => prev ? { ...prev, recomendacoes: updated } : prev);
                              }}
                              className="rounded-md border px-3 py-2 text-sm"
                            >
                              <option value="imediato">Imediato</option>
                              <option value="curto_prazo">Curto Prazo</option>
                              <option value="medio_prazo">Medio Prazo</option>
                            </select>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Botao Salvar */}
                    <div className="flex gap-2 pt-2">
                      <Button
                        onClick={handleSaveDiagnosis}
                        disabled={savingDiagnosis}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
                      >
                        {savingDiagnosis ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                        Salvar Diagnostico
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <hr className="border-dashed" />

              {/* --- Estrategia P1 --- */}
              {pillarId === 1 && (
                <>
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Map className="w-4 h-4 text-violet-500" /> Estrategia (Pilar 1)
                    </h3>

                    {/* Especializacoes */}
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-violet-700 uppercase tracking-wide">Especializacoes Sugeridas</p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleGenerateSpecializations}
                        disabled={generatingSpec}
                        className="gap-2 border-violet-300 text-violet-700 hover:bg-violet-50"
                      >
                        {generatingSpec ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                        {aiSpecResult ? "Regerar" : "Gerar Sugestoes"}
                      </Button>
                    </div>

                    {generatingSpec && (
                      <div className="py-8 flex flex-col items-center gap-3">
                        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
                        <p className="text-sm text-muted-foreground">Analisando perfil e gerando sugestoes personalizadas...</p>
                      </div>
                    )}

                    {!generatingSpec && !aiSpecResult && (
                      <div className="py-6 text-center">
                        <Sparkles className="w-10 h-10 text-violet-300 mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground">Clique em "Gerar Sugestoes" para analisar o perfil do mentorado.</p>
                      </div>
                    )}

                    {!generatingSpec && aiSpecResult && (
                      <div className="space-y-4">
                        <div className="p-4 bg-violet-50 border border-violet-200 rounded-lg">
                          <p className="text-xs font-semibold text-violet-700 uppercase tracking-wide mb-2 flex items-center gap-1">
                            <User className="w-3 h-3" /> Analise do Perfil
                          </p>
                          <p className="text-sm text-violet-900 leading-relaxed">{aiSpecResult.analise_perfil}</p>
                        </div>
                        <div className="space-y-3">
                          {aiSpecResult.sugestoes.map((s, i) => (
                            <div key={i} className="border rounded-lg overflow-hidden">
                              <div className="px-4 py-3 bg-gradient-to-r from-violet-50 to-purple-50 border-b flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-violet-600 text-white text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                                <p className="font-semibold text-foreground">{s.titulo}</p>
                              </div>
                              <div className="px-4 py-3 space-y-2.5">
                                <p className="text-sm text-muted-foreground">{s.descricao}</p>
                                <div className="flex gap-2 items-start">
                                  <Target className="w-3.5 h-3.5 text-violet-500 mt-0.5 shrink-0" />
                                  <p className="text-xs text-violet-800"><span className="font-semibold">Alinhamento:</span> {s.alinhamento}</p>
                                </div>
                                <div className="flex gap-2 items-start">
                                  <TrendingUp className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                                  <p className="text-xs text-emerald-800"><span className="font-semibold">Mercado:</span> {s.mercado}</p>
                                </div>
                                <div className="flex gap-2 items-start">
                                  <Zap className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                                  <p className="text-xs text-amber-800"><span className="font-semibold">Como comecar:</span> {s.como_comecar}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs font-semibold text-amber-700 mb-1">Atencao</p>
                            <p className="text-xs text-amber-800">{aiSpecResult.aviso_importante}</p>
                          </div>
                        </div>
                        <Button onClick={handleSaveSpecializations} disabled={savingSpec} size="sm" className="bg-violet-600 hover:bg-violet-700 text-white gap-1.5">
                          {savingSpec ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                          Salvar Especializacoes
                        </Button>
                      </div>
                    )}

                    <hr className="border-dashed" />

                    {/* Roteiro Estrategico */}
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-violet-700 uppercase tracking-wide">Roteiro Estrategico</p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleGenerateRoadmap}
                        disabled={generatingRoadmap}
                        className="gap-2 border-violet-300 text-violet-700 hover:bg-violet-50"
                      >
                        {generatingRoadmap ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                        {aiRoadmapResult ? "Regerar" : "Gerar Roteiro"}
                      </Button>
                    </div>

                    {generatingRoadmap && (
                      <div className="py-8 flex flex-col items-center gap-3">
                        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
                        <p className="text-sm text-muted-foreground">Analisando todos os pilares e gerando roteiro personalizado...</p>
                      </div>
                    )}

                    {!generatingRoadmap && aiRoadmapResult && (
                      <div className="space-y-4">
                        <div className="p-4 bg-violet-50 border border-violet-200 rounded-lg">
                          <p className="text-xs font-semibold text-violet-700 uppercase tracking-wide mb-2 flex items-center gap-1">
                            <Sparkles className="w-3 h-3" /> Diagnostico Geral
                          </p>
                          <p className="text-sm text-violet-900 leading-relaxed">{aiRoadmapResult.resumo_diagnostico}</p>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex gap-2">
                            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-xs font-semibold text-red-700 mb-1">Ponto Critico</p>
                              <p className="text-xs text-red-800">{aiRoadmapResult.ponto_critico}</p>
                            </div>
                          </div>
                          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex gap-2">
                            <TrendingUp className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-xs font-semibold text-emerald-700 mb-1">Maior Potencial de Transformacao</p>
                              <p className="text-xs text-emerald-800">{aiRoadmapResult.potencial_transformacao}</p>
                            </div>
                          </div>
                        </div>

                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Prioridade por Pilar</p>
                          <div className="space-y-2">
                            {[...aiRoadmapResult.pilares_prioritarios]
                              .sort((a, b) => {
                                const order = { alta: 0, media: 1, baixa: 2 };
                                return order[a.urgencia] - order[b.urgencia];
                              })
                              .map((p) => {
                                const urgenciaConfig = {
                                  alta: { bg: "bg-red-50 border-red-200", badge: "bg-red-100 text-red-700", label: "Alta Prioridade" },
                                  media: { bg: "bg-amber-50 border-amber-200", badge: "bg-amber-100 text-amber-700", label: "Media Prioridade" },
                                  baixa: { bg: "bg-emerald-50 border-emerald-200", badge: "bg-emerald-100 text-emerald-700", label: "Baixa Prioridade" },
                                }[p.urgencia];
                                return (
                                  <div key={p.pillar_id} className={`border rounded-lg p-3 ${urgenciaConfig.bg}`}>
                                    <div className="flex items-center justify-between mb-1.5">
                                      <p className="text-sm font-semibold text-foreground">Pilar {p.pillar_id} — {p.nome}</p>
                                      <Badge className={`text-xs ${urgenciaConfig.badge}`}>{urgenciaConfig.label}</Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground mb-1.5">{p.motivo}</p>
                                    <div className="flex gap-1.5 items-start">
                                      <Zap className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" />
                                      <p className="text-xs font-medium text-foreground">{p.acao_imediata}</p>
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        </div>

                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                          <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2 flex items-center gap-1">
                            <Target className="w-3 h-3" /> Proximos Passos para o Mentor
                          </p>
                          <div className="space-y-1.5">
                            {aiRoadmapResult.proximos_passos.map((passo, i) => (
                              <div key={i} className="flex gap-2">
                                <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                                <p className="text-xs text-blue-900">{passo}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                        <Button onClick={handleSaveRoadmap} disabled={savingRoadmap} size="sm" className="bg-violet-600 hover:bg-violet-700 text-white gap-1.5 mt-3">
                          {savingRoadmap ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                          Salvar Roteiro
                        </Button>
                      </div>
                    )}
                  </div>

                  <hr className="border-dashed" />
                </>
              )}

              {/* --- Chat IA do Mentor --- */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-violet-500" /> Chat IA do Mentor
                </h3>
                <MentorAIChat
                  menteeId={menteeIdNum}
                  pillarId={pillarId}
                  pillarTitle={title || `Pilar ${pillarId}`}
                />
              </div>

              <hr className="border-dashed" />

              {/* --- Conclusoes --- */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Conclusoes do Pilar
                </h3>
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-emerald-900 text-sm flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4" />
                        Gerador de Conclusoes
                      </p>
                      <p className="text-xs text-emerald-700 mt-0.5">
                        A IA analisa todas as respostas do mentorado neste pilar e gera as conclusoes estruturadas. Voce revisa, edita e libera.
                      </p>
                    </div>
                    <Button
                      onClick={handleGenerateConclusions}
                      disabled={generatingConclusions}
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shrink-0"
                    >
                      {generatingConclusions ? (
                        <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Gerando...</>
                      ) : (
                        <><Sparkles className="w-3.5 h-3.5" /> {conclusionsData ? "Regerar" : "Gerar Conclusoes com IA"}</>
                      )}
                    </Button>
                  </div>
                </div>

                {conclusionsData && (
                  <div className="space-y-4">
                    {Object.entries(conclusionsData).map(([key, val]) => {
                      const label = key
                        .replace(/_/g, " ")
                        .replace(/\b\w/g, c => c.toUpperCase());
                      const isArray = Array.isArray(val);
                      const isRecomendacao = key === "recomendacao_mentor";
                      return (
                        <div key={key}>
                          <label className={`text-xs font-semibold uppercase tracking-wide flex items-center gap-1 mb-1.5 ${
                            isRecomendacao ? "text-violet-700" : "text-emerald-700"
                          }`}>
                            {isRecomendacao ? <Eye className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                            {label}
                            {isRecomendacao && <span className="text-violet-500 font-normal normal-case">(somente mentor)</span>}
                          </label>
                          <Textarea
                            value={editedConclusions[key] ?? (isArray ? (val as string[]).join("\n") : String(val ?? ""))}
                            onChange={e => setEditedConclusions(prev => ({ ...prev, [key]: e.target.value }))}
                            rows={isArray ? Math.max(3, (val as string[]).length + 1) : 3}
                            className={`text-sm ${
                              isRecomendacao
                                ? "border-violet-200 bg-violet-50/50 focus:border-violet-400"
                                : "border-emerald-200 bg-emerald-50/50 focus:border-emerald-400"
                            }`}
                            placeholder={isArray ? "Um item por linha" : `Escreva ${label.toLowerCase()}...`}
                          />
                          {isArray && (
                            <p className="text-xs text-muted-foreground mt-1">Um item por linha</p>
                          )}
                        </div>
                      );
                    })}

                    <div className="flex flex-wrap gap-2 pt-2">
                      <Button
                        onClick={() => handleSaveConclusions(false)}
                        disabled={savingConclusions}
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                      >
                        {savingConclusions ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                        Salvar Rascunho
                      </Button>
                      <Button
                        onClick={() => handleSaveConclusions(true)}
                        disabled={savingConclusions}
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                      >
                        {savingConclusions ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                        Salvar e Liberar para Mentorado
                      </Button>
                      {!!existingConclusions?.conclusoesJson && (
                        <Button
                          onClick={() => {
                            const url = `/api/pdf/pilar-conclusoes/${menteeId}/${pillarId}`;
                            window.open(url, "_blank");
                          }}
                          variant="outline"
                          size="sm"
                          className="gap-1.5 border-indigo-300 text-indigo-700 hover:bg-indigo-50"
                        >
                          <FileDown className="w-3.5 h-3.5" />
                          Baixar PDF
                        </Button>
                      )}
                    </div>

                    {existingConclusions?.liberadoParaMentorado && (
                      <div className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-100 rounded-lg px-3 py-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Conclusoes ja liberadas para o mentorado. Qualquer nova edicao e liberacao substituira a versao anterior.
                      </div>
                    )}
                  </div>
                )}

                {!conclusionsData && (
                  <div className="text-center py-6 text-muted-foreground">
                    <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Clique em "Gerar Conclusoes com IA" para analisar as respostas do mentorado e criar as conclusoes deste pilar.</p>
                  </div>
                )}
              </div>

              <hr className="border-dashed" />

              {/* --- Feedback --- */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-violet-500" /> Feedback do Mentor
                </h3>

                <div className="bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-200 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-violet-900 text-sm flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4" />
                        Assistente de Feedback
                      </p>
                      <p className="text-xs text-violet-700 mt-0.5">
                        A IA analisa todas as respostas do mentorado e gera um rascunho completo. Voce revisa e ajusta antes de liberar.
                      </p>
                    </div>
                    <Button
                      onClick={handleGenerateFeedbackDraft}
                      disabled={generatingFeedbackDraft}
                      size="sm"
                      className="bg-violet-600 hover:bg-violet-700 text-white gap-1.5 shrink-0"
                    >
                      {generatingFeedbackDraft ? (
                        <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Gerando...</>
                      ) : (
                        <><Sparkles className="w-3.5 h-3.5" /> {feedbackDraftGenerated ? "Regerar Rascunho" : "Gerar Rascunho com IA"}</>
                      )}
                    </Button>
                  </div>
                  {feedbackDraftGenerated && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-violet-600 bg-violet-100 rounded-lg px-3 py-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Rascunho gerado pela IA — os campos abaixo foram preenchidos. Revise e edite livremente antes de liberar.
                    </div>
                  )}
                </div>

                {/* Pontos Fortes */}
                <div>
                  <label className="text-xs font-semibold text-emerald-700 uppercase tracking-wide flex items-center gap-1 mb-2">
                    <Star className="w-3 h-3" /> Pontos Fortes
                  </label>
                  <div className="space-y-2">
                    {pontosFortes.map((pf, i) => (
                      <div key={i} className="flex gap-2">
                        <Input
                          value={pf}
                          onChange={e => {
                            const updated = [...pontosFortes];
                            updated[i] = e.target.value;
                            setPontosFortes(updated);
                          }}
                          placeholder={`Ponto forte ${i + 1}...`}
                          className="flex-1"
                        />
                        {pontosFortes.length > 1 && (
                          <Button variant="ghost" size="sm" onClick={() => setPontosFortes(prev => prev.filter((_, idx) => idx !== i))}>x</Button>
                        )}
                      </div>
                    ))}
                    <Button variant="ghost" size="sm" onClick={() => setPontosFortes(prev => [...prev, ""])} className="text-xs">
                      + Adicionar ponto forte
                    </Button>
                  </div>
                </div>

                {/* Pontos de Melhoria */}
                <div>
                  <label className="text-xs font-semibold text-amber-700 uppercase tracking-wide flex items-center gap-1 mb-2">
                    <AlertCircle className="w-3 h-3" /> Pontos de Melhoria
                  </label>
                  <div className="space-y-2">
                    {pontosMelhoria.map((pm, i) => (
                      <div key={i} className="flex gap-2">
                        <Input
                          value={pm}
                          onChange={e => {
                            const updated = [...pontosMelhoria];
                            updated[i] = e.target.value;
                            setPontosMelhoria(updated);
                          }}
                          placeholder={`Ponto de melhoria ${i + 1}...`}
                          className="flex-1"
                        />
                        {pontosMelhoria.length > 1 && (
                          <Button variant="ghost" size="sm" onClick={() => setPontosMelhoria(prev => prev.filter((_, idx) => idx !== i))}>x</Button>
                        )}
                      </div>
                    ))}
                    <Button variant="ghost" size="sm" onClick={() => setPontosMelhoria(prev => [...prev, ""])} className="text-xs">
                      + Adicionar ponto de melhoria
                    </Button>
                  </div>
                </div>

                {/* Feedback geral */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-2">Feedback Geral</label>
                  <Textarea
                    value={feedback}
                    onChange={e => setFeedback(e.target.value)}
                    placeholder="Escreva seu feedback personalizado para o mentorado sobre este pilar..."
                    rows={4}
                    className="resize-none"
                  />
                </div>

                {/* Plano de Acao */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-2">Plano de Acao</label>
                  <Textarea
                    value={planoAcao}
                    onChange={e => setPlanoAcao(e.target.value)}
                    placeholder="Quais sao os proximos passos para o mentorado neste pilar?&#10;1. ...&#10;2. ...&#10;3. ..."
                    rows={4}
                    className="resize-none"
                  />
                </div>

                {/* Botoes */}
                <div className="flex gap-3 pt-2">
                  <Button variant="outline" onClick={handleSaveFeedback} disabled={savingFeedback} className="gap-2">
                    {savingFeedback ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Salvar feedback
                  </Button>
                  {!existingFeedback?.conclusaoLiberada ? (
                    <Button onClick={handleRelease} disabled={savingFeedback} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                      <Unlock className="w-4 h-4" />
                      Liberar conclusao para o mentorado
                    </Button>
                  ) : (
                    <div className="flex items-center gap-2 text-emerald-600 text-sm font-medium">
                      <CheckCircle2 className="w-4 h-4" />
                      Conclusao ja liberada
                    </div>
                  )}
                </div>
              </div>

              <hr className="border-dashed" />

              {/* --- Relatorio --- */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <FileDown className="w-4 h-4 text-indigo-500" /> Relatorio do Pilar
                </h3>
                <PillarReportGenerator
                  menteeId={menteeIdNum}
                  menteeName={mentee?.nome ?? "Mentorado"}
                  pillarId={pillarId}
                  pillarName={title ?? `Pilar ${pillarId}`}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// FERRAMENTAS POR PILAR
// ============================================================
function PillarTools({ pillarId, menteeId, answers }: {
  pillarId: number;
  menteeId: number;
  answers: Record<string, Answer[]>;
}) {
  // Extrai valores das respostas para usar nas calculadoras
  const getAnswer = (secao: string, questionId: string): string | number | null => {
    const sectionAnswers = answers[secao] ?? [];
    const answer = sectionAnswers.find(a => a.id === questionId);
    if (!answer || answer.naoSabe) return null;
    return answer.resposta as string | number | null;
  };

  if (pillarId === 3) {
    // Calculadora de custo/hora e potencial de crescimento
    const faturamento = Number(getAnswer("faturamento_producao", "p3_faturamento_mensal") ?? 0);
    const consultasMes = Number(getAnswer("faturamento_producao", "p3_consultas_mes") ?? 0);
    const capacidadeMax = Number(getAnswer("ociosidade_potencial", "p3_capacidade_maxima") ?? 0);
    const taxaOcupacao = Number(getAnswer("ociosidade_potencial", "p3_taxa_ocupacao") ?? 0);
    const horasDia = Number(getAnswer("faturamento_producao", "p3_horas_dia") ?? 0);
    const diasSemana = Number(getAnswer("faturamento_producao", "p3_dias_trabalho") ?? 0);

    // Soma custos fixos
    const custosCampos = [
      "p3_aluguel_valor_geral", "p3_custo_pessoal", "p3_custo_contador",
      "p3_custo_energia", "p3_custo_agua", "p3_custo_internet",
      "p3_custo_materiais", "p3_custo_limpeza", "p3_custo_software",
      "p3_custo_marketing", "p3_custo_seguros", "p3_custo_associacoes",
      "p3_custo_gasolina", "p3_custo_pedagio", "p3_custo_estacionamento",
      "p3_custo_manutencao_carro", "p3_custo_viagem",
    ];
    const totalCustos = custosCampos.reduce((acc, campo) => {
      const secao = campo.startsWith("p3_custo_gasolina") || campo.startsWith("p3_custo_pedagio") ||
        campo.startsWith("p3_custo_estacionamento") || campo.startsWith("p3_custo_manutencao_carro") ||
        campo.startsWith("p3_custo_viagem") ? "custos_deslocamento" : "custos_fixos";
      return acc + Number(getAnswer(secao, campo) ?? 0);
    }, 0);

    const horasMes = horasDia * diasSemana * 4.3;
    const custoPorHora = horasMes > 0 ? totalCustos / horasMes : 0;
    const lucroBruto = faturamento - totalCustos;
    const margemLucro = faturamento > 0 ? (lucroBruto / faturamento) * 100 : 0;
    const consultasOciosas = capacidadeMax > 0 && taxaOcupacao > 0
      ? Math.round(capacidadeMax * (1 - taxaOcupacao / 100))
      : 0;
    const valorPorConsulta = consultasMes > 0 ? faturamento / consultasMes : 0;
    const potencialCrescimento = consultasOciosas * valorPorConsulta;

    return (
      <div className="mt-4 space-y-4">
        <p className="text-xs text-muted-foreground">Calculado automaticamente com base nas respostas do mentorado.</p>

        <div className="grid grid-cols-2 gap-3">
          <MetricCard label="Faturamento Bruto" value={`R$ ${faturamento.toLocaleString("pt-BR")}`} color="emerald" />
          <MetricCard label="Total de Custos" value={`R$ ${totalCustos.toLocaleString("pt-BR")}`} color="red" />
          <MetricCard label="Lucro Bruto" value={`R$ ${lucroBruto.toLocaleString("pt-BR")}`} color={lucroBruto > 0 ? "emerald" : "red"} />
          <MetricCard label="Margem de Lucro" value={`${margemLucro.toFixed(1)}%`} color={margemLucro > 30 ? "emerald" : margemLucro > 15 ? "amber" : "red"} />
          <MetricCard label="Custo por Hora" value={custoPorHora > 0 ? `R$ ${custoPorHora.toFixed(2)}` : "—"} color="blue" />
          <MetricCard label="Potencial Ocioso" value={potencialCrescimento > 0 ? `R$ ${potencialCrescimento.toLocaleString("pt-BR")}/mês` : "—"} color="purple" />
        </div>

        {totalCustos === 0 && (
          <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-3">
            O mentorado ainda não preencheu os custos. Peça para ele completar a seção de custos no questionário.
          </p>
        )}
      </div>
    );
  }

  if (pillarId === 5) {
    return (
      <div className="mt-4">
        <PricingAnalysis menteeId={menteeId} />
      </div>
    );
  }

  // Pilares sem calculadora — mostra resumo das respostas
  return (
    <div className="mt-4 p-4 bg-muted/30 rounded-lg text-center">
      <p className="text-sm text-muted-foreground">
        As ferramentas interativas deste pilar estão disponíveis na{" "}
        <Link href={`/mentor/mentorado/${menteeId}/pilar${pillarId}`} className="text-primary underline">
          Sala de Trabalho do Pilar {pillarId}
        </Link>.
      </p>
    </div>
  );
}

function MetricCard({ label, value, color }: { label: string; value: string; color: string }) {
  const colorMap: Record<string, string> = {
    emerald: "bg-emerald-50 border-emerald-200 text-emerald-700",
    red: "bg-red-50 border-red-200 text-red-700",
    amber: "bg-amber-50 border-amber-200 text-amber-700",
    blue: "bg-blue-50 border-blue-200 text-blue-700",
    purple: "bg-purple-50 border-purple-200 text-purple-700",
  };

  return (
    <div className={`border rounded-lg p-3 ${colorMap[color] ?? colorMap.blue}`}>
      <p className="text-xs opacity-70 mb-1">{label}</p>
      <p className="font-bold text-sm">{value}</p>
    </div>
  );
}
