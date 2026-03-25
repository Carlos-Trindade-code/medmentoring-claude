import { useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import React from "react";
import {
  ArrowLeft, Copy, CheckCircle, Circle, Lock, Unlock, FileText,
  StickyNote, Save, ChevronDown, ChevronUp, Download, Trash2,
  Phone, Mail, Building, Clock, Plus, ExternalLink, AlertCircle, Loader2
} from "lucide-react";
import { PILLARS } from "@/lib/pillars";
import MaterialUpload from "@/components/MaterialUpload";
import MentorPartControls from "@/components/MentorPartControls";
import { useAuth } from "@/_core/hooks/useAuth";

function PillarSection({ pillar, menteeId }: { pillar: typeof PILLARS[0]; menteeId: number }) {
  const [open, setOpen] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [noteText, setNoteText] = useState("");

  const releases = trpc.mentor.getReleases.useQuery({ menteeId });
  const checklist = trpc.mentor.getChecklist.useQuery({ menteeId, pillarId: pillar.id });
  const materials = trpc.mentor.getMaterials.useQuery({ menteeId, pillarId: pillar.id });
  const notes = trpc.mentor.getNote.useQuery({ menteeId, pillarId: pillar.id });
  const deleteMaterial = trpc.mentor.deleteMaterial.useMutation({
    onSuccess: () => materials.refetch(),
    onError: (e) => toast.error(e.message),
  });

  const updateRelease = trpc.mentor.updateRelease.useMutation({
    onSuccess: () => { releases.refetch(); toast.success("Liberação atualizada!"); },
    onError: (e) => toast.error(e.message),
  });

  const toggleChecklist = trpc.mentor.updateChecklistItem.useMutation({
    onSuccess: () => checklist.refetch(),
    onError: (e) => toast.error(e.message),
  });

  const saveNote = trpc.mentor.saveNote.useMutation({
    onSuccess: () => { notes.refetch(); setNoteText(""); toast.success("Nota salva!"); },
    onError: (e) => toast.error(e.message),
  });

  const deleteNote = trpc.mentor.saveNote.useMutation({
    onSuccess: () => notes.refetch(),
    onError: (e) => toast.error(e.message),
  });

  const release = releases.data?.find((r) => r.pillarId === pillar.id);
  const pillarChecklist = checklist.data?.filter((c) => c.pillarId === pillar.id) || [];
  const completedCount = pillarChecklist.filter((c) => c.status === "completed").length;
  const totalCount = pillar.checklist.length;
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const isAnyReleased = release?.checklistReleased || release?.resumoReleased || release?.materiaisReleased;

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <button
        className="w-full flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors text-left"
        onClick={() => setOpen(!open)}
      >
        <div className={`w-10 h-10 rounded-xl ${pillar.color} flex items-center justify-center flex-shrink-0`}>
          <span className="text-white text-lg">{pillar.emoji}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground text-sm">Pilar {pillar.id} — {pillar.title}</span>
            {isAnyReleased && <Badge variant="secondary" className="text-xs">Liberado</Badge>}
          </div>
          <div className="flex items-center gap-3 mt-1">
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden max-w-[120px]">
              <div className="h-full bg-primary rounded-full" style={{ width: `${progress}%` }} />
            </div>
            <span className="text-xs text-muted-foreground">{completedCount}/{totalCount} itens</span>
          </div>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="border-t border-border p-4 space-y-5">
          {/* Release controls */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Controle de Liberação</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                { key: "checklistReleased", label: "Checklist", icon: CheckCircle },
                { key: "resumoReleased", label: "Resumo/Conteúdo", icon: FileText },
                { key: "materiaisReleased", label: "Materiais", icon: Download },
              ].map(({ key, label, icon: Icon }) => {
                const isReleased = release?.[key as keyof typeof release] as boolean;
                return (
                  <button
                    key={key}
                    onClick={() => {
                      const update: Record<string, boolean> = {};
                      update[key] = !isReleased;
                      updateRelease.mutate({
                        menteeId,
                        pillarId: pillar.id,
                        ...update,
                      });
                    }}
                    className={`flex items-center gap-2 p-3 rounded-lg border text-sm font-medium transition-all ${
                      isReleased
                        ? "bg-green-50 border-green-300 text-green-800"
                        : "bg-muted/30 border-border text-muted-foreground hover:border-primary"
                    }`}
                  >
                    {isReleased ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Checklist */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Checklist do Pilar</h4>
            <div className="space-y-2">
              {pillar.checklist.map((item, idx) => {
                const checkItem = pillarChecklist.find((c) => c.itemIndex === idx);
                const isCompleted = checkItem?.status === "completed";
                return (
                  <button
                    key={idx}
                    onClick={() => toggleChecklist.mutate({
                      menteeId,
                      pillarId: pillar.id,
                      itemIndex: idx,
                      status: isCompleted ? "pending" : "completed",
                    })}
                    className={`w-full flex items-start gap-3 p-2.5 rounded-lg text-left text-sm transition-colors ${
                      isCompleted ? "bg-green-50 text-green-800" : "hover:bg-muted/50 text-foreground"
                    }`}
                  >
                    {isCompleted
                      ? <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                      : <Circle className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                    }
                    <span className={isCompleted ? "line-through opacity-70" : ""}>{item}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Materials */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Materiais do Pilar</h4>
              <button
                onClick={() => setShowUpload(!showUpload)}
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <Plus className="w-3.5 h-3.5" /> Adicionar
              </button>
            </div>
            {showUpload && (
              <MaterialUpload
                menteeId={menteeId}
                pillarId={pillar.id}
                onSuccess={() => { setShowUpload(false); materials.refetch(); }}
                onCancel={() => setShowUpload(false)}
              />
            )}
            {(materials.data || []).length > 0 ? (
              <div className="space-y-2">
                {(materials.data || []).map((mat) => (
                  <div key={mat.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-white">
                    <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{mat.titulo}</p>
                      <p className="text-xs text-muted-foreground capitalize">{mat.tipo}</p>
                    </div>
                    <a href={mat.url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <button onClick={() => deleteMaterial.mutate({ id: mat.id })} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : !showUpload ? (
              <p className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-3">Nenhum material adicionado ainda.</p>
            ) : null}
          </div>

          {/* Notes */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Notas Privadas do Mentor</h4>
            <div className="space-y-2 mb-3">
              {(notes.data ? [notes.data] : []).filter(n => n?.conteudo).map((note: any) => (
                <div key={note.id} className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                  <StickyNote className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-900 flex-1">{note.conteudo}</p>
                  <button onClick={() => toast.info("Remover nota em breve")} className="text-amber-400 hover:text-red-500">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Adicionar nota privada..."
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && noteText && saveNote.mutate({ menteeId, pillarId: pillar.id, conteudo: noteText })}
                className="text-sm"
              />
              <Button
                size="sm"
                className="bg-primary text-primary-foreground"
                disabled={!noteText || saveNote.isPending}
                onClick={() => saveNote.mutate({ menteeId, pillarId: pillar.id, conteudo: noteText })}
              >
                <Save className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Per-part release controls */}
          <MentorPartControls menteeId={menteeId} pillarId={pillar.id} />
        </div>
      )}
    </div>
  );
}

export default function MenteeDetail() {
  const { id } = useParams<{ id: string }>();
  const menteeId = parseInt(id || "0");
  const [, navigate] = useLocation();
  const { user, loading: authLoading } = useAuth();
  const [copied, setCopied] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<any>({});

  const mentee = trpc.mentor.getMentee.useQuery({ id: menteeId });
  const updateMentee = trpc.mentor.updateMentee.useMutation({
    onSuccess: () => { mentee.refetch(); setEditMode(false); toast.success("Dados atualizados!"); },
    onError: (e) => toast.error(e.message),
  });

  const generatePptx = trpc.mentor.generatePptx.useMutation({
    onSuccess: (data) => {
      window.open(data.url, "_blank");
      toast.success("Apresentação gerada com sucesso!");
    },
    onError: (e) => toast.error(e.message),
  });
  const handleGeneratePptx = () => generatePptx.mutate({ menteeId });

  const generateFinal = trpc.pillarReport.generateFinalReport.useMutation({
    onSuccess: (data) => {
      const byteCharacters = atob(data.base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = data.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Relatório Final gerado com sucesso!");
    },
    onError: (e) => toast.error(e.message),
  });

  const m = mentee.data;

  const copyCode = () => {
    if (m?.accessCode) {
      navigator.clipboard.writeText(m.accessCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Código copiado!");
    }
  };

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
          <Button onClick={() => navigate("/mentor")}>Ir para o painel</Button>
        </div>
      </div>
    );
  }

  if (mentee.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!m) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Mentorado não encontrado.</p>
          <Link href="/mentor"><Button variant="outline">Voltar</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-border">
        <div className="container flex items-center gap-4 h-14">
          <Link href="/mentor" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" />
            Painel
          </Link>
          <span className="text-muted-foreground">/</span>
          <span className="text-sm font-medium text-foreground">{m.nome}</span>
          <div className="ml-auto flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => generateFinal.mutate({ menteeId })}
              disabled={generateFinal.isPending}
              className="text-xs"
            >
              {generateFinal.isPending ? <><Loader2 className="w-3 h-3 animate-spin mr-1" /> Gerando...</> : "📄 Relatório Final"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleGeneratePptx}
              disabled={generatePptx.isPending}
              className="text-xs"
            >
              {generatePptx.isPending ? "Gerando..." : "📊 Gerar PPTX"}
            </Button>
          </div>
        </div>
      </div>

      <div className="container py-6 space-y-6">
        {/* Profile card */}
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-primary font-bold text-xl">{m.nome.charAt(0)}</span>
              </div>
              <div>
                <h1 className="font-display text-xl font-bold text-foreground">{m.nome}</h1>
                <p className="text-muted-foreground text-sm">{m.especialidade || "Especialidade não informada"}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={m.ativo ? "default" : "secondary"}>{m.ativo ? "Ativo" : "Inativo"}</Badge>
                  <div className="flex items-center gap-1 bg-muted/50 rounded-full px-3 py-1">
                    <span className="text-xs font-mono font-bold text-primary">{m.accessCode}</span>
                    <button onClick={copyCode} className="text-muted-foreground hover:text-primary ml-1">
                      {copied ? <CheckCircle className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => { setEditData(m); setEditMode(true); }}>
              Editar
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-border">
            {[
              { icon: Mail, label: "E-mail", value: m.email },
              { icon: Phone, label: "Telefone", value: m.telefone },
              { icon: Building, label: "Cidade", value: m.cidade },
              { icon: Clock, label: "Horas realizadas", value: `${Number(m.horasRealizadas || 0).toFixed(0)}h` },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-start gap-2">
                <Icon className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-sm font-medium text-foreground">{value || "—"}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Ferramentas de Diagnóstico */}
        <div>
          <h2 className="font-display text-lg font-bold text-foreground mb-3">Ferramentas de Diagnóstico</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <button
              onClick={() => navigate(`/mentor/mentorado/${menteeId}/ivmp`)}
              className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:border-[#1B3A5C] hover:bg-[#1B3A5C]/5 transition-all text-left group"
            >
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                <span className="text-blue-600 font-bold text-sm">iVMP</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground group-hover:text-[#1B3A5C]">iVMP</p>
                <p className="text-xs text-muted-foreground">Índice de Valor Médico Percebido</p>
              </div>
            </button>
            <button
              onClick={() => navigate(`/mentor/mentorado/${menteeId}/financeiro`)}
              className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:border-[#1B3A5C] hover:bg-[#1B3A5C]/5 transition-all text-left group"
            >
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                <span className="text-green-600 text-lg">R$</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground group-hover:text-[#1B3A5C]">Financeiro</p>
                <p className="text-xs text-muted-foreground">Despesas, mapa de sala e precificação</p>
              </div>
            </button>
            <button
              onClick={() => navigate(`/mentor/mentorado/${menteeId}/vendas`)}
              className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:border-[#1B3A5C] hover:bg-[#1B3A5C]/5 transition-all text-left group"
            >
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                <span className="text-amber-600 text-lg">🎯</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground group-hover:text-[#1B3A5C]">Vendas</p>
                <p className="text-xs text-muted-foreground">Objeções, scripts e gatilhos mentais</p>
              </div>
            </button>
            <button
              onClick={() => navigate(`/mentor/mentorado/${menteeId}/precificacao`)}
              className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:border-[#1B3A5C] hover:bg-[#1B3A5C]/5 transition-all text-left group"
            >
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                <span className="text-purple-600 text-lg">💰</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground group-hover:text-[#1B3A5C]">Precificação</p>
                <p className="text-xs text-muted-foreground">Custo variável e dinheiro invisível</p>
              </div>
            </button>
          </div>
        </div>

        {/* Salas de Trabalho por Pilar */}
        <div>
          <h2 className="font-display text-lg font-bold text-foreground mb-3">Salas de Trabalho por Pilar</h2>
          <p className="text-sm text-muted-foreground mb-4">Roteiro de conduição, respostas do mentorado, ferramentas interativas e feedback — tudo em um lugar só.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
            {[
              { id: 1, emoji: "🎯", label: "Pilar 1 — Identidade", desc: "Propósito, Missão, Visão e Valores", color: "bg-indigo-100", textColor: "text-indigo-600" },
              { id: 2, emoji: "📌", label: "Pilar 2 — Posicionamento", desc: "Diferencial + Frase de posicionamento", color: "bg-sky-100", textColor: "text-sky-600" },
              { id: 3, emoji: "📊", label: "Pilar 3 — Diagnóstico", desc: "iVMP + Custos reais + Potencial de crescimento", color: "bg-amber-100", textColor: "text-amber-600" },
              { id: 4, emoji: "⚙️", label: "Pilar 4 — Gestão", desc: "Processos, equipe e gargalos", color: "bg-blue-100", textColor: "text-blue-600" },
              { id: 5, emoji: "💰", label: "Pilar 5 — Precificação", desc: "Dinheiro invisível + Tabela de preços", color: "bg-emerald-100", textColor: "text-emerald-600" },
              { id: 6, emoji: "📱", label: "Pilar 6 — Marketing", desc: "Estratégia digital + Prompt IA personalizado", color: "bg-pink-100", textColor: "text-pink-600" },
              { id: 7, emoji: "🎤", label: "Pilar 7 — Vendas", desc: "Objeções + Script de apresentação", color: "bg-violet-100", textColor: "text-violet-600" },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => navigate(`/mentor/mentorado/${menteeId}/pilar/${p.id}`)}
                className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:border-[#1B3A5C] hover:bg-[#1B3A5C]/5 transition-all text-left group"
              >
                <div className={`w-10 h-10 rounded-lg ${p.color} flex items-center justify-center flex-shrink-0`}>
                  <span className={`${p.textColor} text-lg`}>{p.emoji}</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground group-hover:text-[#1B3A5C]">{p.label}</p>
                  <p className="text-xs text-muted-foreground">{p.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
        {/* Pasta de Documentos */}
        <div className="bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-200 rounded-2xl p-5 mb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                <span className="text-violet-600 text-lg">📂</span>
              </div>
              <div>
                <p className="font-bold text-violet-900">Pasta de Documentos</p>
                <p className="text-violet-600 text-sm">Resumos do questionário + Prompts de marketing gerados pela IA</p>
              </div>
            </div>
            <button
              onClick={() => navigate(`/mentor/documentos?menteeId=${menteeId}`)}
              className="flex items-center gap-2 bg-violet-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-violet-700 transition-colors"
            >
              Abrir Pasta
            </button>
          </div>
        </div>
        {/* 7 Pillars */}
        <div>
          <h2 className="font-display text-lg font-bold text-foreground mb-4">Os 7 Pilares da Mentoria</h2>
          <div className="space-y-3">
            {PILLARS.map((p) => (
              <PillarSection key={p.id} pillar={p} menteeId={menteeId} />
            ))}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b flex items-center justify-between">
              <h3 className="font-display text-lg font-bold">Editar Mentorado</h3>
              <button onClick={() => setEditMode(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <div className="p-5 space-y-3">
              {[
                { key: "nome", label: "Nome completo", type: "text" },
                { key: "email", label: "E-mail", type: "email" },
                { key: "telefone", label: "Telefone/WhatsApp", type: "text" },
                { key: "especialidade", label: "Especialidade", type: "text" },
                { key: "cidade", label: "Cidade", type: "text" },
                { key: "horasContratadas", label: "Horas contratadas", type: "number" },
              ].map(({ key, label, type }) => (
                <div key={key}>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">{label}</label>
                  <Input
                    type={type}
                    value={editData[key] || ""}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditData((p: any) => ({ ...p, [key]: e.target.value }))}
                  />
                </div>
              ))}
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Observações</label>
                <textarea
                  value={editData.observacoes || ""}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditData((p: any) => ({ ...p, observacoes: e.target.value }))}
                  className="w-full border border-border rounded-lg p-3 text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
            <div className="p-5 border-t flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setEditMode(false)}>Cancelar</Button>
              <Button
                className="flex-1 bg-primary text-primary-foreground"
                disabled={updateMentee.isPending}
                onClick={() => updateMentee.mutate({ id: menteeId, ...editData })}
              >
                {updateMentee.isPending ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
