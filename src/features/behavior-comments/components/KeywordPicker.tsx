"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/cn";
import { behaviorCategories } from "../keywords";

interface KeywordPickerProps {
  selected: string[];
  onToggle: (keyword: string) => void;
}

/** 관찰 키워드 다중 선택 패널. 실제로 관찰한 특징만 고르도록 안내한다. */
export function KeywordPicker({ selected, onToggle }: KeywordPickerProps) {
  return (
    <div className="glass rounded-2xl border border-line bg-card/95 p-6 backdrop-blur-md">
      <div className="flex justify-between gap-2.5">
        <div>
          <h2 className="text-lg font-bold">관찰 키워드</h2>
          <p className="mt-1 text-xs text-muted">실제로 관찰한 특징만 선택해 주세요.</p>
        </div>
        <span className="h-fit rounded-full bg-primary-soft px-2 py-1 text-[10px] font-extrabold text-primary-dark">
          {selected.length}개 선택
        </span>
      </div>
      {Object.entries(behaviorCategories).map(([category, keywords]) => (
        <div key={category} className="mt-4">
          <h3 className="mb-2 text-[11px] text-muted">{category}</h3>
          <div className="flex flex-wrap gap-1.5">
            {keywords.map((keyword) => {
              const active = selected.includes(keyword);
              return (
                <button
                  key={keyword}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onToggle(keyword)}
                  className={cn(
                    "inline-flex min-h-[34px] items-center gap-1 rounded-xl border px-2.5 text-[11px]",
                    active
                      ? "border-primary bg-primary-soft font-semibold text-primary-dark"
                      : "border-line bg-solid/60",
                  )}
                >
                  {active && <Check size={13} />}
                  {keyword}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
