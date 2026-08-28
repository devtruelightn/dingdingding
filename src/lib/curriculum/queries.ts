import curriculum from "@/data/curriculum.json";
import type { CurriculumStandard, GradeBand, SchoolStage } from "@/types";
import { gradeBandFor } from "./levels";

/** 2022 개정 교육과정 성취기준 전체 목록 */
export const standards = curriculum.standards as CurriculumStandard[];

/**
 * 학년군을 못 정한 학교급(중·고등)은 null로 들어오고, 이때는 빈 목록을 돌려
 * 초등 데이터가 새어 나가지 않게 한다.
 */
export const subjectsFor = (gradeBand: GradeBand | null) =>
  gradeBand === null
    ? []
    : [
        ...new Set(
          standards
            .filter((item) => item.gradeBand === gradeBand)
            .map((item) => item.subjectName),
        ),
      ];

export const areasFor = (gradeBand: GradeBand | null, subjectName: string) =>
  gradeBand === null
    ? []
    : [
        ...new Set(
          standards
            .filter((item) => item.gradeBand === gradeBand && item.subjectName === subjectName)
            .map((item) => item.areaName),
        ),
      ];

export const standardsFor = (
  gradeBand: GradeBand | null,
  subjectName: string,
  areaName: string,
) =>
  gradeBand === null
    ? []
    : standards.filter(
        (item) =>
          item.gradeBand === gradeBand &&
          item.subjectName === subjectName &&
          item.areaName === areaName,
      );

/**
 * 작업 화면에 처음 들어갈 때 쓰는 학년·과목·평가영역 기본값.
 * 성취기준 데이터가 없는 학교급에서는 과목·영역이 빈 값으로 남는다.
 */
export const defaultSelectionFor = (schoolLevel: SchoolStage, grade: number) => {
  const band = gradeBandFor(schoolLevel, grade);
  const subject = subjectsFor(band)[0] ?? "";
  const area = areasFor(band, subject)[0] ?? "";
  return { grade, subject, area };
};

export const findStandardById = (standardId: string) =>
  standards.find((item) => item.standardId === standardId);

export const findStandardByCode = (standardCode: string) =>
  standards.find((item) => item.standardCode === standardCode);
