"use client";

import { Check } from "lucide-react";
import { Card } from "@/components/ui";
import { cn } from "@/lib/cn";
import { behaviorCategories } from "../keywords";

interface KeywordPickerProps {
  selected: string[];
  onToggle: (keyword: string) => void;
}

/** 관찰 키워드 다중 선택 패널. 실제로 관찰한 특징만 고르도록 안내한다. */
export function KeywordPicker({ selected, onToggle }: KeywordPickerProps) {
  return (
    <Card>
      <div className="flex justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">관찰 키워드</h2>
          <p className="mt-1 text-xs text-muted">실제로 관찰한 특징만 선택해 주세요.</p>
        </div>
        <span className="h-fit rounded-full bg-primary-soft px-2 py-1 text-xs font-bold text-primary-dark">
          {selected.length}개 선택
        </span>
      </div>
      {Object.entries(behaviorCategories).map(([category, keywords]) => (
        <div key={category} className="mt-4">
          <h3 className="mb-2 text-xs text-muted">{category}</h3>
          <div className="flex flex-wrap gap-2">
            {keywords.map((keyword) => {
              const active = selected.includes(keyword);
              return (
                <button
                  key={keyword}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onToggle(keyword)}
                  className={cn(
                    "inline-flex min-h-9 items-center gap-1 rounded-full border px-3.5 text-xs transition-colors duration-150",
                    active
                      ? "border-primary bg-primary-soft font-semibold text-primary-dark"
                      : "border-line bg-card text-ink hover:bg-subtle",
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
    </Card>
  );
}
