import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  ArrowLeft, Megaphone, ChevronDown, ChevronUp,
  CheckCircle2, Lightbulb, MessageSquare, Target, DollarSign
} from "lucide-react";

// ============================================================
// DADOS — Pilar 7: Vendas e Conversão
// ============================================================
const OBJECOES = [
  {
    objecao: "Está caro",
    categoria: "Preço",
    respostas: [
      "Entendo sua preocupação com o investimento. Posso te perguntar: caro em relação a quê? Se for em relação ao que você vai ganhar, vamos fazer uma conta juntos.",
      "Quando você diz caro, você está comparando com o valor que vai gerar para você ou com o que tem no bolso agora?",
      "Você tem razão, não é um investimento pequeno. Mas me diz: quanto você está deixando de ganhar por mês por não ter esse problema resolvido?",
    ],
    tecnica: "Reversão de perspectiva — transformar custo em investimento com ROI mensurável",
    gatilho: "Ancoragem de valor: mostre o que o paciente/cliente ganha, não o que paga",
  },
  {
    objecao: "Preciso pensar",
    categoria: "Indecisão",
    respostas: [
      "Claro, é uma decisão importante. Me diz: o que especificamente você precisa pensar? Assim posso te ajudar com as informações que faltam.",
      "Totalmente compreensível. Só para eu entender melhor: o que está te impedindo de decidir agora? É o valor, o momento, ou alguma dúvida sobre o resultado?",
      "Quando você diz 'preciso pensar', normalmente é porque falta alguma informação. O que eu não expliquei bem que te deixou com dúvida?",
    ],
    tecnica: "Sondagem de objeção real — descobrir o que está por trás do 'preciso pensar'",
    gatilho: "Urgência legítima: o custo de não agir agora é maior que o custo de agir",
  },
  {
    objecao: "Não tenho tempo",
    categoria: "Prioridade",
    respostas: [
      "Entendo, você é muito ocupado. Mas me diz: se você continuar sem resolver isso, quanto tempo você vai perder nos próximos 6 meses?",
      "Exatamente por isso que você precisa disso agora. Médicos ocupados são os que mais precisam de um sistema que funcione sem eles.",
      "Vamos ser diretos: o problema que você tem hoje vai sumir sozinho ou vai continuar te consumindo tempo?",
    ],
    tecnica: "Reframe de tempo — mostrar que a falta de tempo é o sintoma, não a causa",
    gatilho: "Dor futura: o que acontece se você não resolver isso nos próximos 12 meses?",
  },
  {
    objecao: "Vou esperar o momento certo",
    categoria: "Procrastinação",
    respostas: [
      "Posso te perguntar: como vai ser o momento certo? O que precisa acontecer para você saber que chegou a hora?",
      "Entendo. Mas me diz: há quanto tempo você está esperando o momento certo? E o que mudou nesse período?",
      "O momento certo raramente chega. O que chega é a decisão de criar o momento certo.",
    ],
    tecnica: "Confronto gentil — questionar a lógica da espera sem atacar o paciente",
    gatilho: "Escassez real: sua agenda tem vagas limitadas, e o próximo slot pode demorar meses",
  },
  {
    objecao: "Já tentei outras coisas e não funcionou",
    categoria: "Ceticismo",
    respostas: [
      "Faz todo sentido você estar cético. O que você tentou antes? Quero entender o que não funcionou para garantir que isso seja diferente.",
      "Você tem razão em questionar. Vou ser honesto: se o que eu ofereço for mais do mesmo, não vai funcionar. Me conta o que você já fez.",
      "Isso é uma informação valiosa. O que não funcionou antes me ajuda a entender o que você realmente precisa agora.",
    ],
    tecnica: "Validação + diferenciação — reconhecer a experiência passada e mostrar o que é diferente",
    gatilho: "Prova social específica: cases de pessoas com o mesmo histórico que obtiveram resultado",
  },
  {
    objecao: "Não sei se vai funcionar para mim",
    categoria: "Insegurança",
    respostas: [
      "É uma dúvida legítima. Me diz: o que te faz achar que pode não funcionar no seu caso especificamente?",
      "Entendo. Vamos fazer o seguinte: me conta sua situação atual e eu te digo honestamente se consigo te ajudar ou não.",
      "Essa dúvida é saudável. Posso te mostrar casos parecidos com o seu? Assim você avalia com mais informação.",
    ],
    tecnica: "Diagnóstico aberto — criar segurança através da transparência e casos similares",
    gatilho: "Garantia de resultado ou devolução — reduzir o risco percebido da decisão",
  },
];

