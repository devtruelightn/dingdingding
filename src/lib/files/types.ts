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

export const MAX_FILE = 20 * 1024 * 1024;
export const MAX_ZIP_ENTRIES = 1200;
export const MAX_UNZIPPED = 100 * 1024 * 1024;

export const decodeBytes = (bytes: Uint8Array) =>
  new TextDecoder("utf-8", { fatal: false }).decode(bytes);

export const cleanFormula = (value: unknown) => {
  const text = String(value ?? "").trim();
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
};
