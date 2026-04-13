import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";
import {
  Target, TrendingUp, Users, BarChart3, Megaphone, ShoppingBag,
  ChevronRight, Star, CheckCircle, ArrowRight, Menu, X, Award, Clock, BookOpen
} from "lucide-react";

const PILLARS = [
  { id: 1, icon: Target, title: "Mapa Estratégico", desc: "Defina quem você é, seu propósito e aonde quer chegar.", color: "from-blue-900 to-blue-700" },
  { id: 2, icon: Star, title: "Produto Profissional", desc: "Crie seu cardápio de serviços alinhado com seus valores.", color: "from-indigo-900 to-indigo-700" },
  { id: 3, icon: BarChart3, title: "Diagnóstico", desc: "Mapeie custos reais, iVMP e entenda sua realidade financeira.", color: "from-slate-800 to-slate-600" },
  { id: 4, icon: TrendingUp, title: "Estratégia", desc: "Simule cenários, defina preços e trace seu plano de ação.", color: "from-amber-800 to-amber-600" },
  { id: 5, icon: Megaphone, title: "Comunicação", desc: "Crie sua estratégia de comunicação com IA personalizada.", color: "from-teal-800 to-teal-600" },
  { id: 6, icon: ShoppingBag, title: "Vendas", desc: "Aprenda a vender com valor e construa seu protocolo de consulta.", color: "from-rose-900 to-rose-700" },
];

const PAINS = [
  { icon: "💰", title: "Fatura bem, mas sobra pouco", desc: "Agenda cheia, mas no fim do mês o saldo não reflete o esforço." },
  { icon: "😰", title: "Depende demais de você", desc: "A clínica para quando você para. Sem delegação real, sem liberdade." },
  { icon: "🎯", title: "Não sabe precificar", desc: "Cobra por intuição e teme perder pacientes se aumentar os valores." },
  { icon: "📱", title: "Invisível no digital", desc: "Sabe que precisa de presença online, mas não sabe por onde começar." },
  { icon: "🤝", title: "Dificuldade em fechar tratamentos", desc: "Pacientes consultam, mas não aderem aos planos indicados." },
  { icon: "🏥", title: "Clínica sem identidade", desc: "Sem diferencial claro, compete por preço com qualquer consultório da cidade." },
];

const TESTIMONIALS = [
  { name: "Dra. Mariana Costa", specialty: "Dermatologista", text: "Em 6 meses, aumentei meu faturamento em 40% sem aumentar a carga horária. O método é transformador.", stars: 5 },
  { name: "Dr. Rafael Mendes", specialty: "Ortopedista", text: "Finalmente entendi como precificar meus procedimentos corretamente. Deixei de trabalhar no prejuízo.", stars: 5 },
  { name: "Dra. Camila Rocha", specialty: "Ginecologista", text: "A clareza que o método traz sobre identidade e posicionamento mudou completamente minha relação com o trabalho.", stars: 5 },
];

