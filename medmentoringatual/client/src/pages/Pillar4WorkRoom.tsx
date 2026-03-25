import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  ArrowLeft, Settings, ChevronDown, ChevronRight, Save, CheckCircle2,
  AlertTriangle, Lightbulb, Plus, Trash2, Users, GitBranch,
  ClipboardList, Zap, Lock, Sparkles, ArrowRight, AlertCircle,
  RefreshCw, UserCheck, Clock, Star
} from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";

// ─── TIPOS ────────────────────────────────────────────────────────────────────
interface TeamMember {
  id: string;
  cargo: string;
  nome: string;
  responsabilidades: string;
  tempoServico: string;
  nivel: "medico" | "gestao" | "clinico" | "administrativo";
}

interface Processo {
  id: string;
  nome: string;
  responsavel: string;
  frequencia: string;
  tempoMinutos: number;
  documentado: boolean;
  gargalo: boolean;
  descricao: string;
  melhorias: string;
}

interface GargaloItem {
  id: string;
  problema: string;
  frequencia: string;
  impacto: "alto" | "medio" | "baixo";
  solucao: string;
}

// ─── DADOS ────────────────────────────────────────────────────────────────────
const CARGOS_SUGERIDOS = [
  { cargo: "Médico(a) Titular", nivel: "medico" as const },
  { cargo: "Médico(a) Sócio(a)", nivel: "medico" as const },
  { cargo: "Médico(a) Residente/Assistente", nivel: "medico" as const },
  { cargo: "Gerente / Coordenador(a) Administrativo(a)", nivel: "gestao" as const },
  { cargo: "Recepcionista / Secretária", nivel: "administrativo" as const },
  { cargo: "Auxiliar de Enfermagem", nivel: "clinico" as const },
  { cargo: "Técnico(a) de Enfermagem", nivel: "clinico" as const },
  { cargo: "Enfermeiro(a)", nivel: "clinico" as const },
  { cargo: "Fisioterapeuta", nivel: "clinico" as const },
  { cargo: "Psicólogo(a)", nivel: "clinico" as const },
  { cargo: "Nutricionista", nivel: "clinico" as const },
  { cargo: "Auxiliar de Limpeza", nivel: "administrativo" as const },
  { cargo: "Técnico(a) em Radiologia", nivel: "clinico" as const },
];

const PROCESSOS_SUGERIDOS = [
  { nome: "Agendamento de consultas", responsavel: "Recepcionista", frequencia: "Diário", tempoMinutos: 5, descricao: "Receber ligação/mensagem, verificar agenda, confirmar horário, registrar no sistema" },
  { nome: "Confirmação de consultas (24h antes)", responsavel: "Recepcionista", frequencia: "Diário", tempoMinutos: 30, descricao: "Ligar ou enviar mensagem para confirmar presença do paciente" },
  { nome: "Recepção e check-in do paciente", responsavel: "Recepcionista", frequencia: "Diário", tempoMinutos: 5, descricao: "Receber paciente, confirmar dados, preparar prontuário" },
  { nome: "Preparação da sala de atendimento", responsavel: "Aux. Enfermagem", frequencia: "Diário", tempoMinutos: 10, descricao: "Organizar materiais, verificar equipamentos, preparar ambiente" },
  { nome: "Triagem e aferição de sinais vitais", responsavel: "Aux. Enfermagem", frequencia: "Diário", tempoMinutos: 10, descricao: "Peso, pressão, temperatura, saturação, histórico de queixas" },
  { nome: "Atendimento médico / consulta", responsavel: "Médico(a)", frequencia: "Diário", tempoMinutos: 30, descricao: "Anamnese, exame físico, diagnóstico, plano terapêutico" },
  { nome: "Emissão de receitas e pedidos de exame", responsavel: "Médico(a)", frequencia: "Diário", tempoMinutos: 5, descricao: "Prescrição digital ou manual, orientações ao paciente" },
  { nome: "Cobrança e pagamento", responsavel: "Recepcionista", frequencia: "Diário", tempoMinutos: 5, descricao: "Informar valor, processar pagamento, emitir recibo" },
  { nome: "Lançamento no prontuário eletrônico", responsavel: "Médico(a)", frequencia: "Diário", tempoMinutos: 10, descricao: "Registrar evolução, diagnóstico, conduta e retorno" },
  { nome: "Limpeza e esterilização de materiais", responsavel: "Aux. Enfermagem", frequencia: "Diário", tempoMinutos: 20, descricao: "Limpar e esterilizar instrumentos após cada atendimento" },
  { nome: "Controle de estoque de insumos", responsavel: "Aux. Enfermagem", frequencia: "Semanal", tempoMinutos: 30, descricao: "Verificar estoque, fazer pedido de compra quando necessário" },
  { nome: "Fechamento do caixa", responsavel: "Recepcionista", frequencia: "Diário", tempoMinutos: 15, descricao: "Conferir pagamentos, fechar caixa, registrar divergências" },
  { nome: "Relatório de produção mensal", responsavel: "Gestor(a)", frequencia: "Mensal", tempoMinutos: 60, descricao: "Consolidar atendimentos, faturamento, indicadores" },
];

