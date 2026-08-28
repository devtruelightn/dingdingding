"use client";

import { useCallback, useState } from "react";
import { gradesFor } from "@/lib/school";
import type { OnboardingStage, SchoolStage, TeacherProfile, TeacherRole } from "@/types";

const INITIAL_PROFILE: TeacherProfile = {
  schoolLevel: "elementary",
  grade: 1,
  role: "homeroom",
};

/**
 * 학교급 → 학년·역할 → 작업 화면으로 이어지는 진입 흐름 상태.
 * 사이드바 메뉴(View)와는 분리해 두고 AppShell에서 함께 조립한다.
 */
export const useOnboarding = () => {
  const [stage, setStage] = useState<OnboardingStage>("school");
  const [profile, setProfile] = useState<TeacherProfile>(INITIAL_PROFILE);

  const selectSchoolLevel = useCallback((schoolLevel: SchoolStage) => {
    // 학교급마다 학년 범위가 달라 이전 선택은 첫 학년으로 되돌린다.
    setProfile((current) => ({ ...current, schoolLevel, grade: gradesFor(schoolLevel)[0] }));
    setStage("profile");
  }, []);

  const selectGrade = useCallback(
    (grade: number) => setProfile((current) => ({ ...current, grade })),
    [],
  );

  const selectRole = useCallback((role: TeacherRole) => {
    setProfile((current) => ({ ...current, role }));
    setStage("work");
  }, []);

  const restart = useCallback(() => setStage("school"), []);

  return { stage, profile, selectSchoolLevel, selectGrade, selectRole, restart };
};
