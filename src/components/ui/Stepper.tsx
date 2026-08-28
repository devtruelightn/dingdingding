import { Check } from "lucide-react";
import { cn } from "@/lib/cn";

interface StepperProps {
  steps: string[];
  current: number; // 1-based
  onStepClick: (step: number) => void;
}

export function Stepper({ steps, current, onStepClick }: StepperProps) {
  return (
    <div className="mb-4 flex items-center overflow-x-auto rounded-2xl border border-line bg-card p-2.5">
      {steps.map((label, index) => {
        const step = index + 1;
        const state = current === step ? "active" : current > step ? "done" : "todo";
        return (
          <button
            key={label}
            type="button"
            onClick={() => onStepClick(step)}
            className={cn(
              "flex min-w-[110px] flex-1 items-center justify-center gap-2 py-2",
              state === "active" && "font-extrabold text-primary-dark",
              state === "done" && "text-success",
              state === "todo" && "text-muted",
            )}
          >
            <span
              className={cn(
                "grid size-6 place-items-center rounded-full text-xs",
                state === "active" && "bg-primary text-white",
                state === "done" && "bg-success/15 text-success",
                state === "todo" && "bg-primary-soft/60",
              )}
            >
              {state === "done" ? <Check size={14} /> : step}
            </span>
            {label}
          </button>
        );
      })}
    </div>
  );
}
