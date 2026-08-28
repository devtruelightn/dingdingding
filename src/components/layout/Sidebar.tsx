"use client";

import { ShieldCheck, X } from "lucide-react";
import { IconButton } from "@/components/ui";
import { cn } from "@/lib/cn";
import { roleLabel, schoolStageLabel } from "@/lib/school";
import type { TeacherProfile, View } from "@/types";
import { navItemsFor } from "./nav";

interface SidebarProps {
  view: View;
  profile: TeacherProfile;
  onNavigate: (view: View) => void;
  onRestart: () => void;
  open: boolean;
  onClose: () => void;
}

export function Sidebar({
  view,
  profile,
  onNavigate,
  onRestart,
  open,
  onClose,
}: SidebarProps) {
  const context = `${schoolStageLabel[profile.schoolLevel]} ${profile.grade}학년 · ${roleLabel(
    profile.schoolLevel,
    profile.role,
  )}`;

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-30 flex w-[248px] flex-col gap-5 border-r border-line bg-card/90 px-4 pb-4 pt-5 backdrop-blur-lg transition-transform",
        "max-lg:shadow-lg",
        open ? "translate-x-0" : "max-lg:-translate-x-[105%]",
      )}
    >
      <IconButton
        className="absolute right-2 top-2 lg:hidden"
        aria-label="메뉴 닫기"
        onClick={onClose}
      >
        <X />
      </IconButton>

      <button
        className="flex min-h-[52px] items-center gap-3 px-1.5 text-left"
        onClick={onRestart}
        title="학교급부터 다시 선택"
      >
        <span
          className="grid size-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary to-primary-dark text-lg font-black text-white"
          aria-hidden
        >
          <span>평</span>
        </span>
        <span className="flex min-w-0 flex-col">
          <b className="text-lg tracking-tight">평행톡톡</b>
          <small className="truncate text-[11px] text-muted">{context}</small>
        </span>
      </button>

      <nav className="flex flex-col gap-1.5" aria-label="주요 메뉴">
        {navItemsFor(profile.schoolLevel).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onNavigate(id)}
            className={cn(
              "flex min-h-[46px] items-center gap-3 rounded-xl px-3 text-left transition-colors",
              view === id
                ? "bg-primary font-semibold text-white shadow-sm"
                : "text-muted hover:bg-primary-soft/60 hover:text-primary-dark",
            )}
          >
            <Icon size={19} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <div className="mt-auto flex items-center gap-2 rounded-xl bg-solid/55 p-2.5 text-success">
        <ShieldCheck size={16} />
        <span className="flex flex-col">
          <b className="text-[11px]">공식 자료 연결</b>
          <small className="text-[10px] text-muted">2022 개정 성취기준 · 검증 완료</small>
        </span>
      </div>
    </aside>
  );
}
