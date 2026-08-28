"use client";

import { CloudOff, ShieldCheck } from "lucide-react";
import { isCloudAiEnabled, isFirebaseConfigured } from "@/lib/firebase";

/** Firebase 연결 상태 안내 배너. */
export function ConfigBanner() {
  if (!isFirebaseConfigured) {
    return (
      <div className="flex min-h-[35px] items-center justify-center gap-2 bg-warning/15 px-4 py-1.5 text-xs text-warning">
        <CloudOff size={16} />
        <span>
          미리보기 모드 · Firebase 프로젝트를 연결하면 Google 로그인과 기기 간 저장이 활성화됩니다.
        </span>
      </div>
    );
  }
  return (
    <div className="flex min-h-[35px] items-center justify-center gap-2 bg-primary-soft/60 px-4 py-1.5 text-xs text-primary-dark">
      <ShieldCheck size={16} />
      <span>
        {isCloudAiEnabled
          ? "Google 로그인과 App Check로 보호된 AI 서버(Cloud Functions) 연결"
          : "Google 로그인과 Firestore 저장 사용 · 외부 AI는 사용하지 않음"}
      </span>
    </div>
  );
}
