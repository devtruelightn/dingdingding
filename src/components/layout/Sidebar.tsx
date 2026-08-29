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
        "glass fixed inset-y-0 left-0 z-30 flex w-[248px] flex-col gap-6 border-r border-line px-4 py-6 transition-transform duration-200",
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
        className="flex min-h-11 items-center gap-3 rounded-xl px-2 py-1 text-left transition-colors duration-150 hover:bg-primary-soft"
        onClick={onRestart}
        title="학교급부터 다시 선택"
      >
        <span
          className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary to-primary-dark text-base font-bold text-on-primary shadow-brand"
          aria-hidden
        >
          아
        </span>
        <span className="flex min-w-0 flex-col">
          <b className="text-base font-bold">아주 나이스</b>
          <small className="truncate text-xs text-muted">{context}</small>
        </span>
      </button>

      <nav className="flex flex-col gap-1" aria-label="주요 메뉴">
        {navItemsFor(profile.schoolLevel, profile.role).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onNavigate(id)}
            aria-current={view === id ? "page" : undefined}
            className={cn(
              "flex min-h-11 items-center gap-3 rounded-xl px-3 text-left text-sm transition-all duration-150",
              view === id
                ? "bg-gradient-to-r from-primary to-primary-dark font-semibold text-on-primary shadow-brand"
                : "text-muted hover:bg-primary-soft hover:text-primary-dark",
            )}
          >
            <Icon size={18} className="shrink-0" />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <div className="mt-auto flex items-start gap-2 rounded-xl border border-line bg-subtle p-3">
        <ShieldCheck size={16} className="mt-1 shrink-0 text-success" />
        <span className="flex flex-col">
          <b className="text-xs font-semibold">공식 자료 연결</b>
          <small className="text-xs text-muted">2022 개정 성취기준 · 검증 완료</small>
        </span>
      </div>
    </aside>
  );
}