const PERGUNTAS_MENTOR = [
  {
    pergunta: "Qual problema operacional aparece mais de uma vez por semana na sua clínica?",
    motivo: "Identifica os gargalos recorrentes — que por definição não são eventos, são sistemas. O que se repete é o que precisa de protocolo.",
    angustia: "Não tem tempo para gerenciar processos",
    tecnica: "Reframe de Investimento — '2h em um processo bem documentado economizam 30min/semana para sempre. Em 1 ano = 26h economizadas. Você não tem tempo de não fazer isso.'",
  },
  {
    pergunta: "Se você sumisse por 2 semanas, o que pararia de funcionar? Por quê?",
    motivo: "Mapeia as dependências críticas do médico. A resposta é o organograma real — não o que deveria ser, mas o que é.",
    angustia: "Dificuldade em delegar",
    tecnica: "Modelagem de Excelência — 'você já delegou algo que funcionou bem. O que fez diferente naquela vez? Use isso como referência.'",
  },
  {
    pergunta: "Sua equipe sabe exatamente o que fazer quando você não está presente?",
    motivo: "Testa se os processos existem apenas na cabeça do médico ou estão documentados e transferidos.",
    angustia: "Medo de demitir funcionário antigo / lealdade",
    tecnica: "Posições Perceptuais — experienciar nas 3 posições: como você, como o funcionário e como observador neutro. O que cada um diria? Separa afeto de decisão estratégica.",
  },
];

const CHECKLIST_PILAR = [
  "Local de trabalho e modelo de atuação avaliados e decididos com critérios",
  "Organograma atual desenhado e lacunas de função identificadas",
  "Responsabilidades por cargo definidas com clareza, incluindo o secretariado",
  "Processos críticos mapeados (ao menos 5 processos documentados)",
  "Gargalos recorrentes identificados com plano de solução",
  "Protocolos de atendimento criados e comunicados à equipe",
  "Sistemas de agenda e prontuário avaliados e adequados ao perfil",
  "Plano de delegação estruturado para ausências do médico",
];

const NIVEL_COLORS: Record<string, string> = {
  medico: "bg-purple-100 text-purple-700 border-purple-300",
  gestao: "bg-blue-100 text-blue-700 border-blue-300",
  clinico: "bg-green-100 text-green-700 border-green-300",
  administrativo: "bg-gray-100 text-gray-700 border-gray-300",
};

const NIVEL_LABELS: Record<string, string> = {
  medico: "Médico",
  gestao: "Gestão",
  clinico: "Clínico",
  administrativo: "Administrativo",
};

const IMPACTO_COLORS: Record<string, string> = {
  alto: "bg-red-100 text-red-700 border-red-300",
  medio: "bg-yellow-100 text-yellow-700 border-yellow-300",
  baixo: "bg-green-100 text-green-700 border-green-300",
};

