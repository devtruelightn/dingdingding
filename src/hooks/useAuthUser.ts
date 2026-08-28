"use client";

import { useEffect, useState } from "react";
import { observeUser, type User } from "@/lib/firebase";

/** 현재 로그인한 Firebase 사용자. 미설정 환경에서는 항상 null. */
export const useAuthUser = (onError?: (message: string) => void) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => observeUser(setUser, onError), [onError]);

  return user;
};
