import type { CurriculumStandard, GradeBand } from "@/types";

/** 업로드한 문구를 그대로 성취수준으로 쓸 때 붙이는 수준별 강도 */
const LEVEL_TONE: Record<"A" | "B" | "C", string> = {
  A: "정확하고 능숙하게",
  B: "대체로",
  C: "부분적으로",
};

/** 문장 앞에 붙어 나오는 성취기준 코드(9과03-02, [6국03-05] 등)를 떼어낸다. */
const stripCode = (text: string) =>
  text.replace(/^\s*\[?\s*\d{1,2}\s*[가-힣]{1,5}\s*-?\s*\d{2}\s*-\s*\d{2}\s*\]?\s*/u, "").trim();

const NIEUN = 4;
const RIEUL = 8;

/**
 * "~한다/~ㄴ다"를 성취수준 문장 꼴("~할 수 있다")로 맞춘다.
 * 받침 ㄴ을 ㄹ로 바꿔야 "설명한다 → 설명할 수 있다"가 된다.
 */
const toAchievement = (text: string) => {
  const value = stripCode(text).replace(/[.]+$/u, "").trim();
  if (!value) return "";
  if (/수 (있|없)다$/u.test(value)) return `${value}.`;
  if (/[가-힣]다$/u.test(value)) {
    const stem = value.slice(0, -1);
    const code = stem.charCodeAt(stem.length - 1) - 0xac00;
    if (code >= 0 && code <= 11171 && code % 28 === NIEUN) {
      return `${stem.slice(0, -1)}${String.fromCharCode(0xac00 + code - NIEUN + RIEUL)} 수 있다.`;
    }
  }
  return `${value}.`;
};

interface UploadedStandardInput {
  standardCode: string;
  standardText: string;
  subject: string;
  area: string;
  gradeBand: GradeBand;
  /** 평가계획에 적힌 잘함·보통·노력요함 문구가 있으면 그대로 쓴다. */
  levels?: Partial<Record<"A" | "B" | "C", string>>;
}

/**
 * 내장 교육과정에 없는 성취기준을, 업로드한 평가계획 문구만으로 만든다.
 *
 * 중·고등은 2022 개정 성취기준 데이터가 아직 없어 이 경로로만 평가표를 쓸 수 있다.
 * 공식 성취수준이 없으므로 학교가 적어 온 문구를 근거로 삼고, 없으면
 * 성취기준 문장에 수준별 강도만 붙여 A·B·C를 만든다.
 */
export const buildUploadedStandard = ({
  standardCode,
  standardText,
  subject,
  area,
  gradeBand,
  levels = {},
}: UploadedStandardInput): CurriculumStandard => {
  const base = toAchievement(standardText);
  const levelFor = (level: "A" | "B" | "C") => {
    const supplied = levels[level]?.trim();
    if (supplied) return toAchievement(supplied);
    return `${LEVEL_TONE[level]} ${base}`;
  };
  const id = `uploaded:${standardCode || stripCode(standardText).slice(0, 24)}`;
  return {
    curriculumVersion: "2022",
    gradeBand,
    subjectId: `uploaded-${subject}`,
    subjectName: subject || "과목",
    areaId: `uploaded-${subject}-${area}`,
    areaName: area || "평가영역",
    standardId: id,
    standardCode: standardCode || id,
    standardText: stripCode(standardText),
    levelA: levelFor("A"),
    levelB: levelFor("B"),
    levelC: levelFor("C"),
    sourceDocument: "업로드한 평가계획",
    sourcePage: 0,
    uploaded: true,
  };
};
