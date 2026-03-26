/**
 * PillarPartsView — Exibe as partes de um pilar com seus respectivos componentes
 *
 * Quando a parte está liberada (isReleased = true), exibe a análise gerada pela IA
 * em vez do questionário. Quando não liberada, exibe o formulário normalmente
 * (com banner informativo se o mentorado já concluiu e está aguardando).
 */
import { useState, useMemo } from "react";
import { PILLAR_PARTS } from "../../../shared/pillar-parts";
import { PILLAR_SECTIONS } from "@/lib/pillar-questions";
import { MenteePillarQuestionnaire } from "@/components/MenteePillarQuestionnaire";
import { ExpenseTool } from "@/components/ExpenseTool";
import { IvmpQuestionnaire } from "@/components/IvmpQuestionnaire";
import { ScenarioSimulator } from "@/components/ScenarioSimulator";
import { trpc } from "@/lib/trpc";
import {
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Circle,
  FileText,
  Calculator,
  SlidersHorizontal,
  Wrench,
  Sparkles,
  Star,
  ChevronRight,
  Loader2,
  Clock,
} from "lucide-react";

// ============================================================
// MAPPING: secoes do questionario para cada parte de cada pilar
// ============================================================
const PART_SECTION_MAP: Record<number, Record<string, string[]>> = {
  1: {
    a: ["quem_sou", "valores"],
    b: ["ikigai", "valores_avancados"],
    c: ["missao_visao", "reflexao_identidade"],
  },
  2: {
    a: ["especialidade_atuacao", "publico_ideal"],
    b: ["diferencial"],
    c: ["proposta_valor"],
  },
  3: {
    a: ["estrutura_clinica", "custos_fixos", "custos_deslocamento", "faturamento_producao", "ociosidade_potencial", "reflexao_financeira"],
    // b, c, d are tool/simulator — no questionnaire sections
  },
  4: {
    a: ["equipe_gestao"],
    b: ["processos_atendimento"],
    c: ["reflexao_operacional"],
  },
  5: {
    a: ["precificacao_atual"],
    b: ["custos_variaveis"],
    c: ["reflexao_precificacao"],
  },
  6: {
    a: ["presenca_digital_atual"],
    b: ["comunicacao_tom_voz"],
    c: ["reflexao_marketing"],
  },
  7: {
    a: ["apresentacao_tratamento"],
    b: ["objecoes_comuns"],
    c: ["reflexao_conversao"],
  },
};

// ============================================================
// TIPOS
// ============================================================
interface PillarPartsViewProps {
  pillarId: number;
  menteeId: number;
  partReleases: Array<{
    pillarId: number;
    partId: string;
    partLabel: string;
    released: boolean;
  }>;
  onComplete?: () => void;
}

// ============================================================
// ICONE POR TIPO DE PARTE
// ============================================================
function PartIcon({ type }: { type: string }) {
  switch (type) {
    case "questionnaire":
      return <FileText className="w-4 h-4" />;
    case "tool":
      return <Wrench className="w-4 h-4" />;
    case "simulator":
      return <SlidersHorizontal className="w-4 h-4" />;
    default:
      return <Circle className="w-4 h-4" />;
  }
}

