"use client";

import { Clipboard, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui";
import { utf8Bytes } from "@/lib/text";

interface StudentDraftListProps {
  /** 번호만 쓴다. 이름은 이 화면에 올리지 않는다. */
  numbers: { id: string; number: number }[];
  texts: Record<string, string>;
  label: string;
  onChange: (id: string, value: string) => void;
  onCopy: (value: string) => void;
  onRegenerate: (entry: { id: string; number: number }) => void;
  /** 다시 만드는 중인 학생. 그 줄의 버튼만 잠근다. */
  busyId?: string;
}

/** 학생별 초안 목록. 번호 · 글자수 · 편집 칸 · 복사/다시 생성 한 줄씩. */
export function StudentDraftList({
  numbers,
  texts,
  label,
  onChange,
  onCopy,
  onRegenerate,
  busyId,
}: StudentDraftListProps) {
  return (
    <div className="flex flex-col gap-3">
      {numbers
        .filter((entry) => texts[entry.id])
        .map((entry) => (
          <div key={entry.id} className="grid items-start gap-2.5 sm:grid-cols-[140px_1fr_auto]">
            <div className="flex flex-col">
              <b>{entry.number}번</b>
              <span className="text-[10px] text-muted">
                {texts[entry.id].length}자 · {utf8Bytes(texts[entry.id])}바이트
              </span>
            </div>
            <textarea
              className="min-h-[88px] leading-relaxed"
              value={texts[entry.id]}
              aria-label={`${entry.number}번 ${label}`}
              onChange={(event) => onChange(entry.id, event.target.value)}
            />
            <div className="flex gap-1.5 sm:flex-col">
              <Button variant="ghost" size="sm" onClick={() => onCopy(texts[entry.id])}>
                <Clipboard size={14} /> 복사
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={busyId === entry.id}
                onClick={() => onRegenerate(entry)}
              >
                <RefreshCw
                  size={14}
                  className={busyId === entry.id ? "animate-spin-slow" : undefined}
                />
                {busyId === entry.id ? "생성 중" : "다시 생성"}
              </Button>
            </div>
          </div>
        ))}
    </div>
  );
}
