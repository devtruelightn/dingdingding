import type { CurriculumStandard } from "@/types";
import type { AssessmentPlanRow, AssessmentPlanSuggestion } from "./types";

const normalizePlanText = (value: string) =>
  value
    .normalize("NFKC")
    // 공백·기호를 먼저 걷어내야 PDF가 `[6 국 03-05]`로 쪼개 놓은 코드도 함께 지워진다.
    .replace(/[\s\p{P}\p{S}]+/gu, "")
    .replace(/[246][가-힣]{1,5}\d{4}/gu, "")
    .toLowerCase();

const ngrams = (value: string, size = 2) => {
  const normalized = normalizePlanText(value);
  const result = new Set<string>();
  for (let index = 0; index <= normalized.length - size; index += 1) {
    result.add(normalized.slice(index, index + size));
  }
  return result;
};

/** 학교 평가계획 문구와 공식 성취기준 원문의 일치 정도 (0~1) */
export const textMatchScore = (source: string, target: string) => {
  const normalizedSource = normalizePlanText(source);
  const normalizedTarget = normalizePlanText(target);
  if (!normalizedSource || !normalizedTarget) return 0;
  if (normalizedSource.includes(normalizedTarget) || normalizedTarget.includes(normalizedSource)) {
    return 1;
  }
  const sourceGrams = ngrams(source);
  const targetGrams = ngrams(target);
  if (!sourceGrams.size || !targetGrams.size) return 0;
  const intersection = [...targetGrams].filter((gram) => sourceGrams.has(gram)).length;
  const targetCoverage = intersection / targetGrams.size;
  const dice = (2 * intersection) / (sourceGrams.size + targetGrams.size);
  // 학교 평가계획에는 성취기준 뒤에 평가요소·활동이 길게 붙을 수 있으므로
  // 전체 길이보다 공식 원문의 핵심 구절이 얼마나 포함되었는지를 우선한다.
  return targetCoverage * 0.78 + dice * 0.22;
};

/** 업로드된 행에 가장 가까운 공식 성취기준 후보 최대 3개를 점수순으로 반환한다. */
export const suggestOfficialStandards = (
  row: Pick<AssessmentPlanRow, "subject" | "area" | "standardCode" | "standardText">,
  standards: CurriculumStandard[],
): AssessmentPlanSuggestion[] =>
  standards
    .map((standard) => {
      let score = textMatchScore(row.standardText, standard.standardText);
      const uploadedPrefix = /^([246])([가-힣]{1,5})/u.exec(row.standardCode);
      const officialPrefix = /^([246])([가-힣]{1,5})/u.exec(standard.standardCode);
      if (uploadedPrefix && officialPrefix) {
        score += uploadedPrefix[1] === officialPrefix[1] ? 0.06 : -0.12;
        score += uploadedPrefix[2] === officialPrefix[2] ? 0.08 : -0.15;
      }
      if (row.subject && row.subject.replace(/\s/gu, "") === standard.subjectName.replace(/\s/gu, "")) {
        score += 0.08;
      }
      if (row.area && normalizePlanText(row.area) === normalizePlanText(standard.areaName)) {
        score += 0.08;
      }
      return {
        standardCode: standard.standardCode,
        subject: standard.subjectName,
        area: standard.areaName,
        standardText: standard.standardText,
        score: Math.min(1, score),
      } satisfies AssessmentPlanSuggestion;
    })
    .filter((candidate) => candidate.score >= 0.28)
    .sort((left, right) => right.score - left.score)
    .slice(0, 3);
