import { officialTextFor } from "@/lib/curriculum";
import type { CurriculumStandard, GeneratedSentence, TeacherProfile } from "@/types";

/** generateSubjectComment Cloud Function 요청 본문을 만든다. */
export const buildSubjectAiRequest = ({
  anonymousStudentId,
  standard,
  item,
  sentenceLength,
  usedSentences,
  diversificationSeed,
  profile,
}: {
  anonymousStudentId: string;
  standard: CurriculumStandard;
  item: Pick<GeneratedSentence, "officialLevel" | "schoolLevel">;
  sentenceLength: string;
  usedSentences: string[];
  diversificationSeed: number;
  /** 진입 화면에서 고른 학교급·학년. 서버가 프롬프트 팩을 고르는 데 쓴다. */
  profile: TeacherProfile;
}) => ({
  anonymousStudentId,
  // 학년군만으로는 3·4학년처럼 같은 군의 예시집을 가릴 수 없어 학년도 함께 보낸다.
  stage: profile.schoolLevel,
  grade: profile.grade,
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
