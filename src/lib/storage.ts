"use client";

import type { BehaviorWorkState, SavedAssessmentPlan, Theme, View } from "@/types";

/**
 * 브라우저 localStorage 헬퍼. 서버 렌더링과 저장소 차단 브라우저에서도
 * 안전하게 동작하도록 모든 접근을 try/catch로 감싼다.
 */
const KEYS = {
  theme: "pht-theme",
  lastView: "pht-last-view",
  tutorialDone: "pht-tutorial-done",
  assessmentPlan: "pht-assessment-plan",
  workspace: "pht-workspace",
  behaviorWork: "pht-behavior-work-v2",
} as const;

const readRaw = (key: string): string | null => {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

const writeRaw = (key: string, value: string) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* 저장소가 차단된 브라우저 */
  }
};

const removeRaw = (key: string) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* 저장소가 차단된 브라우저 */
  }
};

const themes: Theme[] = ["lavender", "mint", "peach", "sky", "butter", "rose", "dark", "system"];

export const loadTheme = (): Theme => {
  const stored = readRaw(KEYS.theme) as Theme | null;
  return stored && themes.includes(stored) ? stored : "lavender";
};
export const saveTheme = (theme: Theme) => writeRaw(KEYS.theme, theme);

export const isTutorialDone = () => readRaw(KEYS.tutorialDone) === "true";
export const markTutorialDone = () => writeRaw(KEYS.tutorialDone, "true");

export const saveLastView = (view: View) => writeRaw(KEYS.lastView, view);

export const saveWorkspaceSnapshot = (snapshot: Record<string, unknown>) =>
  writeRaw(KEYS.workspace, JSON.stringify(snapshot));

export const isSavedAssessmentPlan = (value: unknown): value is SavedAssessmentPlan => {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<SavedAssessmentPlan>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.fileName === "string" &&
    typeof candidate.savedAt === "string" &&
    Array.isArray(candidate.standardIds) &&
    candidate.standardIds.every((id) => typeof id === "string")
  );
};

export const loadStoredAssessmentPlan = (): SavedAssessmentPlan | null => {
  const raw = readRaw(KEYS.assessmentPlan);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    return isSavedAssessmentPlan(parsed) ? parsed : null;
  } catch {
    removeRaw(KEYS.assessmentPlan);
    return null;
  }
};

export const saveStoredAssessmentPlan = (plan: SavedAssessmentPlan) =>
  writeRaw(KEYS.assessmentPlan, JSON.stringify(plan));

export const loadBehaviorWork = (): unknown => {
  const raw = readRaw(KEYS.behaviorWork);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    removeRaw(KEYS.behaviorWork);
    return null;
  }
};

export const saveBehaviorWork = (state: BehaviorWorkState): boolean => {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(KEYS.behaviorWork, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
};
