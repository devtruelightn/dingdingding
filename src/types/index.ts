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
  /**
   * 내장 교육과정이 아니라 선생님이 올린 평가계획에서 만든 기준.
   * 공식 성취수준이 없으므로 근거 검증(AI)을 걸지 않는다.
   */
  uploaded?: boolean;
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

/** 진입 흐름 단계. work 단계에서만 사이드바가 나타난다. */
export type OnboardingStage = "school" | "profile" | "work";

/** 학교급. 평가단계를 뜻하는 SchoolLevel과 이름이 겹치지 않도록 Stage로 구분한다. */
export type SchoolStage = "elementary" | "middle" | "high";

/** 담임 / 전담과목·교과 */
export type TeacherRole = "homeroom" | "subject";

/** 진입 흐름에서 고른 학교급·학년·역할 */
export interface TeacherProfile {
  schoolLevel: SchoolStage;
  grade: number;
  role: TeacherRole;
}

/** 사이드바에서 전환하는 최상위 화면 */
export type View = "behavior" | "subject" | "settings";

/** 한 메뉴 안에서 고르는 작업 범위 (명단 없이 빠르게 / 우리 반 전체) */
export type WorkMode = "quick" | "class";

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
