import { z } from "zod";

const safeText = (max: number) => z.string().trim().min(1).max(max);
const identifier = z.string().regex(/^[A-Za-z0-9가-힣_-]{1,80}$/u);

/**
 * 프롬프트 팩 라우팅에 쓰는 학교급.
 *
 * 기존 `schoolLevel` 필드는 학교급이 아니라 평가단계(매우 잘함·잘함·보통·…)를 뜻하므로 이름을 재사용할 수 없다.
 * 프론트엔드 온보딩의 `TeacherProfile.schoolLevel` 값이 이 필드로 전달된다.
 * 기본값이 있어 이 필드를 보내지 않는 기존 클라이언트도 그대로 동작한다.
 */
const stage = z.enum(["elementary", "middle", "high"]).default("elementary");

export const subjectRequestSchema = z.object({
  anonymousStudentId: identifier,
  stage,
  gradeBand: z.enum(["1-2", "3-4", "5-6"]),
  /** 학년. 학년군만으로는 예시집을 특정할 수 없어(3학년과 4학년이 같은 학년군) 선택적으로 받는다. */
  grade: z.number().int().min(1).max(6).optional(),
  subject: safeText(30),
  area: safeText(80),
  standards: z.array(z.object({
    id: identifier,
    code: identifier,
    text: safeText(1200),
  }).strict()).min(1).max(3),
  officialLevel: z.enum(["A", "B", "C"]),
  officialLevelText: safeText(1800),
  schoolLevel: z.enum(["매우 잘함", "잘함", "보통", "노력요함", "매우 노력요함"]),
  sentenceLength: z.enum(["간결하게", "기본", "자세하게"]),
  usedSentences: z.array(safeText(1000)).max(40).default([]),
  diversificationSeed: z.number().int().min(0).max(1_000_000),
}).strict();

export const behaviorRequestSchema = z.object({
  anonymousStudentId: identifier,
  stage,
  entries: z.array(z.object({
    category: safeText(30),
    keyword: safeText(50),
    degree: z.enum(["잘함", "보통", "노력요함"]),
  }).strict()).min(1).max(20),
  anonymizedTeacherNotes: z.string().trim().max(3000),
  sentenceLength: z.enum(["간결하게", "기본", "자세하게"]),
  style: z.enum(["담백하게", "따뜻하게", "자세하게"]),
  usedAnonymousSentences: z.array(safeText(2000)).max(40).default([]),
  diversificationSeed: z.number().int().min(0).max(1_000_000),
}).strict();

export const subjectOutputSchema = z.object({
  sentence: safeText(1200),
  standardIds: z.array(identifier).min(1).max(3),
  officialLevel: z.enum(["A", "B", "C"]),
  schoolLevel: safeText(30),
  grounded: z.boolean(),
  introducedClaims: z.array(z.string().max(300)).max(10),
  needsReview: z.boolean(),
  reviewReason: z.string().max(500),
}).strict();

export const verificationOutputSchema = z.object({
  grounded: z.boolean(),
  levelMatches: z.boolean(),
  introducedClaims: z.array(z.string().max(300)).max(10),
  observedFactAssumed: z.boolean(),
  needsReview: z.boolean(),
  reviewReason: z.string().max(500),
}).strict();

export const behaviorOutputSchema = z.object({
  snippets: z.array(safeText(1200)).min(1).max(24),
  finalParagraph: safeText(6000),
  usedKeywords: z.array(safeText(50)).max(20),
  claimsFromTeacherNotes: z.array(z.string().max(500)).max(20),
  inferredClaims: z.array(z.string().max(500)).max(20),
  sensitiveDataWarning: z.boolean(),
  needsReview: z.boolean(),
  reviewReason: z.string().max(500),
}).strict();

export type SubjectRequest = z.infer<typeof subjectRequestSchema>;
export type BehaviorRequest = z.infer<typeof behaviorRequestSchema>;

export const subjectJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["sentence", "standardIds", "officialLevel", "schoolLevel", "grounded", "introducedClaims", "needsReview", "reviewReason"],
  properties: {
    sentence: { type: "string" },
    standardIds: { type: "array", items: { type: "string" } },
    officialLevel: { type: "string", enum: ["A", "B", "C"] },
    schoolLevel: { type: "string" },
    grounded: { type: "boolean" },
    introducedClaims: { type: "array", items: { type: "string" } },
    needsReview: { type: "boolean" },
    reviewReason: { type: "string" }
  }
} as const;

export const verificationJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["grounded", "levelMatches", "introducedClaims", "observedFactAssumed", "needsReview", "reviewReason"],
  properties: {
    grounded: { type: "boolean" },
    levelMatches: { type: "boolean" },
    introducedClaims: { type: "array", items: { type: "string" } },
    observedFactAssumed: { type: "boolean" },
    needsReview: { type: "boolean" },
    reviewReason: { type: "string" }
  }
} as const;

export const behaviorJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["snippets", "finalParagraph", "usedKeywords", "claimsFromTeacherNotes", "inferredClaims", "sensitiveDataWarning", "needsReview", "reviewReason"],
  properties: {
    snippets: { type: "array", items: { type: "string" } },
    finalParagraph: { type: "string" },
    usedKeywords: { type: "array", items: { type: "string" } },
    claimsFromTeacherNotes: { type: "array", items: { type: "string" } },
    inferredClaims: { type: "array", items: { type: "string" } },
    sensitiveDataWarning: { type: "boolean" },
    needsReview: { type: "boolean" },
    reviewReason: { type: "string" }
  }
} as const;
