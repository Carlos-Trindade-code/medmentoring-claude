/**
 * pptxGenerator — Gera apresentação PPTX para treinamento de vendas/consulta
 * Pilar 6: Usa dados do protocolo de consulta + produtos para montar slides
 */
import PptxGenJS from "pptxgenjs";

interface Phase {
  id: number;
  nome: string;
  objetivo: string;
  duracaoMinutos: number;
  frasesChave: string;
  oQueNaoFazer: string;
}

interface Product {
  nome: string;
  paraQuem?: string;
  oQueInclui?: string;
  formato?: string;
  duracao?: string;
  precoSugerido?: string;
  logicaClinica?: string;
}

interface PptxData {
  mentorName: string;
  menteeName: string;
  specialty?: string;
  phases: Phase[];
  products: Product[];
}

export function generateConsultationPptx(data: PptxData): Promise<Buffer> {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = data.mentorName;
  pptx.title = `Protocolo de Consulta — ${data.menteeName}`;

  const BRAND_COLOR = "1a365d";
  const ACCENT = "0d9488";
  const LIGHT_BG = "f8fafc";

  // ===== Slide 1: Cover =====
  const cover = pptx.addSlide();
  cover.background = { color: BRAND_COLOR };
  cover.addText("Protocolo de Consulta", {
    x: 0.8, y: 1.5, w: 11, h: 1.2,
    fontSize: 36, color: "FFFFFF", fontFace: "Arial", bold: true,
  });
  cover.addText(data.menteeName + (data.specialty ? ` — ${data.specialty}` : ""), {
    x: 0.8, y: 2.8, w: 11, h: 0.6,
    fontSize: 20, color: "94a3b8", fontFace: "Arial",
  });
  cover.addText(`Mentoria Dr. ${data.mentorName}`, {
    x: 0.8, y: 3.6, w: 11, h: 0.5,
    fontSize: 14, color: "64748b", fontFace: "Arial",
  });

  const totalMin = data.phases.reduce((s, p) => s + p.duracaoMinutos, 0);
  cover.addText(`${data.phases.length} fases | ${totalMin} minutos`, {
    x: 0.8, y: 4.5, w: 11, h: 0.4,
    fontSize: 14, color: ACCENT, fontFace: "Arial",
  });

  // ===== Slide 2: Overview =====
  const overview = pptx.addSlide();
  overview.background = { color: LIGHT_BG };
  overview.addText("Visao Geral do Protocolo", {
    x: 0.8, y: 0.4, w: 11, h: 0.8,
    fontSize: 28, color: BRAND_COLOR, fontFace: "Arial", bold: true,
  });

  const phaseColors = ["3b82f6", "10b981", "f59e0b", "8b5cf6", "14b8a6", "f43f5e"];
  data.phases.forEach((phase, idx) => {
    const y = 1.5 + idx * 0.8;
    overview.addShape(pptx.ShapeType.rect, {
      x: 0.8, y, w: 0.5, h: 0.5,
      fill: { color: phaseColors[idx] || ACCENT },
      rectRadius: 0.1,
    });
    overview.addText(String(phase.id), {
      x: 0.8, y, w: 0.5, h: 0.5,
      fontSize: 16, color: "FFFFFF", fontFace: "Arial", bold: true, align: "center", valign: "middle",
    });
    overview.addText(phase.nome, {
      x: 1.5, y, w: 5, h: 0.5,
      fontSize: 16, color: BRAND_COLOR, fontFace: "Arial", bold: true, valign: "middle",
    });
    overview.addText(`${phase.duracaoMinutos} min`, {
      x: 6.5, y, w: 1.5, h: 0.5,
      fontSize: 14, color: "64748b", fontFace: "Arial", valign: "middle",
    });
    overview.addText(phase.objetivo, {
      x: 8, y, w: 4.5, h: 0.5,
      fontSize: 12, color: "475569", fontFace: "Arial", valign: "middle",
    });
  });

  // ===== Slides 3-8: One per phase =====
  data.phases.forEach((phase, idx) => {
    const slide = pptx.addSlide();
    slide.background = { color: "FFFFFF" };

    // Header bar
    slide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: 13.33, h: 1.2,
      fill: { color: phaseColors[idx] || ACCENT },
    });
    slide.addText(`Fase ${phase.id}: ${phase.nome}`, {
      x: 0.8, y: 0.1, w: 10, h: 0.7,
      fontSize: 28, color: "FFFFFF", fontFace: "Arial", bold: true,
    });
    slide.addText(`${phase.duracaoMinutos} minutos`, {
      x: 0.8, y: 0.7, w: 10, h: 0.4,
      fontSize: 14, color: "FFFFFF", fontFace: "Arial", italic: true,
    });

    // Objetivo
    slide.addText("Objetivo", {
      x: 0.8, y: 1.5, w: 5.5, h: 0.4,
      fontSize: 14, color: ACCENT, fontFace: "Arial", bold: true,
    });
    slide.addText(phase.objetivo, {
      x: 0.8, y: 1.9, w: 5.5, h: 0.8,
      fontSize: 16, color: BRAND_COLOR, fontFace: "Arial",
    });

    // Frases-chave
    if (phase.frasesChave) {
      slide.addText("Frases-Chave", {
        x: 0.8, y: 2.9, w: 5.5, h: 0.4,
        fontSize: 14, color: ACCENT, fontFace: "Arial", bold: true,
      });
      const frases = phase.frasesChave.split("\n").filter(Boolean);
      frases.forEach((frase, fi) => {
        slide.addText(`"${frase.trim()}"`, {
          x: 1.0, y: 3.3 + fi * 0.45, w: 5.3, h: 0.4,
          fontSize: 13, color: "334155", fontFace: "Arial", italic: true,
        });
      });
    }

    // O que NAO fazer
    if (phase.oQueNaoFazer) {
      slide.addShape(pptx.ShapeType.rect, {
        x: 7, y: 1.5, w: 5.5, h: 3.5,
        fill: { color: "fef2f2" },
        rectRadius: 0.15,
        line: { color: "fecaca", width: 1 },
      });
      slide.addText("O que NAO fazer", {
        x: 7.3, y: 1.7, w: 5, h: 0.4,
        fontSize: 14, color: "dc2626", fontFace: "Arial", bold: true,
      });
      const items = phase.oQueNaoFazer.split(/[.\n]/).filter(s => s.trim());
      items.forEach((item, ii) => {
        slide.addText(`• ${item.trim()}`, {
          x: 7.3, y: 2.2 + ii * 0.5, w: 5, h: 0.4,
          fontSize: 12, color: "991b1b", fontFace: "Arial",
        });
      });
    }
  });

  // ===== Slide: Products (if available) =====
  if (data.products.length > 0) {
    const prodSlide = pptx.addSlide();
    prodSlide.background = { color: LIGHT_BG };
    prodSlide.addText("Cardapio de Servicos", {
      x: 0.8, y: 0.4, w: 11, h: 0.8,
      fontSize: 28, color: BRAND_COLOR, fontFace: "Arial", bold: true,
    });

    data.products.forEach((prod, idx) => {
      const col = idx % 3;
      const row = Math.floor(idx / 3);
      const x = 0.5 + col * 4.2;
      const y = 1.5 + row * 2.8;

      prodSlide.addShape(pptx.ShapeType.rect, {
        x, y, w: 3.8, h: 2.5,
        fill: { color: "FFFFFF" },
        rectRadius: 0.15,
        shadow: { type: "outer", blur: 6, offset: 2, color: "cbd5e1", opacity: 0.3 },
      });

      prodSlide.addText(prod.nome || "Servico", {
        x: x + 0.2, y: y + 0.15, w: 3.4, h: 0.4,
        fontSize: 14, color: BRAND_COLOR, fontFace: "Arial", bold: true,
      });

      const details = [
        prod.formato ? `Formato: ${prod.formato}` : "",
        prod.duracao ? `Duracao: ${prod.duracao}` : "",
        prod.precoSugerido ? `Preco: ${prod.precoSugerido}` : "",
        prod.paraQuem ? `Para: ${prod.paraQuem}` : "",
      ].filter(Boolean);

      details.forEach((d, di) => {
        prodSlide.addText(d, {
          x: x + 0.2, y: y + 0.6 + di * 0.4, w: 3.4, h: 0.35,
          fontSize: 11, color: "475569", fontFace: "Arial",
        });
      });
    });
  }

  // ===== Final Slide =====
  const final = pptx.addSlide();
  final.background = { color: BRAND_COLOR };
  final.addText("Consulta = Transformacao", {
    x: 0.8, y: 2, w: 11, h: 1,
    fontSize: 32, color: "FFFFFF", fontFace: "Arial", bold: true, align: "center",
  });
  final.addText("Cada fase do protocolo constroi confianca, clareza e resultado.", {
    x: 0.8, y: 3.2, w: 11, h: 0.6,
    fontSize: 16, color: "94a3b8", fontFace: "Arial", align: "center",
  });
  final.addText(`MedMentoring — Dr. ${data.mentorName}`, {
    x: 0.8, y: 4.5, w: 11, h: 0.4,
    fontSize: 12, color: "64748b", fontFace: "Arial", align: "center",
  });

  return pptx.write({ outputType: "nodebuffer" }) as Promise<Buffer>;
}