// ─── COMPONENT ────────────────────────────────────────────────────────────────
export default function Pillar4WorkRoom() {
  const { menteeId } = useParams<{ menteeId: string }>();
  const [, navigate] = useLocation();
  const { user, loading: authLoading } = useAuth();

  const mid = Number(menteeId);

  const [activeTab, setActiveTab] = useState<"mentor" | "organograma" | "processos" | "gargalos" | "checklist">("mentor");

  // Organograma
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMember, setNewMember] = useState<Partial<TeamMember>>({ nivel: "administrativo" });

  // Processos
  const [processos, setProcessos] = useState<Processo[]>([]);
  const [showAddProcesso, setShowAddProcesso] = useState(false);
  const [expandedProcesso, setExpandedProcesso] = useState<string | null>(null);

  // Gargalos
  const [gargalos, setGargalos] = useState<GargaloItem[]>([]);

  // Mentor notes
  const [mentorNotes, setMentorNotes] = useState<Record<number, string>>({});
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(0);
  // Checklist (DB-backed)
  const utils = trpc.useUtils();
  const { data: checklistData } = trpc.mentor.getChecklist.useQuery({ menteeId: mid });
  const updateChecklistItem = trpc.mentor.updateChecklistItem.useMutation({
    onSuccess: () => utils.mentor.getChecklist.invalidate({ menteeId: mid }),
  });
  const pillarChecklist = (checklistData ?? []).filter((c: any) => c.pillarId === 4);
  const checklistStatus = CHECKLIST_PILAR.map((_item, i) => {
    const saved = pillarChecklist.find((c: any) => c.itemIndex === i);
    return saved?.status === "completed";
  });

  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const { data: mentee } = trpc.mentor.getMentee.useQuery({ id: mid }, { enabled: !!mid });
  const { data: diagnostic } = trpc.mentor.getPillarDiagnostic.useQuery({ menteeId: mid, pillarId: 4 }, { enabled: !!mid });
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

  // Load mentee portal answers for pre-fill
  const { data: menteeAnswers } = trpc.pillarFeedback.getAnswers.useQuery(
    { menteeId: mid, pillarId: 4 },
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
    if (diagnostic?.respostasJson) {
      const saved = diagnostic.respostasJson as Record<string, unknown>;
      if (saved.teamMembers) setTeamMembers(saved.teamMembers as TeamMember[]);
      if (saved.processos) setProcessos(saved.processos as Processo[]);
      if (saved.gargalos) setGargalos(saved.gargalos as GargaloItem[]);
      if (saved.mentorNotes) setMentorNotes(saved.mentorNotes as Record<number, string>);
    }
  }, [diagnostic]);

  // Pre-fill gargalos from mentee answers
  useEffect(() => {
    if (!menteeAnswers?.length || diagnostic?.respostasJson) return;
    const gargaloVal = getMenteeAnswer("equipe_gestao", "p4_maior_gargalo");
    const ausenciaVal = getMenteeAnswer("equipe_gestao", "p4_ausencia_2semanas");
    if (gargaloVal || ausenciaVal) {
      setGargalos(prev => prev.length ? prev : [
        ...(gargaloVal ? [{ id: Date.now().toString(), problema: gargaloVal, frequencia: "Frequente", impacto: "alto" as const, solucao: "" }] : []),
        ...(ausenciaVal ? [{ id: (Date.now() + 1).toString(), problema: `Dependência do médico: ${ausenciaVal}`, frequencia: "Sempre", impacto: "alto" as const, solucao: "" }] : []),
      ]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menteeAnswers, diagnostic]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveDiagnostic.mutateAsync({
        menteeId: mid, pillarId: 4,
        respostasJson: { teamMembers, processos, gargalos, mentorNotes },
        angustiasJson: [], tecnicasJson: [],
      });
      setLastSaved(new Date());
      toast.success("Progresso salvo!");
    } catch { toast.error("Erro ao salvar."); }
    finally { setSaving(false); }
  };

  const addMember = () => {
    if (!newMember.cargo) return;
    const member: TeamMember = {
      id: Date.now().toString(),
      cargo: newMember.cargo || "",
      nome: newMember.nome || "",
      responsabilidades: newMember.responsabilidades || "",
      tempoServico: newMember.tempoServico || "",
      nivel: newMember.nivel || "administrativo",
    };
    setTeamMembers(prev => [...prev, member]);
    setNewMember({ nivel: "administrativo" });
    setShowAddMember(false);
  };

  const removeMember = (id: string) => setTeamMembers(prev => prev.filter(m => m.id !== id));

  const addProcessoFromSugestao = (sugestao: typeof PROCESSOS_SUGERIDOS[0]) => {
    const p: Processo = {
      id: Date.now().toString(),
      nome: sugestao.nome,
      responsavel: sugestao.responsavel,
      frequencia: sugestao.frequencia,
      tempoMinutos: sugestao.tempoMinutos,
      documentado: false,
      gargalo: false,
      descricao: sugestao.descricao,
      melhorias: "",
    };
    setProcessos(prev => [...prev, p]);
  };

  const addGargalo = () => {
    setGargalos(prev => [...prev, {
      id: Date.now().toString(),
      problema: "", frequencia: "", impacto: "medio", solucao: "",
    }]);
  };

  const completedChecklist = checklistStatus.filter(Boolean).length;
  const processosDocumentados = processos.filter(p => p.documentado).length;
  const gargalosComSolucao = gargalos.filter(g => g.solucao.trim().length > 10).length;

  const TABS = [
    { id: "mentor", label: "Roteiro do Mentor", icon: Lock },
    { id: "organograma", label: "Organograma", icon: Users, badge: teamMembers.length > 0 ? `${teamMembers.length}` : null },
    { id: "processos", label: "Processos", icon: GitBranch, badge: processos.length > 0 ? `${processosDocumentados}/${processos.length}` : null },
    { id: "gargalos", label: "Gargalos", icon: AlertCircle, badge: gargalos.length > 0 ? `${gargalos.length}` : null },
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
          <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
            <Settings className="w-5 h-5 text-blue-300" />
          </div>
          <div>
            <div className="text-xs text-white/60 uppercase tracking-wider">Pilar 4</div>
            <div className="font-bold text-lg leading-tight">Estrutura Operacional</div>
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
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">{tab.badge}</span>
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
              <p className="text-gray-600 text-sm">A clínica depende exclusivamente do médico para funcionar. Férias, doença ou ausência = operação parada.</p>
              <div className="mt-3 p-3 bg-[#C9A84C]/10 rounded-lg border border-[#C9A84C]/30">
                <div className="text-xs font-semibold text-[#C9A84C] uppercase tracking-wider mb-1">Frase de impacto para abrir a sessão</div>
                <div className="text-sm text-gray-700 italic">"Me conta: se você precisasse ficar 2 semanas sem trabalhar amanhã, o que aconteceria com a sua clínica? Essa resposta vai nos dizer tudo que precisamos trabalhar hoje."</div>
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

        {/* ─── TAB: ORGANOGRAMA ─── */}
        {activeTab === "organograma" && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="font-bold text-[#1A3A5C]">Organograma da Equipe</h3>
                  <p className="text-gray-500 text-sm">Mapeie todos os membros da equipe, seus cargos e responsabilidades</p>
                </div>
                <Button onClick={() => setShowAddMember(true)} size="sm" className="bg-[#1A3A5C] text-white">
                  <Plus className="w-4 h-4 mr-1" /> Adicionar
                </Button>
              </div>

              {teamMembers.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <div className="text-sm">Nenhum membro cadastrado ainda</div>
                  <div className="text-xs mt-1">Clique em "Adicionar" para começar o organograma</div>
                </div>
              )}

              {/* Visualização por nível */}
              {["medico", "gestao", "clinico", "administrativo"].map(nivel => {
                const membros = teamMembers.filter(m => m.nivel === nivel);
                if (membros.length === 0) return null;
                return (
                  <div key={nivel} className="mt-4">
                    <div className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border mb-2 ${NIVEL_COLORS[nivel]}`}>
                      {NIVEL_LABELS[nivel]}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {membros.map(member => (
                        <div key={member.id} className="border border-gray-200 rounded-lg p-3 relative group">
                          <button onClick={() => removeMember(member.id)}
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-600">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <div className="font-semibold text-[#1A3A5C] text-sm">{member.cargo}</div>
                          {member.nome && <div className="text-gray-600 text-xs mt-0.5">{member.nome}</div>}
                          {member.tempoServico && <div className="text-gray-400 text-xs">{member.tempoServico} de serviço</div>}
                          {member.responsabilidades && (
                            <div className="mt-2 text-xs text-gray-600 bg-gray-50 rounded p-2">{member.responsabilidades}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Add member form */}
            {showAddMember && (
              <div className="bg-white rounded-xl border border-[#1A3A5C] p-5">
                <h4 className="font-semibold text-[#1A3A5C] mb-4">Novo membro da equipe</h4>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block mb-1">Cargo *</label>
                    <select value={newMember.cargo || ""} onChange={e => {
                      const found = CARGOS_SUGERIDOS.find(c => c.cargo === e.target.value);
                      setNewMember(prev => ({ ...prev, cargo: e.target.value, nivel: found?.nivel || prev.nivel }));
                    }} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3A5C]">
                      <option value="">Selecione ou escreva abaixo</option>
                      {CARGOS_SUGERIDOS.map(c => <option key={c.cargo} value={c.cargo}>{c.cargo}</option>)}
                    </select>
                    <input type="text" value={newMember.cargo || ""} onChange={e => setNewMember(prev => ({ ...prev, cargo: e.target.value }))}
                      placeholder="Ou escreva o cargo aqui..." className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3A5C]" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block mb-1">Nome (opcional)</label>
                      <input type="text" value={newMember.nome || ""} onChange={e => setNewMember(prev => ({ ...prev, nome: e.target.value }))}
                        placeholder="Nome do colaborador" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3A5C]" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block mb-1">Tempo de serviço</label>
                      <input type="text" value={newMember.tempoServico || ""} onChange={e => setNewMember(prev => ({ ...prev, tempoServico: e.target.value }))}
                        placeholder="Ex: 2 anos" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3A5C]" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block mb-1">Nível hierárquico</label>
                    <div className="flex gap-2 flex-wrap">
                      {(["medico", "gestao", "clinico", "administrativo"] as const).map(n => (
                        <button key={n} onClick={() => setNewMember(prev => ({ ...prev, nivel: n }))}
                          className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${newMember.nivel === n ? NIVEL_COLORS[n] : "border-gray-200 text-gray-500"}`}>
                          {NIVEL_LABELS[n]}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block mb-1">Responsabilidades principais</label>
                    <Textarea value={newMember.responsabilidades || ""} onChange={e => setNewMember(prev => ({ ...prev, responsabilidades: e.target.value }))}
                      placeholder="Liste as principais responsabilidades deste cargo..." className="text-sm min-h-[60px] resize-none" />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={addMember} className="bg-[#1A3A5C] text-white">Adicionar ao organograma</Button>
                    <Button variant="outline" onClick={() => setShowAddMember(false)}>Cancelar</Button>
                  </div>
                </div>
              </div>
            )}

            {/* Análise de lacunas */}
            {teamMembers.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="font-semibold text-blue-800 text-sm mb-2 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4" /> Análise de lacunas
                </div>
                <div className="space-y-1 text-xs text-blue-700">
                  {!teamMembers.some(m => m.nivel === "gestao") && (
                    <div className="flex items-center gap-1.5"><AlertTriangle className="w-3 h-3 text-orange-500" /> Nenhum gestor/coordenador identificado — quem gerencia a operação quando o médico está atendendo?</div>
                  )}
                  {!teamMembers.some(m => m.cargo.toLowerCase().includes("recep") || m.cargo.toLowerCase().includes("secret")) && (
                    <div className="flex items-center gap-1.5"><AlertTriangle className="w-3 h-3 text-orange-500" /> Nenhuma recepcionista identificada — quem faz o agendamento e recepção?</div>
                  )}
                  {teamMembers.length >= 3 && <div className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-green-500" /> Equipe com {teamMembers.length} membros mapeados. Verifique se as responsabilidades estão claras para cada um.</div>}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── TAB: PROCESSOS ─── */}
        {activeTab === "processos" && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-[#1A3A5C]">Mapeamento de Processos</h3>
                  <p className="text-gray-500 text-sm">Documente os processos críticos da clínica e identifique quais precisam de protocolo</p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => setShowAddProcesso(!showAddProcesso)} size="sm" variant="outline">
                    <Plus className="w-4 h-4 mr-1" /> Adicionar
                  </Button>
                </div>
              </div>

              {/* Sugestões rápidas */}
              <div className="mb-4">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Adicionar processo sugerido</div>
                <div className="flex flex-wrap gap-2">
                  {PROCESSOS_SUGERIDOS.filter(s => !processos.some(p => p.nome === s.nome)).slice(0, 6).map(s => (
                    <button key={s.nome} onClick={() => addProcessoFromSugestao(s)}
                      className="text-xs px-2 py-1 rounded-full border border-gray-200 text-gray-600 hover:border-[#1A3A5C] hover:text-[#1A3A5C] transition-colors">
                      + {s.nome}
                    </button>
                  ))}
                </div>
              </div>

              {processos.length === 0 && (
                <div className="text-center py-6 text-gray-400">
                  <GitBranch className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <div className="text-sm">Nenhum processo mapeado ainda</div>
                </div>
              )}

              <div className="space-y-2">
                {processos.map(p => (
                  <div key={p.id} className="border border-gray-200 rounded-lg overflow-hidden">
                    <button className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
                      onClick={() => setExpandedProcesso(expandedProcesso === p.id ? null : p.id)}>
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${p.documentado ? "bg-green-500" : "bg-gray-300"}`} />
                        <span className="font-medium text-[#1A3A5C] text-sm">{p.nome}</span>
                        <span className="text-xs text-gray-400">{p.responsavel}</span>
                        {p.gargalo && <Badge className="bg-red-100 text-red-700 border-red-300 text-xs">Gargalo</Badge>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">{p.frequencia} · {p.tempoMinutos}min</span>
                        {expandedProcesso === p.id ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                      </div>
                    </button>
                    {expandedProcesso === p.id && (
                      <div className="px-4 pb-4 space-y-3 bg-gray-50">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div>
                            <label className="text-xs text-gray-500 block mb-1">Responsável</label>
                            <input type="text" value={p.responsavel} onChange={e => setProcessos(prev => prev.map(x => x.id === p.id ? { ...x, responsavel: e.target.value } : x))}
                              className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#1A3A5C]" />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 block mb-1">Frequência</label>
                            <select value={p.frequencia} onChange={e => setProcessos(prev => prev.map(x => x.id === p.id ? { ...x, frequencia: e.target.value } : x))}
                              className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#1A3A5C]">
                              {["Diário", "Semanal", "Quinzenal", "Mensal", "Por demanda"].map(f => <option key={f}>{f}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 block mb-1">Tempo (min)</label>
                            <input type="number" value={p.tempoMinutos} onChange={e => setProcessos(prev => prev.map(x => x.id === p.id ? { ...x, tempoMinutos: Number(e.target.value) } : x))}
                              className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#1A3A5C]" />
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-xs text-gray-500 block mb-1">Status</label>
                            <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                              <input type="checkbox" checked={p.documentado} onChange={e => setProcessos(prev => prev.map(x => x.id === p.id ? { ...x, documentado: e.target.checked } : x))} />
                              Documentado
                            </label>
                            <label className="flex items-center gap-1.5 text-xs cursor-pointer text-red-600">
                              <input type="checkbox" checked={p.gargalo} onChange={e => setProcessos(prev => prev.map(x => x.id === p.id ? { ...x, gargalo: e.target.checked } : x))} />
                              É um gargalo
                            </label>
                          </div>
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 block mb-1">Descrição do processo</label>
                          <Textarea value={p.descricao} onChange={e => setProcessos(prev => prev.map(x => x.id === p.id ? { ...x, descricao: e.target.value } : x))}
                            className="text-xs min-h-[60px] resize-none" placeholder="Descreva o passo a passo do processo..." />
                        </div>
                        {p.gargalo && (
                          <div>
                            <label className="text-xs text-red-600 font-semibold block mb-1">Plano de melhoria</label>
                            <Textarea value={p.melhorias} onChange={e => setProcessos(prev => prev.map(x => x.id === p.id ? { ...x, melhorias: e.target.value } : x))}
                              className="text-xs min-h-[60px] resize-none border-red-200" placeholder="Como resolver este gargalo? Quem é responsável? Prazo?" />
                          </div>
                        )}
                        <Button variant="outline" size="sm" onClick={() => setProcessos(prev => prev.filter(x => x.id !== p.id))} className="text-red-500 border-red-200">
                          <Trash2 className="w-3.5 h-3.5 mr-1" /> Remover processo
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {processos.length > 0 && (
                <div className="mt-4 grid grid-cols-3 gap-3">
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-[#1A3A5C]">{processos.length}</div>
                    <div className="text-xs text-gray-500">processos mapeados</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-green-600">{processosDocumentados}</div>
                    <div className="text-xs text-gray-500">documentados</div>
                  </div>
                  <div className="bg-red-50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-red-500">{processos.filter(p => p.gargalo).length}</div>
                    <div className="text-xs text-gray-500">gargalos</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── TAB: GARGALOS ─── */}
        {activeTab === "gargalos" && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-[#1A3A5C]">Gargalos Operacionais</h3>
                  <p className="text-gray-500 text-sm">Problemas recorrentes que precisam de solução sistêmica</p>
                </div>
                <Button onClick={addGargalo} size="sm" className="bg-[#1A3A5C] text-white">
                  <Plus className="w-4 h-4 mr-1" /> Adicionar
                </Button>
              </div>

              {gargalos.length === 0 && (
                <div className="text-center py-6 text-gray-400">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <div className="text-sm">Nenhum gargalo registrado</div>
                  <div className="text-xs mt-1">Use as perguntas do roteiro para identificar os problemas recorrentes</div>
                </div>
              )}

              <div className="space-y-3">
                {gargalos.map((g, i) => (
                  <div key={g.id} className="border border-gray-200 rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-[#1A3A5C] text-sm">Gargalo #{i + 1}</div>
                      <button onClick={() => setGargalos(prev => prev.filter(x => x.id !== g.id))} className="text-red-400 hover:text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block mb-1">Qual é o problema?</label>
                      <input type="text" value={g.problema} onChange={e => setGargalos(prev => prev.map(x => x.id === g.id ? { ...x, problema: e.target.value } : x))}
                        placeholder="Ex: Pacientes chegam sem confirmar a consulta, gerando horários vagos..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3A5C]" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block mb-1">Com que frequência?</label>
                        <input type="text" value={g.frequencia} onChange={e => setGargalos(prev => prev.map(x => x.id === g.id ? { ...x, frequencia: e.target.value } : x))}
                          placeholder="Ex: 2–3x por semana" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3A5C]" />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block mb-1">Impacto</label>
                        <div className="flex gap-2">
                          {(["alto", "medio", "baixo"] as const).map(imp => (
                            <button key={imp} onClick={() => setGargalos(prev => prev.map(x => x.id === g.id ? { ...x, impacto: imp } : x))}
                              className={`flex-1 py-1.5 rounded-lg border text-xs font-medium transition-all ${g.impacto === imp ? IMPACTO_COLORS[imp] : "border-gray-200 text-gray-500"}`}>
                              {imp.charAt(0).toUpperCase() + imp.slice(1)}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block mb-1">Solução proposta</label>
                      <Textarea value={g.solucao} onChange={e => setGargalos(prev => prev.map(x => x.id === g.id ? { ...x, solucao: e.target.value } : x))}
                        placeholder="Como resolver? Quem é responsável? Qual o prazo? Qual o protocolo?" className="text-sm min-h-[70px] resize-none" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB: CHECKLIST ─── */}
        {activeTab === "checklist" && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-[#1A3A5C]">Checklist de Conclusão — Pilar 4</h3>
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
                  <button key={i} onClick={() => updateChecklistItem.mutate({
                    menteeId: mid,
                    pillarId: 4,
                    itemIndex: i,
                    status: checklistStatus[i] ? "pending" : "completed",
                  })} className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 text-left transition-all ${checklistStatus[i] ? "border-green-300 bg-green-50" : "border-gray-200 hover:border-gray-300"}`}>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${checklistStatus[i] ? "border-green-500 bg-green-500" : "border-gray-300"}`}>
                      {checklistStatus[i] && <CheckCircle2 className="w-3 h-3 text-white" />}
                    </div>
                    <span className={`text-sm ${checklistStatus[i] ? "text-green-700 line-through" : "text-gray-700"}`}>{item}</span>
                  </button>
                ))}
              </div>
            </div>
            {completedChecklist < 5 && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex gap-3">
                <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-orange-800 text-sm">Pilar incompleto</div>
                  <div className="text-orange-700 text-xs mt-0.5">Ainda faltam {CHECKLIST_PILAR.length - completedChecklist} itens. Recomenda-se mapear ao menos 5 processos antes de avançar.</div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
