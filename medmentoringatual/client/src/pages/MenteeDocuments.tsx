import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ArrowLeft,
  FileText,
  Sparkles,
  Copy,
  Trash2,
  Eye,
  EyeOff,
  Download,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  FolderOpen,
  CheckCircle2,
  Clock,
  Wand2,
} from "lucide-react";

const TIPO_LABELS: Record<string, { label: string; cor: string; icone: string }> = {
  resumo_questionario: { label: "Resumo Completo", cor: "bg-violet-100 text-violet-700", icone: "📋" },
  resumo_fase: { label: "Resumo de Fase", cor: "bg-blue-100 text-blue-700", icone: "📝" },
  prompt_marketing: { label: "Prompt de Marketing", cor: "bg-emerald-100 text-emerald-700", icone: "✨" },
  persona: { label: "Persona", cor: "bg-amber-100 text-amber-700", icone: "👤" },
  diagnostico_pilar: { label: "Diagnóstico", cor: "bg-rose-100 text-rose-700", icone: "🔍" },
};

interface DocumentCardProps {
  doc: {
    id: number;
    titulo: string;
    tipo: string;
    conteudo: string;
    lidoPeloMentor: boolean;
    createdAt: Date;
    metadados?: unknown;
  };
  onDelete: (id: number) => void;
  onMarkRead: (id: number) => void;
}

