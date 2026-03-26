import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ArrowLeft, Plus, Trash2, AlertTriangle, CheckCircle,
  ChevronDown, ChevronRight, Lightbulb, TrendingDown,
  DollarSign, Eye, EyeOff, Save, Target, Scissors,
  TrendingUp, AlertCircle, Info, BarChart3, Zap
} from "lucide-react";

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface ExpenseItem {
  id: string;
  name: string;
  type: "Fixo" | "Semifixo" | "Variável";
  monthly: number;
  note?: string;
}
interface ExpenseCategory {
  id: string;
  cat: string;
  icon: string;
  benchmarkPct: number;
  collapsed: boolean;
  items: ExpenseItem[];
}

// ─── Catálogo exaustivo — todos os custos que médicos esquecem ────────────────
const CATALOG: Record<string, {
  name: string;
  type: "Fixo" | "Semifixo" | "Variável";
  hint: string;
  priority: "alta" | "média" | "baixa";
  reducaoTip?: string;
}[]> = {
  "INFRAESTRUTURA": [
    { name: "Aluguel da sala/clínica", type: "Fixo", hint: "Custo mais alto da maioria das clínicas. Inclua o valor mensal do contrato.", priority: "alta", reducaoTip: "Renegociar contrato, reduzir metragem ou migrar para coworking médico pode cortar 30–50% deste custo." },
    { name: "Condomínio", type: "Fixo", hint: "Cobrado separado do aluguel em muitos edifícios comerciais.", priority: "alta" },
    { name: "IPTU (rateio mensal)", type: "Fixo", hint: "Muitos contratos repassam o IPTU ao locatário. Divida o valor anual por 12.", priority: "média" },
    { name: "Energia elétrica", type: "Semifixo", hint: "Varia com uso de equipamentos. Use a média dos últimos 3 meses.", priority: "alta", reducaoTip: "Trocar iluminação para LED e desligar equipamentos em standby pode reduzir 15–25%." },
    { name: "Água e esgoto", type: "Fixo", hint: "Frequentemente esquecido por ser valor pequeno.", priority: "média" },
    { name: "Telefone e internet", type: "Fixo", hint: "Inclua linha fixa, celular corporativo e link de internet.", priority: "alta", reducaoTip: "Planos corporativos costumam ser 20–30% mais baratos que planos pessoais." },
    { name: "Gás (se houver)", type: "Semifixo", hint: "Relevante se houver cozinha ou autoclave a gás.", priority: "baixa" },
    { name: "Segurança / alarme / monitoramento", type: "Fixo", hint: "Mensalidade do sistema de alarme e câmeras.", priority: "baixa", reducaoTip: "Câmeras IP com gravação em nuvem custam 60% menos que sistemas de monitoramento 24h." },
    { name: "Estacionamento (vaga mensal)", type: "Fixo", hint: "Vaga rotativa ou mensal para o médico e equipe.", priority: "baixa" },
    { name: "Manutenção predial (reserva)", type: "Semifixo", hint: "Reserve ao menos 0,5% do valor do imóvel por mês para reparos.", priority: "média" },
    { name: "Sala de espera compartilhada (rateio)", type: "Fixo", hint: "Se compartilha recepção com outros médicos, inclua o rateio mensal.", priority: "média" },
    { name: "Ar-condicionado (manutenção e energia)", type: "Semifixo", hint: "Manutenção semestral do ar-condicionado + consumo de energia estimado.", priority: "média" },
  ],
  "PESSOAL (CLT / PJ)": [
    { name: "Salários brutos (equipe)", type: "Fixo", hint: "Soma de todos os salários antes dos descontos.", priority: "alta", reducaoTip: "Avaliar se todos os funcionários são necessários em tempo integral ou se horário parcial atende." },
    { name: "INSS patronal (20% sobre folha)", type: "Fixo", hint: "Encargo patronal obrigatório. Muitos esquecem de incluir.", priority: "alta" },
    { name: "FGTS (8% sobre salário)", type: "Fixo", hint: "Obrigatório para CLT. Custo real que sai do caixa mensalmente.", priority: "alta" },
    { name: "Vale transporte (parte patronal)", type: "Fixo", hint: "A empresa paga o excedente acima de 6% do salário.", priority: "média" },
    { name: "Vale refeição / alimentação", type: "Fixo", hint: "Benefício negociado ou obrigatório por convenção coletiva.", priority: "média" },
    { name: "Plano de saúde (funcionários)", type: "Fixo", hint: "Custo mensal por funcionário coberto.", priority: "média", reducaoTip: "Planos coletivos por adesão costumam ser 40% mais baratos que planos empresariais." },
    { name: "13º salário (provisão 1/12)", type: "Fixo", hint: "Provisione 1/12 do salário por mês para não ser pego de surpresa.", priority: "alta" },
    { name: "Férias (provisão 1/12 + 1/3)", type: "Fixo", hint: "Provisione 1/12 + 1/3 por mês. Custo real, mesmo que futuro.", priority: "alta" },
    { name: "Pró-labore do médico", type: "Fixo", hint: "Sua retirada mensal fixa. Sem isso, o custo real da operação está subestimado.", priority: "alta" },
    { name: "Recepcionista / secretária (PJ)", type: "Fixo", hint: "Se for PJ, inclua o valor total pago mensalmente.", priority: "alta", reducaoTip: "Recepcionista virtual (PJ remota) custa 40–60% menos que CLT presencial." },
    { name: "Auxiliar de enfermagem", type: "Fixo", hint: "Custo mensal do auxiliar, incluindo encargos se CLT.", priority: "média", reducaoTip: "Avaliar se o volume de procedimentos justifica auxiliar CLT ou se PJ por demanda é mais eficiente." },
    { name: "Seguro de vida (funcionários)", type: "Fixo", hint: "Apólice coletiva de seguro de vida para a equipe.", priority: "baixa" },
    { name: "Rescisão trabalhista (provisão)", type: "Semifixo", hint: "Reserve mensalmente para cobrir eventuais rescisões sem comprometer o caixa.", priority: "média" },
  ],
  "CONSULTÓRIO (INSUMOS E OPERAÇÃO)": [
    { name: "Materiais médicos descartáveis", type: "Variável", hint: "Luvas, seringas, agulhas, gazes, curativos. Varia com volume de atendimentos.", priority: "alta", reducaoTip: "Compra em atacado com outros médicos da clínica pode reduzir 20–35%." },
    { name: "Medicamentos para uso no consultório", type: "Variável", hint: "Anestésicos, soluções, medicamentos de emergência.", priority: "alta" },
    { name: "Materiais para procedimentos", type: "Variável", hint: "Insumos específicos por procedimento (ácido hialurônico, toxina, etc.).", priority: "alta", reducaoTip: "Negociar com distribuidores por volume ou consignação pode reduzir custo de capital." },
    { name: "Esterilização e autoclave", type: "Semifixo", hint: "Produtos de esterilização, manutenção da autoclave.", priority: "média" },
    { name: "Limpeza e higienização", type: "Semifixo", hint: "Produtos de limpeza, desinfetantes, papel toalha, sabonete.", priority: "média" },
    { name: "EPIs (luvas, máscaras, óculos)", type: "Semifixo", hint: "Equipamentos de proteção individual para toda a equipe.", priority: "alta" },
    { name: "Uniformes e jalecos", type: "Semifixo", hint: "Compra e lavanderia de uniformes. Rateie o custo anual por 12.", priority: "média" },
    { name: "Lavanderia (uniformes e roupas de cama)", type: "Semifixo", hint: "Custo mensal de lavagem de uniformes, lençóis, toalhas.", priority: "média" },
    { name: "Café, água e copa (pacientes e equipe)", type: "Variável", hint: "Café, água mineral, chá, biscoitos. Parece pouco, mas R$200–400/mês é comum.", priority: "baixa" },
    { name: "Material de escritório (papel, toner)", type: "Semifixo", hint: "Papel, canetas, toner de impressora, receituários.", priority: "baixa" },
    { name: "Impressão de exames e documentos", type: "Semifixo", hint: "Custo de impressão de laudos, receitas, relatórios.", priority: "baixa", reducaoTip: "Prontuário 100% digital elimina esse custo quase integralmente." },
    { name: "Descarte de resíduos biológicos", type: "Fixo", hint: "Contrato com empresa de coleta de lixo hospitalar.", priority: "média" },
    { name: "Flores e decoração da recepção", type: "Semifixo", hint: "Manutenção de plantas, flores e decoração do ambiente.", priority: "baixa" },
    { name: "Revistas e entretenimento da sala de espera", type: "Fixo", hint: "Assinaturas de revistas ou plataformas de entretenimento para pacientes.", priority: "baixa", reducaoTip: "Tablet com conteúdo digital custa menos e tem mais impacto que revistas impressas." },
  ],
  "TRANSPORTE E DESLOCAMENTO": [
    { name: "Combustível (deslocamento clínica/hospital)", type: "Variável", hint: "Custo real de combustível para ir e voltar do trabalho e entre locais de atendimento.", priority: "alta", reducaoTip: "Calcule: km/dia × dias úteis × preço/litro ÷ consumo do veículo. Muitos subestimam em 50%." },
    { name: "Pedágio (deslocamento entre cidades)", type: "Variável", hint: "Pedágios em rotas entre clínica, hospital e outras unidades. Inclua ida e volta.", priority: "alta" },
    { name: "Estacionamento rotativo (hospitais/plantões)", type: "Variável", hint: "Estacionamento pago em hospitais, clínicas e plantões. R$20–60/dia é comum.", priority: "alta" },
    { name: "Aplicativo de transporte (Uber/99)", type: "Variável", hint: "Corridas para plantões, eventos, congressos. Frequentemente esquecido.", priority: "média" },
    { name: "Manutenção do veículo (rateio mensal)", type: "Semifixo", hint: "Revisões, pneus, óleo, IPVA, seguro do carro. Divida o custo anual por 12.", priority: "alta", reducaoTip: "Carro usado para trabalho pode ter parte dos custos deduzida como despesa operacional." },
    { name: "Seguro do veículo (rateio mensal)", type: "Fixo", hint: "Apólice anual do seguro do carro dividida por 12 meses.", priority: "média" },
    { name: "Passagem aérea (plantões em outras cidades)", type: "Variável", hint: "Voos para plantões ou atendimentos em outras localidades. Rateie o custo mensal médio.", priority: "alta" },
    { name: "Hospedagem (plantões fora da cidade)", type: "Variável", hint: "Hotel ou diária quando trabalha em outra cidade. Frequentemente não contabilizado.", priority: "alta" },
    { name: "Alimentação fora de casa (plantões)", type: "Variável", hint: "Refeições durante plantões e deslocamentos. R$30–80/dia × dias de plantão.", priority: "média" },
    { name: "Transporte público (metrô, ônibus)", type: "Fixo", hint: "Se usa transporte público para algum deslocamento de trabalho.", priority: "baixa" },
    { name: "Táxi / transfer para aeroporto", type: "Variável", hint: "Deslocamento para aeroporto em viagens a trabalho.", priority: "baixa" },
  ],
  "MARKETING E CAPTAÇÃO": [
    { name: "Agência / gestor de marketing digital", type: "Fixo", hint: "Gestão de redes sociais, Google Ads, estratégia de conteúdo.", priority: "alta", reducaoTip: "Freelancer especializado em saúde custa 40–60% menos que agência e entrega resultado similar." },
    { name: "Doctoralia / iClinic / Consultas.vc", type: "Fixo", hint: "Plataformas de agendamento online. Verifique o plano contratado.", priority: "alta" },
    { name: "Google Ads (investimento)", type: "Semifixo", hint: "Valor investido em anúncios pagos no Google.", priority: "média" },
    { name: "Meta / Instagram Ads", type: "Semifixo", hint: "Impulsionamento de posts e campanhas no Instagram/Facebook.", priority: "média" },
    { name: "Fotografia e produção de conteúdo", type: "Semifixo", hint: "Ensaio fotográfico, vídeos. Rateie o custo anual por 12.", priority: "baixa" },
    { name: "Site (hospedagem e domínio)", type: "Fixo", hint: "Mensalidade de hospedagem e renovação de domínio rateada.", priority: "média" },
    { name: "Brindes e materiais impressos", type: "Semifixo", hint: "Cartões de visita, folders, brindes para pacientes.", priority: "baixa" },
    { name: "Assessoria de imprensa / relações públicas", type: "Fixo", hint: "Serviço de RP para posicionamento de marca pessoal.", priority: "baixa" },
    { name: "Patrocínio de eventos médicos", type: "Semifixo", hint: "Patrocínio de eventos locais para visibilidade.", priority: "baixa" },
  ],
  "IMPOSTOS E TAXAS": [
    { name: "Simples Nacional / DAS", type: "Fixo", hint: "Guia mensal do Simples. Use a alíquota efetiva sobre o faturamento.", priority: "alta" },
    { name: "ISS (Imposto sobre Serviços)", type: "Fixo", hint: "Cobrado pelo município. Verifique se já está no Simples ou é separado.", priority: "alta" },
    { name: "IRPJ e CSLL (se Lucro Presumido)", type: "Fixo", hint: "Tributos federais se não estiver no Simples.", priority: "alta" },
    { name: "CRM (anuidade rateada)", type: "Fixo", hint: "Anuidade do CRM dividida por 12 meses.", priority: "média" },
    { name: "Anuidade de especialidade (AMB, CFM)", type: "Fixo", hint: "Anuidade de sociedades médicas rateada por 12.", priority: "baixa" },
    { name: "Alvará de funcionamento (rateio)", type: "Fixo", hint: "Taxa anual da prefeitura dividida por 12.", priority: "baixa" },
    { name: "Taxa de cartão de crédito/débito", type: "Variável", hint: "% cobrado pela maquininha sobre cada transação. Use a média mensal.", priority: "alta", reducaoTip: "Negociar taxa com operadora de cartão pode reduzir de 3,5% para 1,8–2,5% dependendo do volume." },
    { name: "INSS do médico (pró-labore)", type: "Fixo", hint: "Contribuição previdenciária sobre o pró-labore.", priority: "alta" },
    { name: "Imposto de renda pessoa física (provisão)", type: "Fixo", hint: "Provisão mensal para o IRPF anual. Evita surpresa na declaração.", priority: "alta" },
  ],
  "TERCEIRIZADOS E SERVIÇOS": [
    { name: "Contabilidade", type: "Fixo", hint: "Honorários mensais do contador. Inclua declarações anuais rateadas.", priority: "alta", reducaoTip: "Contabilidade online (Contabilizei, Agilize) custa 50–70% menos para PJ simples." },
    { name: "Assessoria jurídica", type: "Semifixo", hint: "Consultas eventuais ou contrato de retenção mensal.", priority: "baixa" },
    { name: "Serviço de limpeza (empresa)", type: "Fixo", hint: "Empresa terceirizada de limpeza e higienização.", priority: "alta" },
    { name: "TI / suporte de sistemas", type: "Semifixo", hint: "Manutenção de computadores, prontuário eletrônico, etc.", priority: "média" },
    { name: "Assessoria de RH", type: "Semifixo", hint: "Se terceirizar admissão, demissão e folha de pagamento.", priority: "baixa" },
    { name: "Serviço de agendamento / call center", type: "Fixo", hint: "Central de agendamento terceirizada ou chatbot de agendamento.", priority: "média", reducaoTip: "Chatbot de agendamento automático custa R$200–500/mês vs. R$2.000–4.000 de recepcionista." },
    { name: "Consultoria de gestão", type: "Semifixo", hint: "Consultoria para gestão da clínica, processos e indicadores.", priority: "baixa" },
  ],
  "EQUIPAMENTOS E TECNOLOGIA": [
    { name: "Prontuário eletrônico (assinatura)", type: "Fixo", hint: "iClinic, Nuvem, MV, etc. Valor mensal da assinatura.", priority: "alta" },
    { name: "Leasing / financiamento de equipamento", type: "Fixo", hint: "Parcelas mensais de equipamentos médicos financiados.", priority: "alta" },
    { name: "Manutenção preventiva de equipamentos", type: "Semifixo", hint: "Contratos de manutenção ou reserva mensal (0,5% do valor).", priority: "média" },
    { name: "Assinaturas de software (Microsoft, Zoom)", type: "Fixo", hint: "Microsoft 365, Zoom, ferramentas de gestão, etc.", priority: "média" },
    { name: "Renovação de equipamentos (reserva)", type: "Semifixo", hint: "Reserve mensalmente para substituição futura de equipamentos.", priority: "média" },
    { name: "Telemedicina (plataforma)", type: "Fixo", hint: "Plataforma para teleconsultas. Pode gerar receita adicional.", priority: "média" },
    { name: "Backup e segurança de dados", type: "Fixo", hint: "Solução de backup de prontuários e dados de pacientes (LGPD).", priority: "média" },
  ],
  "DESENVOLVIMENTO PROFISSIONAL": [
    { name: "Cursos e congressos (rateio mensal)", type: "Semifixo", hint: "Inscrições em cursos, congressos, pós-graduação. Divida o custo anual por 12.", priority: "média" },
    { name: "Assinaturas de revistas e plataformas", type: "Fixo", hint: "UpToDate, PubMed, revistas científicas, etc.", priority: "baixa" },
    { name: "Livros e materiais didáticos", type: "Semifixo", hint: "Custo mensal médio com atualização bibliográfica.", priority: "baixa" },
    { name: "Viagens a trabalho / congressos", type: "Semifixo", hint: "Passagens, hotel, alimentação em eventos. Rateie o custo anual.", priority: "baixa" },
    { name: "Mentoria e coaching profissional", type: "Fixo", hint: "Investimento em mentoria de negócios ou coaching de carreira.", priority: "média" },
    { name: "Supervisão clínica / análise pessoal", type: "Fixo", hint: "Psicoterapia ou supervisão clínica — custo real e frequentemente omitido.", priority: "baixa" },
  ],
  "SAÚDE E BEM-ESTAR DO MÉDICO": [
    { name: "Plano de saúde (médico e família)", type: "Fixo", hint: "Plano de saúde pessoal e familiar. Custo real que sai do caixa.", priority: "alta" },
    { name: "Seguro de vida pessoal", type: "Fixo", hint: "Apólice pessoal de seguro de vida e invalidez.", priority: "alta" },
    { name: "Previdência privada (PGBL/VGBL)", type: "Fixo", hint: "Aporte mensal em previdência privada. Custo real do planejamento financeiro.", priority: "alta", reducaoTip: "PGBL permite deduzir até 12% da renda bruta no IR — pode ser investimento, não custo." },
    { name: "Academia / atividade física", type: "Fixo", hint: "Mensalidade de academia, personal trainer, esportes.", priority: "baixa" },
    { name: "Alimentação saudável / nutricionista", type: "Semifixo", hint: "Custo com alimentação especial ou acompanhamento nutricional.", priority: "baixa" },
  ],
  "OUTROS CUSTOS": [
    { name: "Seguro de responsabilidade civil médica", type: "Fixo", hint: "Seguro RC médico. Obrigatório e frequentemente esquecido. Rateie o anual.", priority: "alta" },
    { name: "Seguro do imóvel / equipamentos", type: "Fixo", hint: "Seguro contra incêndio, roubo, danos a equipamentos.", priority: "média" },
    { name: "Despesas bancárias (conta PJ)", type: "Fixo", hint: "Tarifas de conta PJ, TED, DOC, manutenção.", priority: "média", reducaoTip: "Bancos digitais PJ (Inter, Nubank PJ) têm tarifas zero ou mínimas." },
    { name: "Aluguel de maquininha de cartão", type: "Fixo", hint: "Taxa mensal de aluguel do terminal POS.", priority: "média" },
    { name: "Presentes e cortesias a pacientes", type: "Variável", hint: "Brindes, cartões de aniversário, cestas. Parece simbólico, mas soma.", priority: "baixa" },
    { name: "Estorno e reembolso de pacientes", type: "Variável", hint: "Valor médio mensal de estornos e reembolsos.", priority: "baixa" },
    { name: "Imprevistos e reserva de emergência", type: "Semifixo", hint: "Reserve ao menos 2–3% do faturamento para imprevistos.", priority: "média" },
    { name: "Assinatura de clube de benefícios", type: "Fixo", hint: "Clubes de vantagens, cashback, programas de fidelidade pagos.", priority: "baixa" },
    { name: "Doações e responsabilidade social", type: "Semifixo", hint: "Contribuições regulares a causas ou entidades.", priority: "baixa" },
  ],
};

