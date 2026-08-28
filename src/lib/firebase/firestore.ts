"use client";

import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { firestore } from "./client";

const safeWorkspaceId = (workspaceId: string) =>
  workspaceId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80);

/** 사용자별 비공개 경로에 작업 상태를 저장한다. */
export const saveWorkspace = async (
  uid: string,
  workspaceId: string,
  data: Record<string, unknown>,
) => {
  if (!firestore) throw new Error("Firebase 환경설정이 필요합니다.");
  await setDoc(
    doc(firestore, "users", uid, "workspaces", safeWorkspaceId(workspaceId)),
    { ...data, ownerUid: uid, updatedAt: serverTimestamp(), schemaVersion: 1 },
    { merge: true },
  );
};

export const loadWorkspace = async (uid: string, workspaceId: string) => {
  if (!firestore) throw new Error("Firebase 환경설정이 필요합니다.");
  const snapshot = await getDoc(
    doc(firestore, "users", uid, "workspaces", safeWorkspaceId(workspaceId)),
  );
  return snapshot.exists() ? snapshot.data() : null;
};
