/**
 * ExpenseTool — Ferramenta de levantamento de despesas fixas do mentorado
 *
 * Tab 1: Despesas Fixas — accordion com 9 categorias e ~55 subcategorias
 * Tab 2: Mapa de Sala — formulario de ocupacao de consultorio
 *
 * REGRA CRITICA: Nenhum total, analise ou resultado calculado e exibido ao mentorado.
 * Os hints apenas orientam o preenchimento de mais dados.
 */
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import {
  Building2,
  Users,
  Cpu,
  FileText,
  Megaphone,
  Car,
  GraduationCap,
  Shield,
  MoreHorizontal,
  Info,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import {
  EXPENSE_CATEGORIES,
  TOTAL_EXPENSE_ITEMS,
} from "../../../shared/expense-categories";
import type { ExpenseCategory } from "../../../shared/expense-categories";

// ============================================================
// TIPOS
// ============================================================
interface ExpenseToolProps {
  pillarId: number;
  onComplete?: () => void;
}

type ExpenseValues = Record<string, number>;

interface MapaSala {
  diasSemana: string[];
  turnoManha: number;
  turnoTarde: number;
  semanasMes: number;
  horasOcupadas: number;
  faturamentoMensal: number;
}

const DEFAULT_MAPA_SALA: MapaSala = {
  diasSemana: [],
  turnoManha: 0,
  turnoTarde: 0,
  semanasMes: 4,
  horasOcupadas: 0,
  faturamentoMensal: 0,
};

// ============================================================
// MAPA DE ICONES
// ============================================================
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Building2,
  Users,
  Cpu,
  FileText,
  Megaphone,
  Car,
  GraduationCap,
  Shield,
  MoreHorizontal,
};

