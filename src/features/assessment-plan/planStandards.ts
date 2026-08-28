import { standards } from "@/lib/curriculum";
import type { AssessmentPlanRow } from "@/lib/files";
import type { CurriculumStandard } from "@/types";

export type PlanSetupMode = "choose" | "plan" | "manual";

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

/** 확정(confirmed)되고 공식 코드가 있는 행에서 중복 없는 성취기준 목록을 만든다. */
export const standardsFromPlanRows = (rows: AssessmentPlanRow[]): CurriculumStandard[] => {
  const seen = new Set<string>();
  return rows
    .filter((row) => row.confirmed && row.officialStandardCode)
    .map((row) => standards.find((standard) => standard.standardCode === row.officialStandardCode))
    .filter((standard): standard is CurriculumStandard => {
      if (!standard || seen.has(standard.standardId)) return false;
      seen.add(standard.standardId);
      return true;
    });
};
