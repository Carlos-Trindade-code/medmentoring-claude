/**
 * MenteePillarPage — Página do portal do mentorado para um pilar específico
 *
 * Acessada via /portal/pilar/:id
 * Mostra o questionário guiado do pilar e o feedback do mentor quando liberado.
 */
import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { MenteePillarQuestionnaire } from "@/components/MenteePillarQuestionnaire";
import { PILLAR_SECTIONS, PILLAR_TITLES, PILLAR_ICONS } from "@/lib/pillar-questions";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Lock } from "lucide-react";
import { Link } from "wouter";

export default function MenteePillarPage() {
  const { id } = useParams<{ id: string }>();
  const pillarId = parseInt(id ?? "1");

  const { data: mentee, isLoading } = trpc.portal.myData.useQuery();

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
        <p className="text-muted-foreground">Sessão expirada. <Link href="/acesso" className="text-primary underline">Fazer login</Link></p>
      </div>
    );
  }

  const sections = PILLAR_SECTIONS[pillarId];
  const title = PILLAR_TITLES[pillarId];
  const icon = PILLAR_ICONS[pillarId];

  if (!sections || !title) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Pilar não encontrado.</p>
      </div>
    );
  }

  // Pilar 1 sempre liberado. Demais pilares: liberados quando o mentor libera a conclusão do pilar anterior.
  // Para simplificar, todos os pilares ficam acessíveis (o mentor controla via feedback/liberação).
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
              Este pilar ainda não foi liberado pelo seu mentor. Conclua o Pilar anterior e aguarde a liberação.
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
            Responda as perguntas abaixo com calma e honestidade. Você pode salvar o progresso e continuar depois.
            Se tiver dúvida em alguma pergunta, clique no ícone <strong>?</strong> para ver uma orientação.
          </p>
        </div>

        {/* Questionário */}
        <MenteePillarQuestionnaire
          pillarId={pillarId}
          pillarTitle={title}
          sections={sections}
          onComplete={() => {
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          allowReview={true}
        />
      </div>
    </div>
  );
}
