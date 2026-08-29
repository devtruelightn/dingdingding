"use client";

import { Check, X } from "lucide-react";
import { cn } from "@/lib/cn";
import type { AssessmentPlanRow } from "@/lib/files";
import { choosePlanSuggestion } from "./planStandards";

interface AssessmentPlanReviewProps {
  rows: AssessmentPlanRow[];
  setRows: (rows: AssessmentPlanRow[]) => void;
  limit?: number;
}

/** 파일에서 추출한 성취기준 후보를 교사가 확인·선택하는 목록. */
export function AssessmentPlanReview({ rows, setRows, limit }: AssessmentPlanReviewProps) {
  const visibleRows = typeof limit === "number" ? rows.slice(0, limit) : rows;

  const updateCandidate = (row: AssessmentPlanRow, standardCode: string) => {
    setRows(rows.map((item) => (item.id === row.id ? choosePlanSuggestion(item, standardCode) : item)));
  };
  const toggleRow = (row: AssessmentPlanRow) => {
    if (!row.officialStandardCode) return;
    setRows(rows.map((item) => (item.id === row.id ? { ...item, confirmed: !item.confirmed } : item)));
  };
  const appliedCount = rows.filter((row) => row.confirmed && row.officialStandardCode).length;

  return (
    <div className="mt-3.5 grid gap-2 rounded-2xl border border-line bg-solid/60 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col">
          <b>분석 결과</b>
          <span className="text-[11px] text-muted">{appliedCount}개 기준 적용 예정</span>
        </div>
        <span className="text-[11px] text-muted">
          일치한 기준은 자동 적용됩니다. 원문이 다르면 오른쪽 버튼으로 포함 여부만 확인하세요.
        </span>
      </div>
      {visibleRows.map((row) => {
        const mismatch = row.status !== "공식 PDF와 정확히 일치";
        return (
          <article
            key={row.id}
            className={cn(
              "grid gap-3 rounded-xl border p-3.5 md:grid-cols-[minmax(0,1fr)_minmax(230px,300px)]",
              row.confirmed ? "border-primary bg-primary-soft/40" : "border-line bg-card opacity-70",
            )}
          >
            <div className="min-w-0">
              <div className="mb-2 flex items-center gap-2">
                <b>업로드 {row.standardCode || "코드 없음"}</b>
                <span className="text-[11px] text-muted">
                  {row.subject || "과목 확인"} · {row.area || "영역 확인"}
                </span>
              </div>
              {row.uploadedStandardText && (
                <p className="my-1.5 rounded-lg bg-surface/50 p-2 text-[11px] leading-relaxed">
                  <strong className="mr-1.5 text-[10px] text-muted">학교 문구</strong>
                  {row.uploadedStandardText}
                </p>
              )}
              {row.officialStandardText && (
                <p className="my-1.5 rounded-lg bg-success/10 p-2 text-[11px] leading-relaxed">
                  <strong className="mr-1.5 text-[10px] text-muted">공식 원문</strong>
                  <b className="mr-1 text-success">{row.officialStandardCode}</b>
                  {row.officialStandardText}
                </p>
              )}
              <small className="mt-2 block text-[11px] leading-relaxed text-muted">{row.resolution}</small>
            </div>
            <div className="flex flex-col gap-2">
              <span
                className={cn(
                  "self-start rounded-full px-2 py-1 text-[10px] font-extrabold",
                  row.status.includes("정확히")
                    ? "bg-success/15 text-success"
                    : row.officialStandardCode
                      ? "bg-primary-soft text-primary-dark"
                      : "bg-warning/15 text-warning",
                )}
              >
                {row.status}
              </span>
              {mismatch && row.suggestions.length > 0 && (
                <label className="grid gap-1 text-[10px] text-muted">
                  <span>공식 기준 선택</span>
                  <select
                    className="w-full text-[11px]"
                    value={row.officialStandardCode}
                    onChange={(event) => updateCandidate(row, event.target.value)}
                  >
                    <option value="">추천 후보를 선택하세요</option>
                    {row.suggestions.map((candidate) => (
                      <option key={candidate.standardCode} value={candidate.standardCode}>
                        {candidate.standardCode} · {candidate.area} · {Math.round(candidate.score * 100)}% 유사
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <button
                type="button"
                role="switch"
                aria-checked={row.confirmed}
                disabled={!row.officialStandardCode}
                onClick={() => toggleRow(row)}
                className={cn(
                  "inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-lg border px-3 text-xs font-bold disabled:opacity-50",
                  row.confirmed
                    ? "border-primary bg-primary text-white"
                    : "border-line bg-card text-muted",
                )}
              >
                {row.confirmed ? <Check size={15} /> : <X size={15} />}
                {row.officialStandardCode
                  ? row.confirmed
                    ? "적용됨"
                    : "제외됨"
                  : "기준 선택 필요"}
              </button>
            </div>
          </article>
        );
      })}
      {typeof limit === "number" && rows.length > limit && (
        <p className="text-center text-[11px] text-muted">
          나머지 {rows.length - limit}개 항목도 이 화면에서 이어서 확인할 수 있습니다.
        </p>
      )}
    </div>
  );
}