const SCRIPTS_CONSULTA = [
  {
    tempo: "Primeiros 5 minutos",
    objetivo: "Criar conexão e estabelecer autoridade",
    script: `"[Nome], obrigado por estar aqui. Antes de começarmos, quero entender melhor o que te trouxe até mim. Me conta: qual é o maior desafio que você está enfrentando na sua carreira médica hoje?"

[Escutar ativamente, sem interromper]

"Entendo. E há quanto tempo isso está te incomodando?"`,
    dica: "Não fale sobre você ainda. Deixe o paciente/cliente falar. Quem faz as perguntas controla a conversa.",
  },
  {
    tempo: "5 a 15 minutos",
    objetivo: "Aprofundar a dor e quantificar o impacto",
    script: `"Você mencionou [problema]. Me ajuda a entender melhor: qual é o impacto disso no seu dia a dia? E financeiramente, quanto você acredita que isso está te custando por mês?"

[Após a resposta]

"E se isso continuar assim por mais 12 meses, onde você vai estar?"`,
    dica: "Faça o paciente/cliente quantificar a dor. Números criam urgência real.",
  },
  {
    tempo: "15 a 25 minutos",
    objetivo: "Apresentar a solução e criar visão de futuro",
    script: `"Baseado no que você me contou, eu consigo te ajudar com [solução específica]. Vou te mostrar como funciona..."

[Apresentar metodologia de forma simples]

"Imagina daqui a 6 meses, com isso resolvido: como seria o seu dia a dia? O que mudaria?"`,
    dica: "Primeiro crie a visão do futuro desejado, depois apresente o caminho (sua solução).",
  },
  {
    tempo: "25 a 35 minutos",
    objetivo: "Apresentar o investimento e fechar",
    script: `"O investimento para trabalharmos juntos é [valor]. Isso inclui [benefícios principais].

Antes de te dar o valor, me diz: se eu conseguir te ajudar a [resultado principal], isso valeria o investimento para você?"

[Após confirmação positiva]

"Ótimo. O investimento é [valor]. Como você prefere: à vista ou parcelado?"`,
    dica: "Nunca apresente o preço sem antes ter confirmação de que o resultado vale o investimento.",
  },
];

const GATILHOS = [
  { nome: "Escassez", descricao: "Vagas limitadas, tempo limitado, oferta exclusiva", exemplo: "Tenho apenas 2 vagas abertas para novos mentorados este mês." },
  { nome: "Urgência", descricao: "Prazo real para agir, custo de esperar", exemplo: "Cada mês que passa sem resolver isso é X reais que ficam na mesa." },
  { nome: "Autoridade", descricao: "Credenciais, resultados, reconhecimento", exemplo: "Já ajudei mais de 50 médicos a aumentar seu faturamento em 40%." },
  { nome: "Prova Social", descricao: "Depoimentos, cases, resultados de outros", exemplo: "A Dra. Ana tinha o mesmo problema que você. Em 4 meses, ela dobrou o ticket médio." },
  { nome: "Reciprocidade", descricao: "Dar valor antes de pedir", exemplo: "Vou te dar um diagnóstico gratuito agora. Sem compromisso." },
  { nome: "Comprometimento", descricao: "Pequenos 'sins' que levam ao grande 'sim'", exemplo: "Você concorda que esse problema precisa ser resolvido? Ótimo. Então vamos falar sobre como." },
  { nome: "Afinidade", descricao: "Conexão pessoal, valores compartilhados", exemplo: "Eu também sou médico. Sei exatamente o que você está vivendo." },
];