// Benchmarks baseados em dados reais do mercado médico brasileiro (CFM, IESS, AMB 2023–2024)
const BENCHMARKS: Record<string, { max: number; ideal: number; label: string; insight: string }> = {
  "INFRAESTRUTURA": { max: 0.15, ideal: 0.10, label: "10–15% do faturamento", insight: "Clínicas com aluguel acima de 15% do faturamento têm 3× mais risco de fechamento nos primeiros 5 anos (SEBRAE 2023)." },
  "PESSOAL (CLT / PJ)": { max: 0.35, ideal: 0.25, label: "25–35% do faturamento", insight: "O custo real de um funcionário CLT é 1,7× o salário bruto quando incluídos todos os encargos. Muitos médicos subestimam em 40%." },
  "CONSULTÓRIO (INSUMOS E OPERAÇÃO)": { max: 0.12, ideal: 0.08, label: "8–12% do faturamento", insight: "Insumos acima de 12% indicam desperdício ou falta de negociação com fornecedores. Compra coletiva pode reduzir 25%." },
  "TRANSPORTE E DESLOCAMENTO": { max: 0.08, ideal: 0.04, label: "4–8% do faturamento", insight: "Médicos que trabalham em 3+ locais gastam em média R$1.200–2.800/mês em deslocamento — valor raramente contabilizado." },
  "MARKETING E CAPTAÇÃO": { max: 0.10, ideal: 0.05, label: "5–10% do faturamento", insight: "Clínicas que investem 5–8% em marketing crescem 2,3× mais rápido que as que investem menos de 2% (Doctoralia 2024)." },
  "IMPOSTOS E TAXAS": { max: 0.20, ideal: 0.15, label: "15–20% do faturamento", insight: "Médicos no Simples Nacional com faturamento acima de R$360k/ano frequentemente pagam mais imposto que no Lucro Presumido." },
  "TERCEIRIZADOS E SERVIÇOS": { max: 0.08, ideal: 0.05, label: "5–8% do faturamento", insight: "Terceirizar recepção, limpeza e TI pode ser 30–50% mais barato que manter equipe própria para clínicas pequenas." },
  "EQUIPAMENTOS E TECNOLOGIA": { max: 0.08, ideal: 0.04, label: "4–8% do faturamento", insight: "Leasing de equipamentos acima de 8% do faturamento compromete a margem. Avaliar ROI por procedimento é essencial." },
  "DESENVOLVIMENTO PROFISSIONAL": { max: 0.05, ideal: 0.02, label: "2–5% do faturamento", insight: "Médicos que investem em desenvolvimento profissional têm ticket médio 35% maior em 3 anos (dados AMB 2023)." },
  "SAÚDE E BEM-ESTAR DO MÉDICO": { max: 0.05, ideal: 0.03, label: "3–5% do faturamento", insight: "Burnout afeta 56% dos médicos brasileiros (CFM 2023). Investir em saúde pessoal é proteção do ativo mais valioso da clínica." },
  "OUTROS CUSTOS": { max: 0.05, ideal: 0.02, label: "2–5% do faturamento", insight: "Custos 'outros' acima de 5% indicam falta de controle financeiro. Cada item deve ser rastreado individualmente." },
};

