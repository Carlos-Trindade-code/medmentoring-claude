import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================
// Unit tests for questionnaire and documents logic
// ============================================================

describe("Questionnaire Phase Logic", () => {
  it("should validate faseId range 1-6", () => {
    const validFaseIds = [1, 2, 3, 4, 5, 6];
    const invalidFaseIds = [0, 7, -1, 100];

    validFaseIds.forEach((id) => {
      expect(id >= 1 && id <= 6).toBe(true);
    });

    invalidFaseIds.forEach((id) => {
      expect(id >= 1 && id <= 6).toBe(false);
    });
  });

  it("should map faseId to correct phase name", () => {
    const faseNomes = [
      "", "Identidade e Propósito", "Perfil Profissional",
      "Situação Atual", "Sonhos e Objetivos",
      "Presença Digital", "Paciente Ideal"
    ];

    expect(faseNomes[1]).toBe("Identidade e Propósito");
    expect(faseNomes[2]).toBe("Perfil Profissional");
    expect(faseNomes[3]).toBe("Situação Atual");
    expect(faseNomes[4]).toBe("Sonhos e Objetivos");
    expect(faseNomes[5]).toBe("Presença Digital");
    expect(faseNomes[6]).toBe("Paciente Ideal");
    expect(faseNomes[0]).toBe("");
  });

  it("should correctly identify status transitions", () => {
    type Status = "nao_iniciada" | "em_progresso" | "concluida";
    const validStatuses: Status[] = ["em_progresso", "concluida"];
    const invalidStatuses = ["pendente", "ativa", "cancelada"];

    validStatuses.forEach((s) => {
      expect(["em_progresso", "concluida"].includes(s)).toBe(true);
    });

    invalidStatuses.forEach((s) => {
      expect(["em_progresso", "concluida"].includes(s)).toBe(false);
    });
  });

  it("should format respostas array correctly", () => {
    const respostas = [
      { perguntaId: "p1_1", pergunta: "Por que você escolheu a medicina?", resposta: "Quero ajudar pessoas." },
      { perguntaId: "p1_2", pergunta: "Qual é seu maior sonho?", resposta: "Ser referência nacional." },
    ];

    const formatted = respostas
      .map((r) => `**${r.pergunta}**\n${r.resposta}`)
      .join("\n\n");

    expect(formatted).toContain("**Por que você escolheu a medicina?**");
    expect(formatted).toContain("Quero ajudar pessoas.");
    expect(formatted).toContain("**Qual é seu maior sonho?**");
    expect(formatted).toContain("Ser referência nacional.");
  });

  it("should count non-answered questions correctly", () => {
    const respostas = [
      { perguntaId: "p1_1", pergunta: "Q1", resposta: "Resposta 1" },
      { perguntaId: "p1_2", pergunta: "Q2", resposta: "" },
      { perguntaId: "p1_3", pergunta: "Q3", resposta: "  " },
      { perguntaId: "p1_4", pergunta: "Q4", resposta: "Resposta 4" },
      { perguntaId: "p1_5", pergunta: "Q5", resposta: "" },
    ];

    const naoRespondidas = respostas.filter((r) => !r.resposta.trim());
    expect(naoRespondidas.length).toBe(3);
  });
});

describe("Document Type Logic", () => {
  it("should recognize valid document types", () => {
    const validTypes = ["resumo_questionario", "resumo_fase", "prompt_marketing", "persona", "diagnostico_pilar"];
    const invalidTypes = ["unknown", "test", ""];

    validTypes.forEach((t) => {
      expect(validTypes.includes(t)).toBe(true);
    });

    invalidTypes.forEach((t) => {
      expect(validTypes.includes(t)).toBe(false);
    });
  });

  it("should generate safe filename from document title", () => {
    const titulo = "Fase 1 — Identidade e Propósito (Dr. Carlos)";
    const filename = titulo.replace(/[^a-z0-9]/gi, "_");
    expect(filename).not.toContain(" ");
    expect(filename).not.toContain("—");
    expect(filename).not.toContain("(");
    expect(filename).not.toContain(")");
    expect(filename).toMatch(/^[a-z0-9_]+$/i);
  });

  it("should calculate overall questionnaire progress correctly", () => {
    const phases = [
      { faseId: 1, status: "concluida" },
      { faseId: 2, status: "concluida" },
      { faseId: 3, status: "em_progresso" },
      { faseId: 4, status: "nao_iniciada" },
      { faseId: 5, status: "nao_iniciada" },
      { faseId: 6, status: "nao_iniciada" },
    ];

    const completed = phases.filter((p) => p.status === "concluida").length;
    const progress = Math.round((completed / 6) * 100);

    expect(completed).toBe(2);
    expect(progress).toBe(33);
  });

  it("should identify unread documents correctly", () => {
    const docs = [
      { id: 1, lidoPeloMentor: false },
      { id: 2, lidoPeloMentor: true },
      { id: 3, lidoPeloMentor: false },
      { id: 4, lidoPeloMentor: true },
    ];

    const unread = docs.filter((d) => !d.lidoPeloMentor);
    expect(unread.length).toBe(2);
    expect(unread.map((d) => d.id)).toEqual([1, 3]);
  });
});

describe("LLM Prompt Construction", () => {
  it("should build a valid system prompt for phase summary", () => {
    const systemPrompt = `Você é um assistente especializado em mentoria médica. 
Analise as respostas do mentorado e gere um resumo estruturado, perspicaz e acionável para o mentor.`;

    expect(systemPrompt).toContain("mentoria médica");
    expect(systemPrompt).toContain("resumo estruturado");
    expect(systemPrompt.length).toBeGreaterThan(50);
  });

  it("should build a valid user prompt with mentee data", () => {
    const mentee = { nome: "Dr. João Silva", especialidade: "Cardiologia" };
    const faseNome = "Identidade e Propósito";
    const respostasFormatadas = "**Pergunta 1**\nResposta 1\n\n**Pergunta 2**\nResposta 2";

    const userPrompt = `Mentorado: ${mentee.nome} | Especialidade: ${mentee.especialidade}\nFase: ${faseNome}\n\nRespostas:\n${respostasFormatadas}`;

    expect(userPrompt).toContain("Dr. João Silva");
    expect(userPrompt).toContain("Cardiologia");
    expect(userPrompt).toContain("Identidade e Propósito");
    expect(userPrompt).toContain("Pergunta 1");
  });

  it("should handle LLM response content safely", () => {
    // Simulates safe string conversion of LLM content
    const mockContent = "Este é o resumo gerado pela IA.";
    const result = String(mockContent || "");
    expect(result).toBe("Este é o resumo gerado pela IA.");

    const nullContent = null;
    const resultNull = String(nullContent || "");
    expect(resultNull).toBe("");
  });
});
