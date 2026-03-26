import { useState, useRef, useCallback } from "react";
import { useLocation, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Upload, FileText, FileSpreadsheet, CheckCircle, XCircle,
  AlertCircle, ArrowLeft, Loader2, Edit3, Save, Trash2,
  ChevronDown, ChevronUp, Users, Sparkles
} from "lucide-react";

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface ExtractedMentee {
  nome: string | null;
  email: string | null;
  telefone: string | null;
  especialidade: string | null;
  crm: string | null;
  cidade: string | null;
  estado: string | null;
  objetivoMentoria: string | null;
  motivacao: string | null;
  horasRealizadas: number | null;
  sessoesRealizadas: number | null;
  observacoes: string | null;
}

interface MenteeRow extends ExtractedMentee {
  _id: string;
  _status: "pending" | "saving" | "saved" | "error" | "skipped";
  _expanded: boolean;
  _edited: boolean;
}

// ─── Campos para exibição ────────────────────────────────────────────────────

const FIELDS: { key: keyof ExtractedMentee; label: string; required?: boolean; type?: string }[] = [
  { key: "nome", label: "Nome completo", required: true },
  { key: "email", label: "E-mail", type: "email" },
  { key: "telefone", label: "Telefone / WhatsApp" },
  { key: "especialidade", label: "Especialidade médica" },
  { key: "crm", label: "CRM" },
  { key: "cidade", label: "Cidade" },
  { key: "estado", label: "Estado (sigla)" },
  { key: "objetivoMentoria", label: "Objetivo da mentoria" },
  { key: "motivacao", label: "Motivação / Por que buscou a mentoria" },
  { key: "horasRealizadas", label: "Horas realizadas", type: "number" },
  { key: "sessoesRealizadas", label: "Sessões realizadas", type: "number" },
  { key: "observacoes", label: "Observações gerais" },
];

// ─── Componente de linha de mentorado ────────────────────────────────────────

