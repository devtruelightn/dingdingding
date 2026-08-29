import { cn } from "@/lib/cn";

interface SegmentedProps<T extends string | number> {
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  label?: string;
  renderLabel?: (option: T) => string;
}

export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  label,
  renderLabel = String,
}: SegmentedProps<T>) {
  return (
    <div
      className="inline-flex rounded-2xl bg-primary-soft/60 p-1"
      role="tablist"
      aria-label={label}
    >
      {options.map((option) => (
        <button
          key={String(option)}
          type="button"
          role="tab"
          aria-selected={value === option}
          onClick={() => onChange(option)}
          className={cn(
            "min-h-[38px] min-w-[86px] rounded-xl px-3 text-sm font-semibold transition-colors",
            value === option
              ? "bg-solid text-primary-dark shadow-sm"
              : "text-muted hover:text-ink",
          )}
        >
          {renderLabel(option)}
        </button>
      ))}
    </div>
  );
}
