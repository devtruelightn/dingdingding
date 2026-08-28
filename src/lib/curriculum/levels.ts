import type {
  CurriculumStandard,
  GradeBand,
  OfficialLevel,
  SchoolLevel,
  SchoolStage,
} from "@/types";

export const gradeBandForGrade = (grade: number): GradeBand =>
  grade <= 2 ? "1-2" : grade <= 4 ? "3-4" : "5-6";

/** curriculum.json에는 2022 개정 초등 학년군 성취기준만 담겨 있다. */
export const hasCurriculumFor = (schoolLevel: SchoolStage) => schoolLevel === "elementary";

/**
 * 학교급을 함께 보고 학년군을 정한다. 중·고등은 대응하는 학년군이 없으므로
 * null을 돌려 학년 숫자만으로 초등 학년군에 매핑되는 일을 막는다.
 */
export const gradeBandFor = (schoolLevel: SchoolStage, grade: number): GradeBand | null =>
  hasCurriculumFor(schoolLevel) ? gradeBandForGrade(grade) : null;

export const schoolLevelsFor = (count: 3 | 4 | 5): SchoolLevel[] => {
  if (count === 3) return ["잘함", "보통", "노력요함"];
  if (count === 4) return ["매우 잘함", "잘함", "보통", "노력요함"];
  return ["매우 잘함", "잘함", "보통", "노력요함", "매우 노력요함"];
};

export const officialLevelFor = (level: SchoolLevel): OfficialLevel => {
  if (level === "매우 잘함" || level === "잘함") return "A";
  if (level === "보통") return "B";
  return "C";
};

export const officialTextFor = (standard: CurriculumStandard, level: OfficialLevel) =>
  standard[`level${level}` as "levelA" | "levelB" | "levelC"];