function MenteeRowCard({
  row,
  index,
  onUpdate,
  onSave,
  onSkip,
  onRemove,
}: {
  row: MenteeRow;
  index: number;
  onUpdate: (id: string, field: keyof ExtractedMentee, value: string) => void;
  onSave: (id: string) => void;
  onSkip: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const statusConfig = {
    pending: { color: "bg-amber-100 text-amber-800 border-amber-200", icon: AlertCircle, label: "Aguardando confirmação" },
    saving: { color: "bg-blue-100 text-blue-800 border-blue-200", icon: Loader2, label: "Salvando..." },
    saved: { color: "bg-green-100 text-green-800 border-green-200", icon: CheckCircle, label: "Salvo com sucesso" },
    error: { color: "bg-red-100 text-red-800 border-red-200", icon: XCircle, label: "Erro ao salvar" },
    skipped: { color: "bg-gray-100 text-gray-500 border-gray-200", icon: XCircle, label: "Ignorado" },
  };

  const cfg = statusConfig[row._status];
  const StatusIcon = cfg.icon;
  const filledFields = FIELDS.filter(f => row[f.key] !== null && row[f.key] !== "").length;
  const confidence = Math.round((filledFields / FIELDS.length) * 100);

  return (
    <div className={`rounded-xl border-2 transition-all duration-200 ${
      row._status === "saved" ? "border-green-200 bg-green-50/30" :
      row._status === "skipped" ? "border-gray-200 bg-gray-50/30 opacity-60" :
      row._status === "error" ? "border-red-200 bg-red-50/30" :
      "border-border bg-card"
    }`}>
      {/* Header */}
      <div className="p-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          <span className="text-primary font-bold text-sm">{index + 1}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-foreground text-sm truncate">
              {row.nome || <span className="text-destructive italic">Nome não identificado</span>}
            </h3>
            {row._edited && (
              <Badge variant="outline" className="text-xs border-primary/40 text-primary">Editado</Badge>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-xs text-muted-foreground">{row.especialidade || "Especialidade não informada"}</span>
            <span className="text-xs text-muted-foreground">•</span>
            <span className="text-xs text-muted-foreground">{filledFields}/{FIELDS.length} campos</span>
            <div className="flex items-center gap-1">
              <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${confidence >= 70 ? "bg-green-500" : confidence >= 40 ? "bg-amber-500" : "bg-red-400"}`}
                  style={{ width: `${confidence}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground">{confidence}%</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full border flex items-center gap-1 ${cfg.color}`}>
            <StatusIcon className={`w-3 h-3 ${row._status === "saving" ? "animate-spin" : ""}`} />
            {cfg.label}
          </span>
          {row._status === "pending" || row._status === "error" ? (
            <button
              className="p-1.5 rounded-lg hover:bg-muted transition-colors"
              title="Expandir/recolher"
              onClick={() => {
                onUpdate(row._id, "_expanded" as any, row._expanded ? "false" : "true");
              }}
            >
              {row._expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </button>
          ) : null}
        </div>
      </div>

      {/* Expanded fields */}
      {row._expanded && row._status !== "saved" && row._status !== "skipped" && (
        <div className="px-4 pb-4 border-t border-border pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            {FIELDS.map((field) => (
              <div key={field.key} className={field.key === "objetivoMentoria" || field.key === "motivacao" || field.key === "observacoes" ? "sm:col-span-2" : ""}>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  {field.label}
                  {field.required && <span className="text-destructive ml-0.5">*</span>}
                </label>
                <Input
                  type={field.type || "text"}
                  value={row[field.key] !== null ? String(row[field.key]) : ""}
                  onChange={(e) => onUpdate(row._id, field.key, e.target.value)}
                  placeholder={`${field.label}...`}
                  className={`text-sm h-8 ${!row[field.key] ? "border-amber-300 bg-amber-50/50" : ""}`}
                />
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRemove(row._id)}
              className="text-destructive hover:text-destructive hover:bg-destructive/10 text-xs"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              Remover
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSkip(row._id)}
              className="text-xs"
            >
              Ignorar
            </Button>
            <Button
              size="sm"
              onClick={() => onSave(row._id)}
              disabled={!row.nome}
              className="bg-primary text-primary-foreground text-xs"
            >
              <Save className="w-3.5 h-3.5 mr-1" />
              Confirmar e Salvar
            </Button>
          </div>
        </div>
      )}

      {/* Saved summary */}
      {row._status === "saved" && (
        <div className="px-4 pb-3 flex items-center gap-2 text-xs text-green-700">
          <CheckCircle className="w-3.5 h-3.5" />
          Mentorado cadastrado com código de acesso gerado automaticamente.
        </div>
      )}
    </div>
  );
}

// ─── Página principal ────────────────────────────────────────────────────────

export default function ImportData() {
  const { user, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionInfo, setExtractionInfo] = useState<{ filename: string; rawTextLength: number } | null>(null);
  const [rows, setRows] = useState<MenteeRow[]>([]);

  const createMentee = trpc.mentor.createMentee.useMutation({
    onError: (e) => toast.error(e.message),
  });

  // Aguardar autenticação
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }
  // Redirecionar se não for admin
  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-10 h-10 text-destructive mx-auto mb-3" />
          <p className="text-muted-foreground">Acesso restrito ao mentor.</p>
          <Link href="/mentor"><Button variant="outline" className="mt-3">Ir ao painel</Button></Link>
        </div>
      </div>
    );
  }

  // ─── Upload e extração ─────────────────────────────────────────────────────

  const processFile = async (file: File) => {
    const allowed = ["application/pdf", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel", "text/csv"];
    const isAllowed = allowed.some(t => file.type === t) || file.name.match(/\.(pdf|xlsx|xls|csv)$/i);
    if (!isAllowed) {
      toast.error("Formato não suportado. Use PDF, Excel (.xlsx/.xls) ou CSV.");
      return;
    }

    setIsExtracting(true);
    setRows([]);
    setExtractionInfo(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/import/extract", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Erro ao processar arquivo");
        return;
      }

      if (!data.mentorados || data.mentorados.length === 0) {
        toast.warning("Nenhum mentorado identificado no arquivo. Verifique o conteúdo.");
        return;
      }

      setExtractionInfo({ filename: data.filename, rawTextLength: data.rawTextLength });

      const newRows: MenteeRow[] = data.mentorados.map((m: ExtractedMentee, i: number) => ({
        ...m,
        _id: `row-${Date.now()}-${i}`,
        _status: "pending",
        _expanded: true,
        _edited: false,
      }));

      setRows(newRows);
      toast.success(`${newRows.length} mentorado(s) identificado(s). Revise e confirme os dados.`);
    } catch (err: any) {
      toast.error(err.message || "Erro de conexão");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, []);

  // ─── Edição de campos ──────────────────────────────────────────────────────

  const handleUpdate = (id: string, field: keyof ExtractedMentee | "_expanded", value: string) => {
    setRows(prev => prev.map(r => {
      if (r._id !== id) return r;
      if (field === "_expanded" as any) {
        return { ...r, _expanded: value === "true" };
      }
      return {
        ...r,
        [field]: field === "horasRealizadas" || field === "sessoesRealizadas"
          ? (value === "" ? null : Number(value))
          : (value === "" ? null : value),
        _edited: true,
      };
    }));
  };

  const handleSkip = (id: string) => {
    setRows(prev => prev.map(r => r._id === id ? { ...r, _status: "skipped", _expanded: false } : r));
  };

  const handleRemove = (id: string) => {
    setRows(prev => prev.filter(r => r._id !== id));
  };

  // ─── Salvar mentorado ──────────────────────────────────────────────────────

  const handleSave = async (id: string) => {
    const row = rows.find(r => r._id === id);
    if (!row || !row.nome) {
      toast.error("O nome é obrigatório para salvar.");
      return;
    }

    setRows(prev => prev.map(r => r._id === id ? { ...r, _status: "saving", _expanded: false } : r));

    try {
      // Gerar código de acesso único a partir do nome
      const baseCode = row.nome!
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9]/g, "")
        .toUpperCase()
        .substring(0, 8);
      const accessCode = `${baseCode}${Math.floor(100 + Math.random() * 900)}`;

      await createMentee.mutateAsync({
        nome: row.nome!,
        accessCode,
        email: row.email || undefined,
        telefone: row.telefone || undefined,
        especialidade: row.especialidade || undefined,
        cidade: row.cidade || undefined,
        estado: row.estado || undefined,
      });

      setRows(prev => prev.map(r => r._id === id ? { ...r, _status: "saved" } : r));
      toast.success(`${row.nome} cadastrado com sucesso!`);
    } catch (err: any) {
      setRows(prev => prev.map(r => r._id === id ? { ...r, _status: "error", _expanded: true } : r));
      toast.error(err.message || "Erro ao salvar mentorado");
    }
  };

  const handleSaveAll = async () => {
    const pending = rows.filter(r => r._status === "pending");
    for (const row of pending) {
      await handleSave(row._id);
    }
  };

  const pendingCount = rows.filter(r => r._status === "pending").length;
  const savedCount = rows.filter(r => r._status === "saved").length;
  const skippedCount = rows.filter(r => r._status === "skipped").length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/mentor">
            <button className="p-1.5 rounded-lg hover:bg-muted transition-colors">
              <ArrowLeft className="w-4 h-4 text-muted-foreground" />
            </button>
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display font-bold text-foreground text-sm">Importação Inteligente</h1>
              <p className="text-xs text-muted-foreground">MedMentoring</p>
            </div>
          </div>
          {rows.length > 0 && (
            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {savedCount} salvo(s) · {skippedCount} ignorado(s) · {pendingCount} pendente(s)
              </span>
              {pendingCount > 0 && (
                <Button
                  size="sm"
                  onClick={handleSaveAll}
                  className="bg-primary text-primary-foreground text-xs h-8"
                >
                  <Save className="w-3.5 h-3.5 mr-1" />
                  Salvar todos ({pendingCount})
                </Button>
              )}
              {savedCount > 0 && pendingCount === 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate("/mentor")}
                  className="text-xs h-8"
                >
                  <Users className="w-3.5 h-3.5 mr-1" />
                  Ver mentorados
                </Button>
              )}
            </div>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Intro */}
        {rows.length === 0 && !isExtracting && (
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <h2 className="font-display text-2xl font-bold text-foreground mb-2">
              Importe seus dados com IA
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto text-sm leading-relaxed">
              Envie um PDF ou planilha Excel com os dados dos seus mentorados.
              A IA extrai as informações automaticamente e você confirma campo a campo
              antes de qualquer dado ser salvo.
            </p>
          </div>
        )}

        {/* Drop zone */}
        {rows.length === 0 && (
          <div
            className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all duration-200 cursor-pointer mb-6 ${
              isDragging
                ? "border-primary bg-primary/5 scale-[1.01]"
                : "border-border hover:border-primary/50 hover:bg-muted/30"
            }`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.xlsx,.xls,.csv"
              className="hidden"
              onChange={handleFileChange}
            />

            {isExtracting ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
                <p className="font-medium text-foreground">Analisando arquivo com IA...</p>
                <p className="text-sm text-muted-foreground">Isso pode levar alguns segundos</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="flex items-center gap-4 mb-2">
                  <FileText className="w-10 h-10 text-red-400" />
                  <Upload className="w-8 h-8 text-muted-foreground" />
                  <FileSpreadsheet className="w-10 h-10 text-green-500" />
                </div>
                <p className="font-semibold text-foreground">
                  {isDragging ? "Solte o arquivo aqui" : "Arraste ou clique para selecionar"}
                </p>
                <p className="text-sm text-muted-foreground">
                  Suporta <strong>PDF</strong>, <strong>Excel (.xlsx/.xls)</strong> e <strong>CSV</strong>
                </p>
                <p className="text-xs text-muted-foreground">Tamanho máximo: 16 MB</p>
              </div>
            )}
          </div>
        )}

        {/* Extraction info */}
        {extractionInfo && rows.length > 0 && (
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-6 flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">
                IA identificou <strong>{rows.length} mentorado(s)</strong> em "{extractionInfo.filename}"
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {extractionInfo.rawTextLength.toLocaleString()} caracteres processados.
                Revise os dados abaixo, edite o que for necessário e confirme para salvar.
              </p>
              <button
                onClick={() => { setRows([]); setExtractionInfo(null); }}
                className="text-xs text-primary hover:underline mt-1"
              >
                Importar outro arquivo
              </button>
            </div>
          </div>
        )}

        {/* Rows */}
        {rows.length > 0 && (
          <div className="space-y-3">
            {rows.map((row, i) => (
              <MenteeRowCard
                key={row._id}
                row={row}
                index={i}
                onUpdate={handleUpdate}
                onSave={handleSave}
                onSkip={handleSkip}
                onRemove={handleRemove}
              />
            ))}
          </div>
        )}

        {/* Formato esperado */}
        {rows.length === 0 && !isExtracting && (
          <div className="mt-8 bg-muted/30 rounded-xl p-5">
            <h3 className="font-semibold text-foreground text-sm mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              Formatos e estruturas suportados
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="font-medium text-foreground mb-1">📄 PDF</p>
                <p className="text-xs text-muted-foreground">
                  Fichas de cadastro, formulários de onboarding, relatórios de diagnóstico.
                  A IA lê o texto e identifica os campos automaticamente.
                </p>
              </div>
              <div>
                <p className="font-medium text-foreground mb-1">📊 Excel / CSV</p>
                <p className="text-xs text-muted-foreground">
                  Planilhas com colunas de dados dos mentorados. Não precisa seguir um formato específico —
                  a IA interpreta os cabeçalhos e mapeia os campos.
                </p>
              </div>
              <div>
                <p className="font-medium text-foreground mb-1">✅ Confirmação</p>
                <p className="text-xs text-muted-foreground">
                  Nenhum dado é salvo automaticamente. Você revisa e edita cada campo
                  antes de confirmar o cadastro de cada mentorado.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
