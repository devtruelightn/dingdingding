import { describe, expect, it } from "vitest";
import { behaviorExportRows } from "@/features/behavior-comments/behaviorExport";
import {
  behaviorMissingCount,
  createBehaviorWorkState,
  migrateBehaviorWork,
  requiresBehaviorResizeConfirmation,
  resizeBehaviorWork,
  updateBehaviorStudent,
} from "@/features/behavior-comments/behaviorWork";

describe("행발 학생별 작업 상태", () => {
  it("요청한 인원수만큼 작업 공간을 만들고 1번을 기본 선택한다", () => {
    const state = createBehaviorWorkState(10);
    expect(state.students).toHaveLength(10);
    expect(state.currentStudentNumber).toBe(1);
    expect(state.students.map((student) => student.studentNumber)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it("학생별 입력을 독립적으로 유지한다", () => {
    let state = createBehaviorWorkState(2);
    state = updateBehaviorStudent(state, 1, { observationMemo: "1번 기록" });
    state = updateBehaviorStudent(state, 2, { observationMemo: "2번 기록" });
    expect(state.students.map((student) => student.observationMemo)).toEqual(["1번 기록", "2번 기록"]);
  });

  it("인원을 늘려도 기존 작업을 유지하고 새 번호만 추가한다", () => {
    const original = updateBehaviorStudent(createBehaviorWorkState(2), 2, { finalText: "최종 문장" });
    const resized = resizeBehaviorWork(original, 4);
    expect(resized.students).toHaveLength(4);
    expect(resized.students[1].finalText).toBe("최종 문장");
    expect(resized.students[3].studentNumber).toBe(4);
  });

  it("인원을 줄일 때만 확인 절차를 요구한다", () => {
    const state = createBehaviorWorkState(10);
    expect(requiresBehaviorResizeConfirmation(state, 5)).toBe(true);
    expect(requiresBehaviorResizeConfirmation(state, 10)).toBe(false);
    expect(requiresBehaviorResizeConfirmation(state, 12)).toBe(false);
  });

  it("손상 데이터와 이전 필드명을 안전하게 마이그레이션한다", () => {
    const migrated = migrateBehaviorWork({ studentCount: 2, currentStudentNumber: 9, students: [{ selected: ["배려"], notes: "관찰", paragraph: "완성" }, null] });
    expect(migrated.currentStudentNumber).toBe(2);
    expect(migrated.students[0]).toMatchObject({ selectedKeywords: ["배려"], observationMemo: "관찰", finalText: "완성", status: "completed" });
    expect(migrated.students[1].studentNumber).toBe(2);
  });

  it("최신 최종 문장을 번호순 엑셀 행으로 만든다", () => {
    let state = createBehaviorWorkState(3);
    state = updateBehaviorStudent(state, 2, { generatedText: "AI 문장", finalText: "교사 수정 문장" });
    expect(behaviorExportRows(state)).toEqual([
      { number: 1, text: "" },
      { number: 2, text: "교사 수정 문장" },
      { number: 3, text: "" },
    ]);
  });

  it("미작성 학생 수를 계산해 다운로드 경고 여부를 결정한다", () => {
    const state = updateBehaviorStudent(createBehaviorWorkState(3), 1, { finalText: "작성 완료" });
    expect(behaviorMissingCount(state)).toBe(2);
  });
});