function DocumentCard({ doc, onDelete, onMarkRead }: DocumentCardProps) {
  const [expandido, setExpandido] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const tipoInfo = TIPO_LABELS[doc.tipo] || { label: doc.tipo, cor: "bg-gray-100 text-gray-700", icone: "📄" };

  const handleCopiar = async () => {
    await navigator.clipboard.writeText(doc.conteudo);
    setCopiado(true);
    toast.success("Conteúdo copiado para a área de transferência!");
    setTimeout(() => setCopiado(false), 2000);
    if (!doc.lidoPeloMentor) onMarkRead(doc.id);
  };

  const handleDownload = () => {
    const blob = new Blob([doc.conteudo], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${doc.titulo.replace(/[^a-z0-9]/gi, "_")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    if (!doc.lidoPeloMentor) onMarkRead(doc.id);
  };

  const handleExpand = () => {
    setExpandido(!expandido);
    if (!doc.lidoPeloMentor && !expandido) onMarkRead(doc.id);
  };

  const dataFormatada = new Date(doc.createdAt).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className={`border rounded-xl overflow-hidden transition-all duration-200 ${
      !doc.lidoPeloMentor ? "border-violet-200 bg-violet-50/50 shadow-sm shadow-violet-100" : "border-gray-200 bg-white"
    }`}>
      {/* Header do card */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <span className="text-2xl flex-shrink-0">{tipoInfo.icone}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <Badge className={`${tipoInfo.cor} text-xs border-0`}>{tipoInfo.label}</Badge>
                {!doc.lidoPeloMentor && (
                  <Badge className="bg-violet-600 text-white text-xs border-0 animate-pulse">Novo</Badge>
                )}
              </div>
              <h3 className="font-semibold text-gray-900 text-sm leading-tight">{doc.titulo}</h3>
              <p className="text-gray-400 text-xs mt-1 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {dataFormatada}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={handleCopiar}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              title="Copiar conteúdo"
            >
              {copiado ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              onClick={handleDownload}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              title="Baixar como .txt"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(doc.id)}
              className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
              title="Excluir documento"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={handleExpand}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
              title={expandido ? "Recolher" : "Expandir"}
            >
              {expandido ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Preview (primeiras linhas) */}
        {!expandido && (
          <p className="text-gray-500 text-xs mt-3 line-clamp-2 leading-relaxed">
            {doc.conteudo.replace(/[#*_]/g, "").substring(0, 150)}...
          </p>
        )}
      </div>

      {/* Conteúdo expandido */}
      {expandido && (
        <div className="border-t border-gray-100">
          <div className="p-4 bg-gray-50 max-h-96 overflow-y-auto">
            <pre className="text-xs text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
              {doc.conteudo}
            </pre>
          </div>
          <div className="p-3 border-t border-gray-100 flex justify-end gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopiar}
              className="text-xs"
            >
              {copiado ? <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-500" /> : <Copy className="w-3 h-3 mr-1" />}
              {copiado ? "Copiado!" : "Copiar tudo"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleDownload}
              className="text-xs"
            >
              <Download className="w-3 h-3 mr-1" />
              Baixar .txt
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function MenteeDocuments() {
  const [, navigate] = useLocation();
  const { user, loading: authLoading } = useAuth();
  const [menteeId, setMenteeId] = useState<number | null>(null);
  const [gerandoPrompt, setGerandoPrompt] = useState(false);
  const [gerandoResumo, setGerandoResumo] = useState(false);
  const [promptGerado, setPromptGerado] = useState<string | null>(null);
  const [filtroTipo, setFiltroTipo] = useState<string>("todos");

  // Pega o menteeId da URL
  const urlParams = new URLSearchParams(window.location.search);
  const menteeIdParam = parseInt(urlParams.get("menteeId") || "0");

  const { data: mentee } = trpc.mentor.getMentee.useQuery(
    { id: menteeIdParam },
    { enabled: menteeIdParam > 0, retry: false }
  );

  const { data: documentos, refetch: refetchDocs } = trpc.documents.list.useQuery(
    { menteeId: menteeIdParam },
    { enabled: menteeIdParam > 0, retry: false }
  );

  const { data: progresso } = trpc.questionnaire.getProgress.useQuery(undefined, {
    enabled: false, // Só o mentorado acessa isso
  });

  const markRead = trpc.documents.markRead.useMutation();
  const deleteDoc = trpc.documents.delete.useMutation();
  const generatePrompt = trpc.documents.generateMarketingPrompt.useMutation();
  const generateSummary = trpc.documents.generateFullSummary.useMutation();

  const handleMarkRead = async (docId: number) => {
    await markRead.mutateAsync({ documentId: docId });
    refetchDocs();
  };

  const handleDelete = async (docId: number) => {
    if (!confirm("Tem certeza que deseja excluir este documento?")) return;
    await deleteDoc.mutateAsync({ documentId: docId });
    refetchDocs();
    toast.success("Documento excluído.");
  };

  const handleGerarPrompt = async () => {
    setGerandoPrompt(true);
    try {
      const result = await generatePrompt.mutateAsync({ menteeId: menteeIdParam });
      setPromptGerado(result.prompt);
      refetchDocs();
      toast.success("Prompt de marketing gerado com sucesso!");
    } catch (e: any) {
      toast.error(e?.message || "Erro ao gerar prompt. Verifique se há dados suficientes.");
    } finally {
      setGerandoPrompt(false);
    }
  };

  const handleGerarResumo = async () => {
    setGerandoResumo(true);
    try {
      await generateSummary.mutateAsync({ menteeId: menteeIdParam });
      refetchDocs();
      toast.success("Resumo completo gerado e salvo na pasta!");
    } catch (e: any) {
      toast.error(e?.message || "Erro ao gerar resumo. Certifique-se de que há fases concluídas.");
    } finally {
      setGerandoResumo(false);
    }
  };

  const handleCopiarPrompt = async () => {
    if (!promptGerado) return;
    await navigator.clipboard.writeText(promptGerado);
    toast.success("Prompt copiado! Cole no ChatGPT, Claude ou qualquer IA.");
  };

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

  // Filtra documentos
  const docsFiltrados = documentos?.filter((d) =>
    filtroTipo === "todos" ? true : d.tipo === filtroTipo
  ) ?? [];

  const docsNaoLidos = documentos?.filter((d) => !d.lidoPeloMentor).length ?? 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(`/mentor/mentorado/${menteeIdParam}`)}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <FolderOpen className="w-5 h-5 text-violet-600" />
                  <h1 className="font-bold text-gray-900">Pasta de Documentos</h1>
                  {docsNaoLidos > 0 && (
                    <Badge className="bg-violet-600 text-white text-xs border-0">
                      {docsNaoLidos} novo{docsNaoLidos > 1 ? "s" : ""}
                    </Badge>
                  )}
                </div>
                {mentee && (
                  <p className="text-gray-500 text-sm">{mentee.nome} · {mentee.especialidade}</p>
                )}
              </div>
            </div>
            <Button
              onClick={handleGerarPrompt}
              disabled={gerandoPrompt}
              className="bg-gradient-to-r from-violet-600 to-purple-700 text-white hover:opacity-90 shadow-sm"
              size="sm"
            >
              {gerandoPrompt ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4 mr-2" />
                  Gerar Prompt IA
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Prompt gerado — destaque */}
        {promptGerado && (
          <div className="bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-200 rounded-2xl p-6 mb-6 shadow-sm">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-violet-600" />
                <h2 className="font-bold text-violet-900">Prompt de Marketing Gerado</h2>
                <Badge className="bg-violet-600 text-white text-xs border-0">Novo</Badge>
              </div>
              <Button
                size="sm"
                onClick={handleCopiarPrompt}
                className="bg-violet-600 text-white hover:bg-violet-700"
              >
                <Copy className="w-4 h-4 mr-1" />
                Copiar Prompt
              </Button>
            </div>
            <div className="bg-white rounded-xl p-4 max-h-64 overflow-y-auto border border-violet-100">
              <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
                {promptGerado}
              </pre>
            </div>
            <p className="text-violet-600 text-xs mt-3 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Salvo automaticamente na pasta de documentos abaixo
            </p>
          </div>
        )}

        {/* Ações rápidas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          <button
            onClick={handleGerarResumo}
            disabled={gerandoResumo}
            className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50/50 transition-all text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
              {gerandoResumo ? (
                <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
              ) : (
                <FileText className="w-5 h-5 text-blue-600" />
              )}
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-sm">Gerar Resumo Completo</p>
              <p className="text-gray-500 text-xs">Consolida todas as fases concluídas em um único documento</p>
            </div>
          </button>

          <button
            onClick={handleGerarPrompt}
            disabled={gerandoPrompt}
            className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-xl hover:border-violet-300 hover:bg-violet-50/50 transition-all text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0">
              {gerandoPrompt ? (
                <RefreshCw className="w-5 h-5 text-violet-600 animate-spin" />
              ) : (
                <Wand2 className="w-5 h-5 text-violet-600" />
              )}
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-sm">Gerar Prompt de Marketing</p>
              <p className="text-gray-500 text-xs">IA analisa todos os dados e cria prompt personalizado</p>
            </div>
          </button>
        </div>

        {/* Filtros */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className="text-gray-500 text-sm">Filtrar:</span>
          {["todos", "resumo_questionario", "resumo_fase", "prompt_marketing", "diagnostico_pilar"].map((tipo) => (
            <button
              key={tipo}
              onClick={() => setFiltroTipo(tipo)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                filtroTipo === tipo
                  ? "bg-violet-600 text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:border-violet-300"
              }`}
            >
              {tipo === "todos" ? "Todos" : TIPO_LABELS[tipo]?.label || tipo}
            </button>
          ))}
        </div>

        {/* Lista de documentos */}
        {docsFiltrados.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300">
            <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="font-semibold text-gray-500 mb-2">
              {filtroTipo === "todos" ? "Nenhum documento ainda" : `Nenhum documento do tipo "${TIPO_LABELS[filtroTipo]?.label}"`}
            </h3>
            <p className="text-gray-400 text-sm max-w-sm mx-auto">
              Os documentos são gerados automaticamente quando o mentorado conclui fases do questionário ou quando você gera resumos e prompts.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {docsFiltrados.map((doc) => (
              <DocumentCard
                key={doc.id}
                doc={doc as any}
                onDelete={handleDelete}
                onMarkRead={handleMarkRead}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
