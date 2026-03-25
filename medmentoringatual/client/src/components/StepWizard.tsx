import { ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface WizardStep {
  id: string;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
}

interface Props {
  steps: WizardStep[];
  currentStep: number;
  onStepChange: (step: number) => void;
  completedSteps: Set<string>;
  children: ReactNode;
  onFinish?: () => void;
  canAdvance?: boolean;
  /** Optional content for the footer left side (e.g. auto-save indicator) */
  footerLeft?: ReactNode;
}

export function StepWizard({
  steps, currentStep, onStepChange, completedSteps, children, onFinish, canAdvance = true, footerLeft,
}: Props) {
  const isFirst = currentStep === 0;
  const isLast = currentStep === steps.length - 1;
  const progress = steps.length > 0 ? Math.round((completedSteps.size / steps.length) * 100) : 0;

  return (
    <div className="flex flex-col h-full">
      {/* Progress bar */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-foreground">
            Etapa {currentStep + 1} de {steps.length}
          </span>
          <span className="text-sm font-semibold text-primary">{progress}%</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-primary to-secondary rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>

        {/* Step indicators — scrollable on mobile */}
        <div className="flex gap-1.5 mt-3 overflow-x-auto pb-1 scrollbar-hide">
          {steps.map((step, i) => {
            const done = completedSteps.has(step.id);
            const active = i === currentStep;
            return (
              <button
                key={step.id}
                onClick={() => (done || i <= currentStep) && onStepChange(i)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all",
                  active && "bg-primary text-primary-foreground shadow-sm",
                  done && !active && "bg-primary/10 text-primary cursor-pointer",
                  !done && !active && "bg-muted text-muted-foreground"
                )}
              >
                {done ? <Check className="w-3 h-3" /> : <span className="w-4 text-center">{i + 1}</span>}
                <span className="hidden sm:inline">{step.title}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step content with animation */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
          >
            {steps[currentStep] && (
              <div className="mb-6">
                <h2 className="text-xl font-display font-bold text-foreground">
                  {steps[currentStep].title}
                </h2>
                {steps[currentStep].subtitle && (
                  <p className="text-sm text-muted-foreground mt-1">{steps[currentStep].subtitle}</p>
                )}
              </div>
            )}
            {children}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-t border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            onClick={() => onStepChange(currentStep - 1)}
            disabled={isFirst}
            className="gap-1.5"
          >
            <ChevronLeft className="w-4 h-4" /> Anterior
          </Button>
          {footerLeft}
        </div>

        {isLast ? (
          <Button onClick={onFinish} disabled={!canAdvance} className="gap-1.5 bg-secondary text-secondary-foreground hover:bg-secondary/90">
            Concluir <Check className="w-4 h-4" />
          </Button>
        ) : (
          <Button onClick={() => onStepChange(currentStep + 1)} disabled={!canAdvance} className="gap-1.5">
            Próximo <ChevronRight className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
