import curriculum from "@/data/curriculum.json";
import type { CurriculumStandard, GradeBand } from "@/types";

/** 2022 개정 교육과정 성취기준 전체 목록 */
export const standards = curriculum.standards as CurriculumStandard[];

export const subjectsFor = (gradeBand: GradeBand) => [
  ...new Set(
    standards
      .filter((item) => item.gradeBand === gradeBand)
      .map((item) => item.subjectName),
  ),
];

export const areasFor = (gradeBand: GradeBand, subjectName: string) => [
  ...new Set(
    standards
      .filter((item) => item.gradeBand === gradeBand && item.subjectName === subjectName)
      .map((item) => item.areaName),
  ),
];

export const standardsFor = (gradeBand: GradeBand, subjectName: string, areaName: string) =>
  standards.filter(
    (item) =>
      item.gradeBand === gradeBand &&
      item.subjectName === subjectName &&
      item.areaName === areaName,
  );

export const findStandardById = (standardId: string) =>
  standards.find((item) => item.standardId === standardId);

export const findStandardByCode = (standardCode: string) =>
  standards.find((item) => item.standardCode === standardCode);
