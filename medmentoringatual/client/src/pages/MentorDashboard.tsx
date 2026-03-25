import { useState } from "react";
import { useLocation, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Users, Clock, Calendar, TrendingUp, Plus, Search, ChevronRight,
  LogOut, BarChart3, Bell, Settings, Star, CheckCircle, AlertCircle,
  UserPlus, FileText, Layers, Upload, Eye, EyeOff
} from "lucide-react";
import { PILLARS } from "@/lib/pillars";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: any; label: string; value: string | number; sub?: string; color: string;
}) {
  return (
    <div className="bg-card rounded-xl border border-border p-5 flex items-start gap-4">
      <div className={`w-11 h-11 rounded-xl ${color} flex items-center justify-center flex-shrink-0`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function MenteeCard({ mentee, onClick }: { mentee: any; onClick: () => void }) {
  const releases = trpc.mentor.getReleases.useQuery({ menteeId: mentee.id });
  const checklist = trpc.mentor.getChecklist.useQuery({ menteeId: mentee.id });

  const totalItems = PILLARS.reduce((s, p) => s + p.checklist.length, 0);
  const completedItems = checklist.data?.filter((c) => c.status === "completed").length || 0;
  const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  const releasedPillars = releases.data?.filter(
    (r) => r.checklistReleased || r.resumoReleased || r.materiaisReleased
  ).length || 0;

  const pendingAnalysis = (releases.data ?? []).filter(
    (r: any) => !r.resumoReleased
  ).length;

  return (
    <div
      className="bg-card rounded-xl border border-border p-5 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-primary font-bold text-sm">{mentee.nome.charAt(0)}</span>
          </div>
          <div>
            <h3 className="font-semibold text-foreground text-sm">{mentee.nome}</h3>
            <p className="text-xs text-muted-foreground">{mentee.especialidade || "Especialidade não informada"}</p>
          </div>
        </div>
        <Badge variant={mentee.ativo ? "default" : "secondary"} className="text-xs">
          {mentee.ativo ? "Ativo" : "Inativo"}
        </Badge>
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>Progresso geral</span>
          <span className="font-medium text-foreground">{progress}%</span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {pendingAnalysis > 0 && (
        <div className="mb-2">
          <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
            <AlertCircle className="w-3 h-3" />
            {pendingAnalysis} {pendingAnalysis === 1 ? "pilar para analisar" : "pilares para analisar"}
          </span>
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Layers className="w-3 h-3" />
          {releasedPillars}/7 pilares
        </span>
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {Number(mentee.horasRealizadas || 0).toFixed(0)}h realizadas
        </span>
        <ChevronRight className="w-4 h-4" />
      </div>
    </div>
  );
}

function SessionCard({ session, onRespond }: { session: any; onRespond: () => void }) {
  const statusConfig = {
    pending: { label: "Pendente", color: "bg-amber-100 text-amber-800" },
    confirmed: { label: "Confirmada", color: "bg-green-100 text-green-800" },
    refused: { label: "Recusada", color: "bg-red-100 text-red-800" },
    completed: { label: "Realizada", color: "bg-blue-100 text-blue-800" },
  };
  const cfg = statusConfig[session.status as keyof typeof statusConfig] || statusConfig.pending;

  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="font-medium text-sm text-foreground">{session.menteeName}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{session.assunto}</p>
        </div>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.color}`}>{cfg.label}</span>
      </div>
      {session.dataPreferida && (
        <p className="text-xs text-muted-foreground mb-3">
          <Calendar className="w-3 h-3 inline mr-1" />
          Preferência: {session.dataPreferida}
        </p>
      )}
      {session.status === "pending" && (
        <Button size="sm" className="w-full bg-primary text-primary-foreground text-xs h-8" onClick={onRespond}>
          Responder Solicitação
        </Button>
      )}
    </div>
  );
}

export default function MentorDashboard() {
  const { user, logout, loading } = useAuth();
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"dashboard" | "mentees" | "sessions" | "leads">("dashboard");
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [sessionResponse, setSessionResponse] = useState({ status: "confirmed", resposta: "", data: "", hora: "", link: "" });

  const [showSimulateDialog, setShowSimulateDialog] = useState(false);

  const stats = trpc.mentor.stats.useQuery();
  const mentees = trpc.mentor.listMentees.useQuery();
  const sessions = trpc.mentor.getAllSessions.useQuery();
  const leads = trpc.mentor.getLeads.useQuery();

  const simulateMentee = trpc.mentor.simulateMentee.useMutation({
    onSuccess: (data) => {
      toast.success(`Simulando portal de ${data.nome}`);
      setShowSimulateDialog(false);
      navigate("/portal");
    },
    onError: (e) => toast.error(e.message),
  });

  const respondSession = trpc.mentor.respondSession.useMutation({
    onSuccess: () => {
      toast.success("Resposta enviada com sucesso!");
      setSelectedSession(null);
      sessions.refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const filteredMentees = mentees.data?.filter((m) =>
    m.nome.toLowerCase().includes(search.toLowerCase()) ||
    (m.especialidade || "").toLowerCase().includes(search.toLowerCase())
  ) || [];

  const pendingSessions = sessions.data?.filter((s) => s.status === "pending") || [];

  // While auth is loading, show a spinner — do NOT show the login screen
  // (avoids the user clicking "Entrar" again during the initial auth check)
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <span className="text-sm text-muted-foreground">Verificando sessão...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-sm mx-auto p-8">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-6">
            <span className="text-primary-foreground font-bold text-xl">ITC</span>
          </div>
          <h2 className="font-display text-2xl font-bold text-foreground mb-2">Painel do Mentor</h2>
          <p className="text-muted-foreground mb-6">Faça login com sua conta Manus para acessar o painel de mentoria.</p>
          <a href={getLoginUrl("/mentor")}>
            <Button className="w-full bg-primary text-primary-foreground">
              Entrar com Manus
            </Button>
          </a>
          <p className="text-xs text-muted-foreground mt-4">
            Apenas o mentor cadastrado tem acesso a esta área.
          </p>
          <Link href="/">
            <Button variant="ghost" className="mt-2 w-full text-muted-foreground">Voltar ao início</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (user.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-sm mx-auto p-8">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h2 className="font-display text-xl font-bold text-foreground mb-2">Aguardando Permissão</h2>
          <p className="text-muted-foreground mb-2">
            Você está logado como <strong>{user.name || user.email}</strong>.
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            Sua conta ainda não tem permissão de mentor. Se você é o dono desta plataforma,
            acesse o painel de banco de dados do Manus e execute:
          </p>
          <code className="block bg-muted rounded-lg p-3 text-xs text-left mb-6 font-mono">
            UPDATE users SET role = 'admin'<br />
            WHERE openId = '{user.openId}';
          </code>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={logout}>Sair</Button>
            <Link href="/"><Button variant="ghost" className="flex-1">Voltar</Button></Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* SIDEBAR */}
      <aside className="w-64 bg-sidebar text-sidebar-foreground flex flex-col fixed inset-y-0 left-0 z-30 hidden lg:flex">
        <div className="p-5 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sidebar-primary flex items-center justify-center">
              <span className="text-sidebar-primary-foreground font-bold text-sm">ITC</span>
            </div>
            <div>
              <p className="font-display font-bold text-sidebar-foreground text-sm">MedMentoring</p>
              <p className="text-xs text-sidebar-foreground/60">Painel do Mentor</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {[
            { id: "dashboard", icon: BarChart3, label: "Dashboard" },
            { id: "mentees", icon: Users, label: "Mentorados" },
            { id: "sessions", icon: Calendar, label: "Sessões", badge: pendingSessions.length },
            { id: "leads", icon: Bell, label: "Leads", badge: leads.data?.filter(l => l.status === "new").length || 0 },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                activeTab === item.id
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              }`}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge ? (
                <span className="bg-sidebar-primary text-sidebar-primary-foreground text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                  {item.badge}
                </span>
              ) : null}
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-sidebar-border">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center">
              <span className="text-sidebar-accent-foreground font-bold text-xs">{user.name?.charAt(0) || "M"}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-sidebar-foreground truncate">{user.name || "Mentor"}</p>
              <p className="text-xs text-sidebar-foreground/60">Mentor</p>
            </div>
          </div>
          <button
            onClick={() => setShowSimulateDialog(true)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-violet-400 hover:text-violet-300 hover:bg-violet-500/10 transition-colors mb-1"
          >
            <Eye className="w-4 h-4" />
            Simular Portal do Mentorado
          </button>
          <button
            onClick={() => { logout(); navigate("/"); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      </aside>

      {/* DIALOG: Simular Portal do Mentorado */}
      <Dialog open={showSimulateDialog} onOpenChange={setShowSimulateDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-violet-500" />
              Simular Portal do Mentorado
            </DialogTitle>
            <DialogDescription>
              Escolha um mentorado para visualizar o portal como ele vê. Você será redirecionado para o portal e poderá navegar normalmente. Para voltar ao painel do mentor, acesse <strong>/mentor</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 mt-2">
            {mentees.isLoading && (
              <p className="text-sm text-muted-foreground text-center py-4">Carregando mentorados...</p>
            )}
            {mentees.data?.filter(m => m.ativo).map(m => (
              <button
                key={m.id}
                onClick={() => simulateMentee.mutate({ menteeId: m.id })}
                disabled={simulateMentee.isPending}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted transition-colors text-left"
              >
                <div className="w-9 h-9 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-violet-700 font-bold text-sm">{m.nome.charAt(0)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{m.nome}</p>
                  <p className="text-xs text-muted-foreground truncate">{m.especialidade || "Especialidade não informada"}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </button>
            ))}
            {mentees.data?.filter(m => m.ativo).length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum mentorado ativo cadastrado.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* MAIN */}
      <main className="flex-1 lg:ml-64 min-h-screen">
        {/* Mobile header */}
        <div className="lg:hidden sticky top-0 z-20 bg-primary text-primary-foreground p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500 flex items-center justify-center">
              <span className="text-white font-bold text-xs">ITC</span>
            </div>
            <span className="font-display font-bold">MedMentoring</span>
          </div>
          <div className="flex gap-2">
            {(["dashboard", "mentees", "sessions"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-2 py-1 rounded text-xs ${activeTab === tab ? "bg-white/20" : "opacity-60"}`}
              >
                {tab === "dashboard" ? "Home" : tab === "mentees" ? "Mentorados" : "Sessões"}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {/* DASHBOARD TAB */}
          {activeTab === "dashboard" && (
            <div className="space-y-6">
              <div>
                <h1 className="font-display text-2xl font-bold text-foreground">Bom dia, {user.name?.split(" ")[0] || "Mentor"}!</h1>
                <p className="text-muted-foreground text-sm mt-1">Aqui está o resumo da sua mentoria.</p>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={Users} label="Mentorados Ativos" value={stats.data?.activeMentees || 0} sub={`${stats.data?.totalMentees || 0} total`} color="bg-primary" />
                <StatCard icon={Calendar} label="Sessões Pendentes" value={stats.data?.pendingSessions || 0} sub="aguardando resposta" color="bg-amber-600" />
                <StatCard icon={Clock} label="Horas Realizadas" value={`${(stats.data?.totalHours || 0).toFixed(0)}h`} sub="total acumulado" color="bg-teal-700" />
                <StatCard icon={Bell} label="Novos Leads" value={stats.data?.newLeads || 0} sub="aguardando contato" color="bg-rose-700" />
              </div>

              {/* Pending sessions */}
              {pendingSessions.length > 0 && (
                <div>
                  <h2 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    Sessões aguardando resposta ({pendingSessions.length})
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {pendingSessions.slice(0, 3).map((s) => (
                      <SessionCard key={s.id} session={s} onRespond={() => setSelectedSession(s)} />
                    ))}
                  </div>
                </div>
              )}

              {/* Recent mentees */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-semibold text-foreground">Mentorados Recentes</h2>
                  <Button variant="ghost" size="sm" onClick={() => setActiveTab("mentees")} className="text-xs">
                    Ver todos <ChevronRight className="w-3 h-3 ml-1" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(mentees.data || []).slice(0, 3).map((m) => (
                    <MenteeCard key={m.id} mentee={m} onClick={() => navigate(`/mentor/mentorado/${m.id}`)} />
                  ))}
                  {(!mentees.data || mentees.data.length === 0) && (
                    <div className="col-span-3 bg-muted/30 rounded-xl border border-dashed border-border p-8 text-center">
                      <UserPlus className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground text-sm">Nenhum mentorado cadastrado ainda.</p>
                      <Button size="sm" className="mt-3 bg-primary text-primary-foreground" onClick={() => navigate("/mentor/novo")}>
                        <Plus className="w-4 h-4 mr-1" /> Cadastrar primeiro mentorado
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* MENTEES TAB */}
          {activeTab === "mentees" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="font-display text-2xl font-bold text-foreground">Mentorados</h1>
                  <p className="text-muted-foreground text-sm mt-1">{mentees.data?.length || 0} cadastrados</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={() => navigate("/mentor/importar")} className="text-sm">
                    <Upload className="w-4 h-4 mr-2" /> Importar PDF/Excel
                  </Button>
                  <Button className="bg-primary text-primary-foreground" onClick={() => navigate("/mentor/novo")}>
                    <Plus className="w-4 h-4 mr-2" /> Novo Mentorado
                  </Button>
                </div>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou especialidade..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredMentees.map((m) => (
                  <MenteeCard key={m.id} mentee={m} onClick={() => navigate(`/mentor/mentorado/${m.id}`)} />
                ))}
                {filteredMentees.length === 0 && (
                  <div className="col-span-3 text-center py-12 text-muted-foreground">
                    {search ? "Nenhum mentorado encontrado para esta busca." : "Nenhum mentorado cadastrado."}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SESSIONS TAB */}
          {activeTab === "sessions" && (
            <div className="space-y-6">
              <h1 className="font-display text-2xl font-bold text-foreground">Sessões</h1>

              {["pending", "confirmed", "completed", "refused"].map((status) => {
                const filtered = sessions.data?.filter((s) => s.status === status) || [];
                if (filtered.length === 0) return null;
                const labels = { pending: "Aguardando Resposta", confirmed: "Confirmadas", completed: "Realizadas", refused: "Recusadas" };
                return (
                  <div key={status}>
                    <h2 className="font-semibold text-foreground mb-3 text-sm">{labels[status as keyof typeof labels]} ({filtered.length})</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filtered.map((s) => (
                        <SessionCard key={s.id} session={s} onRespond={() => setSelectedSession(s)} />
                      ))}
                    </div>
                  </div>
                );
              })}

              {(!sessions.data || sessions.data.length === 0) && (
                <div className="text-center py-12 text-muted-foreground">Nenhuma sessão registrada ainda.</div>
              )}
            </div>
          )}

          {/* LEADS TAB */}
          {activeTab === "leads" && (
            <div className="space-y-6">
              <h1 className="font-display text-2xl font-bold text-foreground">Leads — Sessões de Diagnóstico</h1>
              <div className="space-y-3">
                {(leads.data || []).map((lead) => (
                  <div key={lead.id} className="bg-card rounded-xl border border-border p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-foreground">{lead.nome}</p>
                        <p className="text-sm text-muted-foreground">{lead.especialidade} · {lead.email}</p>
                        {lead.principalDor && (
                          <p className="text-sm text-foreground/70 mt-2 bg-muted/50 rounded-lg p-2 italic">
                            "{lead.principalDor}"
                          </p>
                        )}
                      </div>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        lead.status === "new" ? "bg-amber-100 text-amber-800" :
                        lead.status === "contacted" ? "bg-blue-100 text-blue-800" :
                        lead.status === "converted" ? "bg-green-100 text-green-800" :
                        "bg-gray-100 text-gray-600"
                      }`}>
                        {lead.status === "new" ? "Novo" : lead.status === "contacted" ? "Contatado" : lead.status === "converted" ? "Convertido" : "Perdido"}
                      </span>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <p className="text-xs text-muted-foreground flex-1">
                        {new Date(lead.createdAt).toLocaleDateString("pt-BR")} · {lead.faturamentoFaixa || "Faturamento não informado"}
                      </p>
                    </div>
                  </div>
                ))}
                {(!leads.data || leads.data.length === 0) && (
                  <div className="text-center py-12 text-muted-foreground">Nenhum lead recebido ainda.</div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Session Response Modal */}
      {selectedSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-5 border-b">
              <h3 className="font-display text-lg font-bold text-foreground">Responder Solicitação</h3>
              <p className="text-sm text-muted-foreground mt-1">{selectedSession.menteeName} — {selectedSession.assunto}</p>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex gap-3">
                <button
                  onClick={() => setSessionResponse(p => ({ ...p, status: "confirmed" }))}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                    sessionResponse.status === "confirmed"
                      ? "bg-green-600 text-white border-green-600"
                      : "border-border text-muted-foreground hover:border-green-600"
                  }`}
                >
                  ✓ Confirmar
                </button>
                <button
                  onClick={() => setSessionResponse(p => ({ ...p, status: "refused" }))}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                    sessionResponse.status === "refused"
                      ? "bg-red-600 text-white border-red-600"
                      : "border-border text-muted-foreground hover:border-red-600"
                  }`}
                >
                  ✗ Recusar
                </button>
              </div>

              {sessionResponse.status === "confirmed" && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <Input placeholder="Data (ex: 10/03/2026)" value={sessionResponse.data} onChange={(e) => setSessionResponse(p => ({ ...p, data: e.target.value }))} />
                    <Input placeholder="Hora (ex: 14:00)" value={sessionResponse.hora} onChange={(e) => setSessionResponse(p => ({ ...p, hora: e.target.value }))} />
                  </div>
                  <Input placeholder="Link da sessão (Zoom, Meet...)" value={sessionResponse.link} onChange={(e) => setSessionResponse(p => ({ ...p, link: e.target.value }))} />
                </>
              )}

              <textarea
                placeholder={sessionResponse.status === "confirmed" ? "Mensagem para o mentorado (opcional)" : "Motivo da recusa e sugestão de nova data"}
                value={sessionResponse.resposta}
                onChange={(e) => setSessionResponse(p => ({ ...p, resposta: e.target.value }))}
                className="w-full border border-border rounded-lg p-3 text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="p-5 border-t flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setSelectedSession(null)}>Cancelar</Button>
              <Button
                className="flex-1 bg-primary text-primary-foreground"
                disabled={respondSession.isPending}
                onClick={() => respondSession.mutate({
                  sessionId: selectedSession.id,
                  status: sessionResponse.status as "confirmed" | "refused",
                  mentorResposta: sessionResponse.resposta,
                  dataConfirmada: sessionResponse.data,
                  horaConfirmada: sessionResponse.hora,
                  linkSessao: sessionResponse.link,
                })}
              >
                {respondSession.isPending ? "Enviando..." : "Confirmar Resposta"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
