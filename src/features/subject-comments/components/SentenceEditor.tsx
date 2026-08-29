"use client";

import { Clipboard, Lock, MoreHorizontal, RefreshCw } from "lucide-react";
import { Evidence } from "@/components/curriculum/Evidence";
import { Button, IconButton } from "@/components/ui";
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
    <article className="min-w-0 rounded-xl border border-line bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
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
          <span className="rounded-full border border-line bg-subtle px-2 py-1 font-semibold text-muted">
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
        className="mt-3 min-h-24 w-full border-transparent bg-subtle leading-relaxed"
        onChange={(event) => onChange({ sentence: event.target.value, edited: true, locked: true })}
      />

      <div className="mt-2 flex items-center justify-between text-xs text-muted">
        <span>
          {item.sentence.length}자 · {utf8Bytes(item.sentence)}바이트
        </span>
        <span className={item.grounded ? "text-success" : "text-warning"}>
          {item.grounded ? "● 근거 일치" : "● 검토 필요"}
        </span>
      </div>

      <Evidence standard={standard} item={item} />

      <div className="mt-3 flex items-center justify-between">
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={item.confirmed}
            onChange={(event) => onChange({ confirmed: event.target.checked })}
          />
          교사 확인 완료
        </label>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" disabled={item.locked} onClick={onRegenerate}>
            <RefreshCw size={15} /> 다시 생성
          </Button>
          <Button variant="ghost" size="sm" onClick={onCopy}>
            <Clipboard size={15} /> 복사
          </Button>
        </div>
      </div>
    </article>
  );
}
