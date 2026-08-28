import {
  GraduationCap,
  Home,
  MessageCircleHeart,
  Settings,
  Users,
  WandSparkles,
  type LucideIcon,
} from "lucide-react";
import type { View } from "@/types";

export const navItems: { id: View; label: string; icon: LucideIcon }[] = [
  { id: "dashboard", label: "홈", icon: Home },
  { id: "quick-subject", label: "평어 빠른 생성", icon: WandSparkles },
  { id: "class-subject", label: "우리 반 평어", icon: Users },
  { id: "quick-behavior", label: "행발 빠른 생성", icon: MessageCircleHeart },
  { id: "class-behavior", label: "우리 반 행발", icon: GraduationCap },
  { id: "settings", label: "설정", icon: Settings },
];
