import { buildUploadedStandard, standards } from "@/lib/curriculum";
import type { AssessmentPlanRow } from "@/lib/files";
import type { CurriculumStandard } from "@/types";

/** "result"는 이미 매긴 평가결과를 올려 학기말 종합의견으로 바로 가는 길이다. */
export type PlanSetupMode = "choose" | "plan" | "manual" | "result" | "performance";

/** 검토 화면에서 교사가 고른 공식 후보 코드를 행에 반영한다. */
export const choosePlanSuggestion = (
  row: AssessmentPlanRow,
  standardCode: string,
): AssessmentPlanRow => {
  const candidate = row.suggestions.find((item) => item.standardCode === standardCode);
  if (!candidate) return row;
  return {
    ...row,
    subject: candidate.subject,
    area: candidate.area,
    officialStandardCode: candidate.standardCode,
    officialStandardText: candidate.standardText,
    standardText: candidate.standardText,
    status: row.standardCode === candidate.standardCode ? "원문 불일치" : "유사 기준 발견",
    resolution:
      row.standardCode === candidate.standardCode
        ? "업로드 문구 대신 공식 2022 개정 성취기준 원문을 평어 근거로 사용합니다."
        : `업로드 코드 ${row.standardCode || "없음"} 대신 교사가 확인한 공식 코드 ${candidate.standardCode}를 사용합니다.`,
    confirmed: true,
  };
};

/**
 * 평가표에 쓸 성취기준 목록을 만든다.
 *
 * 공식 자료에 있으면 그 원문을 쓰고, 없으면(중·고등처럼 내장 데이터가 없는 경우)
 * 업로드한 평가계획 문구로 기준을 만들어 흐름이 끊기지 않게 한다.
 */
export const standardsFromPlanRows = (
  rows: AssessmentPlanRow[],
  { allowUploaded = false }: { allowUploaded?: boolean } = {},
): CurriculumStandard[] => {
  const seen = new Set<string>();
  return rows
    .map((row) => {
      const official =
        row.confirmed && row.officialStandardCode
          ? standards.find((standard) => standard.standardCode === row.officialStandardCode)
          : undefined;
      if (official) return official;
      if (!allowUploaded) return undefined;
      const text = row.uploadedStandardText || row.standardText;
      if (!text.trim()) return undefined;
      return buildUploadedStandard({
        standardCode: row.standardCode,
        standardText: text,
        subject: row.subject,
        area: row.area,
        // 내장 학년군과 섞이지 않도록 한 값으로 통일한다 (같은 작업 안에서만 쓰인다).
        gradeBand: "5-6",
      });
    })
    .filter((standard): standard is CurriculumStandard => {
      if (!standard || seen.has(standard.standardId)) return false;
      seen.add(standard.standardId);
      return true;
    });
};
