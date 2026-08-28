import { describe, expect, it } from "vitest";
import { behaviorOutputSchema, behaviorRequestSchema, subjectOutputSchema, subjectRequestSchema } from "../../functions/src/schemas";

describe("AI Structured Outputs 계약", () => {
  const subject = {
    sentence: "중요한 내용과 순서를 파악하여 말할 수 있음.",
    standardIds: ["2국01-01"], officialLevel: "A", schoolLevel: "잘함",
    grounded: true, introducedClaims: [], needsReview: false, reviewReason: "",
  };
  it("엄격한 평어 응답만 허용한다", () => {
    expect(subjectOutputSchema.parse(subject)).toEqual(subject);
    expect(() => subjectOutputSchema.parse({ ...subject, studentName: "김하늘" })).toThrow();
  });
  it("성취기준은 최대 3개이고 이름 필드는 받지 않는다", () => {
    const request = { anonymousStudentId: "student-01", gradeBand: "1-2", subject: "국어", area: "듣기·말하기", standards: [{ id: "2국01-01", code: "2국01-01", text: "중요한 내용을 듣고 말한다." }], officialLevel: "A", officialLevelText: "중요한 내용을 정확하게 파악한다.", schoolLevel: "잘함", sentenceLength: "기본", usedSentences: [], diversificationSeed: 1 };
    expect(subjectRequestSchema.safeParse(request).success).toBe(true);
    expect(subjectRequestSchema.safeParse({ ...request, studentName: "김하늘" }).success).toBe(false);
  });
  it("행발 inferredClaims를 구조적으로 노출한다", () => {
    const result = behaviorOutputSchema.parse({ snippets: ["책임감 있게 참여함."], finalParagraph: "책임감 있게 참여함.", usedKeywords: ["책임감"], claimsFromTeacherNotes: [], inferredClaims: ["반장 역할"], sensitiveDataWarning: false, needsReview: true, reviewReason: "입력하지 않은 역할" });
    expect(result.inferredClaims).toEqual(["반장 역할"]);
    expect(result.needsReview).toBe(true);
  });
  it("행발 평가단계는 잘함·보통·노력요함만 허용한다", () => {
    const request = { anonymousStudentId: "student-01", entries: [{ category: "생활·인성", keyword: "책임감", degree: "잘함" }], anonymizedTeacherNotes: "", sentenceLength: "기본", style: "따뜻하게", usedAnonymousSentences: [], diversificationSeed: 1 };
    expect(behaviorRequestSchema.safeParse(request).success).toBe(true);
    expect(behaviorRequestSchema.safeParse({ ...request, entries: [{ ...request.entries[0], degree: "안정적으로 나타남" }] }).success).toBe(false);
  });
});