const ALL_CATS = Object.keys(CATALOG);
const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtPct = (v: number) => `${(v * 100).toFixed(1)}%`;
const uid = () => Math.random().toString(36).slice(2, 9);

const CAT_ICONS: Record<string, string> = {
  "INFRAESTRUTURA": "🏢", "PESSOAL (CLT / PJ)": "👥",
  "CONSULTÓRIO (INSUMOS E OPERAÇÃO)": "🩺", "TRANSPORTE E DESLOCAMENTO": "🚗",
  "MARKETING E CAPTAÇÃO": "📣", "IMPOSTOS E TAXAS": "🏛️",
  "TERCEIRIZADOS E SERVIÇOS": "🤝", "EQUIPAMENTOS E TECNOLOGIA": "💻",
  "DESENVOLVIMENTO PROFISSIONAL": "📚", "SAÚDE E BEM-ESTAR DO MÉDICO": "❤️",
  "OUTROS CUSTOS": "📋",
};

function defaultCategories(): ExpenseCategory[] {
  return ALL_CATS.map((cat, idx) => ({
    id: `cat-${idx}`,
    cat,
    icon: CAT_ICONS[cat] || "📋",
    benchmarkPct: BENCHMARKS[cat]?.ideal || 0.05,
    collapsed: idx > 2,
    items: CATALOG[cat]
      .filter(s => s.priority === "alta")
      .slice(0, 3)
      .map(s => ({ id: uid(), name: s.name, type: s.type, monthly: 0 })),
  }));
}

