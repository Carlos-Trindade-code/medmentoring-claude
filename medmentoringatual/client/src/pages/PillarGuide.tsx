import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  ChevronDown, ChevronUp, Save, ArrowLeft, Brain,
  Target, BarChart3, Settings, DollarSign, Megaphone,
  Handshake, CheckCircle2, AlertTriangle, Lightbulb,
  ClipboardList, TrendingUp, Users
} from "lucide-react";

// ============================================================
// DADOS COMPLETOS DOS 7 PILARES (do repositório)
// ============================================================
const PILARES = [
  {
    id: 1, nome: "Identidade & Propósito", icon: Brain, cor: "#8E44AD", corLight: "#F0E6F6",
    semanas: "1–2", sessoes: 2, horas: 3.5,
    resumo: "Autoconhecimento profissional, missão, visão, valores. Descobrir o que move você além do diploma.",
    perguntas: [
      { bloco: "Contexto Pessoal", perguntas: [
        "Qual foi o momento em que você mais se sentiu realizado na medicina?",
        "Se você pudesse escolher apenas um tipo de paciente para atender, quem seria?",
        "O que você faz que nenhum colega da sua especialidade faz igual?",
        "Qual problema médico você resolve melhor do que qualquer pessoa que conhece?",
        "Se você parasse de exercer medicina amanhã, o que sentiria falta?",
      ]},
      { bloco: "Missão e Valores", perguntas: [
        "Você tem uma missão profissional definida? Consegue verbalizá-la em 1 frase?",
        "Quais são os 3 valores inegociáveis na sua prática médica?",
        "Sua prática atual está alinhada com esses valores ou há conflitos?",
        "Como você quer ser lembrado pelos seus pacientes daqui a 10 anos?",
      ]},
      { bloco: "Visão de Futuro", perguntas: [
        "Onde você quer estar profissionalmente em 3 anos? E em 5?",
        "O que está impedindo você de chegar lá mais rápido?",
        "Você tem clareza sobre o perfil ideal de paciente que quer atender?",
      ]},
    ],
    angustias: [
      { texto: "Não sei se estou na especialidade certa", tecnica: "Roda da Vida Profissional — mapear satisfação em 8 áreas: técnica, financeiro, equipe, pacientes, tempo, propósito, crescimento, reconhecimento" },
      { texto: "Sinto que perdi a paixão pela medicina", tecnica: "Resgate de Momentos-Pico — relembrar os 3 momentos mais gratificantes da carreira e identificar o padrão comum" },
      { texto: "Não consigo me diferenciar dos colegas", tecnica: "Inventário de Diferenciais Únicos — listar o que só você faz/sabe/oferece que nenhum colega replica" },
      { texto: "Trabalho muito mas não me sinto realizado", tecnica: "Análise de Energia — mapear quais atividades dão energia vs. drenam energia, e rebalancear a agenda" },
      { texto: "Não sei qual é o meu nicho", tecnica: "Matriz Paixão × Habilidade × Mercado — encontrar o ponto de intersecção dos três" },
    ],
    checklist: [
      "Mapeamento de forças e talentos individuais",
      "Definição de missão pessoal e profissional",
      "Alinhamento de valores com a prática médica",
      "Exercício de visão de futuro (3-5 anos)",
      "Definição do perfil ideal de paciente",
      "Construção da declaração de propósito",
    ],
  },
  {
    id: 2, nome: "Posicionamento", icon: Target, cor: "#2980B9", corLight: "#D6E4F0",
    semanas: "1–2", sessoes: 2, horas: 3.0,
    resumo: "Como o mercado te percebe vs como deveria. Nicho, autoridade, diferenciação estratégica.",
    perguntas: [
      { bloco: "Percepção de Mercado", perguntas: [
        "Se você perguntar a 5 pacientes por que te escolheram, o que eles dizem?",
        "Como você se apresenta quando alguém pergunta 'o que você faz'?",
        "Você é lembrado por alguma coisa específica no seu mercado?",
        "Quem são seus principais concorrentes diretos? O que eles fazem diferente?",
      ]},
      { bloco: "Nicho e Autoridade", perguntas: [
        "Você tem um sub-nicho definido ou atende 'todo tipo de paciente'?",
        "Em que você é reconhecido como referência — ou gostaria de ser?",
        "Você é convidado para palestrar, dar entrevistas ou escrever artigos?",
        "Qual é o seu posicionamento de preço em relação ao mercado local?",
      ]},
      { bloco: "Proposta de Valor", perguntas: [
        "Por que um paciente pagaria mais para ser atendido por você do que por outro médico?",
        "O que está incluso na sua consulta que outros não oferecem?",
        "Você tem depoimentos ou cases de resultado que pode mostrar?",
      ]},
    ],
    angustias: [
      { texto: "Meus pacientes só vêm por preço baixo", tecnica: "Escada de Valor — criar ofertas de entrada (consulta simples), intermediária (plano de tratamento) e premium (acompanhamento VIP)" },
      { texto: "Não sei como cobrar mais", tecnica: "Ancoragem de Valor — mostrar o que o paciente ganha (resultado) e não o que paga (custo). Ex: 'R$ 800 por uma consulta que pode evitar R$ 20.000 em cirurgia'" },
      { texto: "Não tenho diferencial claro", tecnica: "Método Blue Ocean — encontrar o espaço não explorado: o que você pode criar que nenhum concorrente oferece?" },
      { texto: "Perco pacientes para colegas mais baratos", tecnica: "Proposta de Valor Comparada — listar o que está incluso no seu atendimento vs. o que falta no concorrente mais barato" },
      { texto: "Não apareço quando buscam minha especialidade", tecnica: "Estratégia de Autoridade Digital — definir 1 plataforma prioritária e criar conteúdo semanal por 90 dias" },
    ],
    checklist: [
      "Análise do posicionamento atual (percepção do mercado)",
      "Definição de nicho e sub-nicho de atuação",
      "Mapeamento da concorrência local",
      "Construção da proposta de valor única",
      "Definição de faixas de preço por posicionamento",
      "Plano de autoridade (onde ser visto e reconhecido)",
    ],
  },
  {
    id: 3, nome: "Diagnóstico do Negócio", icon: BarChart3, cor: "#27AE60", corLight: "#E2EFDA",
    semanas: "2–3", sessoes: 3, horas: 5.0,
    resumo: "Raio-X completo: financeiro, operacional, mercado. iVMP, despesas fixas, custo de sala.",
    perguntas: [
      { bloco: "Financeiro Básico", perguntas: [
        "Você tem clareza do seu faturamento médio mensal? Qual é?",
        "Você sabe quanto são seus custos fixos mensais de cabeça?",
        "Suas finanças pessoais e da clínica estão separadas?",
        "Você tem controle de fluxo de caixa ou usa extrato bancário como referência?",
      ]},
      { bloco: "Operacional", perguntas: [
        "Qual é a sua taxa de ocupação atual (% de horas disponíveis que são pagas)?",
        "Quantas horas por semana você trabalha? Quantas são efetivamente faturadas?",
        "Você sabe qual é o custo da sua sala por hora — mesmo quando está vazia?",
        "Quais são os 3 serviços que mais geram receita para você?",
      ]},
      { bloco: "Diagnóstico iVMP", perguntas: [
        "Em uma escala de 0 a 1, como você avalia sua reputação no mercado?",
        "Como está sua equipe: treinada, engajada, com baixa rotatividade?",
        "Sua infraestrutura transmite o valor que você cobra?",
        "Você tem presença digital ativa e profissional?",
      ]},
    ],
    angustias: [
      { texto: "Não sei quanto gasto por mês", tecnica: "Extrato Reverso — pegar os últimos 3 extratos bancários e categorizar cada saída em: infraestrutura, pessoal, marketing, impostos, outros" },
      { texto: "Trabalho muito e sobra pouco", tecnica: "Análise de Ociosidade — calcular: horas disponíveis × custo/hora = custo da sala vazia. Esse valor existe mesmo que não atenda ninguém" },
      { texto: "Não sei se meu consultório dá lucro", tecnica: "DRE Simplificada — receita bruta − impostos − custos variáveis − custos fixos = lucro operacional. Fazer em 30 minutos com os dados do extrato" },
      { texto: "Meu iVMP está baixo em alguma categoria", tecnica: "Plano de Ação por Categoria — para cada categoria abaixo de 0.6, definir 1 ação concreta com prazo de 30 dias" },
    ],
    ferramentas: ["ivmp", "despesa"],
    checklist: [
      "Aplicação do questionário iVMP completo",
      "Análise do dashboard iVMP com diagnóstico",
      "Levantamento de despesas fixas (12 meses)",
      "Construção do mapa de sala (grade de horários)",
      "Cálculo do custo/hora e taxa de ocupação",
      "Identificação das 3 prioridades de ação",
      "Apresentação do diagnóstico ao mentorado",
    ],
  },
  {
    id: 4, nome: "Estrutura Operacional", icon: Settings, cor: "#E67E22", corLight: "#FDEBD0",
    semanas: "2", sessoes: 2, horas: 4.0,
    resumo: "Processos, equipe, fluxos. Construir uma operação que funciona sem você presente.",
    perguntas: [
      { bloco: "Dependência do Médico", perguntas: [
        "O que acontece na clínica quando você falta por 1 dia? E por 1 semana?",
        "Quais tarefas só você consegue fazer? Quais poderiam ser delegadas?",
        "Você tem manuais de processo escritos para as principais rotinas?",
        "Sua equipe sabe exatamente o que fazer em cada situação sem te perguntar?",
      ]},
      { bloco: "Equipe", perguntas: [
        "Como você contrata? Tem um processo estruturado ou é por indicação?",
        "Você faz treinamentos periódicos com a equipe?",
        "Qual é a rotatividade da sua equipe nos últimos 12 meses?",
        "Sua equipe conhece a missão e os valores da clínica?",
      ]},
      { bloco: "Processos e Indicadores", perguntas: [
        "Você tem indicadores operacionais que acompanha mensalmente?",
        "Como é o processo de agendamento, confirmação e follow-up de pacientes?",
        "Quais são os principais pontos de atrito na jornada do paciente?",
        "Você tem um sistema de prontuário eletrônico integrado à gestão?",
      ]},
    ],
    angustias: [
      { texto: "Se eu falto, a clínica para", tecnica: "Delegação Progressiva — escolher 1 atividade por semana para transferir para a equipe, com treinamento e checklist de validação" },
      { texto: "Minha equipe não funciona sem supervisão", tecnica: "Checklist Operacional — criar rotinas autogerenciáveis: abertura, atendimento, fechamento. A equipe executa, você audita" },
      { texto: "Perco pacientes por falhas no atendimento", tecnica: "Mapeamento de Jornada — identificar todos os pontos de contato (telefone, recepção, sala de espera, consultório, pós-consulta) e definir o padrão ideal para cada um" },
      { texto: "Não consigo contratar boas pessoas", tecnica: "Processo Seletivo Estruturado — definir perfil comportamental antes de anunciar, usar teste prático e entrevista por competências" },
    ],
    checklist: [
      "Mapeamento de todos os processos atuais",
      "Identificação de gargalos e retrabalhos",
      "Definição de cargos e responsabilidades",
      "Criação de scripts de atendimento",
      "Definição de indicadores operacionais",
      "Plano de treinamento da equipe",
    ],
  },
  {
    id: 5, nome: "Precificação & Financeiro", icon: DollarSign, cor: "#C9A84C", corLight: "#FFF2CC",
    semanas: "2", sessoes: 3, horas: 4.5,
    resumo: "Quanto cobrar e por quê. Custos variáveis, margem, cenários, ponto de equilíbrio.",
    perguntas: [
      { bloco: "Precificação Atual", perguntas: [
        "Como você define o preço dos seus serviços hoje? Por intuição, concorrência ou cálculo?",
        "Você sabe qual é o preço mínimo de cada serviço para não ter prejuízo?",
        "Qual é a sua margem bruta média? (receita − custos variáveis) / receita",
        "Você tem serviços com margem negativa sem saber?",
      ]},
      { bloco: "Custos Variáveis", perguntas: [
        "Quais são os custos variáveis de cada serviço? (material médico, equipamento, comissão, imposto, cartão)",
        "Você tem controle de quanto gasta com material médico por procedimento?",
        "Qual é a sua alíquota de imposto efetiva sobre o faturamento?",
        "Você paga comissão para a clínica ou para secretárias por procedimento?",
      ]},
      { bloco: "Cenários e Metas", perguntas: [
        "Qual é o seu ponto de equilíbrio mensal? (quanto precisa faturar para cobrir todos os custos)",
        "Se você aumentasse 10% o preço de 1 serviço, quantos pacientes perderia?",
        "Qual cenário de faturamento você quer atingir em 6 meses?",
      ]},
    ],
    angustias: [
      { texto: "Cobro o que o vizinho cobra", tecnica: "Precificação por Valor — calcular o preço pelo que você entrega (resultado para o paciente), não pela concorrência. O paciente não compara preço, compara valor percebido" },
      { texto: "Não sei se meus preços cobrem os custos", tecnica: "Preço Mínimo — calcular: (custos variáveis + rateio de custos fixos) / (1 − impostos − cartão) = preço mínimo. Qualquer valor abaixo disso é prejuízo" },
      { texto: "Tenho medo de perder pacientes se subir o preço", tecnica: "Teste de Elasticidade — subir 10% em 1 serviço por 30 dias e medir: quantos pacientes recusaram? Se menos de 10%, o preço estava abaixo do mercado" },
      { texto: "Minha margem está muito baixa", tecnica: "Análise de Mix de Serviços — identificar os serviços com maior margem e aumentar o volume deles, reduzindo ou eliminando os de margem negativa" },
    ],
    ferramentas: ["precificacao"],
    checklist: [
      "Cadastro de todos os serviços com custos variáveis",
      "Definição de parâmetros (impostos, taxas, rateio)",
      "Análise de margem bruta e operacional por serviço",
      "Cálculo do preço mínimo por serviço",
      "Simulação de cenários (conservador/moderado/agressivo)",
      "Cálculo do ponto de equilíbrio",
      "Definição de tabela de preços final",
    ],
  },
  {
    id: 6, nome: "Marketing & Digital", icon: Megaphone, cor: "#9B59B6", corLight: "#F0E6F6",
    semanas: "2", sessoes: 2, horas: 4.0,
    resumo: "Presença digital, conteúdo, Google, redes sociais. Atrair o paciente certo.",
    perguntas: [
      { bloco: "Presença Digital Atual", perguntas: [
        "Você tem um site profissional? Ele aparece no Google quando buscam sua especialidade?",
        "Seu Google Meu Negócio está completo (fotos, horários, avaliações)?",
        "Em quais redes sociais você está presente? Com que frequência publica?",
        "Você sabe de onde vêm seus pacientes novos? (indicação, Google, Instagram, outros)",
      ]},
      { bloco: "Conteúdo e Estratégia", perguntas: [
        "Você tem uma estratégia de conteúdo definida ou publica quando lembra?",
        "Qual tipo de conteúdo gera mais engajamento para você?",
        "Você tem um calendário editorial ou plano de publicações?",
        "Você investe em tráfego pago (Google Ads, Meta Ads)? Qual é o retorno?",
      ]},
      { bloco: "Resultados e Métricas", perguntas: [
        "Você mede quantos pacientes novos chegam por mês via digital?",
        "Qual é o custo de aquisição de um paciente novo para você?",
        "Você tem avaliações no Google? Quantas? Qual é a nota média?",
      ]},
    ],
    angustias: [
      { texto: "Não apareço no Google", tecnica: "Google Meu Negócio — completar 100% do perfil: fotos profissionais, horários, descrição com palavras-chave, pedir avaliações para os últimos 10 pacientes" },
      { texto: "Não sei o que postar nas redes", tecnica: "Matriz de Conteúdo 4×4 — 4 pilares: Educar (o que você trata), Inspirar (casos de resultado), Conectar (bastidores, humanização), Converter (CTA para consulta). 1 post por pilar por semana" },
      { texto: "Gasto com marketing e não vejo resultado", tecnica: "Funil de Aquisição — medir: impressões → cliques → contatos → consultas → pacientes. Identificar onde está o gargalo e otimizar esse ponto específico" },
      { texto: "Meus posts não têm engajamento", tecnica: "Conteúdo de Dor — falar sobre o problema do paciente (não sobre você). Ex: 'Por que sua dor nas costas piora à noite?' gera 10x mais engajamento do que 'Sou especialista em coluna'" },
    ],
    checklist: [
      "Auditoria de presença digital atual",
      "Definição de perfil do paciente ideal (persona)",
      "Estratégia de conteúdo para redes sociais",
      "Otimização do Google Meu Negócio",
      "Plano de marketing com orçamento definido",
      "Calendário editorial mensal",
    ],
  },
  {
    id: 7, nome: "Vendas & Valor", icon: Handshake, cor: "#C0392B", corLight: "#FDEDEC",
    semanas: "1–2", sessoes: 2, horas: 4.0,
    resumo: "Converter consultas em tratamentos. Comunicar valor, apresentar orçamento, fechar.",
    perguntas: [
      { bloco: "Taxa de Conversão", perguntas: [
        "De cada 10 pacientes que consultam, quantos aceitam o tratamento proposto?",
        "Você sabe qual é a sua taxa de conversão por tipo de serviço?",
        "Quais são as 3 objeções mais comuns que você ouve? ('vou pensar', 'está caro', 'vou consultar outro')",
        "Você tem um script ou roteiro para apresentar tratamentos?",
      ]},
      { bloco: "Apresentação de Valor", perguntas: [
        "Como você apresenta o investimento: fala o preço direto ou apresenta o valor antes?",
        "Você usa comparações de valor? (ex: 'o custo por dia é menor do que um café')",
        "Você apresenta opções de parcelamento de forma proativa?",
        "Você tem materiais visuais (folheto, apresentação) para apoiar a proposta?",
      ]},
      { bloco: "Follow-up", perguntas: [
        "Você faz follow-up com pacientes que pediram orçamento e não voltaram?",
        "Qual é o seu processo de retorno pós-consulta?",
        "Você tem algum sistema de reativação de pacientes inativos?",
      ]},
    ],
    angustias: [
      { texto: "Pacientes pedem orçamento e somem", tecnica: "Follow-up Estruturado — mensagem em 24h ('Olá [nome], ficou alguma dúvida sobre o tratamento?'), 72h ('Quero garantir que você tenha todas as informações') e 7 dias ('Ainda estou à disposição')" },
      { texto: "Não consigo apresentar tratamentos caros", tecnica: "Framing de Investimento — mostrar custo por dia, não total. R$ 3.000 em 12x = R$ 250/mês = R$ 8/dia. Comparar com algo que o paciente já gasta (café, academia, streaming)" },
      { texto: "Perco tratamentos para concorrentes mais baratos", tecnica: "Proposta de Valor Comparada — criar um documento que mostra o que está incluso no seu tratamento vs. o que falta no mais barato. O paciente precisa ver a diferença, não apenas ouvi-la" },
      { texto: "Minha taxa de conversão está abaixo de 50%", tecnica: "Análise de Objeções — gravar (com consentimento) ou anotar as últimas 10 recusas. Identificar o padrão e criar resposta específica para cada objeção recorrente" },
    ],
    checklist: [
      "Análise da taxa de conversão atual",
      "Script de apresentação de tratamentos",
      "Técnica de apresentação de investimento (não preço)",
      "Objeções mais comuns e respostas",
      "Implementação de follow-up pós-consulta",
      "Métricas de vendas: taxa de aceite, ticket médio",
    ],
  },
];

