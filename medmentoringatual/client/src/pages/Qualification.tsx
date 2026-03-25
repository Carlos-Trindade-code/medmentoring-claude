import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, ArrowLeft, ArrowRight, Star } from "lucide-react";

// ============================================================
// QUESTIONÁRIO DE QUALIFICAÇÃO — do repositório original
// ============================================================
const PERGUNTAS = [
  {
    id: 1,
    pergunta: "Qual é o seu tempo de formado?",
    opcoes: [
      { texto: "Menos de 2 anos", pontos: 1 },
      { texto: "2 a 5 anos", pontos: 2 },
      { texto: "5 a 10 anos", pontos: 3 },
      { texto: "Mais de 10 anos", pontos: 4 },
    ],
  },
  {
    id: 2,
    pergunta: "Como você descreveria sua situação financeira atual?",
    opcoes: [
      { texto: "Dificuldades sérias, não consigo pagar as contas", pontos: 4 },
      { texto: "Estável, mas sem crescimento ou sobra", pontos: 3 },
      { texto: "Boa, mas quero melhorar significativamente", pontos: 2 },
      { texto: "Excelente, busco otimizar e escalar", pontos: 1 },
    ],
  },
  {
    id: 3,
    pergunta: "Qual é o seu maior desafio hoje?",
    opcoes: [
      { texto: "Não sei quanto cobrar / cobro barato demais", pontos: 4 },
      { texto: "Tenho poucos pacientes / agenda vazia", pontos: 3 },
      { texto: "Trabalho muito e sobra pouco", pontos: 4 },
      { texto: "Quero expandir para novos serviços ou locais", pontos: 2 },
    ],
  },
  {
    id: 4,
    pergunta: "Você tem clareza sobre o seu posicionamento no mercado?",
    opcoes: [
      { texto: "Não, atendo qualquer paciente que aparecer", pontos: 4 },
      { texto: "Tenho um nicho, mas não sei comunicar bem", pontos: 3 },
      { texto: "Tenho nicho definido e me comunico razoavelmente", pontos: 2 },
      { texto: "Sou referência reconhecida no meu nicho", pontos: 1 },
    ],
  },
  {
    id: 5,
    pergunta: "Como está sua presença digital?",
    opcoes: [
      { texto: "Não tenho redes sociais profissionais", pontos: 4 },
      { texto: "Tenho perfis, mas não posto com regularidade", pontos: 3 },
      { texto: "Posto regularmente, mas sem estratégia", pontos: 2 },
      { texto: "Tenho estratégia de conteúdo definida", pontos: 1 },
    ],
  },
  {
    id: 6,
    pergunta: "Você tem processos definidos na sua clínica/consultório?",
    opcoes: [
      { texto: "Não, tudo depende de mim para funcionar", pontos: 4 },
      { texto: "Tenho alguns processos, mas nada documentado", pontos: 3 },
      { texto: "Tenho processos básicos documentados", pontos: 2 },
      { texto: "Tenho processos bem definidos e equipe treinada", pontos: 1 },
    ],
  },
  {
    id: 7,
    pergunta: "Qual é o seu nível de comprometimento com a mudança?",
    opcoes: [
      { texto: "Estou desesperado, preciso mudar urgentemente", pontos: 4 },
      { texto: "Estou motivado e disposto a investir tempo e dinheiro", pontos: 4 },
      { texto: "Quero mudar, mas tenho dificuldade de priorizar", pontos: 2 },
      { texto: "Estou apenas explorando possibilidades", pontos: 1 },
    ],
  },
  {
    id: 8,
    pergunta: "Você já investiu em mentoria, cursos ou consultoria antes?",
    opcoes: [
      { texto: "Nunca investi em desenvolvimento profissional", pontos: 2 },
      { texto: "Já fiz cursos, mas nunca mentoria individual", pontos: 3 },
      { texto: "Já tive mentoria e foi muito positivo", pontos: 4 },
      { texto: "Já tive mentoria e não obtive resultados", pontos: 2 },
    ],
  },
];

type Veredicto = {
  titulo: string;
  descricao: string;
  cor: string;
  badge: string;
  recomendacao: string;
  cta: string;
};

function calcVeredicto(total: number): Veredicto {
  if (total >= 26) return {
    titulo: "Candidato Ideal",
    descricao: "Você tem exatamente o perfil que buscamos. Há dor real, comprometimento genuíno e disposição para investir na transformação. A mentoria vai gerar impacto imediato e mensurável.",
    cor: "text-green-700",
    badge: "bg-green-100 text-green-800 border-green-200",
    recomendacao: "Agendar sessão de diagnóstico gratuita com prioridade máxima.",
    cta: "Quero agendar minha sessão de diagnóstico",
  };
  if (total >= 20) return {
    titulo: "Bom Candidato",
    descricao: "Você tem potencial claro para crescimento e está no momento certo para uma mentoria. Há espaço significativo para evolução e você demonstra comprometimento.",
    cor: "text-blue-700",
    badge: "bg-blue-100 text-blue-800 border-blue-200",
    recomendacao: "Agendar sessão de diagnóstico para mapear as prioridades.",
    cta: "Quero conhecer melhor a mentoria",
  };
  if (total >= 14) return {
    titulo: "Em Desenvolvimento",
    descricao: "Você está em um momento de transição. A mentoria pode ajudar, mas o resultado dependerá muito do seu nível de comprometimento e disponibilidade.",
    cor: "text-yellow-700",
    badge: "bg-yellow-100 text-yellow-800 border-yellow-200",
    recomendacao: "Conversa inicial para alinhar expectativas e verificar fit.",
    cta: "Quero entender se a mentoria é para mim",
  };
  return {
    titulo: "Momento Inadequado",
    descricao: "Neste momento, você pode não estar pronto para extrair o máximo da mentoria. Recomendamos começar com recursos gratuitos e retornar quando o momento for mais propício.",
    cor: "text-gray-600",
    badge: "bg-gray-100 text-gray-700 border-gray-200",
    recomendacao: "Acompanhar conteúdo gratuito e retornar em 3-6 meses.",
    cta: "Quero acessar conteúdo gratuito",
  };
}

