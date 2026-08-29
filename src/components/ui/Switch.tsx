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
      // 트랙 자체는 24px이지만 44px 터치 타깃을 패딩으로 확보한다.
      className="-m-2.5 grid min-h-11 min-w-11 shrink-0 place-items-center p-2.5"
    >
      <span
        className={cn(
          "block h-6 w-11 rounded-full border p-0.5 transition-colors duration-150",
          checked ? "border-primary bg-primary" : "border-muted/50 bg-muted/35",
        )}
      >
        <span
          className={cn(
            "block size-5 rounded-full bg-card transition-transform duration-150",
            checked ? "translate-x-5" : "translate-x-0",
          )}
        />
      </span>
    </button>
  );
}