const DIAS_SEMANA = [
  { id: "seg", label: "Seg" },
  { id: "ter", label: "Ter" },
  { id: "qua", label: "Qua" },
  { id: "qui", label: "Qui" },
  { id: "sex", label: "Sex" },
  { id: "sab", label: "Sab" },
];

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
export function ExpenseTool({ pillarId, onComplete }: ExpenseToolProps) {
  const [expenses, setExpenses] = useState<ExpenseValues>({});
  const [mapaSala, setMapaSala] = useState<MapaSala>(DEFAULT_MAPA_SALA);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState("despesas");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // tRPC
  const { data: savedData } = trpc.portal.getMyExpenses.useQuery();
  const saveMutation = trpc.portal.saveExpenses.useMutation();

  // Carrega dados salvos
  useEffect(() => {
    if (savedData) {
      if (savedData.expenses) {
        setExpenses(savedData.expenses as ExpenseValues);
      }
      if (savedData.mapaSala) {
        setMapaSala({ ...DEFAULT_MAPA_SALA, ...(savedData.mapaSala as MapaSala) });
      }
    }
  }, [savedData]);

  // Auto-save com debounce de 1.5s
  const triggerSave = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSaving(true);
      try {
        await saveMutation.mutateAsync({
          expenses,
          mapaSala,
        });
        setLastSaved(new Date());
        toast.success("Salvo automaticamente", {
          duration: 2000,
          id: "expense-autosave",
        });
      } catch {
        toast.error("Erro ao salvar. Tente novamente.");
      } finally {
        setSaving(false);
      }
    }, 1500);
  }, [pillarId, expenses, mapaSala, saveMutation]);

  // Dispara auto-save ao mudar dados
  const isInitialLoad = useRef(true);
  useEffect(() => {
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      return;
    }
    triggerSave();
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [expenses, mapaSala]);

  // Handlers
  const setExpenseValue = useCallback((categoryId: string, subcategoryId: string, value: number) => {
    const key = `${categoryId}.${subcategoryId}`;
    setExpenses((prev) => ({ ...prev, [key]: value }));
  }, []);

  const getExpenseValue = useCallback(
    (categoryId: string, subcategoryId: string): number => {
      return expenses[`${categoryId}.${subcategoryId}`] ?? 0;
    },
    [expenses]
  );

  // Contagem de itens preenchidos
  const filledCount = useMemo(() => {
    return Object.values(expenses).filter((v) => v > 0).length;
  }, [expenses]);

  const getFilledCountForCategory = useCallback(
    (cat: ExpenseCategory): number => {
      return cat.subcategories.filter(
        (sub) => (expenses[`${cat.id}.${sub.id}`] ?? 0) > 0
      ).length;
    },
    [expenses]
  );

  const isCategoryAllZero = useCallback(
    (cat: ExpenseCategory): boolean => {
      return cat.subcategories.every(
        (sub) => (expenses[`${cat.id}.${sub.id}`] ?? 0) === 0
      );
    },
    [expenses]
  );

  // Category-level progress
  const totalCategories = EXPENSE_CATEGORIES.length;
  const filledCategories = useMemo(() => {
    return EXPENSE_CATEGORIES.filter(
      (cat) => cat.subcategories.some((sub) => (expenses[`${cat.id}.${sub.id}`] ?? 0) > 0)
    ).length;
  }, [expenses]);

  return (
      <div className="space-y-4">
        {/* Indicador de salvamento */}
        <div className="flex items-center gap-2">
          {saving && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="w-3 h-3 animate-spin" />
              Salvando...
            </div>
          )}
          {lastSaved && !saving && (
            <div className="flex items-center gap-1.5 text-xs text-green-600 bg-green-50 px-2.5 py-1 rounded-full border border-green-200">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Salvo às {lastSaved.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            </div>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full">
            <TabsTrigger value="despesas" className="flex-1">
              Despesas Fixas
            </TabsTrigger>
            <TabsTrigger value="mapa-sala" className="flex-1">
              Mapa de Sala
            </TabsTrigger>
          </TabsList>

          {/* ============================== */}
          {/* TAB 1: DESPESAS FIXAS          */}
          {/* ============================== */}
          <TabsContent value="despesas" className="space-y-4 mt-4">
            {/* Category progress */}
            <div className="flex items-center gap-3 mb-4 px-4 py-3 bg-muted/50 rounded-xl">
              <span className="text-sm font-medium text-foreground">
                {filledCategories}/{totalCategories} categorias preenchidas
              </span>
              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${totalCategories > 0 ? (filledCategories / totalCategories) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* Barra de progresso */}
            <div>
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>
                  {filledCount} de {TOTAL_EXPENSE_ITEMS} itens preenchidos
                </span>
                <span>
                  {Math.round((filledCount / TOTAL_EXPENSE_ITEMS) * 100)}%
                </span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{
                    width: `${(filledCount / TOTAL_EXPENSE_ITEMS) * 100}%`,
                  }}
                />
              </div>
            </div>

            {/* Accordion de categorias */}
            <Accordion type="multiple" className="space-y-2">
              {EXPENSE_CATEGORIES.map((cat) => {
                const IconComp = ICON_MAP[cat.icon];
                const filled = getFilledCountForCategory(cat);
                const total = cat.subcategories.length;
                const allZero = isCategoryAllZero(cat);

                return (
                  <AccordionItem
                    key={cat.id}
                    value={cat.id}
                    className="border rounded-lg px-4"
                  >
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-3 flex-1">
                        {IconComp && (
                          <IconComp className="w-5 h-5 text-muted-foreground shrink-0" />
                        )}
                        <span className="font-medium text-sm text-foreground">
                          {cat.label}
                        </span>
                        <Badge
                          variant="secondary"
                          className={`text-xs ml-auto mr-2 ${
                            filled === total
                              ? "bg-emerald-100 text-emerald-700"
                              : filled > 0
                              ? "bg-amber-100 text-amber-700"
                              : ""
                          }`}
                        >
                          {filled} de {total} preenchidos
                        </Badge>
                        {filled > 0 && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      {/* Zero hint */}
                      {allZero && cat.zeroHint && (
                        <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-lg flex gap-2">
                          <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                          <p className="text-xs text-blue-700 leading-relaxed">
                            {cat.zeroHint}
                          </p>
                        </div>
                      )}

                      {/* Subcategorias */}
                      <div className="space-y-3">
                        {cat.subcategories.map((sub) => {
                          const value = getExpenseValue(cat.id, sub.id);
                          return (
                            <div
                              key={sub.id}
                              className="flex items-center gap-3"
                            >
                              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                <label className="text-sm text-foreground truncate">
                                  {sub.label}
                                </label>
                                {sub.hint && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button className="text-muted-foreground hover:text-primary shrink-0">
                                        <Info className="w-3.5 h-3.5" />
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent
                                      side="top"
                                      className="max-w-xs text-xs"
                                    >
                                      {sub.hint}
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0 w-40">
                                <span className="text-sm text-muted-foreground font-medium">
                                  R$
                                </span>
                                <Input
                                  type="number"
                                  min={0}
                                  value={value || ""}
                                  onChange={(e) =>
                                    setExpenseValue(
                                      cat.id,
                                      sub.id,
                                      e.target.value === ""
                                        ? 0
                                        : Number(e.target.value)
                                    )
                                  }
                                  placeholder="0"
                                  className="h-8 text-sm"
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </TabsContent>

          {/* ============================== */}
          {/* TAB 2: MAPA DE SALA            */}
          {/* ============================== */}
          <TabsContent value="mapa-sala" className="space-y-6 mt-4">
            <p className="text-sm text-muted-foreground">
              Preencha as informacoes sobre a ocupacao do seu consultorio para
              que seu mentor possa avaliar sua estrutura.
            </p>

            {/* Dias da semana */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Dias da semana que atende
              </label>
              <div className="flex gap-3 flex-wrap">
                {DIAS_SEMANA.map((dia) => {
                  const checked = mapaSala.diasSemana.includes(dia.id);
                  return (
                    <label
                      key={dia.id}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(val) => {
                          setMapaSala((prev) => ({
                            ...prev,
                            diasSemana: val
                              ? [...prev.diasSemana, dia.id]
                              : prev.diasSemana.filter((d) => d !== dia.id),
                          }));
                        }}
                      />
                      <span className="text-sm">{dia.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Horas por turno manha */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Horas por turno (manha)
              </label>
              <Input
                type="number"
                min={0}
                max={12}
                value={mapaSala.turnoManha || ""}
                onChange={(e) =>
                  setMapaSala((prev) => ({
                    ...prev,
                    turnoManha:
                      e.target.value === "" ? 0 : Number(e.target.value),
                  }))
                }
                placeholder="Ex: 4"
                className="max-w-[200px]"
              />
            </div>

            {/* Horas por turno tarde */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Horas por turno (tarde)
              </label>
              <Input
                type="number"
                min={0}
                max={12}
                value={mapaSala.turnoTarde || ""}
                onChange={(e) =>
                  setMapaSala((prev) => ({
                    ...prev,
                    turnoTarde:
                      e.target.value === "" ? 0 : Number(e.target.value),
                  }))
                }
                placeholder="Ex: 4"
                className="max-w-[200px]"
              />
            </div>

            {/* Semanas por mes */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Semanas por mes
              </label>
              <Input
                type="number"
                min={1}
                max={5}
                value={mapaSala.semanasMes || ""}
                onChange={(e) =>
                  setMapaSala((prev) => ({
                    ...prev,
                    semanasMes:
                      e.target.value === "" ? 0 : Number(e.target.value),
                  }))
                }
                placeholder="4"
                className="max-w-[200px]"
              />
            </div>

            {/* Horas ocupadas por mes */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Horas ocupadas por mes
              </label>
              <p className="text-xs text-muted-foreground">
                Total de horas em que voce esta efetivamente atendendo pacientes
                no mes.
              </p>
              <Input
                type="number"
                min={0}
                value={mapaSala.horasOcupadas || ""}
                onChange={(e) =>
                  setMapaSala((prev) => ({
                    ...prev,
                    horasOcupadas:
                      e.target.value === "" ? 0 : Number(e.target.value),
                  }))
                }
                placeholder="Ex: 128"
                className="max-w-[200px]"
              />
            </div>

            {/* Faturamento mensal bruto */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Faturamento mensal bruto (R$)
              </label>
              <div className="flex items-center gap-1.5 max-w-[250px]">
                <span className="text-sm text-muted-foreground font-medium">
                  R$
                </span>
                <Input
                  type="number"
                  min={0}
                  value={mapaSala.faturamentoMensal || ""}
                  onChange={(e) =>
                    setMapaSala((prev) => ({
                      ...prev,
                      faturamentoMensal:
                        e.target.value === "" ? 0 : Number(e.target.value),
                    }))
                  }
                  placeholder="0"
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
  );
}