export default function Qualification() {
  const [, navigate] = useLocation();
  const [atual, setAtual] = useState(0);
  const [respostas, setRespostas] = useState<number[]>([]);
  const [concluido, setConcluido] = useState(false);

  const pergunta = PERGUNTAS[atual];
  const progresso = (atual / PERGUNTAS.length) * 100;
  const totalPontos = respostas.reduce((s, v) => s + v, 0);
  const veredicto = calcVeredicto(totalPontos);

  const responder = (pontos: number) => {
    const novas = [...respostas, pontos];
    setRespostas(novas);
    if (atual + 1 >= PERGUNTAS.length) {
      setConcluido(true);
    } else {
      setAtual(atual + 1);
    }
  };

  const reiniciar = () => {
    setAtual(0);
    setRespostas([]);
    setConcluido(false);
  };

  if (concluido) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1B3A5C] to-[#0d2440] flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full shadow-2xl">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-[#C9A84C]/10 flex items-center justify-center mx-auto mb-4">
              <Star className="w-8 h-8 text-[#C9A84C]" />
            </div>
            <Badge className={`${veredicto.badge} text-sm px-4 py-1 mb-4`}>{veredicto.titulo}</Badge>
            <h2 className={`text-2xl font-bold mb-3 ${veredicto.cor}`}>{veredicto.titulo}</h2>
            <p className="text-muted-foreground mb-6 leading-relaxed">{veredicto.descricao}</p>

            <div className="bg-muted/30 rounded-lg p-4 mb-6 text-left">
              <p className="text-sm font-semibold text-foreground mb-1">Recomendação:</p>
              <p className="text-sm text-muted-foreground">{veredicto.recomendacao}</p>
            </div>

            <div className="flex items-center justify-center gap-2 mb-6">
              <span className="text-sm text-muted-foreground">Pontuação:</span>
              <span className="font-bold text-foreground">{totalPontos} / {PERGUNTAS.length * 4}</span>
            </div>

            <div className="space-y-3">
              <Button className="w-full bg-[#C9A84C] hover:bg-[#b8943e] text-white font-semibold py-3">
                {veredicto.cta}
              </Button>
              <Button variant="outline" className="w-full" onClick={reiniciar}>
                Refazer o questionário
              </Button>
              <Button variant="ghost" className="w-full" onClick={() => navigate("/")}>
                Voltar ao início
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1B3A5C] to-[#0d2440] flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <p className="text-[#C9A84C] text-sm font-semibold uppercase tracking-widest mb-2">Questionário de Qualificação</p>
          <h1 className="text-2xl font-bold text-white">Descubra se a mentoria é para você</h1>
          <p className="text-white/60 text-sm mt-2">8 perguntas · 3 minutos</p>
        </div>

        {/* Progresso */}
        <div className="mb-6">
          <div className="flex justify-between text-xs text-white/60 mb-2">
            <span>Pergunta {atual + 1} de {PERGUNTAS.length}</span>
            <span>{Math.round(progresso)}% concluído</span>
          </div>
          <Progress value={progresso} className="h-2 bg-white/20" />
        </div>

        {/* Card da pergunta */}
        <Card className="shadow-2xl">
          <CardContent className="p-8">
            <div className="mb-6">
              <span className="text-xs font-semibold text-[#C9A84C] uppercase tracking-wider">
                Pergunta {atual + 1}
              </span>
              <h2 className="text-xl font-semibold text-foreground mt-2 leading-snug">
                {pergunta.pergunta}
              </h2>
            </div>

            <div className="space-y-3">
              {pergunta.opcoes.map((opcao, i) => (
                <button
                  key={i}
                  onClick={() => responder(opcao.pontos)}
                  className="w-full text-left p-4 rounded-lg border border-border hover:border-[#1B3A5C] hover:bg-[#1B3A5C]/5 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full border-2 border-muted-foreground/30 group-hover:border-[#1B3A5C] flex items-center justify-center flex-shrink-0 transition-colors">
                      <span className="text-xs font-bold text-muted-foreground group-hover:text-[#1B3A5C]">
                        {String.fromCharCode(65 + i)}
                      </span>
                    </div>
                    <span className="text-sm text-foreground">{opcao.texto}</span>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Navegação */}
        <div className="flex justify-between mt-4">
          <Button
            variant="ghost"
            className="text-white/60 hover:text-white hover:bg-white/10"
            onClick={() => {
              if (atual > 0) {
                setAtual(atual - 1);
                setRespostas(respostas.slice(0, -1));
              } else {
                navigate("/");
              }
            }}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {atual === 0 ? "Voltar ao início" : "Pergunta anterior"}
          </Button>
          <div className="flex gap-1">
            {PERGUNTAS.map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-all ${i < atual ? "bg-[#C9A84C]" : i === atual ? "bg-white" : "bg-white/20"}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
