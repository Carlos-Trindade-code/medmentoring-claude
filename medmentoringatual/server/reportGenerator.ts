/**
 * reportGenerator.ts
 * Gera HTML premium para relatórios finais por pilar.
 * Cada pilar tem tema visual distinto (cores, ícone, imagem de fundo).
 * Inclui: análises por parte, diagnóstico personalizado, conclusões do mentor, checklist.
 */

// ============================================================
// TEMAS VISUAIS POR PILAR
// ============================================================
export const PILLAR_THEMES = {
  1: {
    name: "Identidade e Propósito",
    emoji: "🧭",
    primaryColor: "#1E3A5F",
    accentColor: "#C9A84C",
    lightBg: "#F0F4FA",
    gradient: "linear-gradient(135deg, #1E3A5F 0%, #2D5A8E 100%)",
    headerBg: "#1E3A5F",
    tagline: "Quem você é define onde você vai",
    icon: "compass",
  },
  2: {
    name: "Posicionamento",
    emoji: "🎯",
    primaryColor: "#2D4A22",
    accentColor: "#6DBE45",
    lightBg: "#F2F8EE",
    gradient: "linear-gradient(135deg, #2D4A22 0%, #4A7A35 100%)",
    headerBg: "#2D4A22",
    tagline: "Sua diferença é seu maior ativo",
    icon: "target",
  },
  3: {
    name: "Diagnóstico do Negócio",
    emoji: "📊",
    primaryColor: "#1A3A4A",
    accentColor: "#00B4D8",
    lightBg: "#EEF7FA",
    gradient: "linear-gradient(135deg, #1A3A4A 0%, #2A6080 100%)",
    headerBg: "#1A3A4A",
    tagline: "Números que revelam o caminho",
    icon: "chart",
  },
  4: {
    name: "Gestão e Processos",
    emoji: "⚙️",
    primaryColor: "#3A2A4A",
    accentColor: "#9B59B6",
    lightBg: "#F5F0FA",
    gradient: "linear-gradient(135deg, #3A2A4A 0%, #6A3A8A 100%)",
    headerBg: "#3A2A4A",
    tagline: "Sistemas que libertam, processos que escalam",
    icon: "gear",
  },
  5: {
    name: "Engenharia de Preços",
    emoji: "💰",
    primaryColor: "#2A3A1A",
    accentColor: "#27AE60",
    lightBg: "#EEF8F2",
    gradient: "linear-gradient(135deg, #2A3A1A 0%, #3A6A2A 100%)",
    headerBg: "#2A3A1A",
    tagline: "Precifique com estratégia, não com medo",
    icon: "money",
  },
  6: {
    name: "Marketing Digital",
    emoji: "📱",
    primaryColor: "#3A1A2A",
    accentColor: "#E91E8C",
    lightBg: "#FAF0F5",
    gradient: "linear-gradient(135deg, #3A1A2A 0%, #7A2A5A 100%)",
    headerBg: "#3A1A2A",
    tagline: "Sua presença digital é sua vitrine",
    icon: "phone",
  },
  7: {
    name: "Conversão e Vendas",
    emoji: "🤝",
    primaryColor: "#3A2A1A",
    accentColor: "#E67E22",
    lightBg: "#FAF4EE",
    gradient: "linear-gradient(135deg, #3A2A1A 0%, #7A4A1A 100%)",
    headerBg: "#3A2A1A",
    tagline: "Vender é servir com excelência",
    icon: "handshake",
  },
} as const;

// ============================================================
// TIPOS
// ============================================================
export interface PartAnalysis {
  partId: string;
  partLabel: string;
  titulo?: string;
  conteudo?: string;
  guiaUso?: string;
  destaques?: string[];
  proximosPassos?: string[];
}

export interface DiagnosisData {
  frase_chave?: string;
  resumo?: string;
  nivel_maturidade?: string;
  pontos_fortes?: string[];
  lacunas_criticas?: Array<{ lacuna: string; impacto: string; urgencia: string }>;
  recomendacoes?: Array<{ acao: string; prazo: string; resultado_esperado: string }>;
}

export interface ReportData {
  menteeName: string;
  menteeSpecialty?: string;
  pillarId: number;
  title: string;
  subtitle: string;
  executiveSummary: string;
  strengths: string[];
  attentionPoints: string[];
  actionPlan: Array<{
    action: string;
    deadline: string;
    expectedResult: string;
    priority: "alta" | "média" | "baixa";
  }>;
  conclusions: string;
  suggestions: Array<{ texto: string; concluida: boolean }>;
  generatedAt: Date;
  mentorName?: string;
  // Novos campos
  partAnalyses?: PartAnalysis[];
  diagnosisData?: DiagnosisData | null;
  mentorConclusions?: Record<string, unknown> | null;
  // Respostas do mentorado
  menteeAnswers?: Array<{
    secao: string;
    respostas: Array<{ id: string; pergunta: string; resposta: string | number | boolean | null; naoSabe?: boolean }>;
    status: string;
  }>;
  // Dados financeiros (Pilar 3)
  financialData?: {
    expenses?: Record<string, number>;
    mapaSala?: Record<string, unknown>;
    pricing?: unknown;
  } | null;
  // iVMP scores
  ivmpData?: {
    categories?: Record<string, number>;
    ivmpFinal?: number;
  } | null;
  // Feedback estruturado do mentor
  mentorFeedback?: {
    feedbackText?: string;
    pontosFortesJson?: unknown;
    pontosMelhoriaJson?: unknown;
    planoAcao?: string;
  } | null;
}

