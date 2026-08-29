import { ShieldCheck } from "lucide-react";
import { officialTextFor } from "@/lib/curriculum";
import type { CurriculumStandard, GeneratedSentence } from "@/types";

/** 생성된 문장의 근거(성취기준 원문 + 공식 수준 원문 + 출처)를 접이식으로 표시한다. */
export function Evidence({
  standard,
  item,
}: {
  standard: CurriculumStandard;
  item: GeneratedSentence;
}) {
  return (
    <details className="mt-3 border-y border-line">
      <summary className="flex cursor-pointer items-center gap-2 py-3 text-xs font-semibold text-primary-dark">
        <ShieldCheck size={16} /> 근거 보기 · {standard.standardCode} · 공식 {item.officialLevel}
      </summary>
      <div className="px-1 pb-3">
        <b className="text-xs">성취기준</b>
        <p className="my-1 text-xs text-muted">{standard.standardText}</p>
        <b className="text-xs">공식 {item.officialLevel} 수준</b>
        <p className="my-1 text-xs text-muted">{officialTextFor(standard, item.officialLevel)}</p>
        <small className="text-xs text-muted">
          {standard.sourceDocument} · {standard.sourcePage}쪽
        </small>
      </div>
    </details>
  );
}
