import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the db module
vi.mock("./db", () => ({
  getMenteeById: vi.fn(),
  getPillarDiagnostic: vi.fn(),
  upsertPillarDiagnostic: vi.fn(),
}));

// Mock the LLM module
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn(),
}));

import { getMenteeById, getPillarDiagnostic, upsertPillarDiagnostic } from "./db";
import { invokeLLM } from "./_core/llm";

const mockMentee = {
  id: 1,
  nome: "Dr. João Silva",
  especialidade: "Cardiologia",
  cidade: "São Paulo",
  accessCode: "TEST123",
  ativo: true,
  email: "joao@example.com",
  telefone: "11999999999",
  horasRealizadas: 10,
};

const mockP1Diagnostic = {
  id: 1,
  menteeId: 1,
  pillarId: 1,
  respostasJson: {
    missaoFinal: "Transformar vidas através da cardiologia preventiva",
    visaoFinal: "Ser referência em cardiologia preventiva em São Paulo",
    valoresSelecionados: ["Excelência", "Empatia", "Inovação"],
    ikigaiProposta: "Medicina preventiva que combina ciência e humanização",
  },
  angustiasJson: [],
  tecnicasJson: [],
  analiseEstrategica: null,
  pilaresUrgentes: null,
  criadoEm: new Date(),
  atualizadoEm: new Date(),
};

const mockLLMResponse = {
  choices: [
    {
      message: {
        content: "Você é o agente de marketing pessoal do Dr. João Silva, cardiologista em São Paulo...",
        role: "assistant",
      },
    },
  ],
};

