"use client";

import { useRef, useState } from "react";
import {
  Check,
  ChevronRight,
  Cloud,
  FileSpreadsheet,
  PencilLine,
  RefreshCw,
  Save,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui";
import { standards } from "@/lib/curriculum";
import { analyzeAssessmentPlan, type AssessmentPlanRow } from "@/lib/files";
import { cn } from "@/lib/cn";
import type { CurriculumStandard, SavedAssessmentPlan } from "@/types";
import { AssessmentPlanReview } from "./AssessmentPlanReview";
import { standardsFromPlanRows, type PlanSetupMode } from "./planStandards";

interface AssessmentPlanStartProps {
  mode: PlanSetupMode;
  setMode: (mode: PlanSetupMode) => void;
  savedPlan: SavedAssessmentPlan | null;
  onStandardsChange: (selected: CurriculumStandard[]) => void;
  onSavePlan: (plan: SavedAssessmentPlan) => Promise<void>;
  toast: (message: string) => void;
}

/** 1단계: 평가계획 업로드 여부를 고르고, 파일을 분석해 성취기준을 준비한다. */
export function AssessmentPlanStart({
  mode,
  setMode,
  savedPlan,
  onStandardsChange,
  onSavePlan,
  toast,
}: AssessmentPlanStartProps) {
  const [rows, setRowsState] = useState<AssessmentPlanRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const setRows = (next: AssessmentPlanRow[]) => {
    setRowsState(next);
    onStandardsChange(standardsFromPlanRows(next));
  };

  const analyze = async (file?: File) => {
    if (!file) return;
    setAnalyzing(true);
    try {
      const extracted = await analyzeAssessmentPlan(file, standards);
      setFileName(file.name);
      setRows(extracted);
      const selected = standardsFromPlanRows(extracted);
      toast(
        selected.length
          ? `${selected.length}개 기준을 자동 적용했습니다. 원문이 다른 항목만 확인해 주세요.`
          : "자동 적용할 성취기준을 찾지 못했습니다. 추천 후보를 선택해 주세요.",
      );
    } catch (error) {
      toast(error instanceof Error ? error.message : "평가계획 파일을 분석하지 못했습니다.");
    } finally {
      setAnalyzing(false);
      if (input.current) input.current.value = "";
    }
  };

  const loadSavedPlan = () => {
    if (!savedPlan) return;
    const selected = savedPlan.standardIds
      .map((id) => standards.find((standard) => standard.standardId === id))
      .filter((standard): standard is CurriculumStandard => Boolean(standard));
    setFileName(savedPlan.fileName);
    setRowsState([]);
    onStandardsChange(selected);
    toast(`${savedPlan.fileName}에서 저장한 ${selected.length}개 기준을 불러왔습니다.`);
  };

  const saveCurrentPlan = async () => {
    const selected = standardsFromPlanRows(rows);
    if (!selected.length) return toast("저장할 성취기준을 한 개 이상 적용해 주세요.");
    await onSavePlan({
      id: savedPlan?.id ?? crypto.randomUUID(),
      fileName: fileName || "평가계획",
      standardIds: selected.map((standard) => standard.standardId),
      savedAt: new Date().toISOString(),
    });
  };

  const choosePlanMode = () => {
    setMode("plan");
    if (rows.length) onStandardsChange(standardsFromPlanRows(rows));
    else if (savedPlan) loadSavedPlan();
  };

  return (
    <div>
      <div className="flex items-center gap-3">
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-xs font-extrabold text-white">
          1
        </span>
        <div className="flex flex-col">
          <b className="text-base">평가계획을 사용할까요?</b>
          <small className="text-[11px] text-muted">
            먼저 업로드 여부를 선택하면 다음 설정을 자동으로 준비해 드려요.
          </small>
        </div>
      </div>

      <div className="mt-4 grid gap-3.5 sm:grid-cols-2">
        <button
          type="button"
          aria-pressed={mode === "plan"}
          onClick={choosePlanMode}
          className={cn(
            "flex items-center gap-4 rounded-2xl border p-5 text-left",
            mode === "plan" ? "border-primary bg-primary-soft/50" : "border-line bg-card",
          )}
        >
          <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary-dark">
            <FileSpreadsheet size={22} />
          </span>
          <span className="min-w-0">
            <b className="block">평가계획 사용</b>
            <small className="text-xs text-muted">파일을 불러와 학년·과목·평가영역 자동 설정</small>
          </span>
          {mode === "plan" && <Check size={16} className="ml-auto text-primary" />}
        </button>
        <button
          type="button"
          aria-pressed={mode === "manual"}
          onClick={() => {
            setMode("manual");
            onStandardsChange([]);
          }}
          className={cn(
            "flex items-center gap-4 rounded-2xl border p-5 text-left",
            mode === "manual" ? "border-primary bg-primary-soft/50" : "border-line bg-card",
          )}
        >
          <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary-dark">
            <PencilLine size={22} />
          </span>
          <span className="min-w-0">
            <b className="block">직접 설정</b>
            <small className="text-xs text-muted">학년·과목·평가영역·성취기준 직접 선택</small>
          </span>
          {mode === "manual" && <Check size={16} className="ml-auto text-primary" />}
        </button>
      </div>

      {mode === "plan" && (
        <div className="mt-3.5 rounded-2xl border border-line bg-solid/60 p-4">
          <div className="flex flex-col items-stretch justify-end gap-2.5 sm:flex-row">
            {savedPlan && (
              <button
                type="button"
                onClick={loadSavedPlan}
                className="flex flex-1 items-center gap-2.5 rounded-lg border border-primary/40 bg-card p-2 text-left text-primary-dark"
              >
                <span className="grid size-9 place-items-center rounded-lg bg-primary-soft">
                  <Cloud size={18} />
                </span>
                <span className="flex flex-col">
                  <b>이전에 저장한 평가계획</b>
                  <small className="text-[10px] text-muted">
                    {savedPlan.fileName} · {savedPlan.standardIds.length}개 기준
                  </small>
                </span>
                <ChevronRight size={17} className="ml-auto" />
              </button>
            )}
            <input
              ref={input}
              hidden
              type="file"
              accept=".pdf,.hwpx,.xlsx,.csv,.hwp"
              onChange={(event) => void analyze(event.target.files?.[0])}
            />
            <Button variant="primary" disabled={analyzing} onClick={() => input.current?.click()}>
              {analyzing ? <RefreshCw className="animate-spin-slow" size={16} /> : <Upload size={16} />}
              {analyzing ? "분석 중" : savedPlan ? "새 파일 선택" : "평가계획 파일 선택"}
            </Button>
          </div>
          {fileName && (
            <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-primary-dark">
              <FileSpreadsheet size={15} />
              <b>{fileName}</b>
              <span className="ml-auto text-muted">학년·과목·평가영역 자동 설정</span>
            </div>
          )}
          {rows.length > 0 && (
            <>
              <AssessmentPlanReview rows={rows} setRows={setRows} />
              <div className="mt-3 flex items-center justify-between gap-3">
                <p className="text-[11px] text-muted">적용된 기준은 현재 메뉴에 즉시 반영됩니다.</p>
                <Button variant="ghost" onClick={() => void saveCurrentPlan()}>
                  <Save size={16} /> 이 평가계획 저장
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
