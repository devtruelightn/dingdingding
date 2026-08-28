import { GraduationCap, MessageCircleHeart, type LucideIcon } from "lucide-react";
import { subjectMenuLabel } from "@/lib/school";
import type { SchoolStage, View } from "@/types";

export interface NavItem {
  id: View;
  label: string;
  icon: LucideIcon;
}

/** 사이드바에는 행발과 학교급별 교과 기록 두 메뉴만 노출한다. */
export const navItemsFor = (schoolLevel: SchoolStage): NavItem[] => [
  { id: "behavior", label: "행발", icon: MessageCircleHeart },
  { id: "subject", label: subjectMenuLabel(schoolLevel), icon: GraduationCap },
];
