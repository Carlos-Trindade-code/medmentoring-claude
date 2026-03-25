import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Upload, Link2, X, FileText, Video, Table2, Presentation, Dumbbell } from "lucide-react";

const TIPO_ICONS: Record<string, React.ReactNode> = {
  pdf: <FileText className="w-4 h-4" />,
  video: <Video className="w-4 h-4" />,
  planilha: <Table2 className="w-4 h-4" />,
  apresentacao: <Presentation className="w-4 h-4" />,
  exercicio: <Dumbbell className="w-4 h-4" />,
  link: <Link2 className="w-4 h-4" />,
};

type Props = {
  menteeId: number;
  pillarId: number;
  onSuccess: () => void;
  onCancel: () => void;
};

export default function MaterialUpload({ menteeId, pillarId, onSuccess, onCancel }: Props) {
  const [mode, setMode] = useState<"link" | "file">("link");
  const [titulo, setTitulo] = useState("");
  const [tipo, setTipo] = useState<string>("link");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const saveMaterial = trpc.mentor.saveMaterial.useMutation({
    onSuccess: () => {
      toast.success("Material adicionado com sucesso!");
      onSuccess();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    if (!titulo) setTitulo(f.name.replace(/\.[^.]+$/, ""));
    // Auto-detect type
    const ext = f.name.split(".").pop()?.toLowerCase() || "";
    if (["pdf"].includes(ext)) setTipo("pdf");
    else if (["mp4", "mov", "avi", "webm"].includes(ext)) setTipo("video");
    else if (["xlsx", "xls", "csv"].includes(ext)) setTipo("planilha");
    else if (["pptx", "ppt"].includes(ext)) setTipo("apresentacao");
  };

  const handleSubmit = async () => {
    if (!titulo.trim()) { toast.error("Informe o título do material"); return; }
    if (mode === "link" && !url.trim()) { toast.error("Informe a URL do material"); return; }
    if (mode === "file" && !file) { toast.error("Selecione um arquivo"); return; }

    if (mode === "link") {
      saveMaterial.mutate({ menteeId, pillarId, titulo, tipo: tipo as any, url });
      return;
    }

    // File upload via fetch to S3
    setUploading(true);
    try {
      // Use the Manus upload endpoint via fetch
      const formData = new FormData();
      formData.append("file", file!);

      // Upload to our server which proxies to S3
      const uploadResp = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadResp.ok) throw new Error("Falha no upload");
      const { url: fileUrl, key } = await uploadResp.json();

      saveMaterial.mutate({
        menteeId,
        pillarId,
        titulo,
        tipo: tipo as any,
        url: fileUrl,
        fileKey: key,
        tamanhoBytes: file!.size,
      });
    } catch (err: any) {
      toast.error(err.message || "Erro ao fazer upload");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-muted/30 rounded-xl border border-border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground">Adicionar Material</h4>
        <button onClick={onCancel} className="text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setMode("link")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium border transition-all ${
            mode === "link" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary"
          }`}
        >
          <Link2 className="w-4 h-4" /> Link externo
        </button>
        <button
          onClick={() => setMode("file")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium border transition-all ${
            mode === "file" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary"
          }`}
        >
          <Upload className="w-4 h-4" /> Upload arquivo
        </button>
      </div>

      {/* Title */}
      <Input
        placeholder="Título do material *"
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
      />

      {/* Type */}
      <Select value={tipo} onValueChange={setTipo}>
        <SelectTrigger>
          <SelectValue placeholder="Tipo de material" />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(TIPO_ICONS).map(([key, icon]) => (
            <SelectItem key={key} value={key}>
              <span className="flex items-center gap-2">
                {icon}
                <span className="capitalize">{key}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* URL or file */}
      {mode === "link" ? (
        <Input
          placeholder="https://..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          type="url"
        />
      ) : (
        <div>
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            accept=".pdf,.mp4,.mov,.xlsx,.xls,.csv,.pptx,.ppt,.docx,.doc,.zip"
            onChange={handleFileChange}
          />
          {file ? (
            <div className="flex items-center gap-2 p-3 bg-white border border-border rounded-lg">
              <FileText className="w-4 h-4 text-primary flex-shrink-0" />
              <span className="text-sm text-foreground truncate flex-1">{file.name}</span>
              <span className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(1)}MB</span>
              <button onClick={() => setFile(null)} className="text-muted-foreground hover:text-destructive">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full border-2 border-dashed border-border rounded-lg p-6 text-center text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors"
            >
              <Upload className="w-5 h-5 mx-auto mb-2" />
              Clique para selecionar arquivo
              <br />
              <span className="text-xs">PDF, MP4, XLSX, PPTX, DOC (máx. 16MB)</span>
            </button>
          )}
        </div>
      )}

      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="flex-1" onClick={onCancel}>
          Cancelar
        </Button>
        <Button
          size="sm"
          className="flex-1 bg-primary text-primary-foreground"
          onClick={handleSubmit}
          disabled={saveMaterial.isPending || uploading}
        >
          {uploading ? "Enviando..." : saveMaterial.isPending ? "Salvando..." : "Adicionar"}
        </Button>
      </div>
    </div>
  );
}
