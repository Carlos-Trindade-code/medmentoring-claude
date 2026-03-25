import { useState } from "react";
import { useLocation, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, UserPlus, Copy, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";

function generateCode(nome: string): string {
  const base = nome.trim().split(" ")[0].toUpperCase().replace(/[^A-Z]/g, "").slice(0, 6);
  const year = new Date().getFullYear().toString().slice(2);
  const rand = Math.floor(Math.random() * 99).toString().padStart(2, "0");
  return `${base}${year}${rand}`;
}

export default function NewMentee() {
  const [, navigate] = useLocation();
  const { user, loading: authLoading } = useAuth();
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState({
    nome: "",
    email: "",
    telefone: "",
    especialidade: "",
    cidade: "",
    estado: "",
    tipoClinica: "",
    tempoFormacao: "",
    faturamentoMedio: "",
    dataInicio: new Date().toISOString().split("T")[0],
    horasContratadas: "12",
    accessCode: "",
  });

  const update = (k: string, v: string) => {
    setForm((p) => {
      const next = { ...p, [k]: v };
      if (k === "nome" && v) next.accessCode = generateCode(v);
      return next;
    });
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

  const create = trpc.mentor.createMentee.useMutation({
    onSuccess: (data) => {
      toast.success(`Mentorado ${form.nome} cadastrado com sucesso!`);
      navigate(`/mentor/mentorado/${data.id}`);
    },
    onError: (e) => toast.error(e.message),
  });

  const copyCode = () => {
    navigator.clipboard.writeText(form.accessCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Código copiado!");
  };

  const handleSubmit = () => {
    if (!form.nome || form.nome.length < 2) { toast.error("Nome é obrigatório"); return; }
    if (!form.accessCode || form.accessCode.length < 3) { toast.error("Código de acesso é obrigatório"); return; }
    create.mutate({
      nome: form.nome,
      email: form.email || undefined,
      telefone: form.telefone || undefined,
      especialidade: form.especialidade || undefined,
      cidade: form.cidade || undefined,
      estado: form.estado || undefined,
      tipoClinica: form.tipoClinica || undefined,
      tempoFormacao: form.tempoFormacao ? parseInt(form.tempoFormacao) : undefined,
      faturamentoMedio: form.faturamentoMedio ? parseFloat(form.faturamentoMedio) : undefined,
      dataInicio: form.dataInicio || undefined,
      accessCode: form.accessCode,
    });
  };

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
          <span className="text-sm font-medium text-foreground">Novo Mentorado</span>
        </div>
      </div>

      <div className="container py-8 max-w-2xl">
        <div className="mb-6">
          <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-3">
            <UserPlus className="w-6 h-6 text-primary" />
            Cadastrar Novo Mentorado
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Preencha os dados do mentorado. O código de acesso será gerado automaticamente.
          </p>
        </div>

        <div className="bg-card rounded-xl border border-border p-6 space-y-6">
          {/* Access code highlight */}
          {form.accessCode && (
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Código de Acesso do Mentorado</p>
              <div className="flex items-center gap-3">
                <span className="font-mono text-2xl font-bold text-primary tracking-widest">{form.accessCode}</span>
                <button onClick={copyCode} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary border border-border rounded-lg px-2 py-1 transition-colors">
                  {copied ? <CheckCircle className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? "Copiado!" : "Copiar"}
                </button>
                <Input
                  value={form.accessCode}
                  onChange={(e) => update("accessCode", e.target.value.toUpperCase())}
                  className="flex-1 font-mono text-sm"
                  placeholder="Editar código"
                  maxLength={20}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Este código será usado pelo mentorado para acessar o portal. Você pode editá-lo.
              </p>
            </div>
          )}

          {/* Personal data */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Dados Pessoais</h3>
            <div className="space-y-3">
              <Input
                placeholder="Nome completo *"
                value={form.nome}
                onChange={(e) => update("nome", e.target.value)}
              />
              <div className="grid grid-cols-2 gap-3">
                <Input placeholder="E-mail" type="email" value={form.email} onChange={(e) => update("email", e.target.value)} />
                <Input placeholder="Telefone/WhatsApp" value={form.telefone} onChange={(e) => update("telefone", e.target.value)} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Input placeholder="Cidade" className="col-span-2" value={form.cidade} onChange={(e) => update("cidade", e.target.value)} />
                <Input placeholder="UF" maxLength={2} value={form.estado} onChange={(e) => update("estado", e.target.value.toUpperCase())} />
              </div>
            </div>
          </div>

          {/* Professional data */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Dados Profissionais</h3>
            <div className="space-y-3">
              <Input placeholder="Especialidade médica" value={form.especialidade} onChange={(e) => update("especialidade", e.target.value)} />
              <div className="grid grid-cols-2 gap-3">
                <Select onValueChange={(v) => update("tipoClinica", v)}>
                  <SelectTrigger><SelectValue placeholder="Tipo de estrutura" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sala-alugada">Sala alugada</SelectItem>
                    <SelectItem value="clinica-propria">Clínica própria</SelectItem>
                    <SelectItem value="consultorio-proprio">Consultório próprio</SelectItem>
                    <SelectItem value="celetista">Celetista / Hospital</SelectItem>
                    <SelectItem value="multiplos">Múltiplos locais</SelectItem>
                  </SelectContent>
                </Select>
                <Select onValueChange={(v) => update("tempoFormacao", v)}>
                  <SelectTrigger><SelectValue placeholder="Tempo de formação" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">Menos de 5 anos</SelectItem>
                    <SelectItem value="7">5 a 10 anos</SelectItem>
                    <SelectItem value="15">10 a 20 anos</SelectItem>
                    <SelectItem value="25">Mais de 20 anos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Faturamento médio mensal (R$)</label>
                  <Input
                    type="number"
                    placeholder="Ex: 30000"
                    value={form.faturamentoMedio}
                    onChange={(e) => update("faturamentoMedio", e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Horas contratadas</label>
                  <Input
                    type="number"
                    placeholder="Ex: 12"
                    value={form.horasContratadas}
                    onChange={(e) => update("horasContratadas", e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Mentorship start */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Início da Mentoria</h3>
            <Input
              type="date"
              value={form.dataInicio}
              onChange={(e) => update("dataInicio", e.target.value)}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Link href="/mentor">
              <Button variant="outline" className="flex-1">Cancelar</Button>
            </Link>
            <Button
              className="flex-1 bg-primary text-primary-foreground"
              onClick={handleSubmit}
              disabled={create.isPending || !form.nome}
            >
              {create.isPending ? "Cadastrando..." : "Cadastrar Mentorado"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
