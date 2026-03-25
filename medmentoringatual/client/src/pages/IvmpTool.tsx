import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { ArrowLeft, Save, TrendingUp, BarChart3, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

// ============================================================
// DADOS iVMP — 7 categorias, 53 perguntas, ponderação exata
// ============================================================
const DEFAULT_CATEGORIES = [
  { name: "Sobre Você", short: "Profissional", weight: 0.15, questions: [
    "Títulos e certificados de formação que possui",
    "Segurança técnica sobre os procedimentos que mais geram receita",
    "Tempo de atuação e experiência clínica",
    "Habilidade de empatia com o seu paciente",
    "Qualidade da relação médico-paciente",
    "Taxa de ocupação da sua agenda",
    "Habilidade de liderança e gestão de pessoas",
    "Reputação e destaque no seu mercado de atuação",
    "Seu diferencial, e o quanto é reconhecido e procurado por ele",
  ]},
  { name: "Sobre a Equipe", short: "Equipe", weight: 0.12, questions: [
    "Possui método estruturado de contratação",
    "Programa de treinamento periódico da equipe",
    "Baixo índice de rotatividade",
    "Perfil adequado do setor de atendimento",
    "Perfil adequado da área clínica",
    "Perfil adequado da área administrativa",
    "Uniformes e apresentação pessoal",
    "Atitude proativa da equipe",
    "Espírito de equipe e colaboração",
    "Relação da equipe com os pacientes",
    "Programa de incentivo e premiações",
    "Equipe sabe a quem recorrer em dúvidas",
    "Engajamento em dar o melhor",
  ]},
  { name: "Sobre a Infraestrutura", short: "Infraestrutura", weight: 0.10, questions: [
    "Localização do consultório/clínica",
    "Arquitetura, decoração e conservação",
    "Atualização tecnológica dos equipamentos",
    "Sinalização interna clara e segura",
  ]},
  { name: "Comunicação e Marketing", short: "Marketing", weight: 0.18, questions: [
    "Identidade visual atualizada e profissional",
    "Presença digital (site, redes sociais, vídeos)",
    "Materiais gráficos personalizados",
    "Planejamento de campanhas internas",
    "É convidado para entrevistas",
    "Eventos de relacionamento com pacientes",
    "Busca ativa para retornos de pacientes",
  ]},
  { name: "Perfil do Paciente", short: "Paciente", weight: 0.10, questions: [
    "Pacientes procuram por indicação",
    "Acompanham seu trabalho nas mídias digitais",
    "Satisfeito com o perfil de paciente",
    "Pacientes aceitam indicações de tratamento",
    "Atende somente particular",
  ]},
  { name: "Jornada do Paciente", short: "Jornada", weight: 0.15, questions: [
    "Mapeamento dos pontos de interação",
    "Sabe o que o paciente pensa/sente em cada ponto",
    "Experiência sensorial em cada ponto (5 sentidos)",
    "Acolhimento ao paciente é prioridade",
  ]},
  { name: "Sobre a Gestão", short: "Gestão", weight: 0.20, questions: [
    "Missão, visão e valores definidos e divulgados",
    "Finanças da clínica separadas da pessoa física",
    "Pessoa qualificada para controle de dados",
    "Plano de ação para os próximos 3 anos",
    "Confia no trabalho da contabilidade",
    "Processos bem definidos",
    "Descrição clara das tarefas por cargo",
    "Sistema de gestão e prontuário eletrônico",
    "Controle de produção e fluxo de caixa",
    "Guarda correta dos documentos",
    "Indicadores de desempenho definidos",
  ]},
];

type Category = typeof DEFAULT_CATEGORIES[0] & { scores: number[] };

function initCategories(saved?: unknown): Category[] {
  if (saved && Array.isArray(saved)) {
    return (saved as Category[]).map((c, i) => ({
      ...DEFAULT_CATEGORIES[i],
      scores: c.scores || DEFAULT_CATEGORIES[i].questions.map(() => 0.5),
    }));
  }
  return DEFAULT_CATEGORIES.map(c => ({
    ...c,
    scores: c.questions.map(() => 0.5),
  }));
}

function calcIvmp(cats: Category[]) {
  return cats.reduce((total, cat) => {
    const avg = cat.scores.reduce((s, v) => s + v, 0) / cat.scores.length;
    return total + avg * cat.weight;
  }, 0);
}

function IvmpStatus({ value }: { value: number }) {
  if (value >= 0.8) return <Badge className="bg-green-100 text-green-800 border-green-200"><CheckCircle2 className="w-3 h-3 mr-1" />Excelente ({(value * 100).toFixed(0)}%)</Badge>;
  if (value >= 0.6) return <Badge className="bg-blue-100 text-blue-800 border-blue-200"><TrendingUp className="w-3 h-3 mr-1" />Bom ({(value * 100).toFixed(0)}%)</Badge>;
  if (value >= 0.4) return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200"><AlertTriangle className="w-3 h-3 mr-1" />Em desenvolvimento ({(value * 100).toFixed(0)}%)</Badge>;
  return <Badge className="bg-red-100 text-red-800 border-red-200"><XCircle className="w-3 h-3 mr-1" />Crítico ({(value * 100).toFixed(0)}%)</Badge>;
}

export default function IvmpTool() {
  const params = useParams<{ menteeId: string }>();
  const menteeId = Number(params.menteeId);
  const [, navigate] = useLocation();
  const [categories, setCategories] = useState<Category[]>(initCategories());
  const [activeTab, setActiveTab] = useState(0);
  const [loaded, setLoaded] = useState(false);

  const { data: ivmpData } = trpc.mentor.getIvmp.useQuery(
    { menteeId },
    { enabled: !!menteeId }
  );

  const { data: menteeData } = trpc.mentor.getMentee.useQuery(
    { id: menteeId },
    { enabled: !!menteeId }
  );

  useEffect(() => {
    if (ivmpData && !loaded) {
      setCategories(initCategories(ivmpData.categoriesJson));
      setLoaded(true);
    }
  }, [ivmpData, loaded]);

  const saveIvmp = trpc.mentor.updateIvmp.useMutation({
    onSuccess: () => toast.success("iVMP salvo com sucesso!"),
    onError: () => toast.error("Erro ao salvar iVMP"),
  });

  const ivmpFinal = calcIvmp(categories);

  const updateScore = (catIdx: number, qIdx: number, value: number) => {
    setCategories(prev => {
      const next = prev.map((c, i) => i === catIdx
        ? { ...c, scores: c.scores.map((s, j) => j === qIdx ? value : s) }
        : c
      );
      return next;
    });
  };

  const handleSave = () => {
    saveIvmp.mutate({ menteeId, categories, ivmpFinal });
  };

  const cat = categories[activeTab];
  const catAvg = cat ? cat.scores.reduce((s, v) => s + v, 0) / cat.scores.length : 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container py-4 flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/mentor/mentorado/${menteeId}`)}>
            <ArrowLeft className="w-4 h-4 mr-2" />Voltar
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[#C9A84C]" />
              iVMP — Índice de Valor Médico Percebido
            </h1>
            {menteeData && (
              <p className="text-sm text-muted-foreground">{menteeData.nome} · {menteeData.especialidade}</p>
            )}
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-[#1B3A5C]">{(ivmpFinal * 100).toFixed(1)}%</div>
            <IvmpStatus value={ivmpFinal} />
          </div>
          <Button onClick={handleSave} disabled={saveIvmp.isPending} className="bg-[#1B3A5C] hover:bg-[#2a4f7a] text-white">
            <Save className="w-4 h-4 mr-2" />
            {saveIvmp.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </div>

      <div className="container py-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar — Categorias */}
        <div className="lg:col-span-1 space-y-2">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">Categorias</h3>
          {categories.map((cat, i) => {
            const avg = cat.scores.reduce((s, v) => s + v, 0) / cat.scores.length;
            const color = avg >= 0.8 ? "text-green-600" : avg >= 0.6 ? "text-blue-600" : avg >= 0.4 ? "text-yellow-600" : "text-red-600";
            return (
              <button
                key={i}
                onClick={() => setActiveTab(i)}
                className={`w-full text-left p-3 rounded-lg border transition-all ${activeTab === i ? "bg-[#1B3A5C] text-white border-[#1B3A5C]" : "bg-card hover:bg-muted border-border"}`}
              >
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">{cat.short}</span>
                  <span className={`text-xs font-bold ${activeTab === i ? "text-[#C9A84C]" : color}`}>
                    {(avg * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="text-xs opacity-70 mt-0.5">{(cat.weight * 100).toFixed(0)}% do índice</div>
                <div className="mt-2 h-1 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${avg >= 0.8 ? "bg-green-500" : avg >= 0.6 ? "bg-blue-500" : avg >= 0.4 ? "bg-yellow-500" : "bg-red-500"}`}
                    style={{ width: `${avg * 100}%` }}
                  />
                </div>
              </button>
            );
          })}

          {/* Resumo geral */}
          <Card className="mt-4 border-[#C9A84C]/30 bg-[#FFFBF0]">
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-[#1B3A5C]">{(ivmpFinal * 100).toFixed(1)}</div>
                <div className="text-xs text-muted-foreground">iVMP Final</div>
                <IvmpStatus value={ivmpFinal} />
              </div>
              <div className="mt-3 space-y-1">
                {categories.map((c, i) => {
                  const avg = c.scores.reduce((s, v) => s + v, 0) / c.scores.length;
                  return (
                    <div key={i} className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{c.short}</span>
                      <span className="font-medium">{(avg * 100).toFixed(0)}%</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Conteúdo principal — Perguntas */}
        <div className="lg:col-span-3">
          {cat && (
            <Card>
              <CardHeader className="border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg text-[#1B3A5C]">{cat.name}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {cat.questions.length} perguntas · Peso: {(cat.weight * 100).toFixed(0)}% do índice
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-[#1B3A5C]">{(catAvg * 100).toFixed(0)}%</div>
                    <IvmpStatus value={catAvg} />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {cat.questions.map((q, qi) => {
                  const score = cat.scores[qi] ?? 0.5;
                  const color = score >= 0.8 ? "text-green-600" : score >= 0.6 ? "text-blue-600" : score >= 0.4 ? "text-yellow-600" : "text-red-600";
                  return (
                    <div key={qi} className="space-y-2">
                      <div className="flex justify-between items-start gap-4">
                        <label className="text-sm font-medium text-foreground flex-1">{q}</label>
                        <span className={`text-sm font-bold min-w-[3rem] text-right ${color}`}>
                          {(score * 10).toFixed(1)}/10
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground w-16">Crítico</span>
                        <Slider
                          value={[score * 10]}
                          min={0}
                          max={10}
                          step={0.5}
                          onValueChange={([v]) => updateScore(activeTab, qi, v / 10)}
                          className="flex-1"
                        />
                        <span className="text-xs text-muted-foreground w-16 text-right">Excelente</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${score >= 0.8 ? "bg-green-500" : score >= 0.6 ? "bg-blue-500" : score >= 0.4 ? "bg-yellow-500" : "bg-red-500"}`}
                          style={{ width: `${score * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Navegação entre categorias */}
          <div className="flex justify-between mt-4">
            <Button
              variant="outline"
              onClick={() => setActiveTab(Math.max(0, activeTab - 1))}
              disabled={activeTab === 0}
            >
              ← Categoria anterior
            </Button>
            <span className="text-sm text-muted-foreground self-center">
              {activeTab + 1} / {categories.length}
            </span>
            <Button
              variant="outline"
              onClick={() => {
                if (activeTab < categories.length - 1) {
                  setActiveTab(activeTab + 1);
                } else {
                  handleSave();
                }
              }}
            >
              {activeTab < categories.length - 1 ? "Próxima categoria →" : "Salvar iVMP ✓"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