// ─── Componente de input isolado para evitar bug de estado compartilhado ──────
function MoneyInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [local, setLocal] = useState(value === 0 ? "" : String(value));
  const ref = useRef(false);

  // Sincroniza quando o valor externo muda (ex: carregamento do banco)
  useEffect(() => {
    if (!ref.current) {
      setLocal(value === 0 ? "" : String(value));
    }
  }, [value]);

  return (
    <input
      type="number"
      min="0"
      step="0.01"
      value={local}
      placeholder="0,00"
      onFocus={() => { ref.current = true; }}
      onChange={e => {
        setLocal(e.target.value);
        const n = parseFloat(e.target.value);
        onChange(isNaN(n) ? 0 : n);
      }}
      onBlur={() => {
        ref.current = false;
        if (local === "" || local === "0") setLocal("");
      }}
      className="w-full text-right bg-gray-50 border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-[#1A3A5C] focus:bg-white"
    />
  );
}

// ─── Componente de input de nome isolado ─────────────────────────────────────
function NameInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [local, setLocal] = useState(value);
  const ref = useRef(false);

  useEffect(() => {
    if (!ref.current) setLocal(value);
  }, [value]);

  return (
    <input
      value={local}
      onFocus={() => { ref.current = true; }}
      onChange={e => { setLocal(e.target.value); onChange(e.target.value); }}
      onBlur={() => { ref.current = false; }}
      className="w-full bg-transparent border-none text-sm text-gray-800 focus:outline-none focus:bg-white focus:border focus:border-[#1A3A5C] focus:rounded px-1 py-0.5"
    />
  );
}

const statusColor = (s: string) =>
  s === "danger" ? "text-red-700 bg-red-50 border-red-300" :
  s === "warning" ? "text-yellow-700 bg-yellow-50 border-yellow-300" :
  "text-green-700 bg-green-50 border-green-300";

