"use client";

import { Clipboard, Lock, MoreHorizontal, RefreshCw } from "lucide-react";
import { Evidence } from "@/components/curriculum/Evidence";
import { IconButton } from "@/components/ui";
import { cn } from "@/lib/cn";
import { utf8Bytes } from "@/lib/text";
import type { CurriculumStandard, GeneratedSentence } from "@/types";

interface SentenceEditorProps {
  item: GeneratedSentence;
  standard: CurriculumStandard;
  onChange: (patch: Partial<GeneratedSentence>) => void;
  onRegenerate: () => void;
  onCopy: () => void;
}

const levelTagClass: Record<string, string> = {
  a: "bg-success/15 text-success",
  b: "bg-warning/15 text-warning",
  c: "bg-accent/20 text-accent",
};

/** 생성된 평어 1건: 편집 · 근거 확인 · 다시 생성 · 복사 · 교사 확인 체크. */
export function SentenceEditor({
  item,
  standard,
  onChange,
  onRegenerate,
  onCopy,
}: SentenceEditorProps) {
  return (
    <article className="min-w-0 rounded-2xl border border-line bg-card p-4">
      <div className="flex items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-extrabold">
          <span
            className={cn(
              "rounded-full px-2 py-1",
              levelTagClass[item.officialLevel.toLowerCase()],
            )}
          >
            {item.schoolLevel}
          </span>
          <span className="rounded-full bg-primary-soft px-2 py-1 text-primary-dark">
            공식 {item.officialLevel}
          </span>
          <span className="rounded-full border border-line bg-solid/60 px-2 py-1 font-semibold text-muted">
            {standard.subjectName} · {standard.areaName}
          </span>
          {item.locked && (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted/15 px-2 py-1 text-muted">
              <Lock size={12} /> 수정 잠금
            </span>
          )}
        </div>
        <IconButton aria-label="더 보기">
          <MoreHorizontal size={18} />
        </IconButton>
      </div>

      <textarea
        value={item.sentence}
        aria-label="생성된 평어"
        className="mt-3 min-h-[84px] w-full border-transparent bg-solid/50 leading-relaxed"
        onChange={(event) => onChange({ sentence: event.target.value, edited: true, locked: true })}
      />

      <div className="mt-1.5 flex items-center justify-between text-[11px] text-muted">
        <span>
          {item.sentence.length}자 · {utf8Bytes(item.sentence)}바이트
        </span>
        <span className={item.grounded ? "text-success" : "text-warning"}>
          {item.grounded ? "● 근거 일치" : "● 검토 필요"}
        </span>
      </div>

      <Evidence standard={standard} item={item} />

      <div className="mt-3 flex items-center justify-between">
        <label className="flex items-center gap-1.5 text-[11px]">
          <input
            type="checkbox"
            checked={item.confirmed}
            onChange={(event) => onChange({ confirmed: event.target.checked })}
          />
          교사 확인 완료
        </label>
        <div className="flex gap-1.5">
          <button
            className="inline-flex min-h-[35px] items-center gap-1 rounded-lg border border-line bg-solid/70 px-2.5 text-xs font-bold disabled:opacity-50"
            disabled={item.locked}
            onClick={onRegenerate}
          >
            <RefreshCw size={15} /> 다시 생성
          </button>
          <button
            className="inline-flex min-h-[35px] items-center gap-1 rounded-lg border border-line bg-solid/70 px-2.5 text-xs font-bold"
            onClick={onCopy}
          >
            <Clipboard size={15} /> 복사
          </button>
        </div>
      </div>
    </article>
  );
}
