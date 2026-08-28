"use client";

import { httpsCallable } from "firebase/functions";
import { auth, functions, isCloudAiEnabled } from "./client";

export interface SubjectAiResult {
  sentence: string;
  standardIds: string[];
  officialLevel: "A" | "B" | "C";
  schoolLevel: string;
  grounded: boolean;
  introducedClaims: string[];
  needsReview: boolean;
  reviewReason: string;
  promptVersion: string;
}

export interface BehaviorAiResult {
  snippets: string[];
  finalParagraph: string;
  usedKeywords: string[];
  claimsFromTeacherNotes: string[];
  inferredClaims: string[];
  sensitiveDataWarning: boolean;
  needsReview: boolean;
  reviewReason: string;
  promptVersion: string;
}

const call = async <T>(name: string, data: Record<string, unknown>): Promise<T> => {
  if (!isCloudAiEnabled || !functions || !auth?.currentUser) {
    throw new Error("로그인과 AI 서버 설정이 필요합니다.");
  }
  // App Check 토큰은 Functions SDK가 자동으로 첨부한다.
  const result = await httpsCallable<Record<string, unknown>, T>(functions, name)(data);
  return result.data;
};

/** 교과평어 생성 Cloud Function 호출 */
export const generateSubjectWithAi = (data: Record<string, unknown>) =>
  call<SubjectAiResult>("generateSubjectComment", data);

/** 행동특성(행발) 생성 Cloud Function 호출 */
export const generateBehaviorWithAi = (data: Record<string, unknown>) =>
  call<BehaviorAiResult>("generateBehaviorComment", data);
