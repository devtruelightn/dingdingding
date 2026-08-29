import { cn } from "@/lib/cn";

interface SwitchProps {
  checked: boolean;
  onChange: () => void;
  label?: string;
}

export function Switch({ checked, onChange, label }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={cn(
        "relative h-7 w-12 shrink-0 rounded-full p-[3px] transition-colors",
        checked ? "bg-primary" : "bg-muted/50",
      )}
    >
      <span
        className={cn(
          "block h-[22px] w-[22px] rounded-full bg-white transition-transform",
          checked && "translate-x-5",
        )}
      />
    </button>
  );
}
