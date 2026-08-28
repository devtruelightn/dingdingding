import { GraduationCap, MessageCircleHeart, type LucideIcon } from "lucide-react";
import { subjectMenuLabel } from "@/lib/school";
import type { SchoolStage, TeacherRole, View } from "@/types";

export interface NavItem {
  id: View;
  label: string;
  icon: LucideIcon;
}

/** 전담과목·교과 교사는 교과 기록만, 담임은 행발과 교과 기록을 모두 사용한다. */
export const navItemsFor = (schoolLevel: SchoolStage, role: TeacherRole): NavItem[] => {
  const subject = { id: "subject", label: subjectMenuLabel(schoolLevel), icon: GraduationCap } as const;
  return role === "subject"
    ? [subject]
    : [{ id: "behavior", label: "행발", icon: MessageCircleHeart }, subject];
};
