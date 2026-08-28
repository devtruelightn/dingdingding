export type GradeBand = "1-2" | "3-4" | "5-6";
export type OfficialLevel = "A" | "B" | "C";
export type SchoolLevel =
  | "매우 잘함"
  | "잘함"
  | "보통"
  | "노력요함"
  | "매우 노력요함";

export interface CurriculumStandard {
  curriculumVersion: "2022";
  gradeBand: GradeBand;
  subjectId: string;
  subjectName: string;
  areaId: string;
  areaName: string;
  standardId: string;
  standardCode: string;
  standardText: string;
  levelA: string;
  levelB: string;
  levelC: string;
  sourceDocument: string;
  sourcePage: number;
}

export interface Student {
  id: string;
  number: number;
  name: string;
}

export type BehaviorLevel = "잘함" | "보통" | "노력요함";
export type BehaviorWorkStatus = "empty" | "draft" | "completed";

export interface BehaviorStudentWork {
  studentNumber: number;
  selectedKeywords: string[];
  keywordLevels: Record<string, BehaviorLevel>;
  observationMemo: string;
  generatedText: string;
  finalText: string;
  snippets: string[];
  style: string;
  status: BehaviorWorkStatus;
  updatedAt: string;
}

export interface BehaviorWorkState {
  studentCount: number;
  currentStudentNumber: number;
  students: BehaviorStudentWork[];
}

export interface SavedAssessmentPlan {
  id: string;
  fileName: string;
  standardIds: string[];
  savedAt: string;
}

export interface GeneratedSentence {
  id: string;
  studentId?: string;
  sentence: string;
  standardId: string;
  officialLevel: OfficialLevel;
  schoolLevel: SchoolLevel;
  grounded: boolean;
  needsReview: boolean;
  reviewReason: string;
  locked: boolean;
  confirmed: boolean;
  edited: boolean;
  createdAt: string;
}

/** 사이드바에서 전환하는 최상위 화면 */
export type View =
  | "dashboard"
  | "quick-subject"
  | "class-subject"
  | "quick-behavior"
  | "class-behavior"
  | "settings";

/** 배경 테마 */
export type Theme =
  | "lavender"
  | "mint"
  | "peach"
  | "sky"
  | "butter"
  | "rose"
  | "dark"
  | "system";
