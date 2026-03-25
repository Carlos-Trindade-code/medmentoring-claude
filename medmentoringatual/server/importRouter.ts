/**
 * importRouter.ts
 * Rota de importação inteligente: recebe PDF ou Excel, extrai texto,
 * envia para LLM e retorna dados estruturados para confirmação do mentor.
 */
import { Router } from "express";
import multer from "multer";
import { invokeLLM } from "./_core/llm";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 16 * 1024 * 1024 }, // 16MB
});

const importRouter = Router();

// ─── Helpers ────────────────────────────────────────────────────────────────

async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfParse: any = (await import("pdf-parse"));
  const parseFn = pdfParse.default ?? pdfParse;
  const data = await parseFn(buffer);
  return data.text;
}

async function extractTextFromExcel(buffer: Buffer): Promise<string> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const lines: string[] = [];
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const csv = XLSX.utils.sheet_to_csv(sheet);
    lines.push(`=== Aba: ${sheetName} ===\n${csv}`);
  }
  return lines.join("\n\n");
}

// ─── Prompt para o LLM ──────────────────────────────────────────────────────

const EXTRACTION_PROMPT = `Você é um assistente especializado em extrair dados de mentorados médicos.
Analise o texto abaixo e extraia as informações de TODOS os médicos/mentorados encontrados.
Para cada mentorado, retorne um objeto JSON com os campos disponíveis.

Campos possíveis (use null se não encontrado):
- nome: string (nome completo)
- email: string
- telefone: string
- especialidade: string (ex: Cardiologia, Ortopedia, Clínica Geral)
- crm: string
- cidade: string
- estado: string (sigla, ex: SP, MG, RJ)
- objetivoMentoria: string (objetivo principal da mentoria)
- motivacao: string (por que procurou a mentoria)
- horasRealizadas: number (horas de mentoria já realizadas, default 0)
- sessoesRealizadas: number (sessões já realizadas, default 0)
- observacoes: string (observações gerais relevantes)

IMPORTANTE:
- Retorne APENAS um JSON válido, sem markdown, sem explicações
- Formato: { "mentorados": [ {...}, {...} ] }
- Se encontrar apenas um mentorado, retorne array com um elemento
- Não invente dados que não estejam no texto
- Se um campo não estiver claramente no texto, use null`;

// ─── Rota principal ──────────────────────────────────────────────────────────

importRouter.post("/api/import/extract", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "Nenhum arquivo enviado" });
      return;
    }

    const { mimetype, originalname, buffer } = req.file;
    let rawText = "";

    // Extrair texto conforme o tipo do arquivo
    if (
      mimetype === "application/pdf" ||
      originalname.toLowerCase().endsWith(".pdf")
    ) {
      rawText = await extractTextFromPdf(buffer);
    } else if (
      mimetype.includes("spreadsheet") ||
      mimetype.includes("excel") ||
      originalname.toLowerCase().match(/\.(xlsx|xls|csv)$/)
    ) {
      rawText = await extractTextFromExcel(buffer);
    } else if (mimetype === "text/csv" || originalname.toLowerCase().endsWith(".csv")) {
      rawText = buffer.toString("utf-8");
    } else {
      res.status(400).json({ error: "Formato não suportado. Use PDF, Excel (.xlsx/.xls) ou CSV." });
      return;
    }

    if (!rawText.trim()) {
      res.status(422).json({ error: "Não foi possível extrair texto do arquivo. Verifique se o arquivo não está vazio ou protegido." });
      return;
    }

    // Limitar o texto para não exceder o contexto do LLM (aprox. 12k chars)
    const truncatedText = rawText.length > 12000
      ? rawText.substring(0, 12000) + "\n\n[Texto truncado por tamanho]"
      : rawText;

    // Chamar o LLM para extrair os dados
    const userMessage = `Texto extraído do arquivo "${originalname}":\n\n${truncatedText}`;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const llmResponse = await (invokeLLM as any)({
      messages: [
        { role: "system", content: EXTRACTION_PROMPT },
        { role: "user", content: userMessage },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "mentorados_extraction",
          strict: true,
          schema: {
            type: "object",
            properties: {
              mentorados: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    nome: { type: ["string", "null"] },
                    email: { type: ["string", "null"] },
                    telefone: { type: ["string", "null"] },
                    especialidade: { type: ["string", "null"] },
                    crm: { type: ["string", "null"] },
                    cidade: { type: ["string", "null"] },
                    estado: { type: ["string", "null"] },
                    objetivoMentoria: { type: ["string", "null"] },
                    motivacao: { type: ["string", "null"] },
                    horasRealizadas: { type: ["number", "null"] },
                    sessoesRealizadas: { type: ["number", "null"] },
                    observacoes: { type: ["string", "null"] },
                  },
                  required: [
                    "nome", "email", "telefone", "especialidade", "crm",
                    "cidade", "estado", "objetivoMentoria", "motivacao",
                    "horasRealizadas", "sessoesRealizadas", "observacoes"
                  ],
                  additionalProperties: false,
                },
              },
            },
            required: ["mentorados"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = llmResponse.choices?.[0]?.message?.content;
    if (!content) {
      res.status(500).json({ error: "LLM não retornou dados" });
      return;
    }

    const parsed = JSON.parse(content);

    res.json({
      success: true,
      filename: originalname,
      rawTextLength: rawText.length,
      mentorados: parsed.mentorados || [],
    });
  } catch (err: any) {
    console.error("[Import] Error:", err);
    res.status(500).json({ error: err.message || "Erro ao processar arquivo" });
  }
});

export { importRouter };