export default function SalesTool() {
  const params = useParams<{ menteeId: string }>();
  const menteeId = Number(params.menteeId);
  const [, navigate] = useLocation();
  const { user, loading: authLoading } = useAuth();
  const [expandedObjecao, setExpandedObjecao] = useState<number | null>(null);
  const [expandedScript, setExpandedScript] = useState<number | null>(null);
  const [ticketMedio, setTicketMedio] = useState("");
  const [consultasMes, setConsultasMes] = useState("");
  const [taxaConversao, setTaxaConversao] = useState("");
  const [notasVendas, setNotasVendas] = useState("");

  const { data: menteeData } = trpc.mentor.getMentee.useQuery(
    { id: menteeId },
    { enabled: !!menteeId }
  );

  const ticket = Number(ticketMedio) || 0;
  const consultas = Number(consultasMes) || 0;
  const taxa = Number(taxaConversao) / 100 || 0;
  const faturamentoAtual = ticket * consultas;
  const faturamentoPotencial = taxa > 0 ? ticket * (consultas / taxa) : 0;
  const gapFaturamento = faturamentoPotencial - faturamentoAtual;

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
              <Megaphone className="w-5 h-5 text-[#C9A84C]" />
              Pilar 7 — Vendas e Conversão
            </h1>
            {menteeData && <p className="text-sm text-muted-foreground">{menteeData.nome} · {menteeData.especialidade}</p>}
          </div>
        </div>
      </div>

      <div className="container py-6">
        <Tabs defaultValue="calculadora">
          <TabsList className="mb-6">
            <TabsTrigger value="calculadora">Calculadora de Receita</TabsTrigger>
            <TabsTrigger value="objecoes">Treinador de Objeções</TabsTrigger>
            <TabsTrigger value="scripts">Scripts de Consulta</TabsTrigger>
            <TabsTrigger value="gatilhos">Gatilhos Mentais</TabsTrigger>
          </TabsList>

          {/* ABA 1: CALCULADORA */}
          <TabsContent value="calculadora">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="border-b">
                  <CardTitle className="text-base flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-[#C9A84C]" />
                    Calculadora de Potencial de Receita
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div>
                    <label className="text-sm font-medium text-foreground">Ticket médio atual (R$)</label>
                    <Input
                      type="number"
                      value={ticketMedio}
                      onChange={e => setTicketMedio(e.target.value)}
                      placeholder="Ex: 500"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground">Consultas/procedimentos por mês</label>
                    <Input
                      type="number"
                      value={consultasMes}
                      onChange={e => setConsultasMes(e.target.value)}
                      placeholder="Ex: 80"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground">Taxa de conversão atual (%)</label>
                    <Input
                      type="number"
                      value={taxaConversao}
                      onChange={e => setTaxaConversao(e.target.value)}
                      placeholder="Ex: 60"
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">% dos leads/indicações que viram pacientes pagantes</p>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-4">
                <Card className="border-l-4 border-l-blue-400">
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Faturamento atual/mês</p>
                    <p className="text-2xl font-bold text-foreground">
                      {faturamentoAtual > 0 ? `R$ ${faturamentoAtual.toLocaleString("pt-BR")}` : "—"}
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-l-4 border-l-green-400">
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Potencial com 100% de conversão</p>
                    <p className="text-2xl font-bold text-green-600">
                      {faturamentoPotencial > 0 ? `R$ ${faturamentoPotencial.toLocaleString("pt-BR")}` : "—"}
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-l-4 border-l-orange-400">
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Gap de receita mensal (oportunidade perdida)</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {gapFaturamento > 0 ? `R$ ${gapFaturamento.toLocaleString("pt-BR")}` : "—"}
                    </p>
                    {gapFaturamento > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        R$ {(gapFaturamento * 12).toLocaleString("pt-BR")}/ano deixando na mesa
                      </p>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <label className="text-sm font-medium text-foreground">Notas sobre vendas e conversão</label>
                    <Textarea
                      value={notasVendas}
                      onChange={e => setNotasVendas(e.target.value)}
                      placeholder="Principais bloqueios identificados, estratégias discutidas..."
                      className="mt-2 min-h-[100px]"
                    />
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* ABA 2: OBJEÇÕES */}
          <TabsContent value="objecoes">
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground mb-4">
                Clique em cada objeção para ver as respostas recomendadas, a técnica de PNL e o gatilho mental associado.
              </p>
              {OBJECOES.map((o, i) => (
                <Card key={i} className={`cursor-pointer transition-all ${expandedObjecao === i ? "border-[#1B3A5C]" : "hover:border-muted-foreground/30"}`}>
                  <div
                    className="flex items-center justify-between p-4"
                    onClick={() => setExpandedObjecao(expandedObjecao === i ? null : i)}
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-xs">{o.categoria}</Badge>
                      <span className="font-medium text-foreground">"{o.objecao}"</span>
                    </div>
                    {expandedObjecao === i ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </div>
                  {expandedObjecao === i && (
                    <CardContent className="pt-0 pb-4 px-4 border-t space-y-4">
                      <div>
                        <h4 className="text-sm font-semibold text-[#1B3A5C] mb-2 flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" />Respostas recomendadas
                        </h4>
                        <div className="space-y-2">
                          {o.respostas.map((r, ri) => (
                            <div key={ri} className="bg-muted/30 rounded p-3 text-sm text-foreground italic">
                              {r}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="bg-blue-50 rounded p-3">
                          <h5 className="text-xs font-semibold text-blue-700 mb-1 flex items-center gap-1">
                            <Lightbulb className="w-3 h-3" />Técnica
                          </h5>
                          <p className="text-xs text-blue-800">{o.tecnica}</p>
                        </div>
                        <div className="bg-amber-50 rounded p-3">
                          <h5 className="text-xs font-semibold text-amber-700 mb-1 flex items-center gap-1">
                            <Target className="w-3 h-3" />Gatilho mental
                          </h5>
                          <p className="text-xs text-amber-800">{o.gatilho}</p>
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* ABA 3: SCRIPTS */}
          <TabsContent value="scripts">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground mb-4">
                Roteiro estruturado para a consulta de vendas. Cada etapa tem objetivo claro e script sugerido.
              </p>
              {SCRIPTS_CONSULTA.map((s, i) => (
                <Card key={i} className={`cursor-pointer transition-all ${expandedScript === i ? "border-[#1B3A5C]" : "hover:border-muted-foreground/30"}`}>
                  <div
                    className="flex items-center justify-between p-4"
                    onClick={() => setExpandedScript(expandedScript === i ? null : i)}
                  >
                    <div className="flex items-center gap-3">
                      <Badge className="bg-[#1B3A5C] text-white text-xs">{s.tempo}</Badge>
                      <span className="font-medium text-foreground">{s.objetivo}</span>
                    </div>
                    {expandedScript === i ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                  {expandedScript === i && (
                    <CardContent className="pt-0 pb-4 px-4 border-t space-y-3">
                      <div className="bg-muted/30 rounded p-4">
                        <h4 className="text-xs font-semibold text-muted-foreground mb-2">SCRIPT SUGERIDO</h4>
                        <pre className="text-sm text-foreground whitespace-pre-wrap font-sans">{s.script}</pre>
                      </div>
                      <div className="bg-amber-50 rounded p-3 flex items-start gap-2">
                        <Lightbulb className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-amber-800">{s.dica}</p>
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* ABA 4: GATILHOS */}
          <TabsContent value="gatilhos">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {GATILHOS.map((g, i) => (
                <Card key={i} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#1B3A5C] text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                        {i + 1}
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{g.nome}</h3>
                        <p className="text-sm text-muted-foreground mt-1">{g.descricao}</p>
                        <div className="mt-3 bg-[#FFFBF0] border border-[#C9A84C]/30 rounded p-3">
                          <p className="text-xs font-semibold text-[#C9A84C] mb-1">EXEMPLO PRÁTICO</p>
                          <p className="text-sm text-foreground italic">"{g.exemplo}"</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
