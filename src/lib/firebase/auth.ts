"use client";

import {
  browserLocalPersistence,
  GoogleAuthProvider,
  getRedirectResult,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type User,
} from "firebase/auth";
import { auth, resolvedAuthDomain } from "./client";

export const friendlyAuthError = (error: unknown) => {
  const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
  if (code.includes("unauthorized-domain"))
    return "현재 웹 주소가 Firebase 승인 도메인에 없습니다. Authentication 설정의 승인된 도메인을 확인해 주세요.";
  if (code.includes("popup-blocked"))
    return "브라우저가 로그인 창을 차단했습니다. 주소 표시줄의 팝업 차단을 해제한 뒤 다시 시도해 주세요.";
  if (code.includes("popup-closed-by-user"))
    return "브라우저가 Google 로그인 창과의 연결을 종료했습니다. 팝업·쿠키를 허용하거나 현재 화면 로그인으로 다시 시도해 주세요.";
  if (code.includes("cancelled-popup-request"))
    return "Google 로그인 요청이 이미 진행 중입니다. 열린 로그인 화면에서 계정 선택을 완료해 주세요.";
  if (code.includes("web-storage-unsupported"))
    return "브라우저가 로그인에 필요한 저장 공간을 차단했습니다. 시크릿 모드를 끄고 쿠키를 허용해 주세요.";
  if (code.includes("invalid-api-key"))
    return "Firebase 로그인 설정값이 올바르지 않습니다. .env.local의 Firebase 웹 설정을 확인해 주세요.";
  if (code.includes("operation-not-allowed"))
    return "Firebase Authentication에서 Google 로그인 제공업체가 꺼져 있습니다.";
  if (code.includes("account-exists-with-different-credential"))
    return "같은 이메일의 다른 로그인 방식이 이미 연결되어 있습니다.";
  if (code.includes("admin-restricted-operation"))
    return "학교 Google 계정 관리자가 외부 앱 로그인을 제한했습니다. 개인 Google 계정 또는 관리자 허용이 필요합니다.";
  if (code.includes("network-request-failed"))
    return "Firebase 로그인 요청이 차단됐습니다. 일반 창에서 팝업·쿠키를 허용하고 VPN이나 광고 차단을 끈 뒤 다시 시도해 주세요.";
  return "Google 로그인을 완료하지 못했습니다. 계정을 다시 선택해 주세요.";
};

/** 로그인 상태 변화를 구독한다. 정리 함수를 반환한다. */
export const observeUser = (
  callback: (user: User | null) => void,
  onRedirectError?: (message: string) => void,
) => {
  if (!auth) {
    callback(null);
    return () => undefined;
  }
  void getRedirectResult(auth).catch((error: unknown) =>
    onRedirectError?.(friendlyAuthError(error)),
  );
  return onAuthStateChanged(auth, callback);
};

let activeGoogleLogin: Promise<void> | null = null;

/** Google 로그인. 운영 도메인·모바일은 리디렉션, 그 외는 팝업(실패 시 리디렉션) 방식. */
export const loginWithGoogle = () => {
  if (!auth) throw new Error("Firebase 환경설정이 필요합니다.");
  if (activeGoogleLogin) return activeGoogleLogin;
  const authClient = auth;

  const login = async () => {
    await setPersistence(authClient, browserLocalPersistence);
    authClient.languageCode = "ko";
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    const sameSiteAuth =
      typeof window !== "undefined" && resolvedAuthDomain === window.location.hostname;
    const mobile =
      typeof navigator !== "undefined" && /Android|iPhone|iPad|iPod/iu.test(navigator.userAgent);

    if (sameSiteAuth || mobile) {
      await signInWithRedirect(authClient, provider);
      return;
    }
    try {
      await signInWithPopup(authClient, provider);
    } catch (error) {
      const code =
        typeof error === "object" && error && "code" in error ? String(error.code) : "";
      if (
        code.includes("popup-blocked") ||
        code.includes("popup-closed-by-user") ||
        code.includes("cancelled-popup-request")
      ) {
        await signInWithRedirect(authClient, provider);
        return;
      }
      throw error;
    }
  };

  activeGoogleLogin = login().finally(() => {
    activeGoogleLogin = null;
  });
  return activeGoogleLogin;
};

export const logout = () => (auth ? signOut(auth) : Promise.resolve());

export type { User };
