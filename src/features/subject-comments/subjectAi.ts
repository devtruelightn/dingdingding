import { officialTextFor } from "@/lib/curriculum";
import type { CurriculumStandard, GeneratedSentence } from "@/types";

/** generateSubjectComment Cloud Function 요청 본문을 만든다. */
export const buildSubjectAiRequest = ({
  anonymousStudentId,
  standard,
  item,
  sentenceLength,
  usedSentences,
  diversificationSeed,
}: {
  anonymousStudentId: string;
  standard: CurriculumStandard;
  item: Pick<GeneratedSentence, "officialLevel" | "schoolLevel">;
  sentenceLength: string;
  usedSentences: string[];
  diversificationSeed: number;
}) => ({
  anonymousStudentId,
  gradeBand: standard.gradeBand,
  subject: standard.subjectName,
  area: standard.areaName,
  standards: [{ id: standard.standardId, code: standard.standardCode, text: standard.standardText }],
  officialLevel: item.officialLevel,
  officialLevelText: officialTextFor(standard, item.officialLevel),
  schoolLevel: item.schoolLevel,
  sentenceLength,
  usedSentences: usedSentences.slice(-40),
  diversificationSeed,
});
