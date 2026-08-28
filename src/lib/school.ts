import type { SchoolStage, TeacherRole, View, WorkMode } from "@/types";

/** 진입 화면에 노출하는 학교급 순서 */
export const schoolStageOrder: SchoolStage[] = ["elementary", "middle", "high"];

export const schoolStageLabel: Record<SchoolStage, string> = {
  elementary: "초등학교",
  middle: "중학교",
  high: "고등학교",
};

/** 초등은 1~6학년, 중·고등은 1~3학년 */
export const gradesFor = (schoolLevel: SchoolStage) =>
  schoolLevel === "elementary" ? [1, 2, 3, 4, 5, 6] : [1, 2, 3];

/** 사이드바의 교과 기록 메뉴 이름 */
export const subjectMenuLabel = (schoolLevel: SchoolStage) =>
  schoolLevel === "elementary" ? "평어" : "과세특";

/** 역할 선택 화면에서 담임과 짝을 이루는 버튼 이름 */
export const subjectRoleLabel = (schoolLevel: SchoolStage) =>
  schoolLevel === "elementary" ? "전담과목" : "교과";

export const roleLabel = (schoolLevel: SchoolStage, role: TeacherRole) =>
  role === "homeroom" ? "담임" : subjectRoleLabel(schoolLevel);

/** 담임은 행발, 전담과목·교과는 교과 기록 메뉴로 진입한다. */
export const viewForRole = (role: TeacherRole): View =>
  role === "homeroom" ? "behavior" : "subject";

/** 담임은 우리 반 전체를, 전담과목·교과는 빠른 생성을 기본값으로 둔다. */
export const workModeForRole = (role: TeacherRole): WorkMode =>
  role === "homeroom" ? "class" : "quick";
