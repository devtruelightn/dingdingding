"use client";

import { Clipboard, RefreshCw } from "lucide-react";
import { Button, Card } from "@/components/ui";
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

/** 학생별 초안 목록. 전체 학생 행발 화면과 같은 카드 한 장에 번호 · 분량 · 편집 칸을 담는다. */
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
    <div className="grid gap-3">
      {numbers
        .filter((entry) => texts[entry.id])
        .map((entry) => (
          <Card key={entry.id} className="p-4 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <b>{entry.number}번 학생</b>
                <span className="rounded-lg bg-primary-soft px-2 py-1 text-xs font-semibold text-primary-dark">
                  {texts[entry.id].length}자 · {utf8Bytes(texts[entry.id])}바이트
                </span>
              </div>
              <div className="flex shrink-0 gap-2">
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
            <textarea
              className="mt-3 min-h-28 w-full resize-y border-0 bg-transparent p-0 text-sm leading-relaxed text-ink shadow-none focus:ring-0"
              value={texts[entry.id]}
              aria-label={`${entry.number}번 ${label}`}
              onChange={(event) => onChange(entry.id, event.target.value)}
            />
          </Card>
        ))}
    </div>
  );
}