function OnboardingForm({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    nome: "", email: "", telefone: "", especialidade: "",
    tempoFormacao: "", estruturaAtual: "", faturamentoFaixa: "",
    principalDor: "", tentouResolver: "", disponibilidade: "",
  });

  const submit = trpc.onboarding.submit.useMutation({
    onSuccess: () => {
      toast.success("Solicitação enviada! Entraremos em contato em breve.");
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  const update = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b flex items-center justify-between">
          <div>
            <h3 className="font-display text-xl font-bold text-primary">Sessão de Diagnóstico Gratuita</h3>
            <p className="text-sm text-muted-foreground mt-1">Passo {step} de 3</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-4">
          {step === 1 && (
            <>
              <p className="text-sm text-muted-foreground">Conte-nos um pouco sobre você:</p>
              <Input placeholder="Nome completo *" value={form.nome} onChange={(e) => update("nome", e.target.value)} />
              <Input placeholder="E-mail *" type="email" value={form.email} onChange={(e) => update("email", e.target.value)} />
              <Input placeholder="WhatsApp" value={form.telefone} onChange={(e) => update("telefone", e.target.value)} />
              <Input placeholder="Especialidade médica" value={form.especialidade} onChange={(e) => update("especialidade", e.target.value)} />
              <Select onValueChange={(v) => update("tempoFormacao", v)}>
                <SelectTrigger><SelectValue placeholder="Tempo de formação" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="menos-5">Menos de 5 anos</SelectItem>
                  <SelectItem value="5-10">5 a 10 anos</SelectItem>
                  <SelectItem value="10-20">10 a 20 anos</SelectItem>
                  <SelectItem value="mais-20">Mais de 20 anos</SelectItem>
                </SelectContent>
              </Select>
            </>
          )}

          {step === 2 && (
            <>
              <p className="text-sm text-muted-foreground">Sobre sua estrutura atual:</p>
              <Select onValueChange={(v) => update("estruturaAtual", v)}>
                <SelectTrigger><SelectValue placeholder="Como você atua hoje?" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sala-alugada">Sala alugada em clínica</SelectItem>
                  <SelectItem value="clinica-propria">Clínica própria</SelectItem>
                  <SelectItem value="celetista">Celetista / Hospital</SelectItem>
                  <SelectItem value="consultorio-proprio">Consultório próprio</SelectItem>
                  <SelectItem value="multiplos">Múltiplos locais</SelectItem>
                </SelectContent>
              </Select>
              <Select onValueChange={(v) => update("faturamentoFaixa", v)}>
                <SelectTrigger><SelectValue placeholder="Faturamento médio mensal" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ate-15k">Até R$ 15.000</SelectItem>
                  <SelectItem value="15k-30k">R$ 15.000 a R$ 30.000</SelectItem>
                  <SelectItem value="30k-60k">R$ 30.000 a R$ 60.000</SelectItem>
                  <SelectItem value="60k-100k">R$ 60.000 a R$ 100.000</SelectItem>
                  <SelectItem value="acima-100k">Acima de R$ 100.000</SelectItem>
                </SelectContent>
              </Select>
              <Textarea
                placeholder="Qual é sua principal dor ou incômodo com a clínica hoje? *"
                value={form.principalDor}
                onChange={(e) => update("principalDor", e.target.value)}
                rows={3}
              />
            </>
          )}

          {step === 3 && (
            <>
              <p className="text-sm text-muted-foreground">Últimas informações:</p>
              <Textarea
                placeholder="Já tentou resolver esse problema? Como?"
                value={form.tentouResolver}
                onChange={(e) => update("tentouResolver", e.target.value)}
                rows={3}
              />
              <Select onValueChange={(v) => update("disponibilidade", v)}>
                <SelectTrigger><SelectValue placeholder="Disponibilidade para a sessão" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manha">Manhãs (8h–12h)</SelectItem>
                  <SelectItem value="tarde">Tardes (13h–18h)</SelectItem>
                  <SelectItem value="noite">Noites (19h–21h)</SelectItem>
                  <SelectItem value="sabado">Sábados</SelectItem>
                  <SelectItem value="flexivel">Flexível</SelectItem>
                </SelectContent>
              </Select>
              <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
                A sessão de diagnóstico é <strong>gratuita</strong>, dura aproximadamente 60 minutos e será realizada por videoconferência.
              </div>
            </>
          )}
        </div>

        <div className="p-6 border-t flex gap-3">
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep(s => s - 1)} className="flex-1">
              Voltar
            </Button>
          )}
          {step < 3 ? (
            <Button
              onClick={() => {
                if (step === 1 && (!form.nome || !form.email)) { toast.error("Preencha nome e e-mail"); return; }
                if (step === 2 && !form.principalDor) { toast.error("Descreva sua principal dor"); return; }
                setStep(s => s + 1);
              }}
              className="flex-1 bg-primary text-primary-foreground"
            >
              Continuar <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={() => submit.mutate(form)}
              disabled={submit.isPending}
              className="flex-1 bg-primary text-primary-foreground"
            >
              {submit.isPending ? "Enviando..." : "Solicitar Sessão Gratuita"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* NAVBAR */}
      <nav className="fixed top-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-sm border-b border-border shadow-sm">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">ITC</span>
            </div>
            <span className="font-display font-bold text-primary text-lg">MedMentoring</span>
          </div>

          <div className="hidden md:flex items-center gap-6">
            <a href="#pilares" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Método</a>
            <a href="#dores" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Para quem</a>
            <a href="#depoimentos" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Resultados</a>
            {isAuthenticated ? (
              <Link href={user?.role === "admin" ? "/mentor" : "/portal"}>
                <Button size="sm" className="bg-primary text-primary-foreground">
                  Acessar Plataforma
                </Button>
              </Link>
              
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/acesso">
                  <Button variant="outline" size="sm">Área do Mentorado</Button>
                </Link>
                <a href={getLoginUrl()}>
                  <Button size="sm" className="bg-primary text-primary-foreground">Mentor</Button>
                </a>
              </div>
            )}
          </div>

          <button className="md:hidden p-2" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden border-t bg-white p-4 space-y-3">
            <a href="#pilares" className="block text-sm py-2" onClick={() => setMenuOpen(false)}>Método</a>
            <a href="#dores" className="block text-sm py-2" onClick={() => setMenuOpen(false)}>Para quem</a>
            <Link href="/acesso"><Button variant="outline" className="w-full" size="sm">Área do Mentorado</Button></Link>
            <a href={getLoginUrl()}><Button className="w-full bg-primary text-primary-foreground" size="sm">Acesso Mentor</Button></a>
          </div>
        )}
      </nav>

      {/* HERO */}
      <section className="pt-20 pb-12 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-5"
          style={{ backgroundImage: "radial-gradient(circle at 20% 50%, oklch(0.28 0.07 250) 0%, transparent 50%), radial-gradient(circle at 80% 20%, oklch(0.72 0.12 75) 0%, transparent 50%)" }}
        />
        <div className="container relative">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-full px-4 py-1.5 text-sm font-medium mb-6">
              <Award className="w-4 h-4" />
              Mentoria Exclusiva para Médicos
            </div>
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-primary leading-tight mb-6">
              Transforme sua clínica em um negócio{" "}
              <span className="relative">
                <span className="text-amber-600">próspero</span>
              </span>
              {" "}e sustentável
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 leading-relaxed">
              O método MedMentoring guia médicos que faturam bem mas não sobra dinheiro, que trabalham muito mas não têm liberdade, a construir clínicas sólidas, lucrativas e com propósito.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="bg-primary text-primary-foreground text-base px-8 shadow-lg"
                onClick={() => setShowForm(true)}
              >
                Quero uma Sessão Gratuita <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <a href="#pilares">
                <Button variant="outline" size="lg" className="text-base px-8">
                  Conhecer o Método
                </Button>
              </a>
            </div>
            <div className="mt-10 flex items-center justify-center gap-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-600" /> Sem compromisso</div>
              <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-blue-600" /> 60 minutos</div>
              <div className="flex items-center gap-2"><BookOpen className="w-4 h-4 text-amber-600" /> 100% gratuito</div>
            </div>
          </div>
        </div>
      </section>

      {/* DORES */}
      <section id="dores" className="py-20 bg-primary text-primary-foreground">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">Você se identifica com alguma dessas situações?</h2>
            <p className="text-primary-foreground/70 text-lg max-w-2xl mx-auto">
              Médicos altamente capacitados tecnicamente, mas com dificuldades no negócio. Isso é mais comum do que parece.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {PAINS.map((pain, i) => (
              <div key={i} className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 hover:bg-white/15 transition-colors">
                <div className="text-3xl mb-3">{pain.icon}</div>
                <h3 className="font-semibold text-lg mb-2">{pain.title}</h3>
                <p className="text-primary-foreground/70 text-sm leading-relaxed">{pain.desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <Button
              size="lg"
              className="bg-amber-500 hover:bg-amber-400 text-white text-base px-8"
              onClick={() => setShowForm(true)}
            >
              Quero resolver isso <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      </section>

      {/* 6 PILARES */}
      <section id="pilares" className="py-20 bg-background">
        <div className="container">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-full px-4 py-1.5 text-sm font-medium mb-4">
              O Método
            </div>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-primary mb-4">Os 6 Pilares da Mentoria Médica</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Um sistema estruturado e progressivo que abrange todas as dimensões do seu negócio médico.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {PILLARS.map((p) => {
              const Icon = p.icon;
              return (
                <div key={p.id} className="group bg-card rounded-xl p-6 border border-border hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${p.color} flex items-center justify-center mb-4`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-xs font-bold text-muted-foreground mb-1">PILAR {p.id}</div>
                  <h3 className="font-semibold text-foreground mb-2 leading-snug">{p.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{p.desc}</p>
                </div>
              );
            })}
            {/* CTA card */}
            <div
              className="bg-primary rounded-xl p-6 flex flex-col justify-between cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
              onClick={() => setShowForm(true)}
            >
              <div>
                <div className="text-primary-foreground/60 text-xs font-bold mb-1">COMECE AGORA</div>
                <h3 className="font-display text-xl font-bold text-primary-foreground mb-3">Descubra por onde começar</h3>
                <p className="text-primary-foreground/70 text-sm">Uma sessão gratuita para mapear seus pilares prioritários.</p>
              </div>
              <Button className="mt-6 bg-amber-500 hover:bg-amber-400 text-white w-full">
                Agendar Diagnóstico <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* DEPOIMENTOS */}
      <section id="depoimentos" className="py-20 bg-muted/30">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-primary mb-4">Resultados reais de médicos reais</h2>
            <p className="text-muted-foreground text-lg">O que dizem os médicos que passaram pelo método.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="bg-card rounded-xl p-6 border border-border shadow-sm">
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: t.stars }).map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-foreground/80 text-sm leading-relaxed mb-4 italic">"{t.text}"</p>
                <div>
                  <div className="font-semibold text-foreground text-sm">{t.name}</div>
                  <div className="text-muted-foreground text-xs">{t.specialty}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container text-center">
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">Pronto para transformar sua clínica?</h2>
          <p className="text-primary-foreground/70 text-lg mb-8 max-w-xl mx-auto">
            Agende sua sessão de diagnóstico gratuita e descubra exatamente o que está impedindo sua clínica de crescer.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="bg-amber-500 hover:bg-amber-400 text-white text-base px-10 shadow-lg"
              onClick={() => setShowForm(true)}
            >
              Quero minha Sessão Gratuita <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Link href="/qualificacao">
              <Button
                size="lg"
                variant="outline"
                className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 text-base px-10"
              >
                Fazer Questionário de Qualificação
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-8 border-t bg-background">
        <div className="container flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xs">ITC</span>
            </div>
            <span className="font-medium text-foreground">MedMentoring</span>
          </div>
          <p>© {new Date().getFullYear()} MedMentoring. Todos os direitos reservados.</p>
          <div className="flex gap-4">
            <Link href="/acesso" className="hover:text-foreground transition-colors">Área do Mentorado</Link>
            <a href={getLoginUrl()} className="hover:text-foreground transition-colors">Mentor</a>
          </div>
        </div>
      </footer>

      {showForm && <OnboardingForm onClose={() => setShowForm(false)} />}
    </div>
  );
}