// ============================================================
// ANÁLISE LIBERADA — exibe o conteúdo gerado pela IA
// ============================================================
function ReleasedPartContent({ pillarId, partId }: { pillarId: number; partId: string }) {
  const { data: releasedParts, isLoading } = trpc.pillarPartContent.getMyReleased.useQuery({ pillarId });
  const part = releasedParts?.find((p: any) => p.partId === partId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Carregando análise...</span>
      </div>
    );
  }

  if (!part) {
    return (
      <div className="py-8 text-center space-y-2">
        <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
          <Clock className="w-5 h-5 text-amber-500" />
        </div>
        <p className="text-sm text-muted-foreground">
          Análise em preparação. Seu mentor está finalizando o conteúdo desta parte.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header da análise */}
      <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
        <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center shrink-0">
          <Sparkles className="w-4 h-4 text-emerald-600" />
        </div>
        <div>
          <h4 className="font-bold text-emerald-800 text-sm">
            {part.titulo || "Análise do Mentor"}
          </h4>
          <p className="text-xs text-emerald-600 mt-0.5">
            Análise personalizada liberada pelo seu mentor
          </p>
        </div>
      </div>

      {/* Conteúdo principal */}
      {part.conteudo && (
        <div className="prose prose-sm max-w-none">
          <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
            {part.conteudo}
          </p>
        </div>
      )}

      {/* Destaques */}
      {Array.isArray(part.destaques) && part.destaques.length > 0 && (
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 space-y-2">
          <h5 className="text-xs font-semibold text-blue-700 uppercase tracking-wide flex items-center gap-1.5">
            <Star className="w-3.5 h-3.5" /> Destaques
          </h5>
          <ul className="space-y-1">
            {(part.destaques as string[]).map((d: string, i: number) => (
              <li key={i} className="flex items-start gap-2 text-sm text-blue-800">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 mt-0.5 shrink-0" />
                {d}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Próximos passos */}
      {Array.isArray(part.proximosPassos) && part.proximosPassos.length > 0 && (
        <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 space-y-2">
          <h5 className="text-xs font-semibold text-amber-700 uppercase tracking-wide flex items-center gap-1.5">
            <ChevronRight className="w-3.5 h-3.5" /> Próximos Passos
          </h5>
          <ul className="space-y-1">
            {(part.proximosPassos as string[]).map((p: string, i: number) => (
              <li key={i} className="flex items-start gap-2 text-sm text-amber-800">
                <span className="w-4 h-4 bg-amber-200 rounded-full flex items-center justify-center text-xs font-bold text-amber-700 shrink-0 mt-0.5">
                  {i + 1}
                </span>
                {p}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Guia de uso */}
      {part.guiaUso && (
        <div className="border border-dashed border-muted-foreground/30 rounded-lg p-3">
          <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
            Como aplicar
          </h5>
          <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
            {part.guiaUso}
          </p>
        </div>
      )}
    </div>
  );
}

// ============================================================
// ANÁLISE LIBERADA COM FALLBACK — mostra análise E ferramenta/questionário
// ============================================================
function ReleasedPartContentWithFallback({
  pillarId,
  partId,
  part,
  partSections,
  onComplete,
  questionnaireDefaults,
}: {
  pillarId: number;
  partId: string;
  part: { id: string; label: string; type: string; description: string };
  partSections: Array<{ id: string; titulo: string; perguntas: any[] }>;
  onComplete?: () => void;
  questionnaireDefaults?: Record<string, number>;
}) {
  const { data: releasedParts, isLoading } = trpc.pillarPartContent.getMyReleased.useQuery({ pillarId });
  const [showTool, setShowTool] = useState(false);
  const analysis = releasedParts?.find((p: any) => p.partId === partId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Carregando...</span>
      </div>
    );
  }

  const isToolPart = part.type === "tool" || part.type === "simulator";
  const isQuestionnairePart = part.type === "questionnaire";

  return (
    <div className="space-y-4">
      {/* Se há análise liberada, mostra ela */}
      {analysis?.conteudo ? (
        <ReleasedPartContent pillarId={pillarId} partId={partId} />
      ) : (
        <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
          <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
          <div className="flex-1">
            <p className="text-xs font-semibold text-blue-800">Análise em preparação</p>
            <p className="text-xs text-blue-700">Seu mentor está finalizando a análise desta parte.</p>
          </div>
        </div>
      )}

      {/* Botão para mostrar/ocultar a ferramenta ou questionário */}
      <div className="border-t pt-3">
        <button
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => setShowTool((v) => !v)}
        >
          {showTool ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          {isToolPart
            ? showTool ? "Ocultar ferramenta" : "Abrir ferramenta para preencher/atualizar"
            : showTool ? "Ocultar questionário" : "Revisar ou atualizar respostas"}
        </button>

        {showTool && (
          <div className="mt-3">
            {/* Questionnaire */}
            {isQuestionnairePart && partSections.length > 0 && (
              <MenteePillarQuestionnaire
                pillarId={pillarId}
                pillarTitle={part.label}
                sections={partSections}
                onComplete={onComplete}
                allowReview={true}
              />
            )}

            {isQuestionnairePart && partSections.length === 0 && (
              <div className="py-6 text-center text-muted-foreground">
                <FileText className="w-6 h-6 mx-auto mb-2 opacity-40" />
                <p className="text-sm">Questionário em preparação.</p>
              </div>
            )}

            {/* Tool: Despesas Fixas */}
            {isToolPart && pillarId === 3 && part.id === "b" && (
              <ExpenseTool pillarId={pillarId} onComplete={onComplete} questionnaireDefaults={questionnaireDefaults} />
            )}

            {/* Tool: iVMP */}
            {isToolPart && pillarId === 3 && part.id === "c" && (
              <IvmpQuestionnaire onComplete={onComplete} />
            )}

            {/* Simulator: Cenários */}
            {isToolPart && pillarId === 3 && part.id === "d" && (
              <ScenarioSimulator menteeId={0} mode="mentee" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
export function PillarPartsView({
  pillarId,
  menteeId,
  partReleases,
  onComplete,
}: PillarPartsViewProps) {
  const parts = PILLAR_PARTS[pillarId] ?? [];
  const [expandedPart, setExpandedPart] = useState<string | null>(null);
  // Busca respostas salvas para saber se o mentorado já concluiu as seções de cada parte
  const { data: savedAnswers } = trpc.pillarAnswers.getByPillar.useQuery({ pillarId });
  const completedSectionIds = new Set<string>(
    (savedAnswers ?? []).filter((r: any) => r.status === "concluida").map((r: any) => r.secao)
  );

  // Mapeamento: pergunta do questionário Pilar 3 → chave de despesa no ExpenseTool
  const QUESTIONNAIRE_TO_EXPENSE_MAP: Record<string, string> = {
    'p3_aluguel_valor': 'espaco.aluguel',
    'p3_custo_pessoal': 'pessoal.salarios',
    'p3_custo_energia': 'espaco.energia',
    'p3_custo_agua': 'espaco.agua',
    'p3_custo_internet': 'espaco.internet',
    'p3_custo_limpeza': 'espaco.limpeza',
    'p3_custo_software': 'administrativo.software_gestao',
    'p3_custo_marketing': 'marketing.trafego_pago',
    'p3_custo_seguros': 'seguros_taxas.seguro_profissional',
    'p3_custo_associacoes': 'seguros_taxas.crm',
    'p3_custo_gasolina': 'deslocamento.combustivel',
    'p3_custo_pedagio': 'deslocamento.pedagio',
    'p3_custo_estacionamento': 'deslocamento.estacionamento',
    'p3_custo_manutencao_carro': 'deslocamento.manutencao_veiculo',
    'p3_custo_contador': 'administrativo.contabilidade',
    'p3_custo_materiais': 'administrativo.material_escritorio',
  };

  // Extrai valores numéricos das respostas do questionário para pré-preencher o ExpenseTool
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const questionnaireDefaults = useMemo(() => {
    if (pillarId !== 3 || !savedAnswers || savedAnswers.length === 0) return undefined;
    const defaults: Record<string, number> = {};
    for (const row of savedAnswers as any[]) {
      if (!row.respostas || !Array.isArray(row.respostas)) continue;
      for (const answer of row.respostas) {
        const expenseKey = QUESTIONNAIRE_TO_EXPENSE_MAP[answer.id];
        if (expenseKey && answer.resposta != null && !answer.naoSabe) {
          const num = Number(answer.resposta);
          if (!isNaN(num) && num > 0) {
            defaults[expenseKey] = num;
          }
        }
      }
    }
    return Object.keys(defaults).length > 0 ? defaults : undefined;
  }, [savedAnswers, pillarId]);

  if (parts.length === 0) return null;

  const allSections = PILLAR_SECTIONS[pillarId] ?? [];

  return (
    <div className="space-y-2">
      {parts.map((part) => {
        const isExpanded = expandedPart === part.id;
        // Usa == (loose) para lidar com pillarId como string ou number (MySQL/superjson)
        const release = partReleases.find(
          // eslint-disable-next-line eqeqeq
          (r) => r.pillarId == pillarId && r.partId === part.id
        );
        // Usa !! para garantir que 0/1 do MySQL seja tratado como booleano
        const isReleased = !!(release?.released);

        // Determine sections for this part (for questionnaire types)
        const sectionIds = PART_SECTION_MAP[pillarId]?.[part.id] ?? [];
        const partSections = allSections.filter((s) =>
          sectionIds.includes(s.id)
        );
        // Verifica se o mentorado já concluiu todas as seções desta parte
        // Para partes do tipo "tool" ou "simulator", não bloqueamos baseado em seções
        const partCompleted = sectionIds.length > 0
          ? sectionIds.every(id => completedSectionIds.has(id))
          : false; // tools/simulators nunca são marcados como "aguardando" automaticamente
        // Aguardando: mentorado concluiu questionnaire mas mentor ainda não liberou
        const isAwaitingRelease = partCompleted && !isReleased;

        return (
          <div
            key={part.id}
            className={`border rounded-lg overflow-hidden bg-card ${isReleased ? "border-emerald-200" : isAwaitingRelease ? "border-amber-200" : ""}`}
          >
            {/* Part header */}
            <button
              className="w-full flex items-center gap-3 p-3 hover:bg-muted/30 transition-colors text-left"
              onClick={() =>
                setExpandedPart(isExpanded ? null : part.id)
              }
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isReleased ? "bg-emerald-100" : isAwaitingRelease ? "bg-amber-100" : "bg-muted"}`}>
                {isReleased ? (
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                ) : isAwaitingRelease ? (
                  <Clock className="w-4 h-4 text-amber-600" />
                ) : (
                  <PartIcon type={part.type} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm text-foreground">
                    {part.id.toUpperCase()}. {part.label}
                  </span>
                  {isReleased && (
                    <span className="text-xs px-2 py-0.5 rounded-full border bg-emerald-100 text-emerald-700 border-emerald-200 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Análise disponível
                    </span>
                  )}
                  {!isReleased && isAwaitingRelease && (
                    <span className="text-xs px-2 py-0.5 rounded-full border bg-amber-100 text-amber-700 border-amber-200 font-medium flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Aguardando mentor
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {isReleased
                    ? "Análise personalizada do seu mentor disponível"
                    : isAwaitingRelease
                    ? "Suas respostas foram enviadas ao mentor"
                    : part.description}
                </p>
              </div>
              {isExpanded ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
              )}
            </button>

            {/* Part content */}
            {isExpanded && (
              <div className="border-t p-4">
                {/* Se liberada: mostra análise da IA (se disponível) */}
                {isReleased ? (
                  <ReleasedPartContentWithFallback pillarId={pillarId} partId={part.id} part={part} partSections={partSections} onComplete={onComplete} questionnaireDefaults={questionnaireDefaults} />
                ) : (
                  <>
                    {/* Banner informativo quando aguardando liberação */}
                    {isAwaitingRelease && (
                      <div className="flex items-center gap-3 mb-4 bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-amber-800">Respostas enviadas ao mentor</p>
                          <p className="text-xs text-amber-700">Seu mentor está preparando a análise. Você pode revisar ou complementar suas respostas abaixo.</p>
                        </div>
                      </div>
                    )}

                    {/* Render the appropriate component based on part type — ALWAYS accessible */}
                    {part.type === "questionnaire" && partSections.length > 0 && (
                      <MenteePillarQuestionnaire
                        pillarId={pillarId}
                        pillarTitle={part.label}
                        sections={partSections}
                        onComplete={onComplete}
                        allowReview={true}
                      />
                    )}

                    {part.type === "questionnaire" && partSections.length === 0 && (
                      <div className="py-6 text-center text-muted-foreground">
                        <FileText className="w-6 h-6 mx-auto mb-2 opacity-40" />
                        <p className="text-sm">
                          Questionário em preparação. Em breve disponível.
                        </p>
                      </div>
                    )}

                    {part.type === "tool" &&
                      pillarId === 3 &&
                      part.id === "b" && (
                        <ExpenseTool
                          pillarId={pillarId}
                          onComplete={onComplete}
                          questionnaireDefaults={questionnaireDefaults}
                        />
                      )}

                    {part.type === "tool" &&
                      pillarId === 3 &&
                      part.id === "c" && (
                        <IvmpQuestionnaire onComplete={onComplete} />
                      )}

                    {part.type === "tool" &&
                      pillarId === 5 &&
                      part.id === "b" && (
                        <div className="py-6 text-center text-muted-foreground">
                          <Calculator className="w-6 h-6 mx-auto mb-2 opacity-40" />
                          <p className="text-sm">
                            Ferramenta de Engenharia de Preços em preparação.
                          </p>
                        </div>
                      )}

                    {part.type === "simulator" &&
                      pillarId === 3 &&
                      part.id === "d" && (
                        <ScenarioSimulator
                          menteeId={menteeId}
                          mode="mentee"
                        />
                      )}
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
