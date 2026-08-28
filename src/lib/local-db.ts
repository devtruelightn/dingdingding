"use client";

import { openDB } from "idb";
import type { Student } from "@/types";

type LocalDatabase = ReturnType<typeof openDB>;

let dbPromise: LocalDatabase | null = null;

const getLocalDatabase = () => {
  // 서버 렌더링 시점에는 IndexedDB가 없으므로 실제 브라우저에서만 지연 오픈한다.
  if (typeof indexedDB === "undefined") return null;

  dbPromise ??= openDB("pyeonghaeng-toktok", 1, {
    upgrade(database) {
      if (!database.objectStoreNames.contains("rosters")) database.createObjectStore("rosters");
    },
  });

  return dbPromise;
};

export const storeLocalRoster = async (workspaceId: string, students: Student[]) => {
  const databasePromise = getLocalDatabase();
  if (!databasePromise) return;
  const database = await databasePromise;
  await database.put("rosters", students, workspaceId);
};

export const loadLocalRoster = async (workspaceId: string) => {
  const databasePromise = getLocalDatabase();
  if (!databasePromise) return undefined;
  const database = await databasePromise;
  return (await database.get("rosters", workspaceId)) as Student[] | undefined;
};

export const clearLocalRosters = async () => {
  const databasePromise = getLocalDatabase();
  if (!databasePromise) return;
  const database = await databasePromise;
  await database.clear("rosters");
};
