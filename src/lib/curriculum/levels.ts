import type { CurriculumStandard, GradeBand, OfficialLevel, SchoolLevel } from "@/types";

export const gradeBandForGrade = (grade: number): GradeBand =>
  grade <= 2 ? "1-2" : grade <= 4 ? "3-4" : "5-6";

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
