import type { CurriculumStandard, SchoolLevel } from "@/types";

export type MatchStatus =
  | "공식 PDF와 정확히 일치"
  | "유사 기준 발견"
  | "코드 불일치"
  | "원문 불일치"
  | "OCR 확인 필요"
  | "직접 입력 항목";

export interface AssessmentPlanSuggestion {
  standardCode: string;
  subject: string;
  area: string;
  standardText: string;
  score: number;
}

export interface AssessmentPlanRow {
  id: string;
  subject: string;
  area: string;
  standardCode: string;
  standardText: string;
  uploadedStandardText: string;
  officialStandardCode: string;
  officialStandardText: string;
  suggestions: AssessmentPlanSuggestion[];
  resolution: string;
  evaluationElement: string;
  timing: string;
  status: MatchStatus;
  confirmed: boolean;
}

/** 파일 파서가 추출하는 원시 행 (공식 기준과 대조하기 전) */
export interface ExtractedPlanRow {
  subject: string;
  area: string;
  standardCode: string;
  standardText: string;
  evaluationElement: string;
  timing: string;
}

/**
 * 학교 업무 시스템이 내보낸 "교과평가(성취기준별)" 한 줄.
 * 학생 한 명이 성취기준 한 개에 받은 평가단계를 담는다.
 */
export interface AssessmentResultRow {
  number: number;
  name: string;
  schoolLevel: SchoolLevel;
  /** 업로드 문서에 적힌 성취기준 문구 */
  uploadedStandardText: string;
  /** 대조에 성공한 공식 성취기준 (실패하면 undefined) */
  standard?: CurriculumStandard;
}

/** 수행평가 정리 워크북의 학생 한 줄. 이름은 담지 않는다. */
export interface PerformanceRow {
  number: number;
  career: string;
  topic: string;
  aspects: { label: string; text: string }[];
}

export const MAX_FILE = 20 * 1024 * 1024;
export const MAX_ZIP_ENTRIES = 1200;
export const MAX_UNZIPPED = 100 * 1024 * 1024;

export const decodeBytes = (bytes: Uint8Array) =>
  new TextDecoder("utf-8", { fatal: false }).decode(bytes);

export const cleanFormula = (value: unknown) => {
  const text = String(value ?? "").trim();
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
};
