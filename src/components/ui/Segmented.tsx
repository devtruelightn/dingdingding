import { cn } from "@/lib/cn";

interface SegmentedProps<T extends string | number> {
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  label?: string;
  renderLabel?: (option: T) => string;
}

/** 2~4개의 배타적 선택지를 한 줄로 보여주는 탭 컨트롤. */
export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  label,
  renderLabel = String,
}: SegmentedProps<T>) {
  return (
    <div
      className="inline-flex rounded-full border border-line bg-subtle p-1"
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
            "min-h-9 min-w-[88px] rounded-full px-4 text-sm font-semibold transition-all duration-150",
            value === option
              ? "bg-card text-primary-dark shadow-soft"
              : "text-muted hover:text-ink",
          )}
        >
          {renderLabel(option)}
        </button>
      ))}
    </div>
  );
}
