"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Toast } from "@/components/ui";
import { Topbar } from "./Topbar";
import { Dashboard, RoleSetup } from "@/features/dashboard";
import { BehaviorBuilder } from "@/features/behavior-comments";
import { ClassSubject, QuickSubject } from "@/features/subject-comments";
import { SettingsView } from "@/features/settings/SettingsView";
import { Tutorial } from "@/features/tutorial/Tutorial";
import { useAuthUser } from "@/hooks/useAuthUser";
import { useOnboarding } from "@/hooks/useOnboarding";
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
import { viewForRole, workModeForRole } from "@/lib/school";
import {
  isSavedAssessmentPlan,
  loadStoredAssessmentPlan,
  loadTeacherProfile,
  markTutorialDone,
  saveLastView,
  saveStoredAssessmentPlan,
  saveWorkspaceSnapshot,
} from "@/lib/storage";
import type { SavedAssessmentPlan, TeacherRole, View, WorkMode } from "@/types";

const WORKSPACE_ID = "default-workspace";

/** 앱 전체 셸: 진입 흐름(학교급 → 학년·역할) → 사이드바 작업 화면 오케스트레이션. */
export function AppShell() {
  const { stage, profile, selectSchoolLevel, selectGrade, selectRole, resume, restart } =
    useOnboarding();
  const [view, setView] = useState<View>("behavior");
  const [workMode, setWorkMode] = useState<WorkMode>("quick");
  const { theme, setTheme, reduceMotion, setReduceMotion, reduceTransparency, setReduceTransparency } =
    useTheme();
  const { message: toastMessage, toast } = useToast();
  // 이름 가림 토글을 상단바에서 없애 현재는 항상 표시한다.
  const privacy = false;
  const [cloudNames, setCloudNames] = useState(false);
  const [tutorial, setTutorial] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [savedPlan, setSavedPlan] = useState<SavedAssessmentPlan | null>(null);

  const authError = useCallback((message: string) => toast(message), [toast]);
  const user = useAuthUser(authError);

  // 클라이언트에서만 읽는 초기 상태 (하이드레이션 안전)
  useEffect(() => {
    setSavedPlan(loadStoredAssessmentPlan());
  }, []);

  // 지난번에 고른 학교급·학년·역할이 있으면 진입 화면을 건너뛴다.
  useEffect(() => {
    const saved = loadTeacherProfile();
    if (!saved) return;
    resume(saved);
    setView(viewForRole(saved.role));
    setWorkMode(workModeForRole(saved.role));
  }, [resume]);

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

  // 저장 버튼을 없앴으므로 화면이 바뀔 때 자동으로 저장한다.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      saveLastView(view);
      void autosave();
    }, 450);
    return () => window.clearTimeout(timer);
    // autosave는 매 렌더마다 새로 만들어지므로 의존성에서 뺀다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  const navigate = (next: View) => {
    setView(profile.role === "subject" && next === "behavior" ? "subject" : next);
  };

  /** 담임/전담과목·교과 버튼 → 해당 메뉴가 선택된 작업 화면으로 진입. */
  const enterWorkspace = (role: TeacherRole) => {
    selectRole(role);
    setView(viewForRole(role));
    setWorkMode(workModeForRole(role));
  };

  /** 상단 저장 버튼을 대신하는 조용한 자동 저장. 화면에 아무것도 알리지 않는다. */
  const autosave = async () => {
    saveWorkspaceSnapshot({ view, theme, privacy, ...profile, updatedAt: Date.now() });
    if (user && isFirebaseConfigured) {
      try {
        await saveWorkspace(user.uid, WORKSPACE_ID, {
          title: "기본 작업",
          type: view,
          privacyMode: privacy,
          savedAssessmentPlan: savedPlan,
        });
      } catch {
        return;
      }
    }
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
      case "behavior":
        return <BehaviorBuilder classMode={workMode === "class"} profile={profile} privacy={privacy} toast={toast} />;
      case "subject":
        return workMode === "class" ? (
          <ClassSubject
            profile={profile}
            toast={toast}
            savedPlan={savedPlan}
            onSavePlan={persistAssessmentPlan}
          />
        ) : (
          <QuickSubject
            profile={profile}
            toast={toast}
            savedPlan={savedPlan}
            onSavePlan={persistAssessmentPlan}
          />
        );
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
    workMode,
    profile,
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

  if (stage !== "work") {
    return (
      <div className="flex min-h-screen flex-col justify-center px-6 py-12 sm:px-10 lg:px-16">
        <main className="w-full">
          {stage === "school" ? (
            <Dashboard onSelectSchoolLevel={selectSchoolLevel} />
          ) : (
            <RoleSetup
              schoolLevel={profile.schoolLevel}
              grade={profile.grade}
              onSelectGrade={selectGrade}
              onSelectRole={enterWorkspace}
              onBack={restart}
            />
          )}
        </main>
        <Toast message={toastMessage} />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <main className="min-w-0">
        <Topbar
          view={view}
          profile={profile}
          onNavigate={navigate}
          onRestart={restart}
          onOpenSettings={() => navigate("settings")}
          onOpenTutorial={() => setTutorial(true)}
          onSignIn={() => void signIn()}
          onSignOut={() => void logout()}
          signingIn={signingIn}
          user={user}
        />
        <div className="mx-auto w-[min(1260px,calc(100%-2rem))] py-9 sm:py-10">
          {content}
        </div>
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
