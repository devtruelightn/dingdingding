import { describe, expect, it } from "vitest";
import { behaviorOutputSchema, behaviorRequestSchema, subjectOutputSchema, subjectRequestSchema } from "../../functions/src/schemas";
import { standards } from "@/lib/curriculum";
import { buildSubjectAiRequest } from "@/features/subject-comments/subjectAi";

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

  // 프롬프트 팩은 학교급·학년으로 갈리므로 클라이언트가 그 값을 실어 보내야 한다.
  it("평어 요청에 진입 화면에서 고른 학교급과 학년을 담는다", () => {
    const standard = standards.find((item) => item.standardCode === "2국01-01")!;
    const request = buildSubjectAiRequest({
      anonymousStudentId: "student-01",
      standard,
      item: { officialLevel: "A", schoolLevel: "잘함" },
      sentenceLength: "기본",
      usedSentences: [],
      diversificationSeed: 1,
      profile: { schoolLevel: "middle", grade: 3, role: "subject" },
    });
    expect(request.stage).toBe("middle");
    expect(request.grade).toBe(3);
    expect(subjectRequestSchema.safeParse(request).success).toBe(true);
  });

  it("학교급을 보내지 않는 예전 요청도 초등으로 받아들인다", () => {
    const request = { anonymousStudentId: "student-01", gradeBand: "1-2", subject: "국어", area: "듣기·말하기", standards: [{ id: "2국01-01", code: "2국01-01", text: "중요한 내용을 듣고 말한다." }], officialLevel: "A", officialLevelText: "중요한 내용을 정확하게 파악한다.", schoolLevel: "잘함", sentenceLength: "기본", usedSentences: [], diversificationSeed: 1 };
    expect(subjectRequestSchema.parse(request).stage).toBe("elementary");
    const behavior = { anonymousStudentId: "student-01", entries: [{ category: "생활·인성", keyword: "책임감", degree: "잘함" }], anonymizedTeacherNotes: "", sentenceLength: "기본", style: "따뜻하게", usedAnonymousSentences: [], diversificationSeed: 1 };
    expect(behaviorRequestSchema.parse(behavior).stage).toBe("elementary");
  });
});
