"use client";

import { BookOpen, ChevronLeft, Users, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { gradesFor, roleLabel, schoolStageLabel } from "@/lib/school";
import type { SchoolStage, TeacherRole } from "@/types";
import { choiceBadgeClass, choiceCardClass, choiceLabelClass } from "./choiceCard";

interface RoleSetupProps {
  schoolLevel: SchoolStage;
  grade: number;
  onSelectGrade: (grade: number) => void;
  onSelectRole: (role: TeacherRole) => void;
  onBack: () => void;
}

const roleOptions: { role: TeacherRole; icon: LucideIcon }[] = [
  { role: "homeroom", icon: Users },
  { role: "subject", icon: BookOpen },
];

/** 2단계: 학년을 고르고 담임 또는 전담과목·교과로 작업 화면에 들어간다. */
export function RoleSetup({
  schoolLevel,
  grade,
  onSelectGrade,
  onSelectRole,
  onBack,
}: RoleSetupProps) {
  return (
    <div className="mx-auto w-full max-w-[1400px]">
      <button
        className="mb-7 inline-flex items-center gap-2 text-base font-semibold text-muted transition-colors hover:text-primary-dark"
        onClick={onBack}
      >
        <ChevronLeft size={20} /> {schoolStageLabel[schoolLevel]}
      </button>

      <h1 className="text-center text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
        학년과 역할을 선택해 주세요
      </h1>

      <div
        className="mt-10 flex flex-wrap justify-center gap-3"
        role="group"
        aria-label="학년 선택"
      >
        {gradesFor(schoolLevel).map((item) => (
          <button
            key={item}
            aria-pressed={grade === item}
            onClick={() => onSelectGrade(item)}
            className={cn(
              "min-h-14 min-w-32 rounded-lg border px-6 text-lg font-semibold transition-colors duration-150",
              grade === item
                ? "border-primary bg-primary text-on-primary"
                : "border-line bg-subtle text-muted hover:border-primary/40 hover:text-primary-dark",
            )}
          >
            {item}학년
          </button>
        ))}
      </div>

      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:gap-9">
        {roleOptions.map(({ role, icon: Icon }) => (
          <button
            key={role}
            onClick={() => onSelectRole(role)}
            className={cn(choiceCardClass, "min-h-[220px] gap-6 lg:min-h-[280px]")}
          >
            <span className={cn(choiceBadgeClass, "size-20 lg:size-24")}>
              <Icon className="size-10 lg:size-12" />
            </span>
            <b className={cn(choiceLabelClass, "text-2xl lg:text-3xl")}>
              {roleLabel(schoolLevel, role)}
            </b>
          </button>
        ))}
      </div>
    </div>
  );
}
