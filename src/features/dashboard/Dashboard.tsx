"use client";

import { Backpack, GraduationCap, School, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { schoolStageLabel, schoolStageOrder } from "@/lib/school";
import type { SchoolStage } from "@/types";
import { choiceBadgeClass, choiceCardClass, choiceLabelClass } from "./choiceCard";

interface DashboardProps {
  onSelectSchoolLevel: (schoolLevel: SchoolStage) => void;
}

const stageIcon: Record<SchoolStage, LucideIcon> = {
  elementary: Backpack,
  middle: School,
  high: GraduationCap,
};

/** 1단계: 학교급만 고르는 진입 화면. */
export function Dashboard({ onSelectSchoolLevel }: DashboardProps) {
  return (
    <div className="mx-auto w-full max-w-[1400px]">
      <h1 className="mb-10 text-center text-4xl font-bold tracking-tight sm:text-5xl lg:mb-16 lg:text-6xl">
        학교급을 선택해 주세요
      </h1>
      <div className="grid gap-6 sm:grid-cols-3 lg:gap-9">
        {schoolStageOrder.map((schoolLevel) => {
          const Icon = stageIcon[schoolLevel];
          return (
            <button
              key={schoolLevel}
              onClick={() => onSelectSchoolLevel(schoolLevel)}
              className={cn(choiceCardClass, "min-h-[300px] gap-8 lg:min-h-[400px]")}
            >
              <span className={cn(choiceBadgeClass, "size-24 lg:size-32")}>
                <Icon className="size-12 lg:size-16" />
              </span>
              <b className={cn(choiceLabelClass, "text-2xl lg:text-4xl")}>
                {schoolStageLabel[schoolLevel]}
              </b>
            </button>
          );
        })}
      </div>
    </div>
  );
}
