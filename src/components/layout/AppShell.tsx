"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Toast } from "@/components/ui";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { Dashboard } from "@/features/dashboard/Dashboard";
import { BehaviorBuilder } from "@/features/behavior-comments";
import { ClassSubject, QuickSubject } from "@/features/subject-comments";
import { SettingsView } from "@/features/settings/SettingsView";
import { Tutorial } from "@/features/tutorial/Tutorial";
import { useAuthUser } from "@/hooks/useAuthUser";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/hooks/useToast";
import {
  friendlyAuthError,
  isFirebaseConfigured,
  loadWorkspace,
  loginWithGoogle,
  logout,
  saveWorkspace,
} from "@/lib/firebase";
import {
  isSavedAssessmentPlan,
  loadStoredAssessmentPlan,
  markTutorialDone,
  saveLastView,
  saveStoredAssessmentPlan,
  saveWorkspaceSnapshot,
} from "@/lib/storage";
import type { SavedAssessmentPlan, View } from "@/types";

const WORKSPACE_ID = "default-workspace";

/** 앱 전체 셸: 사이드바 + 탑바 + 화면 전환 + 저장/로그인 오케스트레이션. */
export function AppShell() {
  const [view, setView] = useState<View>("dashboard");
  const { theme, setTheme, reduceMotion, setReduceMotion, reduceTransparency, setReduceTransparency } =
    useTheme();
  const { message: toastMessage, toast } = useToast();
  const [privacy, setPrivacy] = useState(false);
  const [cloudNames, setCloudNames] = useState(false);
  const [tutorial, setTutorial] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "offline">("saved");
  const [savedPlan, setSavedPlan] = useState<SavedAssessmentPlan | null>(null);

  const authError = useCallback((message: string) => toast(message), [toast]);
  const user = useAuthUser(authError);

  // 클라이언트에서만 읽는 초기 상태 (하이드레이션 안전)
  useEffect(() => {
    setSavedPlan(loadStoredAssessmentPlan());
  }, []);

  // 로그인 시 클라우드에 저장된 평가계획을 병합한다.
  useEffect(() => {
    if (!user || !isFirebaseConfigured) return;
    void loadWorkspace(user.uid, WORKSPACE_ID)
      .then((data) => {
        const remotePlan = data?.savedAssessmentPlan;
        if (!isSavedAssessmentPlan(remotePlan)) return;
        setSavedPlan((current) => {
          const chosen =
            !current ||
            new Date(remotePlan.savedAt).getTime() > new Date(current.savedAt).getTime()
              ? remotePlan
              : current;
          saveStoredAssessmentPlan(chosen);
          return chosen;
        });
      })
      .catch(() => undefined);
  }, [user]);

  // view 변경 시 로컬에 마지막 화면과 저장 상태를 기록한다.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      saveLastView(view);
      setSaveState(navigator.onLine ? "saved" : "offline");
    }, 450);
    return () => window.clearTimeout(timer);
  }, [view]);

  const navigate = (next: View) => {
    setView(next);
    setMobileNav(false);
  };

  const save = async () => {
    setSaveState("saving");
    saveWorkspaceSnapshot({ view, theme, privacy, updatedAt: Date.now() });
    if (user && isFirebaseConfigured) {
      try {
        await saveWorkspace(user.uid, WORKSPACE_ID, {
          title: "기본 작업",
          type: view,
          privacyMode: privacy,
          savedAssessmentPlan: savedPlan,
        });
      } catch {
        setSaveState("offline");
        toast("클라우드 저장에 실패했지만 기기 초안은 안전하게 유지했습니다.");
        return;
      }
    }
    setSaveState("saved");
    toast(user ? "계정에 안전하게 저장했습니다." : "현재 기기에 임시 저장했습니다.");
  };

  const persistAssessmentPlan = useCallback(
    async (plan: SavedAssessmentPlan) => {
      setSavedPlan(plan);
      saveStoredAssessmentPlan(plan);
      if (user && isFirebaseConfigured) {
        try {
          await saveWorkspace(user.uid, WORKSPACE_ID, {
            title: "기본 작업",
            savedAssessmentPlan: plan,
          });
          toast("평가계획을 계정에 저장했습니다. 두 평어 메뉴에서 바로 불러올 수 있습니다.");
        } catch {
          toast("계정 저장은 지연됐지만 현재 기기에는 저장했습니다.");
        }
      } else {
        toast("평가계획을 현재 기기에 저장했습니다. 두 평어 메뉴에서 바로 불러올 수 있습니다.");
      }
    },
    [user, toast],
  );

  const signIn = async () => {
    if (!isFirebaseConfigured) {
      return toast("Firebase 프로젝트 연결 후 Google 로그인을 사용할 수 있습니다.");
    }
    if (signingIn) return;
    setSigningIn(true);
    try {
      await loginWithGoogle();
    } catch (error) {
      toast(friendlyAuthError(error));
    } finally {
      setSigningIn(false);
    }
  };

  const content = useMemo(() => {
    switch (view) {
      case "dashboard":
        return <Dashboard setView={setView} />;
      case "quick-subject":
        return (
          <QuickSubject toast={toast} savedPlan={savedPlan} onSavePlan={persistAssessmentPlan} />
        );
      case "class-subject":
        return (
          <ClassSubject
            toast={toast}
            savedPlan={savedPlan}
            onSavePlan={persistAssessmentPlan}
          />
        );
      case "quick-behavior":
        return <BehaviorBuilder privacy={privacy} toast={toast} />;
      case "class-behavior":
        return <BehaviorBuilder classMode privacy={privacy} toast={toast} />;
      case "settings":
        return (
          <SettingsView
            theme={theme}
            setTheme={setTheme}
            cloudNames={cloudNames}
            setCloudNames={setCloudNames}
            reduceMotion={reduceMotion}
            setReduceMotion={setReduceMotion}
            reduceTransparency={reduceTransparency}
            setReduceTransparency={setReduceTransparency}
            toast={toast}
          />
        );
      default:
        return null;
    }
  }, [
    view,
    toast,
    privacy,
    theme,
    setTheme,
    cloudNames,
    reduceMotion,
    setReduceMotion,
    reduceTransparency,
    setReduceTransparency,
    savedPlan,
    persistAssessmentPlan,
  ]);

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      <Sidebar
        view={view}
        onNavigate={navigate}
        open={mobileNav}
        onClose={() => setMobileNav(false)}
      />
      {mobileNav && (
        <button
          className="fixed inset-0 z-20 bg-ink/35 lg:hidden"
          aria-label="메뉴 닫기"
          onClick={() => setMobileNav(false)}
        />
      )}
      <main className="min-w-0 lg:col-start-2">
        <Topbar
          saveState={saveState}
          privacy={privacy}
          onTogglePrivacy={() => setPrivacy((value) => !value)}
          onOpenMenu={() => setMobileNav(true)}
          onOpenSettings={() => navigate("settings")}
          onOpenTutorial={() => setTutorial(true)}
          onSave={() => void save()}
          onSignIn={() => void signIn()}
          onSignOut={() => void logout()}
          signingIn={signingIn}
          user={user}
        />
        <div className="mx-auto w-[min(1260px,calc(100%-2rem))] py-9 sm:py-10">{content}</div>
      </main>

      {tutorial && (
        <Tutorial
          onClose={(hideForever) => {
            if (hideForever) markTutorialDone();
            setTutorial(false);
          }}
        />
      )}
      <Toast message={toastMessage} />
    </div>
  );
}