// Mapa de pilares urgentes baseado nas respostas do diagnóstico
const MAPA_PILARES: Record<string, number[]> = {
  "não sobra dinheiro": [3, 5],
  "trabalho muito": [3, 4, 5],
  "não sei me diferenciar": [1, 2],
  "não apareço no google": [6],
  "perco tratamentos": [7],
  "clínica para sem mim": [4],
  "não sei cobrar": [5],
  "não tenho pacientes": [2, 6],
};

export default function PillarGuide() {
  const params = useParams<{ menteeId: string; pillarId: string }>();
  const [, navigate] = useLocation();
  const { user, loading: authLoading } = useAuth();

  const menteeId = Number(params.menteeId);
  const pillarId = Number(params.pillarId);
  const pilar = PILARES.find((p) => p.id === pillarId);

  const [respostas, setRespostas] = useState<Record<string, string>>({});
  const [angustiasSelecionadas, setAngustiasSelecionadas] = useState<string[]>([]);
  const [tecnicasSelecionadas, setTecnicasSelecionadas] = useState<Record<string, string>>({});
  const [analise, setAnalise] = useState("");
  const [expandedBloco, setExpandedBloco] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Carregar dados existentes
  const { data: diagnosticData } = trpc.mentor.getPillarDiagnostic.useQuery(
    { menteeId, pillarId },
    { enabled: !!menteeId && !!pillarId }
  );

  useEffect(() => {
    if (diagnosticData) {
      if (diagnosticData.respostasJson) setRespostas(diagnosticData.respostasJson as Record<string, string>);
      if (diagnosticData.angustiasJson) setAngustiasSelecionadas(diagnosticData.angustiasJson as string[]);
      if (diagnosticData.tecnicasJson) setTecnicasSelecionadas(diagnosticData.tecnicasJson as Record<string, string>);
      if (diagnosticData.analiseEstrategica) setAnalise(diagnosticData.analiseEstrategica);
    }
  }, [diagnosticData]);

  const saveDiagnostic = trpc.mentor.savePillarDiagnostic.useMutation({
    onSuccess: () => {
      setSaved(true);
      toast.success("Diagnóstico salvo com sucesso!");
      setTimeout(() => setSaved(false), 3000);
    },
    onError: () => toast.error("Erro ao salvar diagnóstico"),
  });

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

  if (!pilar) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Pilar não encontrado.</p>
        <Button variant="outline" onClick={() => navigate(`/mentor/mentorado/${menteeId}`)} className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
        </Button>
      </div>
    );
  }

  const PilarIcon = pilar.icon;

  const handleSave = () => {
    saveDiagnostic.mutate({
      menteeId,
      pillarId,
      respostasJson: respostas,
      angustiasJson: angustiasSelecionadas,
      tecnicasJson: tecnicasSelecionadas,
      analiseEstrategica: analise,
    });
  };

  const toggleAngustia = (texto: string) => {
    setAngustiasSelecionadas((prev) =>
      prev.includes(texto) ? prev.filter((a) => a !== texto) : [...prev, texto]
    );
  };

  const totalPerguntas = pilar.perguntas.reduce((acc, b) => acc + b.perguntas.length, 0);
  const respondidas = Object.values(respostas).filter((r) => r.trim().length > 0).length;
  const progresso = Math.round((respondidas / totalPerguntas) * 100);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div
        className="px-6 py-5 border-b"
        style={{ background: `linear-gradient(135deg, ${pilar.cor}15, ${pilar.cor}05)`, borderColor: `${pilar.cor}30` }}
      >
        <div className="max-w-4xl mx-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/mentor/mentorado/${menteeId}`)}
            className="mb-3 -ml-2"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Voltar ao mentorado
          </Button>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: pilar.cor }}>
                <PilarIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" style={{ borderColor: pilar.cor, color: pilar.cor }}>
                    Pilar {pilar.id}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{pilar.semanas} semanas · {pilar.sessoes} sessões · {pilar.horas}h</span>
                </div>
                <h1 className="text-2xl font-bold" style={{ color: pilar.cor }}>{pilar.nome}</h1>
                <p className="text-sm text-muted-foreground mt-0.5">{pilar.resumo}</p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-2xl font-bold" style={{ color: pilar.cor }}>{progresso}%</div>
              <div className="text-xs text-muted-foreground">{respondidas}/{totalPerguntas} perguntas</div>
            </div>
          </div>

          {/* Barra de progresso */}
          <div className="mt-4 h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${progresso}%`, background: pilar.cor }}
            />
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="max-w-4xl mx-auto px-6 py-6">
        <Tabs defaultValue="roteiro">
          <TabsList className="mb-6">
            <TabsTrigger value="roteiro">
              <ClipboardList className="w-4 h-4 mr-2" />
              Roteiro de Investigação
            </TabsTrigger>
            <TabsTrigger value="angustias">
              <AlertTriangle className="w-4 h-4 mr-2" />
              Angústias & Técnicas
            </TabsTrigger>
            <TabsTrigger value="analise">
              <TrendingUp className="w-4 h-4 mr-2" />
              Análise Estratégica
            </TabsTrigger>
            <TabsTrigger value="checklist">
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Checklist do Pilar
            </TabsTrigger>
          </TabsList>

          {/* ABA: ROTEIRO DE INVESTIGAÇÃO */}
          <TabsContent value="roteiro" className="space-y-4">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 mb-4">
              <Lightbulb className="w-4 h-4 shrink-0" style={{ color: pilar.cor }} />
              <p className="text-sm text-muted-foreground">
                Faça as perguntas ao mentorado e registre as respostas. As respostas ficam salvas e alimentam a análise estratégica.
              </p>
            </div>

            {pilar.perguntas.map((bloco) => (
              <Card key={bloco.bloco} className="overflow-hidden">
                <button
                  className="w-full text-left"
                  onClick={() => setExpandedBloco(expandedBloco === bloco.bloco ? null : bloco.bloco)}
                >
                  <CardHeader className="py-4 px-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ background: pilar.cor }} />
                        <CardTitle className="text-base">{bloco.bloco}</CardTitle>
                        <Badge variant="secondary" className="text-xs">
                          {bloco.perguntas.filter((p) => respostas[`${bloco.bloco}::${p}`]?.trim()).length}/{bloco.perguntas.length}
                        </Badge>
                      </div>
                      {expandedBloco === bloco.bloco ? (
                        <ChevronUp className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                  </CardHeader>
                </button>

                {expandedBloco === bloco.bloco && (
                  <CardContent className="pt-0 pb-5 px-5 space-y-4">
                    {bloco.perguntas.map((pergunta, idx) => {
                      const key = `${bloco.bloco}::${pergunta}`;
                      return (
                        <div key={idx} className="space-y-1.5">
                          <label className="text-sm font-medium flex items-start gap-2">
                            <span
                              className="inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold shrink-0 mt-0.5 text-white"
                              style={{ background: pilar.cor }}
                            >
                              {idx + 1}
                            </span>
                            {pergunta}
                          </label>
                          <Textarea
                            placeholder="Registre a resposta do mentorado..."
                            value={respostas[key] || ""}
                            onChange={(e) => setRespostas((prev) => ({ ...prev, [key]: e.target.value }))}
                            className="min-h-[80px] text-sm resize-none"
                            style={{ borderColor: respostas[key]?.trim() ? `${pilar.cor}60` : undefined }}
                          />
                        </div>
                      );
                    })}
                  </CardContent>
                )}
              </Card>
            ))}
          </TabsContent>

          {/* ABA: ANGÚSTIAS & TÉCNICAS */}
          <TabsContent value="angustias" className="space-y-4">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 mb-4">
              <Brain className="w-4 h-4 shrink-0" style={{ color: pilar.cor }} />
              <p className="text-sm text-muted-foreground">
                Selecione as angústias que o mentorado expressou. O sistema mostra a técnica recomendada para cada uma.
              </p>
            </div>

            {pilar.angustias.map((angustia, idx) => {
              const selected = angustiasSelecionadas.includes(angustia.texto);
              return (
                <Card
                  key={idx}
                  className="cursor-pointer transition-all"
                  style={{
                    borderColor: selected ? pilar.cor : undefined,
                    background: selected ? `${pilar.cor}08` : undefined,
                  }}
                  onClick={() => toggleAngustia(angustia.texto)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div
                        className="w-5 h-5 rounded border-2 shrink-0 mt-0.5 flex items-center justify-center"
                        style={{
                          borderColor: selected ? pilar.cor : "#d1d5db",
                          background: selected ? pilar.cor : "transparent",
                        }}
                      >
                        {selected && <CheckCircle2 className="w-3 h-3 text-white" />}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm mb-2">"{angustia.texto}"</p>
                        {selected && (
                          <div
                            className="p-3 rounded-lg text-sm"
                            style={{ background: `${pilar.cor}15`, borderLeft: `3px solid ${pilar.cor}` }}
                          >
                            <div className="flex items-center gap-1.5 mb-1">
                              <Lightbulb className="w-3.5 h-3.5" style={{ color: pilar.cor }} />
                              <span className="font-semibold text-xs uppercase tracking-wide" style={{ color: pilar.cor }}>
                                Técnica Recomendada
                              </span>
                            </div>
                            <p className="text-muted-foreground">{angustia.tecnica}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {angustiasSelecionadas.length > 0 && (
              <Card style={{ borderColor: `${pilar.cor}40`, background: `${pilar.cor}05` }}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Target className="w-4 h-4" style={{ color: pilar.cor }} />
                    <span className="font-semibold text-sm">Resumo das Angústias Identificadas</span>
                  </div>
                  <div className="space-y-1">
                    {angustiasSelecionadas.map((a, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: pilar.cor }} />
                        {a}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ABA: ANÁLISE ESTRATÉGICA */}
          <TabsContent value="analise" className="space-y-4">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 mb-4">
              <TrendingUp className="w-4 h-4 shrink-0" style={{ color: pilar.cor }} />
              <p className="text-sm text-muted-foreground">
                Registre sua análise estratégica para este pilar: diagnóstico, prioridades de ação e próximos passos.
              </p>
            </div>

            {/* Resumo das respostas */}
            {Object.keys(respostas).length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <ClipboardList className="w-4 h-4" style={{ color: pilar.cor }} />
                    Respostas Coletadas ({respondidas} de {totalPerguntas})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {pilar.perguntas.map((bloco) =>
                    bloco.perguntas
                      .filter((p) => respostas[`${bloco.bloco}::${p}`]?.trim())
                      .map((pergunta, idx) => (
                        <div key={idx} className="text-sm border-l-2 pl-3" style={{ borderColor: `${pilar.cor}60` }}>
                          <p className="font-medium text-muted-foreground text-xs mb-0.5">{pergunta}</p>
                          <p>{respostas[`${bloco.bloco}::${pergunta}`]}</p>
                        </div>
                      ))
                  )}
                </CardContent>
              </Card>
            )}

            {/* Angústias identificadas */}
            {angustiasSelecionadas.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" style={{ color: pilar.cor }} />
                    Angústias Identificadas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {angustiasSelecionadas.map((a, i) => (
                      <Badge key={i} variant="outline" style={{ borderColor: `${pilar.cor}60`, color: pilar.cor }}>
                        {a}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Análise do mentor */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Brain className="w-4 h-4" style={{ color: pilar.cor }} />
                  Sua Análise Estratégica
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder={`Registre aqui sua análise do Pilar ${pilar.id} para este mentorado:\n\n• Diagnóstico atual\n• Principais gaps identificados\n• Prioridades de ação (ordenadas)\n• Próximos passos concretos\n• Prazo estimado`}
                  value={analise}
                  onChange={(e) => setAnalise(e.target.value)}
                  className="min-h-[200px] text-sm"
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ABA: CHECKLIST DO PILAR */}
          <TabsContent value="checklist" className="space-y-3">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 mb-4">
              <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: pilar.cor }} />
              <p className="text-sm text-muted-foreground">
                Itens que devem ser concluídos neste pilar. Gerencie o status no painel principal do mentorado.
              </p>
            </div>

            {pilar.checklist.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 p-4 rounded-lg border bg-card"
              >
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                  style={{ background: pilar.cor }}
                >
                  {idx + 1}
                </div>
                <span className="text-sm">{item}</span>
              </div>
            ))}
          </TabsContent>
        </Tabs>

        {/* Botão Salvar */}
        <div className="mt-6 flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => navigate(`/mentor/mentorado/${menteeId}`)}
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
          </Button>
          <Button
            onClick={handleSave}
            disabled={saveDiagnostic.isPending}
            style={{ background: pilar.cor, color: "white" }}
          >
            <Save className="w-4 h-4 mr-2" />
            {saveDiagnostic.isPending ? "Salvando..." : saved ? "Salvo!" : "Salvar Diagnóstico"}
          </Button>
        </div>
      </div>
    </div>
  );
}
