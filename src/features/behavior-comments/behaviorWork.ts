import type { BehaviorLevel, BehaviorStudentWork, BehaviorWorkState } from "@/types";

export const DEFAULT_BEHAVIOR_KEYWORDS = ["책임감", "학습 태도", "배려"];
const levels = new Set<BehaviorLevel>(["잘함", "보통", "노력요함"]);

export const createBehaviorStudent = (studentNumber: number): BehaviorStudentWork => ({
  studentNumber,
  selectedKeywords: [...DEFAULT_BEHAVIOR_KEYWORDS],
  keywordLevels: {},
  observationMemo: "",
  generatedText: "",
  finalText: "",
  snippets: [],
  style: "따뜻하게",
  status: "empty",
  updatedAt: "",
});

export const createBehaviorWorkState = (studentCount = 1): BehaviorWorkState => ({
  studentCount,
  currentStudentNumber: 1,
  students: Array.from({ length: studentCount }, (_, index) => createBehaviorStudent(index + 1)),
});

const normalizeStudent = (value: unknown, studentNumber: number): BehaviorStudentWork => {
  const fallback = createBehaviorStudent(studentNumber);
  if (!value || typeof value !== "object") return fallback;
  const item = value as Record<string, unknown>;
  const selectedKeywords = Array.isArray(item.selectedKeywords)
    ? item.selectedKeywords.filter((keyword): keyword is string => typeof keyword === "string")
    : Array.isArray(item.selected)
      ? item.selected.filter((keyword): keyword is string => typeof keyword === "string")
      : fallback.selectedKeywords;
  const rawLevels =
    item.keywordLevels && typeof item.keywordLevels === "object"
      ? item.keywordLevels
      : item.degrees && typeof item.degrees === "object"
        ? item.degrees
        : {};
  const keywordLevels = Object.fromEntries(
    Object.entries(rawLevels).filter((entry): entry is [string, BehaviorLevel] => levels.has(entry[1] as BehaviorLevel)),
  );
  const snippets = Array.isArray(item.snippets)
    ? item.snippets.filter((snippet): snippet is string => typeof snippet === "string")
    : [];
  const finalText = typeof item.finalText === "string" ? item.finalText : typeof item.paragraph === "string" ? item.paragraph : "";
  const observationMemo = typeof item.observationMemo === "string" ? item.observationMemo : typeof item.notes === "string" ? item.notes : "";
  const hasDraft = selectedKeywords.length > 0 || observationMemo.trim() || finalText.trim();
  return {
    studentNumber,
    selectedKeywords,
    keywordLevels,
    observationMemo,
    generatedText: typeof item.generatedText === "string" ? item.generatedText : finalText,
    finalText,
    snippets,
    style: typeof item.style === "string" ? item.style : fallback.style,
    status: finalText.trim() ? "completed" : hasDraft ? "draft" : "empty",
    updatedAt: typeof item.updatedAt === "string" ? item.updatedAt : "",
  };
};

export const migrateBehaviorWork = (value: unknown): BehaviorWorkState => {
  if (!value || typeof value !== "object") return createBehaviorWorkState();
  const candidate = value as Record<string, unknown>;
  const rawStudents = Array.isArray(candidate.students) ? candidate.students : [];
  const requestedCount = typeof candidate.studentCount === "number" ? candidate.studentCount : rawStudents.length || 1;
  const studentCount = Math.max(1, Math.min(50, Math.trunc(requestedCount)));
  const current = typeof candidate.currentStudentNumber === "number" ? Math.trunc(candidate.currentStudentNumber) : 1;
  return {
    studentCount,
    currentStudentNumber: Math.max(1, Math.min(studentCount, current)),
    students: Array.from({ length: studentCount }, (_, index) => normalizeStudent(rawStudents[index], index + 1)),
  };
};

export const resizeBehaviorWork = (state: BehaviorWorkState, studentCount: number): BehaviorWorkState => {
  const count = Math.max(1, Math.min(50, Math.trunc(studentCount)));
  return {
    ...state,
    studentCount: count,
    currentStudentNumber: Math.min(state.currentStudentNumber, count),
    students: Array.from({ length: count }, (_, index) => state.students[index] ?? createBehaviorStudent(index + 1)),
  };
};

export const requiresBehaviorResizeConfirmation = (state: BehaviorWorkState, nextCount: number) =>
  nextCount < state.studentCount;

export const behaviorMissingCount = (state: BehaviorWorkState) =>
  state.students.slice(0, state.studentCount).filter((student) => !student.finalText.trim()).length;

export const updateBehaviorStudent = (
  state: BehaviorWorkState,
  studentNumber: number,
  changes: Partial<BehaviorStudentWork>,
): BehaviorWorkState => ({
  ...state,
  students: state.students.map((student) => {
    if (student.studentNumber !== studentNumber) return student;
    const next = { ...student, ...changes, studentNumber, updatedAt: new Date().toISOString() };
    next.status = next.finalText.trim()
      ? "completed"
      : next.observationMemo.trim() || next.selectedKeywords.length > 0 || next.snippets.length > 0
        ? "draft"
        : "empty";
    return next;
  }),
});