// ─── Componente principal ─────────────────────────────────────────────────────
export default function FinancialDiagnostic() {
  const params = useParams<{ menteeId: string }>();
  const menteeId = Number(params.menteeId);
  const [, navigate] = useLocation();
  const { user, loading: authLoading } = useAuth();

  const [categories, setCategories] = useState<ExpenseCategory[]>(defaultCategories());
  const [faturamento, setFaturamento] = useState<number>(0);
  const [horasDisp, setHorasDisp] = useState(160);
  const [horasOcupadas, setHorasOcupadas] = useState(100);
  const [showSuggestions, setShowSuggestions] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<"despesas" | "analise" | "reducao">("despesas");

  const menteeQuery = trpc.mentor.getMentee.useQuery({ id: menteeId }, { enabled: !!menteeId });
  const menteeName = menteeQuery.data?.nome || "Mentorado";

  const { data: financialData } = trpc.mentor.getFinancial.useQuery(
    { menteeId }, { enabled: !!menteeId }
  );

  useEffect(() => {
    if (financialData && !loaded) {
      if (financialData.despesasJson && typeof financialData.despesasJson === 'object') {
        try {
          const raw = financialData.despesasJson as Record<string, unknown>;
          if (Array.isArray(raw)) {
            const savedCats = raw as ExpenseCategory[];
            if (savedCats[0]?.cat) setCategories(savedCats);
          } else if (raw.categories) {
            const savedCats = raw.categories as ExpenseCategory[];
            if (savedCats[0]?.cat) setCategories(savedCats);
            if (raw.faturamento) setFaturamento(Number(raw.faturamento));
            if (raw.horasDisp) setHorasDisp(Number(raw.horasDisp));
            if (raw.horasOcupadas) setHorasOcupadas(Number(raw.horasOcupadas));
          }
        } catch { /* usa padrão */ }
      }
      setLoaded(true);
    }
  }, [financialData, loaded]);

  const saveFinancial = trpc.mentor.updateFinancial.useMutation({
    onSuccess: () => { setSaved(true); toast.success("Diagnóstico financeiro salvo!"); },
    onError: () => toast.error("Erro ao salvar"),
  });

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

  // ─── Cálculos ────────────────────────────────────────────────────────────────
  const totals = useMemo(() => {
    const allItems = categories.flatMap(c => c.items);
    const total = allItems.reduce((s, i) => s + (i.monthly || 0), 0);
    const custoHoraDisp = horasDisp > 0 ? total / horasDisp : 0;
    const taxaOcupacao = horasDisp > 0 ? horasOcupadas / horasDisp : 0;
    const custoOciosidade = (horasDisp - horasOcupadas) * custoHoraDisp;
    const custoHoraOcupada = horasOcupadas > 0 ? total / horasOcupadas : 0;
    const margemBruta = faturamento > 0 ? (faturamento - total) / faturamento : null;
    const lucroLiquido = faturamento > 0 ? faturamento - total : null;

    const byCat = categories.map(c => {
      const catTotal = c.items.reduce((s, i) => s + (i.monthly || 0), 0);
      const pctFat = faturamento > 0 ? catTotal / faturamento : 0;
      const pctCusto = total > 0 ? catTotal / total : 0;
      const bench = BENCHMARKS[c.cat];
      const status = !bench || !pctFat ? "ok"
        : pctFat > bench.max ? "danger"
        : pctFat > bench.ideal ? "warning" : "ok";
      return { cat: c.cat, icon: c.icon, total: catTotal, pctFat, pctCusto, status };
    });

    return { total, custoHoraDisp, custoHoraOcupada, taxaOcupacao, custoOciosidade, margemBruta, lucroLiquido, byCat };
  }, [categories, horasDisp, horasOcupadas, faturamento]);

  // ─── Análise de pontos de atenção ────────────────────────────────────────────
  const alertas = useMemo(() => {
    const result: { nivel: "danger" | "warning" | "ok"; titulo: string; descricao: string; acao: string }[] = [];

    if (faturamento > 0) {
      if (totals.margemBruta !== null && totals.margemBruta < 0.15) {
        result.push({
          nivel: "danger",
          titulo: "Margem crítica — risco de insolvência",
          descricao: `Margem bruta de ${fmtPct(totals.margemBruta)}. Clínicas com margem abaixo de 15% têm 68% de chance de fechar em 2 anos (SEBRAE 2023). O ponto de equilíbrio está sendo atingido, mas qualquer queda de faturamento compromete o pagamento de custos fixos.`,
          acao: "Prioridade máxima: identificar os 3 maiores custos e negociar redução de 20% em cada um nos próximos 30 dias."
        });
      } else if (totals.margemBruta !== null && totals.margemBruta < 0.30) {
        result.push({
          nivel: "warning",
          titulo: "Margem abaixo do ideal para crescimento",
          descricao: `Margem bruta de ${fmtPct(totals.margemBruta)}. Clínicas saudáveis operam com 30–45% de margem. Com margem atual, não há capital para investir em crescimento, equipamentos ou reserva de emergência.`,
          acao: "Meta: elevar margem para 30% nos próximos 6 meses — combinando aumento de faturamento e redução de custos variáveis."
        });
      }

      if (totals.taxaOcupacao < 0.60) {
        const custoOciosidadeMensal = totals.custoOciosidade;
        result.push({
          nivel: "danger",
          titulo: `Ociosidade crítica — ${fmt(custoOciosidadeMensal)}/mês desperdiçado`,
          descricao: `Taxa de ocupação de ${fmtPct(totals.taxaOcupacao)}. Cada hora vazia custa ${fmt(totals.custoHoraDisp)} em custos fixos. Com ${horasDisp - horasOcupadas} horas ociosas/mês, o desperdício é de ${fmt(custoOciosidadeMensal)}/mês — dinheiro que sai sem gerar receita.`,
          acao: "Estratégia imediata: lista de espera ativa, encaixe de retornos e telemedicina para preencher horários vagos."
        });
      }

      totals.byCat.forEach(c => {
        if (c.status === "danger" && c.total > 0) {
          const bench = BENCHMARKS[c.cat];
          result.push({
            nivel: "danger",
            titulo: `${c.cat} acima do limite — ${fmtPct(c.pctFat)} do faturamento`,
            descricao: `${bench?.insight || ""} O ideal é no máximo ${bench?.label}. Com ${fmt(c.total)}/mês nesta categoria, há ${fmt(c.total - (faturamento * (bench?.ideal || 0)))}/mês acima do benchmark.`,
            acao: `Revisar cada item desta categoria e identificar o que pode ser renegociado, terceirizado ou eliminado.`
          });
        }
      });
    }

    // Alertas de categorias zeradas importantes
    const transporteTotal = categories.find(c => c.cat === "TRANSPORTE E DESLOCAMENTO")?.items.reduce((s, i) => s + i.monthly, 0) || 0;
    if (transporteTotal === 0) {
      result.push({
        nivel: "warning",
        titulo: "Transporte e deslocamento não contabilizado",
        descricao: "Médicos que trabalham em 2+ locais gastam em média R$1.200–2.800/mês em combustível, pedágio, estacionamento e deslocamento. Este custo raramente aparece no controle financeiro.",
        acao: "Calcule: quantos km você percorre por mês para trabalho × preço do combustível ÷ consumo do veículo + pedágios + estacionamentos."
      });
    }

    const seguroRC = categories.flatMap(c => c.items).find(i => i.name.toLowerCase().includes("responsabilidade civil") && i.monthly > 0);
    if (!seguroRC) {
      result.push({
        nivel: "warning",
        titulo: "Seguro de responsabilidade civil não identificado",
        descricao: "O seguro RC médico é obrigatório e frequentemente esquecido no controle financeiro. Uma ação judicial sem cobertura pode comprometer anos de patrimônio.",
        acao: "Verifique se possui seguro RC ativo e inclua o custo mensal (rateio do prêmio anual) no diagnóstico."
      });
    }

    return result;
  }, [totals, categories, faturamento, horasDisp, horasOcupadas]);

  // ─── Recomendações de redução de custos ──────────────────────────────────────
  const recomendacoes = useMemo(() => {
    const result: {
      categoria: string;
      icon: string;
      potencial: number;
      prazo: string;
      dificuldade: "Fácil" | "Médio" | "Difícil";
      acao: string;
      detalhe: string;
      perguntaMentorado: string;
    }[] = [];

    const infra = categories.find(c => c.cat === "INFRAESTRUTURA");
    const aluguel = infra?.items.find(i => i.name.toLowerCase().includes("aluguel"));
    if (aluguel && aluguel.monthly > 0 && faturamento > 0 && aluguel.monthly / faturamento > 0.12) {
      result.push({
        categoria: "Infraestrutura",
        icon: "🏢",
        potencial: aluguel.monthly * 0.30,
        prazo: "3–6 meses",
        dificuldade: "Difícil",
        acao: "Renegociar aluguel ou migrar para coworking médico",
        detalhe: `Aluguel atual representa ${fmtPct(aluguel.monthly / faturamento)} do faturamento — acima do limite saudável de 12%. Coworkings médicos em capitais custam R$800–2.500/mês por turno vs. salas próprias de R$3.000–8.000/mês. Redução potencial: ${fmt(aluguel.monthly * 0.30)}/mês.`,
        perguntaMentorado: "Você realmente precisa de sala exclusiva 5 dias por semana, ou 3 dias atenderia sua demanda atual?"
      });
    }

    const pessoal = categories.find(c => c.cat === "PESSOAL (CLT / PJ)");
    const pessoalTotal = pessoal?.items.reduce((s, i) => s + i.monthly, 0) || 0;
    if (pessoalTotal > 0 && faturamento > 0 && pessoalTotal / faturamento > 0.30) {
      result.push({
        categoria: "Pessoal",
        icon: "👥",
        potencial: pessoalTotal * 0.25,
        prazo: "1–3 meses",
        dificuldade: "Médio",
        acao: "Migrar recepcionista CLT para recepcionista virtual PJ",
        detalhe: `Custo total com pessoal representa ${fmtPct(pessoalTotal / faturamento)} do faturamento. Uma recepcionista CLT custa R$3.500–5.500/mês com encargos. Recepcionista virtual PJ especializada em saúde custa R$1.200–2.200/mês — economia de R$1.500–3.000/mês sem perda de qualidade.`,
        perguntaMentorado: "Quantas horas por dia sua recepcionista fica sem atividade? Ela realmente precisa ser presencial?"
      });
    }

    const mktTotal = categories.find(c => c.cat === "MARKETING E CAPTAÇÃO")?.items.reduce((s, i) => s + i.monthly, 0) || 0;
    if (mktTotal > 0) {
      result.push({
        categoria: "Marketing",
        icon: "📣",
        potencial: mktTotal * 0.35,
        prazo: "1–2 meses",
        dificuldade: "Fácil",
        acao: "Substituir agência por freelancer especializado em saúde",
        detalhe: `Agências cobram R$2.000–6.000/mês por gestão de redes sociais. Freelancers especializados em marketing médico entregam resultado equivalente por R$800–2.000/mês. Plataformas como Workana e 99Freelas têm profissionais com portfólio em saúde.`,
        perguntaMentorado: "Você consegue medir o ROI do seu investimento em marketing? Quantos pacientes novos vieram de cada canal no último mês?"
      });
    }

    const impostos = categories.find(c => c.cat === "IMPOSTOS E TAXAS");
    const impostoTotal = impostos?.items.reduce((s, i) => s + i.monthly, 0) || 0;
    if (impostoTotal > 0 && faturamento > 0 && impostoTotal / faturamento > 0.18) {
      result.push({
        categoria: "Impostos",
        icon: "🏛️",
        potencial: impostoTotal * 0.20,
        prazo: "3–6 meses",
        dificuldade: "Médio",
        acao: "Revisar regime tributário com contador especializado em saúde",
        detalhe: `Carga tributária de ${fmtPct(impostoTotal / faturamento)} do faturamento. Médicos com faturamento acima de R$360k/ano frequentemente pagam mais no Simples Nacional que no Lucro Presumido. A diferença pode ser de R$800–2.500/mês. Exige análise com contador especializado em PJ médica.`,
        perguntaMentorado: "Quando foi a última vez que seu contador fez uma simulação comparando Simples Nacional vs. Lucro Presumido para o seu faturamento atual?"
      });
    }

    const cartao = impostos?.items.find(i => i.name.toLowerCase().includes("cartão") && i.monthly > 0);
    if (cartao && cartao.monthly > 0) {
      result.push({
        categoria: "Taxa de Cartão",
        icon: "💳",
        potencial: cartao.monthly * 0.40,
        prazo: "2–4 semanas",
        dificuldade: "Fácil",
        acao: "Renegociar taxa da maquininha ou trocar de operadora",
        detalhe: `Taxa atual estimada em ${fmt(cartao.monthly)}/mês. Operadoras como Stone, PagSeguro e Cielo oferecem taxas de 1,5–2,0% para débito e 2,5–3,5% para crédito à vista para clínicas com volume acima de R$15k/mês. Ligar para a operadora atual e apresentar proposta concorrente geralmente resulta em redução imediata.`,
        perguntaMentorado: "Você sabe qual é a taxa exata que paga por cada tipo de transação? Já ligou para renegociar nos últimos 12 meses?"
      });
    }

    const terceirizados = categories.find(c => c.cat === "TERCEIRIZADOS E SERVIÇOS");
    const contabilidade = terceirizados?.items.find(i => i.name.toLowerCase().includes("contabilidade") && i.monthly > 0);
    if (contabilidade && contabilidade.monthly > 1500) {
      result.push({
        categoria: "Contabilidade",
        icon: "📊",
        potencial: contabilidade.monthly * 0.50,
        prazo: "1–2 meses",
        dificuldade: "Fácil",
        acao: "Migrar para contabilidade online especializada em PJ médica",
        detalhe: `Contabilidade atual de ${fmt(contabilidade.monthly)}/mês. Plataformas como Contabilizei, Agilize e Agilize oferecem serviço completo para PJ médica por R$200–600/mês — incluindo DAS, IRPJ, folha de pagamento e declarações. Economia potencial de ${fmt(contabilidade.monthly * 0.50)}/mês.`,
        perguntaMentorado: "Seu contador é especializado em PJ médica? Ele te avisa proativamente sobre oportunidades de economia tributária?"
      });
    }

    return result.sort((a, b) => b.potencial - a.potencial);
  }, [categories, faturamento]);

  // ─── Handlers ────────────────────────────────────────────────────────────────
  const updateItem = (catId: string, itemId: string, field: keyof ExpenseItem, value: string | number) => {
    setCategories(prev => prev.map(c => c.id !== catId ? c : {
      ...c, items: c.items.map(i => i.id !== itemId ? i : {
        ...i, [field]: field === "monthly" ? (typeof value === "number" ? value : parseFloat(String(value)) || 0) : value
      })
    }));
    setSaved(false);
  };

  const addItem = (catId: string, suggestion?: { name: string; type: "Fixo" | "Semifixo" | "Variável" }) => {
    setCategories(prev => prev.map(c => c.id !== catId ? c : {
      ...c, items: [...c.items, { id: uid(), name: suggestion?.name || "Nova despesa", type: suggestion?.type || "Fixo", monthly: 0 }]
    }));
    setSaved(false);
  };

  const removeItem = (catId: string, itemId: string) => {
    setCategories(prev => prev.map(c => c.id !== catId ? c : { ...c, items: c.items.filter(i => i.id !== itemId) }));
    setSaved(false);
  };

  const toggleCollapse = (catId: string) => {
    setCategories(prev => prev.map(c => c.id === catId ? { ...c, collapsed: !c.collapsed } : c));
  };

  const getSuggestionsForCat = (catName: string) => {
    const existing = categories.find(c => c.cat === catName)?.items.map(i => i.name.toLowerCase()) || [];
    return (CATALOG[catName] || []).filter(s => !existing.some(e => e.includes(s.name.toLowerCase().slice(0, 8))));
  };

  const handleSave = () => {
    saveFinancial.mutate({
      menteeId,
      despesasJson: { categories, faturamento, horasDisp, horasOcupadas } as unknown as Record<string, unknown>[],
    });
  };

  const totalPotencialReducao = recomendacoes.reduce((s, r) => s + r.potencial, 0);

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#1A3A5C] text-white px-6 py-4 flex items-center gap-4 sticky top-0 z-10">
        <button onClick={() => navigate(`/mentor/mentorado/${menteeId}`)} className="hover:opacity-70 transition-opacity">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-lg font-bold flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-[#C9A84C]" />
            Diagnóstico Financeiro
          </h1>
          <p className="text-xs opacity-70">{menteeName}</p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          {saved && <span className="text-green-300 text-sm flex items-center gap-1"><CheckCircle className="w-4 h-4" />Salvo</span>}
          {alertas.filter(a => a.nivel === "danger").length > 0 && (
            <Badge className="bg-red-500 text-white border-0">
              {alertas.filter(a => a.nivel === "danger").length} alertas críticos
            </Badge>
          )}
          <Button onClick={handleSave} size="sm" className="bg-[#C9A84C] hover:bg-[#b8963d] text-white border-0">
            <Save className="w-4 h-4 mr-1" /> Salvar
          </Button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-6 space-y-6">

        {/* Faturamento e horas */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-bold text-[#1A3A5C] mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[#C9A84C]" />
            Dados de Referência
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Faturamento Bruto Mensal (R$)</label>
              <input type="number" value={faturamento || ""} placeholder="Ex: 45000"
                onChange={e => { setFaturamento(Number(e.target.value)); setSaved(false); }}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3A5C]" />
              <p className="text-xs text-gray-400 mt-1">Tudo que entra: consultas, procedimentos, plantões</p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Horas Disponíveis/Mês</label>
              <input type="number" value={horasDisp}
                onChange={e => { setHorasDisp(Number(e.target.value)); setSaved(false); }}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3A5C]" />
              <p className="text-xs text-gray-400 mt-1">Horas totais que a sala poderia estar ocupada</p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Horas Efetivamente Ocupadas/Mês</label>
              <input type="number" value={horasOcupadas}
                onChange={e => { setHorasOcupadas(Number(e.target.value)); setSaved(false); }}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3A5C]" />
              <p className="text-xs text-gray-400 mt-1">Horas com paciente ou procedimento</p>
            </div>
          </div>
        </div>

        {/* KPIs */}
        {totals.total > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Total de Custos/Mês", value: fmt(totals.total), sub: faturamento > 0 ? `${fmtPct(totals.total / faturamento)} do faturamento` : "Preencha o faturamento", accent: "border-l-red-400", icon: <TrendingDown className="w-4 h-4 text-red-400" /> },
              { label: "Margem Bruta", value: totals.margemBruta !== null ? fmtPct(totals.margemBruta) : "—", sub: totals.lucroLiquido !== null ? `${fmt(totals.lucroLiquido)}/mês` : "—", accent: totals.margemBruta !== null && totals.margemBruta < 0.20 ? "border-l-red-400" : "border-l-green-400", icon: <TrendingUp className="w-4 h-4 text-green-400" /> },
              { label: "Custo/Hora (com sala vazia)", value: fmt(totals.custoHoraDisp), sub: "Mesmo sem atender", accent: "border-l-blue-400", icon: <DollarSign className="w-4 h-4 text-blue-400" /> },
              { label: "Custo da Ociosidade/Mês", value: fmt(totals.custoOciosidade), sub: `${horasDisp - horasOcupadas}h sem paciente`, accent: "border-l-orange-400", icon: <AlertCircle className="w-4 h-4 text-orange-400" /> },
            ].map((kpi, i) => (
              <div key={i} className={`bg-white rounded-xl border border-gray-200 border-l-4 ${kpi.accent} p-4`}>
                <div className="flex items-center justify-between mb-1">{kpi.icon}<span className="text-xs text-gray-400">{kpi.label}</span></div>
                <div className="text-xl font-bold text-[#1A3A5C]">{kpi.value}</div>
                <div className="text-xs text-gray-500 mt-0.5">{kpi.sub}</div>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {[
            { id: "despesas", label: "📋 Mapeamento de Custos" },
            { id: "analise", label: `🔍 Análise Profunda${alertas.length > 0 ? ` (${alertas.length})` : ""}` },
            { id: "reducao", label: `✂️ Plano de Redução${recomendacoes.length > 0 ? ` (${recomendacoes.length})` : ""}` },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${activeTab === tab.id ? "bg-white shadow text-[#1A3A5C]" : "text-gray-500 hover:text-gray-700"}`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab: Despesas */}
        {activeTab === "despesas" && (
          <div className="space-y-3">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-blue-800">
                <strong>Como usar:</strong> Expanda cada categoria, preencha os valores mensais de cada despesa e clique em "Ver sugestões" para descobrir custos que você pode estar esquecendo. Clique em "+ Adicionar linha" para incluir despesas personalizadas.
              </p>
            </div>

            {categories.map(cat => {
              const catTotal = cat.items.reduce((s, i) => s + (i.monthly || 0), 0);
              const pctFat = faturamento > 0 ? catTotal / faturamento : null;
              const bench = BENCHMARKS[cat.cat];
              const catStatus = !bench || !pctFat ? "ok"
                : pctFat > bench.max ? "danger"
                : pctFat > bench.ideal ? "warning" : "ok";
              const suggestions = getSuggestionsForCat(cat.cat);

              return (
                <div key={cat.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => toggleCollapse(cat.id)}>
                    <div className="flex items-center gap-3">
                      {cat.collapsed ? <ChevronRight className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                      <span className="text-lg">{cat.icon}</span>
                      <span className="font-bold text-[#1A3A5C] text-sm">{cat.cat}</span>
                      {bench && <span className="text-xs text-gray-400 hidden md:inline">Benchmark: {bench.label}</span>}
                      {suggestions.length > 0 && (
                        <Badge variant="outline" className="text-xs border-amber-400 text-amber-700 bg-amber-50">
                          <Lightbulb className="w-3 h-3 mr-1" />{suggestions.length} sugestões
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      {pctFat !== null && catTotal > 0 && (
                        <span className={`text-xs font-bold px-2 py-0.5 rounded border ${statusColor(catStatus)}`}>
                          {fmtPct(pctFat)} do fat.
                        </span>
                      )}
                      <span className="text-sm font-bold text-[#1A3A5C]">{fmt(catTotal)}/mês</span>
                    </div>
                  </div>

                  {!cat.collapsed && (
                    <div className="px-5 pb-4">
                      {bench && catTotal > 0 && pctFat !== null && catStatus !== "ok" && (
                        <div className={`mb-3 p-2 rounded-lg text-xs flex items-start gap-2 ${catStatus === "danger" ? "bg-red-50 border border-red-200 text-red-800" : "bg-yellow-50 border border-yellow-200 text-yellow-800"}`}>
                          <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                          <span>{bench.insight}</span>
                        </div>
                      )}

                      <table className="w-full text-sm mb-3">
                        <thead>
                          <tr className="border-b border-gray-100">
                            <th className="text-left py-2 text-xs text-gray-500 font-medium">Despesa</th>
                            <th className="text-center py-2 text-xs text-gray-500 font-medium w-24">Tipo</th>
                            <th className="text-right py-2 text-xs text-gray-500 font-medium w-36">Valor Mensal (R$)</th>
                            {faturamento > 0 && <th className="text-right py-2 text-xs text-gray-500 font-medium w-20">% Fat.</th>}
                            <th className="w-8"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {cat.items.map(item => (
                            <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50 group">
                              <td className="py-1.5 pr-2">
                                <NameInput value={item.name} onChange={v => updateItem(cat.id, item.id, "name", v)} />
                              </td>
                              <td className="py-1.5 px-2 text-center">
                                <select value={item.type}
                                  onChange={e => updateItem(cat.id, item.id, "type", e.target.value)}
                                  className="text-xs bg-gray-100 border-none rounded px-2 py-1 focus:outline-none">
                                  <option>Fixo</option>
                                  <option>Semifixo</option>
                                  <option>Variável</option>
                                </select>
                              </td>
                              <td className="py-1.5 pl-2">
                                <MoneyInput value={item.monthly} onChange={v => updateItem(cat.id, item.id, "monthly", v)} />
                              </td>
                              {faturamento > 0 && (
                                <td className="py-1.5 pl-2 text-right">
                                  <span className={`text-xs font-medium ${
                                    item.monthly / faturamento > 0.10 ? "text-red-600" :
                                    item.monthly / faturamento > 0.05 ? "text-yellow-600" : "text-gray-500"
                                  }`}>
                                    {item.monthly > 0 ? fmtPct(item.monthly / faturamento) : "—"}
                                  </span>
                                </td>
                              )}
                              <td className="py-1.5 pl-2">
                                <button onClick={() => removeItem(cat.id, item.id)}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-600">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t border-gray-200">
                            <td colSpan={2} className="py-2 text-xs font-bold text-gray-500">SUBTOTAL</td>
                            <td className="py-2 text-right font-bold text-[#1A3A5C]">{fmt(catTotal)}</td>
                            {faturamento > 0 && (
                              <td className={`py-2 text-right text-xs font-bold ${statusColor(catStatus).split(" ")[0]}`}>
                                {pctFat !== null && catTotal > 0 ? fmtPct(pctFat) : "—"}
                              </td>
                            )}
                            <td></td>
                          </tr>
                        </tfoot>
                      </table>

                      <div className="flex items-center gap-2 flex-wrap">
                        <button onClick={() => addItem(cat.id)}
                          className="flex items-center gap-1 text-xs text-[#1A3A5C] hover:text-[#C9A84C] transition-colors border border-dashed border-[#1A3A5C] rounded px-3 py-1.5">
                          <Plus className="w-3 h-3" /> Adicionar linha
                        </button>
                        {suggestions.length > 0 && (
                          <button onClick={() => setShowSuggestions(showSuggestions === cat.id ? null : cat.id)}
                            className="flex items-center gap-1 text-xs text-amber-700 border border-dashed border-amber-400 rounded px-3 py-1.5 bg-amber-50 hover:bg-amber-100 transition-colors">
                            {showSuggestions === cat.id ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            {showSuggestions === cat.id ? "Ocultar" : `Ver ${suggestions.length} sugestão${suggestions.length > 1 ? "ões" : ""} de custos esquecidos`}
                          </button>
                        )}
                      </div>

                      {showSuggestions === cat.id && suggestions.length > 0 && (
                        <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                          <p className="text-xs font-bold text-amber-800 mb-2 flex items-center gap-1">
                            <Lightbulb className="w-3 h-3" /> Você pode estar esquecendo estes custos em {cat.cat}:
                          </p>
                          <div className="space-y-1 max-h-72 overflow-y-auto">
                            {suggestions.map((s, i) => (
                              <div key={i} className="flex items-start justify-between gap-2 py-1.5 border-b border-amber-100 last:border-0">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs font-medium text-amber-900">{s.name}</span>
                                    <Badge variant="outline" className={`text-xs py-0 ${
                                      s.priority === "alta" ? "border-red-400 text-red-700" :
                                      s.priority === "média" ? "border-yellow-500 text-yellow-700" :
                                      "border-gray-400 text-gray-600"
                                    }`}>{s.priority}</Badge>
                                    <span className="text-xs text-gray-500">{s.type}</span>
                                  </div>
                                  <p className="text-xs text-amber-700 mt-0.5">{s.hint}</p>
                                  {s.reducaoTip && (
                                    <p className="text-xs text-green-700 mt-0.5 flex items-center gap-1">
                                      <Scissors className="w-3 h-3" /> {s.reducaoTip}
                                    </p>
                                  )}
                                </div>
                                <button onClick={() => { addItem(cat.id, s); setShowSuggestions(null); }}
                                  className="flex-shrink-0 text-xs bg-amber-600 text-white rounded px-2 py-1 hover:bg-amber-700 transition-colors">
                                  + Adicionar
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Tab: Análise Profunda */}
        {activeTab === "analise" && (
          <div className="space-y-4">
            {totals.total === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Preencha os valores na aba "Mapeamento de Custos" para ver a análise profunda.</p>
              </div>
            ) : (
              <>
                {/* Composição dos custos */}
                <div className="bg-[#1A3A5C] text-white rounded-xl p-5">
                  <h2 className="font-bold mb-4 flex items-center gap-2">
                    <TrendingDown className="w-4 h-4 text-[#C9A84C]" />
                    Onde está escoando o dinheiro — Composição dos Custos
                  </h2>
                  <div className="space-y-2">
                    {totals.byCat.filter(c => c.total > 0).sort((a, b) => b.total - a.total).map((c, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-sm w-8">{c.icon}</span>
                        <span className="text-sm opacity-80 flex-1 truncate">{c.cat}</span>
                        <div className="w-32 h-2 bg-white/20 rounded-full overflow-hidden">
                          <div className="h-full bg-[#C9A84C] rounded-full" style={{ width: `${c.pctCusto * 100}%` }} />
                        </div>
                        <span className="text-xs opacity-60 w-10 text-right">{fmtPct(c.pctCusto)}</span>
                        <span className="text-sm font-bold w-28 text-right">{fmt(c.total)}</span>
                        {faturamento > 0 && (
                          <span className={`text-xs w-20 text-right font-medium ${
                            c.status === "danger" ? "text-red-300" :
                            c.status === "warning" ? "text-yellow-300" : "text-green-300"
                          }`}>{fmtPct(c.pctFat)} fat.</span>
                        )}
                      </div>
                    ))}
                    <div className="flex items-center gap-3 pt-2 border-t border-white/20">
                      <span className="text-sm w-8"></span>
                      <span className="text-sm font-bold flex-1">TOTAL GERAL</span>
                      <div className="w-32"></div>
                      <span className="text-xs w-10"></span>
                      <span className="text-lg font-bold w-28 text-right text-[#C9A84C]">{fmt(totals.total)}</span>
                      {faturamento > 0 && (
                        <span className="text-sm font-bold w-20 text-right text-[#C9A84C]">
                          {fmtPct(totals.total / faturamento)} fat.
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Alertas */}
                {alertas.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-bold text-[#1A3A5C] flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                      Pontos de Atenção — Análise Baseada em Dados do Mercado Médico
                    </h3>
                    {alertas.map((a, i) => (
                      <div key={i} className={`rounded-xl border p-4 ${
                        a.nivel === "danger" ? "bg-red-50 border-red-200" : "bg-yellow-50 border-yellow-200"
                      }`}>
                        <div className="flex items-start gap-3">
                          <div className={`mt-0.5 ${a.nivel === "danger" ? "text-red-500" : "text-yellow-500"}`}>
                            {a.nivel === "danger" ? <AlertTriangle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                          </div>
                          <div className="flex-1">
                            <h4 className={`font-bold text-sm mb-1 ${a.nivel === "danger" ? "text-red-800" : "text-yellow-800"}`}>
                              {a.titulo}
                            </h4>
                            <p className={`text-sm mb-2 ${a.nivel === "danger" ? "text-red-700" : "text-yellow-700"}`}>
                              {a.descricao}
                            </p>
                            <div className={`text-xs font-medium flex items-start gap-1 ${a.nivel === "danger" ? "text-red-800" : "text-yellow-800"}`}>
                              <Zap className="w-3 h-3 mt-0.5 flex-shrink-0" />
                              <span><strong>Ação recomendada:</strong> {a.acao}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Perguntas diagnósticas para a sessão */}
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h3 className="font-bold text-[#1A3A5C] mb-3 flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-[#C9A84C]" />
                    Perguntas para Usar na Sessão com o Mentorado
                  </h3>
                  <div className="space-y-3">
                    {[
                      {
                        q: "Se você somasse todos os seus custos mensais agora, de cabeça, qual seria o número?",
                        why: `A maioria dos médicos subestima em 30–50%. A diferença entre o que ele diz e os ${fmt(totals.total)} que calculamos aqui é o ponto de entrada da conversa.`
                      },
                      {
                        q: "Você sabe quanto custa sua sala por hora — mesmo quando ela está vazia?",
                        why: `Com os dados acima, o custo real é ${fmt(totals.custoHoraDisp)}/hora disponível. Isso significa que cada hora vazia custa dinheiro real, não é apenas "hora perdida".`
                      },
                      {
                        q: "Qual dessas despesas você nunca havia pensado que era um custo do negócio?",
                        why: "Revela o ponto cego financeiro — onde o dinheiro some sem que ele perceba. Frequentemente é transporte, encargos trabalhistas ou provisões."
                      },
                      {
                        q: "Se você precisasse cortar 20% dos custos amanhã, por onde começaria?",
                        why: "Força priorização e ação concreta. Sai da análise para a decisão. A resposta revela o nível de consciência financeira do mentorado."
                      },
                      {
                        q: "Quanto do seu faturamento sobra para você no final do mês, depois de pagar tudo?",
                        why: totals.margemBruta !== null
                          ? `A margem calculada é ${fmtPct(totals.margemBruta)}. Se a percepção dele for diferente, há custos não contabilizados ou retiradas acima do pró-labore.`
                          : "Confrontar a percepção com a realidade calculada é o momento de maior impacto da sessão."
                      },
                    ].map((item, i) => (
                      <div key={i} className="border-l-4 border-[#C9A84C] pl-4 py-2">
                        <p className="font-medium text-sm italic text-[#1A3A5C]">"{item.q}"</p>
                        <p className="text-xs text-gray-500 mt-1">→ {item.why}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Tab: Plano de Redução */}
        {activeTab === "reducao" && (
          <div className="space-y-4">
            {recomendacoes.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                <Scissors className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Preencha os valores na aba "Mapeamento de Custos" para ver o plano de redução personalizado.</p>
              </div>
            ) : (
              <>
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-4">
                  <div className="bg-green-100 rounded-full p-3">
                    <Target className="w-6 h-6 text-green-700" />
                  </div>
                  <div>
                    <p className="font-bold text-green-800">Potencial de Redução Identificado</p>
                    <p className="text-2xl font-bold text-green-700">{fmt(totalPotencialReducao)}/mês</p>
                    <p className="text-sm text-green-600">{fmt(totalPotencialReducao * 12)}/ano — sem reduzir qualidade de atendimento</p>
                  </div>
                </div>

                <h3 className="font-bold text-[#1A3A5C] flex items-center gap-2">
                  <Scissors className="w-4 h-4 text-[#C9A84C]" />
                  Recomendações Priorizadas por Potencial de Economia
                </h3>

                {recomendacoes.map((r, i) => (
                  <div key={i} className="bg-white rounded-xl border border-gray-200 p-5">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{r.icon}</span>
                        <div>
                          <h4 className="font-bold text-[#1A3A5C]">{r.acao}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className={`text-xs ${
                              r.dificuldade === "Fácil" ? "border-green-400 text-green-700" :
                              r.dificuldade === "Médio" ? "border-yellow-400 text-yellow-700" :
                              "border-red-400 text-red-700"
                            }`}>{r.dificuldade}</Badge>
                            <span className="text-xs text-gray-500">Prazo: {r.prazo}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs text-gray-500">Economia estimada</p>
                        <p className="text-xl font-bold text-green-600">{fmt(r.potencial)}/mês</p>
                        <p className="text-xs text-green-500">{fmt(r.potencial * 12)}/ano</p>
                      </div>
                    </div>

                    <p className="text-sm text-gray-700 mb-3">{r.detalhe}</p>

                    <div className="bg-[#1A3A5C]/5 rounded-lg p-3 border-l-4 border-[#C9A84C]">
                      <p className="text-xs font-bold text-[#1A3A5C] mb-1 flex items-center gap-1">
                        <Lightbulb className="w-3 h-3" /> Pergunta para fazer ao mentorado:
                      </p>
                      <p className="text-sm italic text-[#1A3A5C]">"{r.perguntaMentorado}"</p>
                    </div>
                  </div>
                ))}

                {/* Resumo para o mentorado */}
                <div className="bg-[#1A3A5C] text-white rounded-xl p-5">
                  <h3 className="font-bold mb-3 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-[#C9A84C]" />
                    Resumo para Apresentar ao Mentorado
                  </h3>
                  <div className="space-y-2 text-sm">
                    <p className="opacity-90">
                      "Com base no diagnóstico financeiro, identificamos <strong>{fmt(totals.total)}/mês</strong> em custos totais
                      {faturamento > 0 ? ` — representando ${fmtPct(totals.total / faturamento)} do seu faturamento` : ""}.
                      {totals.margemBruta !== null ? ` Sua margem bruta atual é de ${fmtPct(totals.margemBruta)}.` : ""}
                    </p>
                    <p className="opacity-90">
                      Identificamos <strong>{recomendacoes.length} oportunidades de redução</strong> que podem liberar
                      <strong className="text-[#C9A84C]"> {fmt(totalPotencialReducao)}/mês</strong> sem comprometer a qualidade do atendimento.
                      Isso equivale a <strong>{fmt(totalPotencialReducao * 12)}/ano</strong> que hoje está sendo desperdiçado."
                    </p>
                    {totals.custoOciosidade > 500 && (
                      <p className="opacity-90">
                        "Além disso, a ociosidade da sua agenda está custando <strong>{fmt(totals.custoOciosidade)}/mês</strong>.
                        Preencher esses horários é a forma mais rápida de melhorar a margem sem cortar nenhum custo."
                      </p>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