// ============================================================
// GERADOR DE HTML PREMIUM
// ============================================================
export function generatePillarReportHtml(data: ReportData): string {
  const theme = PILLAR_THEMES[data.pillarId as keyof typeof PILLAR_THEMES] ?? PILLAR_THEMES[1];
  const date = data.generatedAt.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const priorityColor = (p: string) => {
    if (p === "alta") return "#E74C3C";
    if (p === "média") return "#F39C12";
    return "#27AE60";
  };

  const urgencyColor = (u: string) => {
    if (u === "alta") return "#E74C3C";
    if (u === "media") return "#F39C12";
    return "#27AE60";
  };

  const prazoLabel = (p: string) => {
    if (p === "imediato") return "Imediato";
    if (p === "curto_prazo") return "Curto Prazo";
    if (p === "medio_prazo") return "Médio Prazo";
    return p;
  };

  const prazoColor = (p: string) => {
    if (p === "imediato") return "#E74C3C";
    if (p === "curto_prazo") return "#F39C12";
    return "#3498DB";
  };

  const maturidadeLabel = (m: string) => {
    if (m === "expert") return "Expert";
    if (m === "avançado") return "Avançado";
    if (m === "em_desenvolvimento") return "Em Desenvolvimento";
    return "Iniciante";
  };

  const maturidadeColor = (m: string) => {
    if (m === "expert") return "#27AE60";
    if (m === "avançado") return "#3498DB";
    if (m === "em_desenvolvimento") return "#F39C12";
    return "#E74C3C";
  };

  const strengthsHtml = data.strengths
    .map(
      (s) => `
      <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:12px;">
        <div style="width:24px;height:24px;border-radius:50%;background:${theme.accentColor};display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:2px;">
          <span style="color:white;font-size:12px;font-weight:bold;">✓</span>
        </div>
        <p style="margin:0;color:#2C3E50;font-size:15px;line-height:1.6;">${s}</p>
      </div>`
    )
    .join("");

  const attentionHtml = data.attentionPoints
    .map(
      (a) => `
      <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:12px;">
        <div style="width:24px;height:24px;border-radius:50%;background:#F39C12;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:2px;">
          <span style="color:white;font-size:12px;font-weight:bold;">!</span>
        </div>
        <p style="margin:0;color:#2C3E50;font-size:15px;line-height:1.6;">${a}</p>
      </div>`
    )
    .join("");

  const actionPlanHtml = data.actionPlan
    .map(
      (item, i) => `
      <div style="background:white;border-radius:12px;padding:20px;margin-bottom:16px;border-left:4px solid ${priorityColor(item.priority)};box-shadow:0 2px 8px rgba(0,0,0,0.06);">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
          <div style="width:32px;height:32px;border-radius:50%;background:${theme.primaryColor};display:flex;align-items:center;justify-content:center;flex-shrink:0;">
            <span style="color:white;font-size:14px;font-weight:bold;">${i + 1}</span>
          </div>
          <div style="flex:1;">
            <p style="margin:0;font-size:16px;font-weight:600;color:#1A1A2E;">${item.action}</p>
          </div>
          <span style="background:${priorityColor(item.priority)};color:white;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;text-transform:uppercase;">${item.priority}</span>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px;">
          <div style="background:#F8F9FA;border-radius:8px;padding:12px;">
            <p style="margin:0 0 4px;font-size:11px;color:#7F8C8D;text-transform:uppercase;font-weight:600;letter-spacing:0.5px;">⏱ Prazo</p>
            <p style="margin:0;font-size:14px;color:#2C3E50;font-weight:500;">${item.deadline}</p>
          </div>
          <div style="background:#F8F9FA;border-radius:8px;padding:12px;">
            <p style="margin:0 0 4px;font-size:11px;color:#7F8C8D;text-transform:uppercase;font-weight:600;letter-spacing:0.5px;">🎯 Resultado Esperado</p>
            <p style="margin:0;font-size:14px;color:#2C3E50;font-weight:500;">${item.expectedResult}</p>
          </div>
        </div>
      </div>`
    )
    .join("");

  const suggestionsHtml = data.suggestions.length > 0
    ? data.suggestions
        .map(
          (s) => `
        <div style="display:flex;align-items:flex-start;gap:10px;padding:10px 0;border-bottom:1px solid #F0F0F0;">
          <div style="width:20px;height:20px;border-radius:4px;border:2px solid ${s.concluida ? theme.accentColor : "#BDC3C7"};background:${s.concluida ? theme.accentColor : "transparent"};display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:2px;">
            ${s.concluida ? '<span style="color:white;font-size:10px;">✓</span>' : ""}
          </div>
          <p style="margin:0;font-size:14px;color:${s.concluida ? "#7F8C8D" : "#2C3E50"};text-decoration:${s.concluida ? "line-through" : "none"};line-height:1.5;">${s.texto}</p>
        </div>`
        )
        .join("")
    : '<p style="color:#7F8C8D;font-style:italic;font-size:14px;">Nenhuma sugestão registrada.</p>';

  // ── Diagnóstico Personalizado ──
  const diagHtml = data.diagnosisData ? (() => {
    const d = data.diagnosisData!;
    const pontosHtml = (d.pontos_fortes ?? []).map(p => `
      <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:8px;">
        <span style="color:${theme.accentColor};font-size:16px;line-height:1;">✓</span>
        <p style="margin:0;font-size:14px;color:#2C3E50;line-height:1.5;">${p}</p>
      </div>`).join("");

    const lacunasHtml = (d.lacunas_criticas ?? []).map(l => `
      <div style="border-left:3px solid ${urgencyColor(l.urgencia)};background:#FAFAFA;border-radius:0 8px 8px 0;padding:12px 16px;margin-bottom:10px;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
          <p style="margin:0;font-size:14px;font-weight:600;color:#1A1A2E;">${l.lacuna}</p>
          <span style="background:${urgencyColor(l.urgencia)};color:white;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700;text-transform:uppercase;">${l.urgencia}</span>
        </div>
        <p style="margin:0;font-size:13px;color:#7F8C8D;">${l.impacto}</p>
      </div>`).join("");

    const recsHtml = (d.recomendacoes ?? []).map((r, i) => `
      <div style="display:flex;gap:12px;margin-bottom:12px;">
        <div style="width:28px;height:28px;border-radius:50%;background:${theme.primaryColor};display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:2px;">
          <span style="color:white;font-size:12px;font-weight:bold;">${i + 1}</span>
        </div>
        <div style="flex:1;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
            <p style="margin:0;font-size:14px;font-weight:600;color:#1A1A2E;">${r.acao}</p>
            <span style="background:${prazoColor(r.prazo)};color:white;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700;">${prazoLabel(r.prazo)}</span>
          </div>
          <p style="margin:0;font-size:13px;color:#7F8C8D;">${r.resultado_esperado}</p>
        </div>
      </div>`).join("");

    return `
    <!-- ===== DIAGNÓSTICO PERSONALIZADO ===== -->
    <div class="page-break" style="background:white;padding:60px;max-width:900px;margin:0 auto;">
      <div style="display:flex;align-items:center;gap:16px;margin-bottom:32px;">
        <div style="width:4px;height:40px;background:${theme.accentColor};border-radius:2px;"></div>
        <div>
          <p style="font-size:12px;color:${theme.primaryColor};text-transform:uppercase;letter-spacing:1px;font-weight:600;">Análise Personalizada</p>
          <h2 style="font-family:'Playfair Display',serif;font-size:28px;color:${theme.primaryColor};">Diagnóstico Personalizado</h2>
        </div>
      </div>

      ${d.frase_chave ? `
      <div style="background:${theme.gradient};border-radius:16px;padding:28px 32px;margin-bottom:28px;text-align:center;">
        <p style="font-size:11px;color:rgba(255,255,255,0.7);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Frase-Chave do Momento</p>
        <p style="font-size:20px;color:white;font-style:italic;font-weight:600;font-family:'Playfair Display',serif;">"${d.frase_chave}"</p>
        ${d.nivel_maturidade ? `<div style="margin-top:12px;display:inline-block;background:${maturidadeColor(d.nivel_maturidade)};color:white;padding:4px 16px;border-radius:20px;font-size:12px;font-weight:700;">${maturidadeLabel(d.nivel_maturidade)}</div>` : ""}
      </div>` : ""}

      ${d.resumo ? `
      <div style="background:${theme.lightBg};border-radius:12px;padding:24px;border-left:4px solid ${theme.accentColor};margin-bottom:28px;">
        <p style="font-size:15px;line-height:1.8;color:#2C3E50;">${d.resumo}</p>
      </div>` : ""}

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:28px;">
        <div style="background:white;border-radius:12px;padding:24px;box-shadow:0 2px 12px rgba(0,0,0,0.06);">
          <p style="font-size:11px;color:#27AE60;text-transform:uppercase;letter-spacing:0.5px;font-weight:700;margin-bottom:16px;">⭐ Pontos Fortes</p>
          ${pontosHtml || '<p style="color:#7F8C8D;font-style:italic;font-size:13px;">Não identificado.</p>'}
        </div>
        <div style="background:white;border-radius:12px;padding:24px;box-shadow:0 2px 12px rgba(0,0,0,0.06);">
          <p style="font-size:11px;color:#E74C3C;text-transform:uppercase;letter-spacing:0.5px;font-weight:700;margin-bottom:16px;">⚠️ Lacunas Críticas</p>
          ${lacunasHtml || '<p style="color:#7F8C8D;font-style:italic;font-size:13px;">Nenhuma lacuna identificada.</p>'}
        </div>
      </div>

      ${recsHtml ? `
      <div style="background:#F8F9FA;border-radius:12px;padding:24px;">
        <p style="font-size:11px;color:${theme.primaryColor};text-transform:uppercase;letter-spacing:0.5px;font-weight:700;margin-bottom:16px;">🎯 Recomendações</p>
        ${recsHtml}
      </div>` : ""}
    </div>`;
  })() : "";

  // ── Análises por Parte ──
  const partAnalysesHtml = (data.partAnalyses ?? []).filter(p => p.conteudo || p.titulo).map((part, idx) => {
    const destaquesHtml = (part.destaques ?? []).map(d => `
      <div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:6px;">
        <span style="color:${theme.accentColor};font-size:14px;line-height:1.2;">◆</span>
        <p style="margin:0;font-size:13px;color:#2C3E50;">${d}</p>
      </div>`).join("");

    const passosHtml = (part.proximosPassos ?? []).map((p, i) => `
      <div style="display:flex;gap:10px;margin-bottom:8px;">
        <span style="width:20px;height:20px;border-radius:50%;background:${theme.primaryColor};color:white;font-size:10px;font-weight:bold;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:2px;">${i + 1}</span>
        <p style="margin:0;font-size:13px;color:#2C3E50;">${p}</p>
      </div>`).join("");

    return `
    <!-- ===== ANÁLISE PARTE ${part.partId.toUpperCase()} ===== -->
    <div style="background:${idx % 2 === 0 ? "white" : "#F8F9FA"};padding:60px;max-width:900px;margin:0 auto;${idx === 0 ? 'page-break-before:always;' : ''}">
      <div style="display:flex;align-items:center;gap:16px;margin-bottom:28px;">
        <div style="width:4px;height:40px;background:${theme.accentColor};border-radius:2px;"></div>
        <div>
          <p style="font-size:12px;color:${theme.primaryColor};text-transform:uppercase;letter-spacing:1px;font-weight:600;">Análise — Parte ${part.partId.toUpperCase()}</p>
          <h2 style="font-family:'Playfair Display',serif;font-size:24px;color:${theme.primaryColor};">${part.titulo || part.partLabel}</h2>
        </div>
      </div>

      ${part.conteudo ? `
      <div style="margin-bottom:24px;">
        <p style="font-size:15px;line-height:1.8;color:#2C3E50;white-space:pre-wrap;">${part.conteudo}</p>
      </div>` : ""}

      ${destaquesHtml ? `
      <div style="background:${theme.lightBg};border-radius:12px;padding:20px;margin-bottom:20px;">
        <p style="font-size:11px;color:${theme.primaryColor};text-transform:uppercase;letter-spacing:0.5px;font-weight:700;margin-bottom:12px;">✦ Destaques</p>
        ${destaquesHtml}
      </div>` : ""}

      ${passosHtml ? `
      <div style="background:white;border-radius:12px;padding:20px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
        <p style="font-size:11px;color:${theme.primaryColor};text-transform:uppercase;letter-spacing:0.5px;font-weight:700;margin-bottom:12px;">→ Próximos Passos</p>
        ${passosHtml}
      </div>` : ""}

      ${part.guiaUso ? `
      <div style="margin-top:16px;border:1px dashed #BDC3C7;border-radius:10px;padding:16px;">
        <p style="font-size:11px;color:#7F8C8D;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;margin-bottom:8px;">Como Aplicar</p>
        <p style="font-size:13px;color:#5D6D7E;line-height:1.6;">${part.guiaUso}</p>
      </div>` : ""}
    </div>`;
  }).join("");

  // ── Conclusões do Mentor (pillarConclusions) ──
  const mentorConclusionsHtml = data.mentorConclusions ? (() => {
    const entries = Object.entries(data.mentorConclusions).filter(([k]) => k !== "recomendacao_mentor");
    const recomendacao = data.mentorConclusions["recomendacao_mentor"] as string | undefined;

    const fieldsHtml = entries.map(([key, val]) => {
      const label = key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
      const value = Array.isArray(val) ? (val as string[]).join("\n") : String(val ?? "");
      if (!value.trim()) return "";
      return `
      <div style="margin-bottom:20px;">
        <p style="font-size:11px;color:${theme.primaryColor};text-transform:uppercase;letter-spacing:0.5px;font-weight:700;margin-bottom:8px;">${label}</p>
        <p style="font-size:14px;color:#2C3E50;line-height:1.7;white-space:pre-wrap;">${value}</p>
      </div>`;
    }).join("");

    return `
    <!-- ===== CONCLUSÕES DO MENTOR ===== -->
    <div class="page-break" style="background:white;padding:60px;max-width:900px;margin:0 auto;">
      <div style="display:flex;align-items:center;gap:16px;margin-bottom:32px;">
        <div style="width:4px;height:40px;background:${theme.accentColor};border-radius:2px;"></div>
        <div>
          <p style="font-size:12px;color:${theme.primaryColor};text-transform:uppercase;letter-spacing:1px;font-weight:600;">Análise do Mentor</p>
          <h2 style="font-family:'Playfair Display',serif;font-size:28px;color:${theme.primaryColor};">Conclusões do Pilar ${data.pillarId}</h2>
        </div>
      </div>
      <div style="background:${theme.lightBg};border-radius:16px;padding:32px;">
        ${fieldsHtml || '<p style="color:#7F8C8D;font-style:italic;">Conclusões em elaboração.</p>'}
      </div>
      ${recomendacao ? `
      <div style="margin-top:24px;background:#FFF8F0;border:1px solid #F39C12;border-radius:12px;padding:24px;">
        <p style="font-size:11px;color:#E67E22;text-transform:uppercase;letter-spacing:0.5px;font-weight:700;margin-bottom:8px;">📋 Recomendação Especial do Mentor</p>
        <p style="font-size:14px;color:#2C3E50;line-height:1.7;white-space:pre-wrap;">${recomendacao}</p>
      </div>` : ""}
    </div>`;
  })() : "";

  // ── Respostas do Mentorado ──
  const menteeAnswersHtml = (() => {
    const sections = (data.menteeAnswers ?? []).filter(s =>
      s.respostas && s.respostas.some(r => r.resposta != null && r.resposta !== "" && !r.naoSabe)
    );
    if (sections.length === 0) return "";

    const sectionsCards = sections.map(section => {
      const pairs = section.respostas
        .filter(r => r.resposta != null && r.resposta !== "" && !r.naoSabe)
        .map(r => `
          <div style="margin-bottom:14px;padding-bottom:14px;border-bottom:1px solid #F0F0F0;">
            <p style="margin:0 0 4px;font-size:12px;color:${theme.primaryColor};font-weight:600;text-transform:uppercase;letter-spacing:0.3px;">${r.pergunta}</p>
            <p style="margin:0;font-size:14px;color:#2C3E50;line-height:1.6;">${String(r.resposta)}</p>
          </div>`)
        .join("");
      return `
        <div style="background:white;border-radius:12px;padding:24px;margin-bottom:16px;box-shadow:0 2px 8px rgba(0,0,0,0.06);border-left:4px solid ${theme.accentColor};">
          <p style="font-size:13px;color:${theme.primaryColor};font-weight:700;margin-bottom:16px;text-transform:uppercase;letter-spacing:0.5px;">${section.secao}</p>
          ${pairs}
        </div>`;
    }).join("");

    return `
    <!-- ===== RESPOSTAS DO MENTORADO ===== -->
    <div class="page-break" style="margin-bottom:30px;">
      <div style="display:flex;align-items:center;gap:16px;margin-bottom:24px;">
        <div style="width:4px;height:40px;background:${theme.accentColor};border-radius:2px;"></div>
        <div>
          <p style="font-size:12px;color:${theme.primaryColor};text-transform:uppercase;letter-spacing:1px;font-weight:600;">Dados Coletados</p>
          <h2 style="font-family:'Playfair Display',serif;font-size:28px;color:${theme.primaryColor};">Respostas do Mentorado</h2>
        </div>
      </div>
      ${sectionsCards}
    </div>`;
  })();

  // ── Dados Financeiros ──
  const financialDataHtml = (() => {
    const expenses = data.financialData?.expenses;
    if (!expenses || Object.keys(expenses).length === 0) return "";

    const rows = Object.entries(expenses).map(([category, value]) => {
      const label = category.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
      return `
        <tr>
          <td style="padding:10px 16px;border-bottom:1px solid #F0F0F0;font-size:14px;color:#2C3E50;">${label}</td>
          <td style="padding:10px 16px;border-bottom:1px solid #F0F0F0;font-size:14px;color:#2C3E50;text-align:right;font-weight:500;">R$ ${Number(value).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        </tr>`;
    }).join("");

    const total = Object.values(expenses).reduce((sum, v) => sum + Number(v), 0);

    return `
    <!-- ===== DADOS FINANCEIROS ===== -->
    <div style="margin-bottom:30px;">
      <div style="display:flex;align-items:center;gap:16px;margin-bottom:24px;">
        <div style="width:4px;height:40px;background:${theme.accentColor};border-radius:2px;"></div>
        <div>
          <p style="font-size:12px;color:${theme.primaryColor};text-transform:uppercase;letter-spacing:1px;font-weight:600;">Panorama Financeiro</p>
          <h2 style="font-family:'Playfair Display',serif;font-size:28px;color:${theme.primaryColor};">Despesas e Custos</h2>
        </div>
      </div>
      <div style="background:white;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06);">
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="background:${theme.primaryColor};">
              <th style="padding:12px 16px;text-align:left;font-size:12px;color:white;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Categoria</th>
              <th style="padding:12px 16px;text-align:right;font-size:12px;color:white;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Valor</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
            <tr style="background:${theme.lightBg};">
              <td style="padding:12px 16px;font-size:15px;color:${theme.primaryColor};font-weight:700;">Total</td>
              <td style="padding:12px 16px;font-size:15px;color:${theme.primaryColor};font-weight:700;text-align:right;">R$ ${total.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>`;
  })();

  // ── iVMP Score ──
  const ivmpHtml = (() => {
    if (!data.ivmpData?.ivmpFinal) return "";
    const score = data.ivmpData.ivmpFinal;
    const scoreColor = score > 7 ? "#27AE60" : score >= 5 ? "#F39C12" : "#E74C3C";
    const scoreLabel = score > 7 ? "Excelente" : score >= 5 ? "Em Desenvolvimento" : "Atenção Necessária";

    const categoriesHtml = data.ivmpData.categories
      ? Object.entries(data.ivmpData.categories).map(([cat, val]) => {
          const catColor = Number(val) > 7 ? "#27AE60" : Number(val) >= 5 ? "#F39C12" : "#E74C3C";
          const label = cat.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
          return `
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;">
            <p style="margin:0;flex:1;font-size:14px;color:#2C3E50;">${label}</p>
            <div style="width:120px;height:8px;background:#ECEFF1;border-radius:4px;overflow:hidden;">
              <div style="width:${(Number(val) / 10) * 100}%;height:100%;background:${catColor};border-radius:4px;"></div>
            </div>
            <p style="margin:0;font-size:14px;font-weight:600;color:${catColor};min-width:32px;text-align:right;">${Number(val).toFixed(1)}</p>
          </div>`;
        }).join("")
      : "";

    return `
    <!-- ===== iVMP SCORE ===== -->
    <div style="margin-bottom:30px;">
      <div style="display:flex;align-items:center;gap:16px;margin-bottom:24px;">
        <div style="width:4px;height:40px;background:${theme.accentColor};border-radius:2px;"></div>
        <div>
          <p style="font-size:12px;color:${theme.primaryColor};text-transform:uppercase;letter-spacing:1px;font-weight:600;">Indicador de Maturidade</p>
          <h2 style="font-family:'Playfair Display',serif;font-size:28px;color:${theme.primaryColor};">iVMP — Valor da Prática Médica</h2>
        </div>
      </div>
      <div style="text-align:center;background:white;border-radius:16px;padding:40px;box-shadow:0 2px 12px rgba(0,0,0,0.06);margin-bottom:20px;">
        <div style="width:120px;height:120px;border-radius:50%;border:8px solid ${scoreColor};display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">
          <span style="font-size:40px;font-weight:700;color:${scoreColor};">${score.toFixed(1)}</span>
        </div>
        <p style="font-size:16px;font-weight:600;color:${scoreColor};margin-bottom:4px;">${scoreLabel}</p>
        <p style="font-size:13px;color:#7F8C8D;">Escala de 0 a 10</p>
      </div>
      ${categoriesHtml ? `
      <div style="background:white;border-radius:12px;padding:24px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
        <p style="font-size:11px;color:${theme.primaryColor};text-transform:uppercase;letter-spacing:0.5px;font-weight:700;margin-bottom:16px;">Detalhamento por Categoria</p>
        ${categoriesHtml}
      </div>` : ""}
    </div>`;
  })();

  // ── Feedback Estruturado do Mentor ──
  const mentorFeedbackHtml = (() => {
    const fb = data.mentorFeedback;
    if (!fb) return "";
    const hasSomething = fb.feedbackText || fb.planoAcao || fb.pontosFortesJson || fb.pontosMelhoriaJson;
    if (!hasSomething) return "";

    const parseItems = (raw: unknown): string[] => {
      if (!raw) return [];
      if (Array.isArray(raw)) {
        return raw.map(item => typeof item === "string" ? item : (item as Record<string, unknown>)?.texto ? String((item as Record<string, unknown>).texto) : JSON.stringify(item));
      }
      if (typeof raw === "string") {
        try { return parseItems(JSON.parse(raw)); } catch { return [raw]; }
      }
      return [];
    };

    const fortes = parseItems(fb.pontosFortesJson);
    const melhoria = parseItems(fb.pontosMelhoriaJson);

    const fortesHtml = fortes.length > 0 ? `
      <div style="background:#F0FFF4;border-radius:12px;padding:20px;margin-bottom:16px;border-left:4px solid #27AE60;">
        <p style="font-size:11px;color:#27AE60;text-transform:uppercase;letter-spacing:0.5px;font-weight:700;margin-bottom:12px;">Pontos Fortes Identificados</p>
        ${fortes.map(f => `
          <div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:6px;">
            <span style="color:#27AE60;font-size:14px;line-height:1.2;">✓</span>
            <p style="margin:0;font-size:14px;color:#2C3E50;line-height:1.5;">${f}</p>
          </div>`).join("")}
      </div>` : "";

    const melhoriaHtml = melhoria.length > 0 ? `
      <div style="background:#FFF8F0;border-radius:12px;padding:20px;margin-bottom:16px;border-left:4px solid #F39C12;">
        <p style="font-size:11px;color:#F39C12;text-transform:uppercase;letter-spacing:0.5px;font-weight:700;margin-bottom:12px;">Pontos de Melhoria</p>
        ${melhoria.map(m => `
          <div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:6px;">
            <span style="color:#F39C12;font-size:14px;line-height:1.2;">!</span>
            <p style="margin:0;font-size:14px;color:#2C3E50;line-height:1.5;">${m}</p>
          </div>`).join("")}
      </div>` : "";

    const planoHtml = fb.planoAcao ? `
      <div style="background:#F8F9FA;border-radius:12px;padding:20px;margin-bottom:16px;">
        <p style="font-size:11px;color:${theme.primaryColor};text-transform:uppercase;letter-spacing:0.5px;font-weight:700;margin-bottom:8px;">Plano de Ação do Mentor</p>
        <p style="font-size:14px;color:#2C3E50;line-height:1.7;white-space:pre-wrap;">${fb.planoAcao}</p>
      </div>` : "";

    const feedbackTextHtml = fb.feedbackText ? `
      <div style="background:${theme.lightBg};border-radius:12px;padding:20px;border-left:4px solid ${theme.accentColor};">
        <p style="font-size:11px;color:${theme.primaryColor};text-transform:uppercase;letter-spacing:0.5px;font-weight:700;margin-bottom:8px;">Feedback do Mentor</p>
        <p style="font-size:14px;color:#2C3E50;line-height:1.7;white-space:pre-wrap;">${fb.feedbackText}</p>
      </div>` : "";

    return `
    <!-- ===== FEEDBACK ESTRUTURADO DO MENTOR ===== -->
    <div style="margin-bottom:30px;">
      <div style="display:flex;align-items:center;gap:16px;margin-bottom:24px;">
        <div style="width:4px;height:40px;background:${theme.accentColor};border-radius:2px;"></div>
        <div>
          <p style="font-size:12px;color:${theme.primaryColor};text-transform:uppercase;letter-spacing:1px;font-weight:600;">Avaliação do Mentor</p>
          <h2 style="font-family:'Playfair Display',serif;font-size:28px;color:${theme.primaryColor};">Feedback Estruturado</h2>
        </div>
      </div>
      ${fortesHtml}
      ${melhoriaHtml}
      ${planoHtml}
      ${feedbackTextHtml}
    </div>`;
  })();

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${theme.name} — ${data.menteeName}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Playfair+Display:wght@700&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', sans-serif;
      color: #1a1a2e;
      padding: 40px;
      line-height: 1.6;
      max-width: 800px;
      margin: 0 auto;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 3px solid #1a1a2e;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      font-family: 'Playfair Display', serif;
      font-size: 28px;
      color: #1a1a2e;
      margin: 0;
    }
    .header .logo {
      font-size: 14px;
      color: #b8860b;
      font-weight: 600;
      letter-spacing: 2px;
    }
    .subtitle {
      color: #b8860b;
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 4px;
    }
    h2 {
      font-family: 'Playfair Display', serif;
      font-size: 20px;
      color: #1a1a2e;
      border-left: 4px solid #b8860b;
      padding-left: 12px;
      margin-top: 30px;
    }
    .highlight-box {
      background: #f8f6f0;
      border-radius: 8px;
      padding: 16px;
      margin: 12px 0;
    }
    .strength-item {
      padding: 8px 0;
      border-bottom: 1px solid #eee;
    }
    .action-item {
      background: #1a1a2e;
      color: white;
      padding: 12px 16px;
      border-radius: 6px;
      margin: 8px 0;
    }
    .action-item .priority {
      display: inline-block;
      background: #b8860b;
      color: white;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #eee;
      text-align: center;
      color: #999;
      font-size: 11px;
    }
    @media print {
      body { background: white; }
      .page-break { page-break-before: always; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>

<!-- ===== HEADER ITC MENTOR ===== -->
<div class="header">
  <div>
    <p class="subtitle">Pilar ${data.pillarId} de 7 — ${theme.name}</p>
    <h1>${data.title}</h1>
  </div>
  <div class="logo">ITC MENTOR</div>
</div>

<!-- ===== CAPA ===== -->
<div style="min-height:80vh;background:${theme.gradient};display:flex;flex-direction:column;justify-content:space-between;padding:60px;position:relative;overflow:hidden;border-radius:12px;margin-bottom:30px;">
  <!-- Decorative circles -->
  <div style="position:absolute;top:-100px;right:-100px;width:400px;height:400px;border-radius:50%;background:rgba(255,255,255,0.05);"></div>
  <div style="position:absolute;bottom:-150px;left:-80px;width:500px;height:500px;border-radius:50%;background:rgba(255,255,255,0.04);"></div>

  <!-- Header -->
  <div style="display:flex;justify-content:space-between;align-items:center;position:relative;z-index:1;">
    <div style="display:flex;align-items:center;gap:12px;">
      <div style="width:48px;height:48px;background:#b8860b;border-radius:12px;display:flex;align-items:center;justify-content:center;">
        <span style="font-size:24px;">${theme.emoji}</span>
      </div>
      <div>
        <p style="color:#b8860b;font-size:12px;text-transform:uppercase;letter-spacing:2px;font-weight:600;">ITC MENTOR</p>
        <p style="color:white;font-size:16px;font-weight:600;">MedMentoring</p>
      </div>
    </div>
    <div style="text-align:right;">
      <p style="color:rgba(255,255,255,0.6);font-size:12px;">Pilar ${data.pillarId} de 7</p>
      <p style="color:rgba(255,255,255,0.8);font-size:13px;">${date}</p>
    </div>
  </div>

  <!-- Main content -->
  <div style="position:relative;z-index:1;">
    <div style="display:inline-block;background:#b8860b;color:white;padding:6px 16px;border-radius:20px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;margin-bottom:24px;">
      Relatório Final — Pilar ${data.pillarId}
    </div>
    <h1 style="font-family:'Playfair Display',serif;font-size:52px;color:white;line-height:1.15;margin-bottom:16px;">${data.title}</h1>
    <p style="font-size:20px;color:rgba(255,255,255,0.8);font-style:italic;margin-bottom:40px;">${theme.tagline}</p>

    <!-- Mentee info -->
    <div style="background:rgba(255,255,255,0.12);backdrop-filter:blur(10px);border-radius:16px;padding:24px 32px;display:inline-block;border:1px solid rgba(255,255,255,0.2);">
      <p style="color:rgba(255,255,255,0.7);font-size:12px;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Preparado para</p>
      <p style="color:white;font-size:28px;font-weight:700;font-family:'Playfair Display',serif;">${data.menteeName}</p>
      ${data.menteeSpecialty ? `<p style="color:#b8860b;font-size:15px;margin-top:4px;">${data.menteeSpecialty}</p>` : ""}
    </div>
  </div>

  <!-- Footer -->
  <div style="display:flex;justify-content:space-between;align-items:center;position:relative;z-index:1;">
    <p style="color:rgba(255,255,255,0.5);font-size:12px;">Documento confidencial — uso exclusivo do mentorado</p>
    ${data.mentorName ? `<p style="color:rgba(255,255,255,0.6);font-size:13px;">Mentor: ${data.mentorName}</p>` : ""}
  </div>
</div>

<!-- ===== RESUMO EXECUTIVO ===== -->
<div class="page-break" style="margin-bottom:30px;">
  <h2>Resumo Executivo</h2>

  <div class="highlight-box" style="margin-top:16px;">
    <p style="font-size:15px;line-height:1.8;color:#1a1a2e;">${data.executiveSummary}</p>
  </div>

  ${data.subtitle ? `
  <div style="margin-top:16px;padding:16px;background:#fafafa;border-radius:8px;border:1px solid #eee;">
    <p class="subtitle">Foco deste Pilar</p>
    <p style="font-size:15px;color:#1a1a2e;font-weight:500;">${data.subtitle}</p>
  </div>` : ""}
</div>

<!-- ===== RESPOSTAS DO MENTORADO ===== -->
${menteeAnswersHtml}

<!-- ===== DADOS FINANCEIROS ===== -->
${financialDataHtml}

<!-- ===== iVMP SCORE ===== -->
${ivmpHtml}

<!-- ===== DIAGNÓSTICO PERSONALIZADO ===== -->
${diagHtml}

<!-- ===== ANÁLISES POR PARTE ===== -->
${partAnalysesHtml ? `
<div class="page-break" style="background:${theme.gradient};padding:40px 60px;max-width:900px;margin:0 auto;">
  <div style="display:flex;align-items:center;gap:16px;">
    <div style="width:4px;height:40px;background:${theme.accentColor};border-radius:2px;"></div>
    <div>
      <p style="font-size:12px;color:rgba(255,255,255,0.7);text-transform:uppercase;letter-spacing:1px;font-weight:600;">Análise Detalhada</p>
      <h2 style="font-family:'Playfair Display',serif;font-size:28px;color:white;">Análises por Parte</h2>
    </div>
  </div>
</div>
${partAnalysesHtml}` : ""}

<!-- ===== FEEDBACK ESTRUTURADO DO MENTOR ===== -->
${mentorFeedbackHtml}

<!-- ===== PONTOS FORTES ===== -->
<div style="margin-bottom:30px;">
  <h2>Pontos Fortes</h2>
  <div class="highlight-box" style="margin-top:16px;">
    ${data.strengths.length > 0
      ? data.strengths.map(s => `<div class="strength-item"><p style="margin:0;font-size:14px;color:#1a1a2e;">${s}</p></div>`).join("")
      : '<p style="color:#999;font-style:italic;font-size:14px;">Nenhum ponto forte registrado.</p>'}
  </div>
</div>

<!-- ===== PONTOS DE ATENÇÃO ===== -->
<div style="margin-bottom:30px;">
  <h2>Pontos de Atenção</h2>
  <div class="highlight-box" style="margin-top:16px;">
    ${data.attentionPoints.length > 0
      ? data.attentionPoints.map(a => `<div class="strength-item"><p style="margin:0;font-size:14px;color:#1a1a2e;">${a}</p></div>`).join("")
      : '<p style="color:#999;font-style:italic;font-size:14px;">Nenhum ponto de atenção registrado.</p>'}
  </div>
</div>

<!-- ===== PLANO DE AÇÃO ===== -->
<div class="page-break" style="margin-bottom:30px;">
  <h2>Plano de Ação</h2>

  <div style="margin-top:16px;">
    ${data.actionPlan.length > 0
      ? data.actionPlan.map((item, i) => `
        <div class="action-item">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
            <span style="font-size:14px;font-weight:700;">${i + 1}.</span>
            <span style="flex:1;font-size:14px;font-weight:600;">${item.action}</span>
            <span class="priority">${item.priority}</span>
          </div>
          <div style="display:flex;gap:20px;font-size:12px;color:rgba(255,255,255,0.7);">
            <span>Prazo: ${item.deadline}</span>
            <span>Resultado: ${item.expectedResult}</span>
          </div>
        </div>`).join("")
      : '<p style="color:#999;font-style:italic;">Nenhuma ação registrada.</p>'}
  </div>
</div>

<!-- ===== CONCLUSÕES DO MENTOR (pillarConclusions) ===== -->
${mentorConclusionsHtml}

<!-- ===== CONCLUSÕES ===== -->
<div style="margin-bottom:30px;">
  <h2>Conclusões</h2>
  <div class="highlight-box" style="margin-top:16px;">
    <p style="font-size:15px;line-height:1.8;color:#1a1a2e;">${data.conclusions || "Conclusões a serem adicionadas pelo mentor."}</p>
  </div>
</div>

<!-- ===== CHECKLIST DE SUGESTÕES ===== -->
<div style="margin-bottom:30px;">
  <h2>Checklist de Compromissos</h2>
  <div class="highlight-box" style="margin-top:16px;">
    ${suggestionsHtml}
  </div>
</div>

<!-- ===== ASSINATURA DO MENTOR ===== -->
<div style="margin-top:40px;padding-top:20px;border-top:3px solid #b8860b;">
  <div style="display:flex;align-items:flex-start;gap:32px;">
    <div style="flex:1;">
      <p style="font-size:11px;color:#999;text-transform:uppercase;letter-spacing:0.8px;font-weight:600;margin-bottom:8px;">Elaborado por</p>
      <p style="font-family:'Playfair Display',serif;font-size:22px;color:#1a1a2e;font-weight:700;margin-bottom:4px;">Dr. Carlos Trindade Castro</p>
      <p style="font-size:13px;color:#555;margin-bottom:2px;">CRM-MG 45568 &nbsp;|&nbsp; RQE 24768 / 39342</p>
      <div style="width:48px;height:2px;background:#b8860b;margin:12px 0;"></div>
      <p style="font-size:12px;color:#666;line-height:1.7;">
        Diretor Técnico do Instituto Trindade Castro<br>
        Coordenador da Especialização Clínica em Dor — Afya Educação Médica<br>
        Fellow of Interventional Pain Practice (FIPP) — World Institute of Pain<br>
        Coordenador de Medicina Intervencionista da Dor — Rede Mater Dei de Saúde<br>
        Membro da Sociedade Brasileira de Médicos Intervencionistas em Dor (SOBRAMID)
      </p>
    </div>
    <div style="text-align:right;min-width:160px;">
      <p style="font-size:11px;color:#999;margin-bottom:4px;">Belo Horizonte, ${date}</p>
      <p style="font-size:11px;color:#999;">Pilar ${data.pillarId} — ${theme.name}</p>
    </div>
  </div>
</div>
<!-- ===== RODAPÉ ===== -->
<div class="footer">
  <p>Relatório elaborado por ITC MedMentoring — Confidencial</p>
  <p style="margin-top:4px;">Documento gerado em ${date}</p>
</div>

</body>
</html>`;
}