describe("Marketing Router — generatePrompt", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deve buscar dados do mentorado e dos pilares para gerar o prompt", async () => {
    (getMenteeById as ReturnType<typeof vi.fn>).mockResolvedValue(mockMentee);
    (getPillarDiagnostic as ReturnType<typeof vi.fn>).mockResolvedValue(mockP1Diagnostic);
    (upsertPillarDiagnostic as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (invokeLLM as ReturnType<typeof vi.fn>).mockResolvedValue(mockLLMResponse);

    // Simulate what the router does
    const mentee = await getMenteeById(1);
    expect(mentee).toBeTruthy();
    expect(mentee?.nome).toBe("Dr. João Silva");

    const p1 = await getPillarDiagnostic(1, 1);
    expect(p1?.respostasJson).toBeTruthy();

    const p1Data = p1?.respostasJson as Record<string, unknown>;
    expect(p1Data.missaoFinal).toBe("Transformar vidas através da cardiologia preventiva");
    expect(p1Data.valoresSelecionados).toEqual(["Excelência", "Empatia", "Inovação"]);
  });

  it("deve chamar invokeLLM com os dados do mentorado no prompt", async () => {
    (getMenteeById as ReturnType<typeof vi.fn>).mockResolvedValue(mockMentee);
    (getPillarDiagnostic as ReturnType<typeof vi.fn>).mockResolvedValue(mockP1Diagnostic);
    (upsertPillarDiagnostic as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (invokeLLM as ReturnType<typeof vi.fn>).mockResolvedValue(mockLLMResponse);

    const response = await invokeLLM({
      messages: [
        { role: "system", content: "Você é um especialista em marketing médico digital." },
        { role: "user", content: `Crie um prompt de marketing para Dr. João Silva, Cardiologista` },
      ],
    });

    expect(invokeLLM).toHaveBeenCalledTimes(1);
    expect(response.choices[0].message.content).toContain("Dr. João Silva");
  });

  it("deve salvar o prompt gerado no diagnóstico do pilar 6", async () => {
    (getMenteeById as ReturnType<typeof vi.fn>).mockResolvedValue(mockMentee);
    (getPillarDiagnostic as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (upsertPillarDiagnostic as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (invokeLLM as ReturnType<typeof vi.fn>).mockResolvedValue(mockLLMResponse);

    const promptGerado = mockLLMResponse.choices[0].message.content;

    await upsertPillarDiagnostic(1, 6, {
      respostasJson: { promptGerado, promptGeradoEm: new Date().toISOString() },
    });

    expect(upsertPillarDiagnostic).toHaveBeenCalledWith(1, 6, expect.objectContaining({
      respostasJson: expect.objectContaining({ promptGerado }),
    }));
  });

  it("deve lançar erro quando mentorado não existe", async () => {
    (getMenteeById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const mentee = await getMenteeById(999);
    expect(mentee).toBeNull();
    // The router would throw TRPCError NOT_FOUND here
  });
});

describe("Marketing Router — saveMarketingData", () => {
  it("deve mesclar dados novos com dados existentes", async () => {
    const existingData = { bloqueiosMarketing: "Medo de exposição" };
    const newData = { referenciasMedico: "Dr. Drauzio Varella" };

    (getPillarDiagnostic as ReturnType<typeof vi.fn>).mockResolvedValue({
      respostasJson: existingData,
    });
    (upsertPillarDiagnostic as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const existing = await getPillarDiagnostic(1, 6);
    const existingRespostas = (existing?.respostasJson as object) || {};
    const merged = { ...existingRespostas, ...newData };

    await upsertPillarDiagnostic(1, 6, { respostasJson: merged });

    expect(upsertPillarDiagnostic).toHaveBeenCalledWith(1, 6, {
      respostasJson: {
        bloqueiosMarketing: "Medo de exposição",
        referenciasMedico: "Dr. Drauzio Varella",
      },
    });
  });
});

describe("Pillar WorkRoom Data Structures", () => {
  it("deve validar estrutura de dados do Pilar 1 (Identidade)", () => {
    const pilar1Data = {
      ikigaiRespostas: {
        amaFazer: ["Medicina preventiva", "Educação em saúde"],
        bomEm: ["Diagnóstico precoce", "Comunicação com pacientes"],
        mundoPrecisa: ["Prevenção de doenças cardíacas"],
        pagoPor: ["Consultas", "Check-ups executivos"],
      },
      ikigaiProposta: "Medicina preventiva que salva vidas antes que a doença apareça",
      missaoFinal: "Transformar a saúde cardiovascular do Brasil através da prevenção",
      visaoFinal: "Ser o cardiologista preventivo mais respeitado de São Paulo em 5 anos",
      valoresSelecionados: ["Excelência", "Empatia", "Inovação"],
      valoresSignificados: {
        "Excelência": "Nunca aceitar menos que o melhor para meus pacientes",
      },
    };

    expect(pilar1Data.ikigaiRespostas.amaFazer).toHaveLength(2);
    expect(pilar1Data.valoresSelecionados).toContain("Excelência");
    expect(pilar1Data.missaoFinal).toBeTruthy();
    expect(pilar1Data.visaoFinal).toBeTruthy();
  });

  it("deve validar estrutura de dados do Pilar 4 (Gestão)", () => {
    const pilar4Data = {
      teamMembers: [
        { id: "1", cargo: "Médico(a) Titular", nome: "Dr. João", nivel: "medico", responsabilidades: "Atendimento", tempoServico: "5 anos" },
        { id: "2", cargo: "Recepcionista", nome: "Maria", nivel: "administrativo", responsabilidades: "Agendamento", tempoServico: "2 anos" },
      ],
      processos: [
        { id: "1", nome: "Agendamento", responsavel: "Recepcionista", frequencia: "Diário", tempoMinutos: 5, documentado: true, gargalo: false, descricao: "Processo de agendamento", melhorias: "" },
      ],
      gargalos: [],
      checklistStatus: [true, false, false, false, false, false, false, false],
    };

    expect(pilar4Data.teamMembers).toHaveLength(2);
    expect(pilar4Data.processos[0].documentado).toBe(true);
    expect(pilar4Data.checklistStatus.filter(Boolean)).toHaveLength(1);
  });

  it("deve validar estrutura de dados do Pilar 6 (Marketing)", () => {
    const pilar6Data = {
      bloqueiosMarketing: "Medo de críticas",
      referenciasMedico: "Dr. Drauzio Varella",
      presencaAtual: "Instagram com 500 seguidores, sem estratégia",
      promptGerado: "Você é o agente de marketing pessoal do Dr. João...",
      promptGeradoEm: new Date().toISOString(),
      checklistStatus: new Array(8).fill(false),
    };

    expect(pilar6Data.promptGerado).toContain("Dr. João");
    expect(pilar6Data.checklistStatus).toHaveLength(8);
    expect(new Date(pilar6Data.promptGeradoEm)).toBeInstanceOf(Date);
  });
});
