/**
 * MenteePillarPage — Pagina do portal do mentorado para um pilar especifico
 *
 * Acessada via /portal/pilar/:id
 * Mostra as partes do pilar (A, B, C, D) com questionarios e ferramentas.
 */
import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { PillarPartsView } from "@/components/PillarPartsView";
import { PILLAR_TITLES, PILLAR_ICONS, PILLAR_SECTIONS } from "@/lib/pillar-questions";
import { NEW_TO_OLD_PILLAR } from "../../../shared/pillar-parts";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Lock } from "lucide-react";
import { Link } from "wouter";

export default function MenteePillarPage() {
  const { id } = useParams<{ id: string }>();
  const pillarId = parseInt(id ?? "1");
  const dbPillarId = NEW_TO_OLD_PILLAR[pillarId] ?? pillarId;

  const { data: mentee, isLoading } = trpc.portal.myData.useQuery();
  const { data: partReleases } = trpc.portal.getMyPartReleases.useQuery();
  const { data: conclusionData } = trpc.pillarAnswers.isConclusionReleased.useQuery({ pillarId: dbPillarId });
  const { data: savedAnswers } = trpc.pillarAnswers.getByPillar.useQuery({ pillarId: dbPillarId });

  const pillarSections = PILLAR_SECTIONS[dbPillarId] ?? [];
  const completedCount = new Set((savedAnswers ?? []).filter((r: any) => r.status === "concluida").map((r: any) => r.secao)).size;
  const totalCount = pillarSections.length;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!mentee) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Sessao expirada. <Link href="/acesso" className="text-primary underline">Fazer login</Link></p>
      </div>
    );
  }

  const title = PILLAR_TITLES[pillarId];
  const icon = PILLAR_ICONS[pillarId];

  if (!title) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Pilar nao encontrado.</p>
      </div>
    );
  }

  const isPillarUnlocked = true;

  if (!isPillarUnlocked) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <Link href="/portal">
            <Button variant="ghost" size="sm" className="mb-6 gap-2">
              <ChevronLeft className="w-4 h-4" /> Voltar ao portal
            </Button>
          </Link>
          <div className="text-center py-16 space-y-4">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
              <Lock className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-bold text-foreground">
              {icon} Pilar {pillarId} — {title}
            </h2>
            <p className="text-muted-foreground max-w-sm mx-auto">
              Este pilar ainda nao foi liberado pelo seu mentor. Conclua o Pilar anterior e aguarde a liberacao.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/portal">
            <Button variant="ghost" size="sm" className="mb-4 gap-2">
              <ChevronLeft className="w-4 h-4" /> Voltar ao portal
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-3xl">{icon}</span>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Pilar {pillarId}</p>
              <h1 className="text-2xl font-bold text-foreground">{title}</h1>
            </div>
          </div>
          <p className="text-muted-foreground text-sm mt-2">
            Responda as perguntas e preencha as ferramentas abaixo. Seus dados sao salvos automaticamente.
          </p>
        </div>

        {/* Celebração de pilar concluído */}
        {conclusionData?.released && (
          <div className="mb-6 bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-50 border border-amber-200 rounded-xl p-5 text-center">
            <div className="text-3xl mb-2">🏆</div>
            <h3 className="text-lg font-bold text-amber-800">Pilar Concluido!</h3>
            <p className="text-sm text-amber-700 mt-1">Parabens! Seu mentor analisou suas respostas e liberou o diagnostico deste pilar.</p>
            <p className="text-xs text-amber-500 mt-2">Veja a analise personalizada abaixo.</p>
          </div>
        )}

        {/* Mensagem pessoal do mentor */}
        {conclusionData?.mentorMessage && (
          <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                <span className="text-blue-700 font-bold text-sm">CT</span>
              </div>
              <div>
                <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Mensagem do seu Mentor</p>
                <p className="text-sm text-blue-900 mt-2 leading-relaxed whitespace-pre-line">{conclusionData.mentorMessage}</p>
                <p className="text-xs text-blue-500 mt-2">— {conclusionData.mentorName}</p>
              </div>
            </div>
          </div>
        )}

        {/* Incentivo quando falta pouco */}
        {progressPct >= 70 && progressPct < 100 && (
          <div className="mb-4 bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
            <div className="text-2xl">💪</div>
            <div>
              <p className="text-sm font-semibold text-blue-800">Falta pouco!</p>
              <p className="text-xs text-blue-600">{completedCount} de {totalCount} secoes concluidas. Complete as restantes e seu mentor vai analisar.</p>
            </div>
          </div>
        )}

        {/* Partes do pilar com questionarios e ferramentas */}
        <PillarPartsView
          pillarId={dbPillarId}
          menteeId={mentee.mentee.id}
          partReleases={(partReleases ?? []) as Array<{ pillarId: number; partId: string; partLabel: string; released: boolean }>}
          onComplete={() => {
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />
      </div>
    </div>
  );
}
