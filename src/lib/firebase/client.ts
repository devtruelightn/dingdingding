"use client";

import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import {
  ReCaptchaEnterpriseProvider,
  initializeAppCheck,
  type AppCheck,
} from "firebase/app-check";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getFunctions, type Functions } from "firebase/functions";

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const configuredAuthDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;

// Firebase Hosting에서는 인증 중계도 현재 사이트와 같은 도메인에서 처리한다.
// (브라우저 3rd-party 쿠키 제한으로 팝업/리디렉션 완료 신호가 사라지는 문제 회피)
const browserHost = typeof window === "undefined" ? "" : window.location.hostname;
const hostingDomains = projectId
  ? new Set([`${projectId}.web.app`, `${projectId}.firebaseapp.com`])
  : new Set<string>();
export const resolvedAuthDomain = hostingDomains.has(browserHost)
  ? browserHost
  : configuredAuthDomain;

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: resolvedAuthDomain,
  projectId,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/** .env.local에 Firebase 웹 설정이 모두 채워졌는지 */
export const isFirebaseConfigured = Object.values(firebaseConfig).every(Boolean);

/** AI 문장 생성(Cloud Functions) 사용 여부 */
export const isCloudAiEnabled =
  process.env.NEXT_PUBLIC_ENABLE_CLOUD_AI === "true" && isFirebaseConfigured;

/** Cloud Functions 리전 (functions/src/index.ts 와 동일해야 함) */
export const FUNCTIONS_REGION = "asia-northeast3";

export const app: FirebaseApp | null = isFirebaseConfigured
  ? getApps().length
    ? getApp()
    : initializeApp(firebaseConfig)
  : null;

let appCheck: AppCheck | null = null;
if (app && typeof window !== "undefined" && process.env.NEXT_PUBLIC_FIREBASE_APP_CHECK_SITE_KEY) {
  appCheck = initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider(
      process.env.NEXT_PUBLIC_FIREBASE_APP_CHECK_SITE_KEY,
    ),
    isTokenAutoRefreshEnabled: true,
  });
}
export { appCheck };

export const auth: Auth | null = app ? getAuth(app) : null;
export const firestore: Firestore | null = app ? getFirestore(app) : null;
export const functions: Functions | null = app ? getFunctions(app, FUNCTIONS_REGION) : null;
